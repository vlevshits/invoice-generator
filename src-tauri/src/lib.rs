use std::fs;
use std::path::PathBuf;
use std::process::Command;
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceItemPayload {
    pub description: String,
    pub unit: String,
    pub unit_price: f64,
    pub quantity: f64,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoicePayload {
    pub invoice_number: String,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub seller_name: String,
    pub seller_tax_id: String,
    pub seller_address: String,
    pub buyer_name: String,
    pub buyer_tax_id: String,
    pub buyer_director: Option<String>,
    pub buyer_address: String,
    pub bank_account_label: String,
    pub bank_beneficiary: String,
    pub bank_name: String,
    pub bank_address: Option<String>,
    pub bank_iban: String,
    pub bank_swift: String,
    pub intermediary_bank: Option<String>,
    pub intermediary_swift: Option<String>,
    pub currency: String,
    pub total_amount: f64,
    pub amount_in_words: String,
    pub notes: Option<String>,
    pub custom_typst_template: Option<String>,
    pub items: Vec<InvoiceItemPayload>,
}

fn format_currency_symbol(curr: &str) -> &str {
    match curr.to_uppercase().as_str() {
        "EUR" => "€",
        "USD" => "$",
        "GBP" => "£",
        "GEL" => "GEL ",
        _ => curr,
    }
}

fn escape_typst_str(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('#', "\\#")
        .replace('$', "\\$")
        .replace('[', "\\[")
        .replace(']', "\\]")
}

#[tauri::command]
async fn generate_pdf_command(
    _app: AppHandle,
    payload: InvoicePayload,
    target_path: Option<String>,
) -> Result<String, String> {
    let curr_sym = format_currency_symbol(&payload.currency);

    let mut items_typst = String::new();
    for item in &payload.items {
        let desc = escape_typst_str(&item.description);
        let unit = escape_typst_str(&item.unit);
        let qty = item.quantity;
        let price = item.unit_price;
        let amount = item.amount;

        items_typst.push_str(&format!(
            "  [ {} ], [ {:.2} ({}) ], [ {}{:.2} ], [ {}{:.2} ],\n",
            desc, qty, unit, curr_sym, price, curr_sym, amount
        ));
    }

    let seller_name = escape_typst_str(&payload.seller_name);
    let seller_tax_id = escape_typst_str(&payload.seller_tax_id);
    let seller_address = escape_typst_str(&payload.seller_address);

    let buyer_name = escape_typst_str(&payload.buyer_name);
    let buyer_tax_id = escape_typst_str(&payload.buyer_tax_id);
    let buyer_director = payload.buyer_director.as_deref().unwrap_or("");
    let buyer_address = escape_typst_str(&payload.buyer_address);

    let bank_name = escape_typst_str(&payload.bank_name);
    let bank_beneficiary = escape_typst_str(&payload.bank_beneficiary);
    let bank_iban = escape_typst_str(&payload.bank_iban);
    let bank_swift = escape_typst_str(&payload.bank_swift);
    let intermediary_bank = payload.intermediary_bank.as_deref().unwrap_or("");
    let intermediary_swift = payload.intermediary_swift.as_deref().unwrap_or("");

    let notes = payload.notes.as_deref().unwrap_or("");
    let amount_in_words = escape_typst_str(&payload.amount_in_words);
    let due_date_typst = if let Some(d) = payload.due_date.as_deref() {
        if !d.trim().is_empty() {
            format!("Due Date: {}", d)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let director_typst = if !buyer_director.is_empty() {
        format!("Director / Rep: {} \\", escape_typst_str(buyer_director))
    } else {
        String::new()
    };

    let intermediary_typst = if !intermediary_bank.is_empty() {
        format!(
            "Intermediary Bank: {} \\\n        Intermediary SWIFT: #raw(\"{}\") \\",
            escape_typst_str(intermediary_bank),
            escape_typst_str(intermediary_swift)
        )
    } else {
        String::new()
    };

    let notes_typst = if !notes.is_empty() {
        format!(
            "#v(10pt)\n#text(size: 8pt, fill: rgb(\"64748b\"))[*Notes / Terms:* {}]",
            escape_typst_str(notes)
        )
    } else {
        String::new()
    };

    let typst_content = match &payload.custom_typst_template {
        Some(tmpl) if !tmpl.trim().is_empty() => tmpl
            .replace("{{seller_name}}", &seller_name)
            .replace("{{seller_tax_id}}", &seller_tax_id)
            .replace("{{seller_address}}", &seller_address)
            .replace("{{invoice_number}}", &payload.invoice_number)
            .replace("{{issue_date}}", &payload.issue_date)
            .replace("{{due_date}}", &due_date_typst)
            .replace("{{buyer_name}}", &buyer_name)
            .replace("{{buyer_tax_id}}", &buyer_tax_id)
            .replace("{{buyer_director}}", &director_typst)
            .replace("{{buyer_address}}", &buyer_address)
            .replace("{{bank_name}}", &bank_name)
            .replace("{{bank_beneficiary}}", &bank_beneficiary)
            .replace("{{bank_iban}}", &bank_iban)
            .replace("{{bank_swift}}", &bank_swift)
            .replace("{{intermediary_info}}", &intermediary_typst)
            .replace("{{items_table_rows}}", &items_typst)
            .replace("{{currency_symbol}}", curr_sym)
            .replace("{{currency}}", &payload.currency)
            .replace("{{total_amount}}", &format!("{:.2}", payload.total_amount))
            .replace("{{amount_in_words}}", &amount_in_words)
            .replace("{{notes}}", &notes_typst),
        _ => format!(
            r#"#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1.35fr, 0.65fr),
  align: (left, right),
  [
    #text(size: 14pt, weight: "bold", fill: rgb("0f172a"))[{seller_name}] \
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Tax ID: {seller_tax_id} \
      {seller_address}
    ]
  ],
  [
    #text(size: 22pt, weight: "bold", fill: rgb("10b981"))[INVOICE] \
    #v(2pt)
    #text(size: 10.5pt, weight: "bold")[Invoice No. {invoice_number}] \
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Issue Date: {issue_date} \
      {due_date_typst}
    ]
  ]
)

#v(12pt)
#line(length: 100%, stroke: 0.5pt + rgb("e2e8f0"))
#v(8pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[INVOICE TO:] \
    #v(2pt)
    #text(weight: "bold", size: 10.5pt)[{buyer_name}] \
    #text(size: 8.5pt, fill: rgb("334155"))[
      Tax ID: {buyer_tax_id} \
      {director_typst}
      Address: {buyer_address}
    ]
  ],
  [
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[PAYMENT DETAILS:] \
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("334155"))[
      Bank: {bank_name} \
      Beneficiary: {bank_beneficiary} \
      IBAN: #raw("{bank_iban}") \
      SWIFT/BIC: #raw("{bank_swift}") \
      {intermediary_typst}
    ]
  ]
)

