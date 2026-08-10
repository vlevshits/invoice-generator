import { invoke } from '@tauri-apps/api/core'
import { getInvoices, getProfile } from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'

let isAutoSyncing = false

export async function performFullGoogleDriveSync(
  accessToken: string,
  folderName: string,
  onProgress?: (status: string) => void
): Promise<void> {
  if (!accessToken) {
    throw new Error('Google Drive is not connected. Please sign in first.')
  }

  onProgress?.('Locating / creating Drive folder...')
  const folderId: string = await invoke('get_or_create_drive_folder', {
    accessToken,
    folderName: folderName.trim() || 'Invoice Generator',
  })

  onProgress?.('Fetching invoices ledger data...')
  const invoices = await getInvoices()
  const profile = await getProfile()

  if (invoices.length === 0) {
    onProgress?.('No invoices found to sync.')
    return
  }

  // 1. Generate CSV summary for Google Sheet export (updates existing sheet without duplicates)
  onProgress?.('Updating Invoices Summary Google Sheet...')
  const csvHeaders =
    'Invoice Number,Issue Date,Due Date,Paid Date,Buyer Name,Buyer Tax ID,Currency,Total Amount,Status\n'
  const csvRows = invoices
    .map((inv) => {
      const buyerName = (inv.counterparty?.business_name || '').replace(/"/g, '""')
      const taxId = inv.counterparty?.tax_id || ''
      return `"${inv.invoice_number}","${inv.issue_date}","${inv.due_date || ''}","${
        inv.paid_date || ''
      }","${buyerName}","${taxId}","${inv.currency}",${inv.total_amount.toFixed(2)},"${inv.status}"`
    })
    .join('\n')

  const csvContent = csvHeaders + csvRows

  await invoke('export_csv_to_google_sheet', {
    accessToken,
    folderId,
    sheetName: 'Invoices Ledger Summary',
    csvContent,
  })

  // 2. Batch upload & replace invoice PDFs into the folder (updates existing files without duplicates)
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i]
    onProgress?.(`Syncing PDF (${i + 1}/${invoices.length}): ${inv.invoice_number}...`)

    const payload = {
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      paid_date: inv.paid_date,
      seller_name: profile?.business_name || 'Your Business Name',
      seller_tax_id: profile?.tax_id || '123456789',
      seller_address: profile?.legal_address || 'Address',
      buyer_name: inv.counterparty?.business_name || 'Buyer',
      buyer_tax_id: inv.counterparty?.tax_id || '',
      buyer_director: inv.counterparty?.director_name || '',
      buyer_address: inv.counterparty?.legal_address || '',
      bank_account_label: inv.bank_account?.account_label || 'Bank Account',
      bank_beneficiary: inv.bank_account?.beneficiary_name || '',
      bank_name: inv.bank_account?.bank_name || '',
      bank_address: inv.bank_account?.bank_address || '',
      bank_iban: inv.bank_account?.iban || '',
      bank_swift: inv.bank_account?.swift_bic || '',
      intermediary_bank: inv.bank_account?.intermediary_bank_name || '',
      intermediary_swift: inv.bank_account?.intermediary_swift || '',
      currency: inv.currency,
      total_amount: inv.total_amount,
      amount_in_words: inv.amount_in_words,
      notes: inv.notes,
      custom_typst_template: profile?.custom_typst_template,
      items: inv.items.map((it) => ({
        description: it.description,
        unit: it.unit,
        unit_price: it.unit_price,
        quantity: it.quantity,
        amount: it.amount,
      })),
    }

    const pdfPath: string = await invoke('generate_pdf_command', {
      payload,
      targetPath: null,
    })

    const fileName = `Invoice_${inv.invoice_number}.pdf`
    await invoke('upload_pdf_to_google_drive', {
      accessToken,
      filePath: pdfPath,
      fileName,
      parentFolderId: folderId,
    })
  }

  onProgress?.('Full Google Drive Sync completed successfully!')
}

export async function autoSyncGoogleDriveIfConnected(): Promise<void> {
  const store = useAppStore.getState()
  if (!store.googleAccessToken || isAutoSyncing) return

  try {
    isAutoSyncing = true
    await performFullGoogleDriveSync(
      store.googleAccessToken,
      store.googleDriveFolderName || 'Invoice Generator'
    )
  } catch (err) {
    console.error('Auto Drive sync background notice:', err)
  } finally {
    isAutoSyncing = false
  }
}
