export interface InvoiceTemplate {
  id: string
  name: string
  description: string
  badge: string
  accentColor: string
  typstMarkup: string
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Professional',
    description: 'Clean, balanced corporate layout with slate gray typography and structured grid borders.',
    badge: 'Default',
    accentColor: '#10b981',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1.35fr, 0.65fr),
  align: (left, right),
  [
    #text(size: 14pt, weight: "bold", fill: rgb("0f172a"))[{{seller_name}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Tax ID: {{seller_tax_id}} \\
      {{seller_address}}
    ]
  ],
  [
    #text(size: 22pt, weight: "bold", fill: rgb("10b981"))[INVOICE] \\
    #v(2pt)
    #text(size: 10.5pt, weight: "bold")[Invoice No. {{invoice_number}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Issue Date: {{issue_date}} \\
      Due Date: {{due_date}}
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
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[INVOICE TO:] \\
    #v(2pt)
    #text(weight: "bold", size: 10.5pt)[{{buyer_name}}] \\
    #text(size: 8.5pt, fill: rgb("334155"))[
      Tax ID: {{buyer_tax_id}} \\
      {{buyer_director}}
      Address: {{buyer_address}}
    ]
  ],
  [
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[PAYMENT DETAILS:] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("334155"))[
      Bank: {{bank_name}} \\
      Beneficiary: {{bank_beneficiary}} \\
      IBAN: #raw("{{bank_iban}}") \\
      SWIFT/BIC: #raw("{{bank_swift}}") \\
      {{intermediary_info}}
    ]
  ]
)

#v(16pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("f8fafc") } else if calc.even(y) { rgb("f8fafc") } else { none },
  stroke: 0.5pt + rgb("e2e8f0"),
  [ *Description* ], [ *Qty (Units)* ], [ *Unit Price* ], [ *Net Price* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 13pt, weight: "bold", fill: rgb("10b981"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 0.5pt + rgb("e2e8f0"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("334155"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(40pt)

#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("64748b"))[Authorized Signature / Issuer]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("64748b"))[Client Acceptance / Stamp]
  ]
)
`,
  },
  {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    description: 'Vibrant emerald styling with soft tinted table headers, prominent header banner, and modern status pill.',
    badge: 'Popular',
    accentColor: '#059669',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#rect(
  width: 100%,
  fill: rgb("047857"),
  radius: 6pt,
  inset: (x: 16pt, y: 14pt)
)[
  #grid(
    columns: (1.3fr, 0.7fr),
    align: (left, right),
    [
      #text(size: 16pt, weight: "bold", fill: rgb("ffffff"))[{{seller_name}}] \\
      #v(2pt)
      #text(size: 8.5pt, fill: rgb("a7f3d0"))[
        Tax ID: {{seller_tax_id}} | {{seller_address}}
      ]
    ],
    [
      #text(size: 20pt, weight: "bold", fill: rgb("ffffff"))[INVOICE] \\
      #text(size: 9.5pt, weight: "medium", fill: rgb("ecfdf5"))[No. {{invoice_number}}]
    ]
  )
]

#v(10pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 15pt,
  [
    #rect(width: 100%, fill: rgb("f0fdf4"), radius: 4pt, inset: 10pt)[
      #text(weight: "bold", fill: rgb("047857"), size: 8pt)[BILLED TO] \\
      #v(2pt)
      #text(weight: "bold", size: 10pt)[{{buyer_name}}] \\
      #text(size: 8.5pt, fill: rgb("334155"))[
        Tax ID: {{buyer_tax_id}} \\
        {{buyer_director}}
        Address: {{buyer_address}}
      ]
    ]
  ],
  [
    #rect(width: 100%, fill: rgb("f8fafc"), radius: 4pt, inset: 10pt)[
      #text(size: 8.5pt, fill: rgb("334155"))[
        *Issue Date:* {{issue_date}} \\
        *Due Date:* {{due_date}} \\
        *Bank:* {{bank_name}} \\
        *IBAN:* #raw("{{bank_iban}}")
      ]
    ]
  ]
)

#v(12pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("d1fae5") } else if calc.even(y) { rgb("f0fdf4") } else { none },
  stroke: 0.5pt + rgb("a7f3d0"),
  [ *#text(fill: rgb("065f46"))[Description]* ], [ *#text(fill: rgb("065f46"))[Qty]* ], [ *#text(fill: rgb("065f46"))[Unit Price]* ], [ *#text(fill: rgb("065f46"))[Net Price]* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Total Payable:* ], [ *#text(size: 14pt, weight: "bold", fill: rgb("047857"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 0.5pt + rgb("a7f3d0"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("065f46"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(35pt)
#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("059669"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("047857"))[Authorized Signature]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("059669"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("047857"))[Client Stamp]
  ]
)
`,
  },
  {
    id: 'executive_indigo',
    name: 'Executive Indigo',
    description: 'Dark indigo header banner, formal corporate styling, double-line rules, and high contrast detail sections.',
    badge: 'Executive',
    accentColor: '#3730a3',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1.4fr, 0.6fr),
  align: (left, right),
  [
    #text(size: 15pt, weight: "bold", fill: rgb("1e1b4b"))[{{seller_name}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("4338ca"))[
      Tax ID: {{seller_tax_id}} \\
      {{seller_address}}
    ]
  ],
  [
    #block(
      fill: rgb("1e1b4b"),
      inset: (x: 12pt, y: 8pt),
      radius: 4pt
    )[
      #text(size: 16pt, weight: "bold", fill: rgb("ffffff"))[INVOICE] \\
      #text(size: 9pt, fill: rgb("c7d2fe"))[#raw("{{invoice_number}}")]
    ]
  ]
)