#v(16pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 {{ rgb("f8fafc") }} else if calc.even(y) {{ rgb("f8fafc") }} else {{ none }},
  stroke: 0.5pt + rgb("e2e8f0"),
  [ *Description* ], [ *Qty (Units)* ], [ *Unit Price* ], [ *Net Price* ],
{items_typst})

#v(12pt)

#align(right)[
  #block(width: 320pt, fill: rgb("f8fafc"), stroke: 0.5pt + rgb("e2e8f0"), inset: 10pt, radius: 4pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 13pt, weight: "bold", fill: rgb("10b981"))[{curr_sym}{total_amount:.2}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 0.5pt + rgb("cbd5e1"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("334155"))[
        *Amount in words:* {amount_in_words}
      ]
    ]
  ]
]

{notes_typst}

#v(40pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 40pt,
  align: center,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(4pt)
    #text(size: 8.5pt, weight: "medium")[Seller Signature] \
    #text(size: 7.5pt, fill: rgb("64748b"))[({seller_name})]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(4pt)
    #text(size: 8.5pt, weight: "medium")[Buyer Signature] \
    #text(size: 7.5pt, fill: rgb("64748b"))[({buyer_name})]
  ]
)
"#,
            seller_name = seller_name,
            seller_tax_id = seller_tax_id,
            seller_address = seller_address,
            invoice_number = payload.invoice_number,
            issue_date = payload.issue_date,
            due_date_typst = due_date_typst,
            buyer_name = buyer_name,
            buyer_tax_id = buyer_tax_id,
            director_typst = director_typst,
            buyer_address = buyer_address,
            bank_name = bank_name,
            bank_beneficiary = bank_beneficiary,
            bank_iban = bank_iban,
            bank_swift = bank_swift,
            intermediary_typst = intermediary_typst,
            items_typst = items_typst,
            curr_sym = curr_sym,
            total_amount = payload.total_amount,
            amount_in_words = amount_in_words,
            notes_typst = notes_typst
        ),
    };

    let temp_dir = std::env::temp_dir();
    let temp_typ_path = temp_dir.join(format!("invoice_{}.typ", payload.invoice_number));
    let final_pdf_path = match target_path {
        Some(path) => PathBuf::from(path),
        None => temp_dir.join(format!("invoice_{}.pdf", payload.invoice_number)),
    };

    fs::write(&temp_typ_path, typst_content).map_err(|e| e.to_string())?;

    let output = Command::new("typst")
        .arg("compile")
        .arg(&temp_typ_path)
        .arg(&final_pdf_path)
        .output()
        .map_err(|e| format!("Failed to execute typst CLI: {}. Please ensure typst is installed.", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Typst compilation error: {}", err_msg));
    }

    Ok(final_pdf_path.to_string_lossy().into_owned())
}

#[derive(Serialize, Deserialize)]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
}

fn generate_pkce_pair() -> (String, String) {
    let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk_custom_verifier_1234567890";
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    let challenge = URL_SAFE_NO_PAD.encode(hash);
    (verifier.to_string(), challenge)
}

#[tauri::command]
async fn start_google_oauth(
    client_id: String,
    client_secret: Option<String>,
) -> Result<OAuthTokens, String> {
    let port = 9876;
    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

    let server = tiny_http::Server::http(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("Failed to bind local loopback server: {}", e))?;

    let (code_verifier, code_challenge) = generate_pkce_pair();

    let scope = "https://www.googleapis.com/auth/drive.file";
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&code_challenge={}&code_challenge_method=S256",
        client_id, redirect_uri, scope, code_challenge
    );

    let _ = open::that(&auth_url);

    let mut auth_code = None;
    if let Ok(Some(request)) = server.recv_timeout(std::time::Duration::from_secs(30)) {
        let url_str = request.url();
        if let Ok(parsed_url) = url::Url::parse(&format!("http://localhost{}", url_str)) {
            for (k, v) in parsed_url.query_pairs() {
                if k == "code" {
                    auth_code = Some(v.to_string());
                    break;
                }
            }
        }

        let response_html = "<html><body style='font-family:sans-serif;text-align:center;padding-top:50px;'><h2>Google Drive Authorization Successful!</h2><p>You may now close this browser tab and return to the Invoice Generator app.</p></body></html>";
        let response = tiny_http::Response::from_string(response_html)
            .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap());
        let _ = request.respond(response);
    }

    let code = auth_code.ok_or_else(|| "Google Drive login timed out or was closed in the browser. Click 'Sign in with Google Drive' to try again.".to_string())?;

    let client = reqwest::Client::new();
    let mut params = vec![
        ("client_id", client_id.clone()),
        ("code", code),
        ("grant_type", "authorization_code".to_string()),
        ("redirect_uri", redirect_uri),
        ("code_verifier", code_verifier),
    ];

    if let Some(secret) = client_secret {
        if !secret.trim().is_empty() {
            params.push(("client_secret", secret.trim().to_string()));
        }
    }

    let token_resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to request tokens from Google: {}", e))?;

    if !token_resp.status().is_success() {
        let err_text = token_resp.text().await.unwrap_or_default();
        return Err(format!("Google OAuth token error: {}", err_text));
    }

    let tokens: OAuthTokens = token_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google OAuth tokens: {}", e))?;

    Ok(tokens)
}