#v(10pt)
#line(length: 100%, stroke: 1.5pt + rgb("312e81"))
#v(10pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #text(weight: "bold", fill: rgb("312e81"), size: 8.5pt)[CLIENT DETAILS] \\
    #v(3pt)
    #text(weight: "bold", size: 10pt)[{{buyer_name}}] \\
    #text(size: 8.5pt, fill: rgb("334155"))[
      Tax ID: {{buyer_tax_id}} \\
      {{buyer_director}}
      Address: {{buyer_address}}
    ]
  ],
  [
    #text(weight: "bold", fill: rgb("312e81"), size: 8.5pt)[REMITTANCE INSTRUCTIONS] \\
    #v(3pt)
    #text(size: 8.5pt, fill: rgb("334155"))[
      Bank: {{bank_name}} \\
      Beneficiary: {{bank_beneficiary}} \\
      IBAN: #raw("{{bank_iban}}") \\
      SWIFT/BIC: #raw("{{bank_swift}}") \\
      {{intermediary_info}}
    ]
  ]
)

#v(14pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("e0e7ff") } else { none },
  stroke: 0.5pt + rgb("c7d2fe"),
  [ *#text(fill: rgb("1e1b4b"))[Service Description]* ], [ *#text(fill: rgb("1e1b4b"))[Quantity]* ], [ *#text(fill: rgb("1e1b4b"))[Rate]* ], [ *#text(fill: rgb("1e1b4b"))[Amount]* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 14pt, weight: "bold", fill: rgb("1e1b4b"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 1pt + rgb("312e81"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("312e81"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(40pt)
#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("312e81"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("312e81"))[Issuer Authorization]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("312e81"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("312e81"))[Recipient Signature]
  ]
)
`,
  },
  {
    id: 'formal_corporate',
    name: 'Formal Corporate',
    description: 'European / UK corporate standard layout with right-aligned seller header, centered bold INVOICE title, heavy table borders, and remittance box.',
    badge: 'Formal',
    accentColor: '#1e293b',
    typstMarkup: `#set page(
  paper: "a4",
  margin: (x: 1.8cm, top: 2.0cm, bottom: 2.2cm),
  footer: align(center)[
    #text(size: 8pt, fill: rgb("475569"))[
      Individual Entrepreneur {{seller_name}} | Registered Office: {{seller_address}} \\
      Registered Tax ID / INN: {{seller_tax_id}}
    ]
  ]
)
#set text(size: 9.5pt)

#align(right)[
  #text(weight: "bold", size: 10pt)[{{seller_name}}] \\
  #v(2pt)
  #text(size: 9pt, fill: rgb("334155"))[{{seller_address}}]
]

#v(20pt)

#align(center)[
  #text(size: 14pt, weight: "bold")[INVOICE]
]

#v(15pt)

#grid(
  columns: (1.2fr, 0.8fr),
  align: (left, right),
  [
    #text(weight: "bold", size: 10pt)[{{buyer_name}}] \\
    #text(size: 9pt, fill: rgb("334155"))[
      Tax ID: {{buyer_tax_id}} \\
      {{buyer_director}}
      {{buyer_address}}
    ]
  ],
  [
    #text(size: 9.5pt)[
      *Invoice No.* {{invoice_number}} \\
      *Invoice Date:* {{issue_date}} \\
      *Due Date:* {{due_date}}
    ]
  ]
)

#v(15pt)

#table(
  columns: (1fr, 75pt, 80pt, 85pt),
  align: (left, center, right, right),
  stroke: 1pt + rgb("000000"),
  [ *Description* ], [ *Quantity (Units)* ], [ *Unit Price* ], [ *Net Price* ],
{{items_table_rows}})

#v(4pt)

#align(right)[
  #table(
    columns: (90pt, 95pt),
    align: (right, right),
    stroke: 1pt + rgb("000000"),
    [ *NET Total* ], [ {{currency_symbol}}{{total_amount}} ],
    [ *VAT* ], [ {{currency_symbol}}0.00 ],
    [ *Gross Total* ], [ *#text(weight: "bold")[{{currency_symbol}}{{total_amount}}]* ]
  )
]

#v(25pt)

#rect(
  width: 100%,
  stroke: 1pt + rgb("000000"),
  inset: 10pt
)[
  #text(size: 8.5pt)[
    *Payment Terms:* \
    Payments should be made within 20 working days of invoice using the following payment details: \
    BENEFICIARY: {{bank_beneficiary}} \
    BENEFICIARY BANK: {{bank_name}} \
    IBAN: #raw("{{bank_iban}}") \
    SWIFT/BIC: #raw("{{bank_swift}}") \
    {{intermediary_info}}
  ]
]
`,
  },
]

export const CUSTOM_TEMPLATES_KEY = 'user_custom_invoice_templates'

export function getCustomTemplates(): InvoiceTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to parse custom templates:', err)
    return []
  }
}

export function saveCustomTemplate(template: InvoiceTemplate): void {
  const existing = getCustomTemplates()
  const idx = existing.findIndex((t) => t.id === template.id)
  if (idx >= 0) {
    existing[idx] = template
  } else {
    existing.push(template)
  }
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(existing))
}

export function deleteCustomTemplate(id: string): void {
  const existing = getCustomTemplates().filter((t) => t.id !== id)
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(existing))
}