#[tauri::command]
async fn get_or_create_drive_folder(
    access_token: String,
    folder_name: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let q = format!(
        "name = '{}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        folder_name.replace("'", "\\'")
    );

    let search_res = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&access_token)
        .query(&[("q", q.as_str()), ("fields", "files(id, name)")])
        .send()
        .await
        .map_err(|e| format!("Folder search request failed: {}", e))?;

    if search_res.status().is_success() {
        let json: serde_json::Value = search_res
            .json()
            .await
            .map_err(|e| format!("Failed to parse search response: {}", e))?;

        if let Some(files) = json.get("files").and_then(|f| f.as_array()) {
            if let Some(first) = files.first() {
                if let Some(id) = first.get("id").and_then(|i| i.as_str()) {
                    return Ok(id.to_string());
                }
            }
        }
    }

    let create_payload = serde_json::json!({
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    });

    let create_res = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(&access_token)
        .json(&create_payload)
        .send()
        .await
        .map_err(|e| format!("Folder creation request failed: {}", e))?;

    if !create_res.status().is_success() {
        let err = create_res.text().await.unwrap_or_default();
        return Err(format!("Drive API folder creation error: {}", err));
    }

    let created_json: serde_json::Value = create_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse created folder response: {}", e))?;

    let folder_id = created_json
        .get("id")
        .and_then(|i| i.as_str())
        .ok_or_else(|| "No folder ID returned from Drive API".to_string())?;

    Ok(folder_id.to_string())
}

async fn upsert_drive_file(
    access_token: &str,
    folder_id: &str,
    file_name: &str,
    upload_mime: &str,
    target_mime: &str,
    file_bytes: &[u8],
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let q = format!(
        "'{}' in parents and name = '{}' and trashed = false",
        folder_id,
        file_name.replace("'", "\\'")
    );

    let search_res = client
        .get("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .query(&[("q", q.as_str()), ("fields", "files(id, name)")])
        .send()
        .await
        .map_err(|e| format!("File search request failed: {}", e))?;

    let mut existing_id: Option<String> = None;

    if search_res.status().is_success() {
        if let Ok(json) = search_res.json::<serde_json::Value>().await {
            if let Some(files) = json.get("files").and_then(|f| f.as_array()) {
                if let Some(first) = files.first() {
                    if let Some(id) = first.get("id").and_then(|i| i.as_str()) {
                        existing_id = Some(id.to_string());
                    }
                }
            }
        }
    }

    let boundary = "foo_bar_baz_upsert_boundary";
    let mut body = Vec::new();

    if let Some(ref file_id) = existing_id {
        let metadata = serde_json::json!({
            "name": file_name,
            "mimeType": target_mime
        });

        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.extend(metadata.to_string().as_bytes());
        body.extend(b"\r\n");

        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(format!("Content-Type: {}\r\n\r\n", upload_mime).as_bytes());
        body.extend(file_bytes);
        body.extend(b"\r\n");
        body.extend(format!("--{}\r\n", boundary).as_bytes());

        let patch_url = format!(
            "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=multipart",
            file_id
        );

        let res = client
            .patch(&patch_url)
            .bearer_auth(access_token)
            .header("Content-Type", format!("multipart/related; boundary={}", boundary))
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Drive API update failed: {}", e))?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(format!("Drive API file update error: {}", err));
        }

        let body_text = res.text().await.unwrap_or_default();
        Ok(body_text)
    } else {
        let metadata = serde_json::json!({
            "name": file_name,
            "mimeType": target_mime,
            "parents": [folder_id]
        });

        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.extend(metadata.to_string().as_bytes());
        body.extend(b"\r\n");

        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(format!("Content-Type: {}\r\n\r\n", upload_mime).as_bytes());
        body.extend(file_bytes);
        body.extend(b"\r\n");
        body.extend(format!("--{}\r\n", boundary).as_bytes());

        let res = client
            .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .bearer_auth(access_token)
            .header("Content-Type", format!("multipart/related; boundary={}", boundary))
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Drive API creation failed: {}", e))?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(format!("Drive API file creation error: {}", err));
        }

        let body_text = res.text().await.unwrap_or_default();
        Ok(body_text)
    }
}

#[tauri::command]
async fn export_csv_to_google_sheet(
    access_token: String,
    folder_id: String,
    sheet_name: String,
    csv_content: String,
) -> Result<String, String> {
    upsert_drive_file(
        &access_token,
        &folder_id,
        &sheet_name,
        "text/csv; charset=UTF-8",
        "application/vnd.google-apps.spreadsheet",
        csv_content.as_bytes(),
    )
    .await
}

#[tauri::command]
async fn upload_pdf_to_google_drive(
    access_token: String,
    file_path: String,
    file_name: String,
    parent_folder_id: Option<String>,
) -> Result<String, String> {
    let pdf_bytes = fs::read(&file_path).map_err(|e| format!("Failed to read PDF file: {}", e))?;

    let folder_id = parent_folder_id.unwrap_or_default();
    if folder_id.trim().is_empty() {
        let client = reqwest::Client::new();
        let metadata = serde_json::json!({
            "name": file_name,
            "mimeType": "application/pdf"
        });

        let boundary = "foo_bar_baz_boundary";
        let mut body = Vec::new();
        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(b"Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.extend(metadata.to_string().as_bytes());
        body.extend(b"\r\n");
        body.extend(format!("--{}\r\n", boundary).as_bytes());
        body.extend(b"Content-Type: application/pdf\r\n\r\n");
        body.extend(&pdf_bytes);
        body.extend(b"\r\n");
        body.extend(format!("--{}\r\n", boundary).as_bytes());

        let res = client
            .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .bearer_auth(access_token)
            .header("Content-Type", format!("multipart/related; boundary={}", boundary))
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Network request to Google Drive failed: {}", e))?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(format!("Drive API upload error: {}", err));
        }

        let body_text = res.text().await.unwrap_or_default();
        Ok(body_text)
    } else {
        upsert_drive_file(
            &access_token,
            &folder_id,
            &file_name,
            "application/pdf",
            "application/pdf",
            &pdf_bytes,
        )
        .await
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_schema",
        sql: "
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            tax_id TEXT NOT NULL,
            legal_address TEXT NOT NULL,
            default_currency TEXT NOT NULL DEFAULT 'GEL',
            default_payment_terms TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            account_label TEXT NOT NULL,
            beneficiary_name TEXT NOT NULL,
            bank_name TEXT NOT NULL,
            bank_address TEXT,
            iban TEXT NOT NULL,
            swift_bic TEXT NOT NULL,
            intermediary_bank_name TEXT,
            intermediary_swift TEXT,
            is_default BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS counterparties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            tax_id TEXT NOT NULL,
            director_name TEXT,
            legal_address TEXT NOT NULL,
            actual_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE,
            counterparty_id INTEGER NOT NULL REFERENCES counterparties(id),
            bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
            currency TEXT NOT NULL,
            total_amount REAL NOT NULL,
            amount_in_words TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'ISSUED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            item_order INTEGER NOT NULL,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity REAL NOT NULL,
            amount REAL NOT NULL
        );
        ",
        kind: MigrationKind::Up,
    }, Migration {
        version: 2,
        description: "add_default_payment_terms_to_profiles",
        sql: "ALTER TABLE profiles ADD COLUMN default_payment_terms TEXT;",
        kind: MigrationKind::Up,
    }, Migration {
        version: 3,
        description: "purge_dummy_seed_data",
        sql: "
        DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE bank_account_id IN (SELECT id FROM bank_accounts WHERE iban = 'GE00BG0000000000000000'));
        DELETE FROM invoices WHERE bank_account_id IN (SELECT id FROM bank_accounts WHERE iban = 'GE00BG0000000000000000');
        DELETE FROM bank_accounts WHERE iban = 'GE00BG0000000000000000' OR account_label LIKE '%Main Bank Account%';
        DELETE FROM counterparties WHERE tax_id = '987654321' OR business_name = 'Acme Client Corporation';
        DELETE FROM profiles WHERE tax_id = '123456789' AND business_name = 'Your Business Name';
        ",
        kind: MigrationKind::Up,
    }, Migration {
        version: 4,
        description: "add_custom_typst_template_to_profiles",
        sql: "ALTER TABLE profiles ADD COLUMN custom_typst_template TEXT;",
        kind: MigrationKind::Up,
    }, Migration {
        version: 5,
        description: "add_paid_date_to_invoices",
        sql: "ALTER TABLE invoices ADD COLUMN paid_date TEXT;",
        kind: MigrationKind::Up,
    }, Migration {
        version: 6,
        description: "add_email_to_profiles",
        sql: "ALTER TABLE profiles ADD COLUMN email TEXT;",
        kind: MigrationKind::Up,
    }, Migration {
        version: 7,
        description: "add_email_to_counterparties",
        sql: "ALTER TABLE counterparties ADD COLUMN email TEXT;",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:invoices.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            generate_pdf_command,
            start_google_oauth,
            upload_pdf_to_google_drive,
            get_or_create_drive_folder,
            export_csv_to_google_sheet,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
