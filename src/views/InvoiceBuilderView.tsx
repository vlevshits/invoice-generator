import { useState, useEffect } from 'react'
import type {
  Profile,
  BankAccount,
  Counterparty,
  InvoiceItem,
  Currency,
  InvoiceStatus,
} from '@/types'
import {
  getProfile,
  getBankAccounts,
  getCounterparties,
  getNextInvoiceNumber,
  saveInvoice,
} from '@/lib/db'
import { numberToWords } from '@/lib/numberToWords'
import { useAppStore } from '@/store/useAppStore'
import { invoke } from '@tauri-apps/api/core'
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CounterpartyCombobox } from '@/components/domain/CounterpartyCombobox'
import { BankAccountSelector } from '@/components/domain/BankAccountSelector'
import { LineItemsEditor } from '@/components/domain/LineItemsEditor'
import { AmountInWordsBadge } from '@/components/domain/AmountInWordsBadge'
import { LiveInvoicePreview } from '@/components/domain/LiveInvoicePreview'
import { DriveSyncBadge } from '@/components/domain/DriveSyncBadge'
import { ArrowLeft, Save, Download, FileText } from 'lucide-react'

export function InvoiceBuilderView() {
  const { setCurrentView, editingInvoice } = useAppStore()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null)
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null)
  const [currency, setCurrency] = useState<Currency>('GEL')
  const [status, setStatus] = useState<InvoiceStatus>('ISSUED')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      item_order: 1,
      description: 'Consulting Services',
      unit: 'Services',
      unit_price: 1400,
      quantity: 1,
      amount: 1400,
    },
  ])

  const [generatedPdfPath, setGeneratedPdfPath] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadInitialData = async () => {
    const [p, bList, cList] = await Promise.all([
      getProfile(),
      getBankAccounts(),
      getCounterparties(),
    ])
    setProfile(p)
    setBankAccounts(bList)
    setCounterparties(cList)

    if (p && p.default_currency) {
      setCurrency(p.default_currency)
    }

    if (bList.length > 0) {
      const def = bList.find((b) => b.is_default) || bList[0]
      setSelectedBankAccount(def)
    }

    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoice_number)
      setIssueDate(editingInvoice.issue_date)
      setDueDate(editingInvoice.due_date || '')
      setCurrency(editingInvoice.currency)
      setStatus(editingInvoice.status)
      setNotes(editingInvoice.notes || '')
      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(editingInvoice.items)
      }

      if (editingInvoice.counterparty) {
        setSelectedCounterparty(editingInvoice.counterparty)
      } else if (cList.length > 0) {
        const found = cList.find((c) => c.id === editingInvoice.counterparty_id)
        if (found) setSelectedCounterparty(found)
      }

      if (editingInvoice.bank_account) {
        setSelectedBankAccount(editingInvoice.bank_account)
      } else if (bList.length > 0) {
        const found = bList.find((b) => b.id === editingInvoice.bank_account_id)
        if (found) setSelectedBankAccount(found)
      }
    } else {
      if (p && p.default_payment_terms) {
        setNotes(p.default_payment_terms)
      }
      const num = await getNextInvoiceNumber(issueDate)
      setInvoiceNumber(num)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Recalculate invoice number if issue date changes on new invoice
  const handleIssueDateChange = async (newDate: string) => {
    setIssueDate(newDate)
    if (!editingInvoice) {
      const num = await getNextInvoiceNumber(newDate)
      setInvoiceNumber(num)
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const amountInWords = numberToWords(totalAmount, currency)

  const handleSaveInvoice = async (): Promise<number | null> => {
    if (!selectedCounterparty) {
      alert('Please select a counterparty (buyer).')
      return null
    }
    if (!selectedBankAccount) {
      alert('Please select a seller bank account.')
      return null
    }

    try {
      setIsSaving(true)
      const savedId = await saveInvoice(
        {
          id: editingInvoice?.id,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || undefined,
          counterparty_id: selectedCounterparty.id,
          bank_account_id: selectedBankAccount.id,
          currency,
          total_amount: totalAmount,
          amount_in_words: amountInWords,
          notes: notes || undefined,
          status,
        },
        items
      )
      return savedId
    } catch (err: any) {
      alert('Failed to save invoice: ' + String(err))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPdf = async () => {
    const savedId = await handleSaveInvoice()
    if (!savedId) return

    try {
      const defaultName = `Invoice_${invoiceNumber}.pdf`
      const targetPath = await saveFileDialog({
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      })

      if (!targetPath) return

      const payload = {
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        seller_name: profile?.business_name || 'Your Business Name',
        seller_tax_id: profile?.tax_id || '123456789',
        seller_address: profile?.legal_address || '123 Main Street, Suite 100, City, Country',
        buyer_name: selectedCounterparty!.business_name,
        buyer_tax_id: selectedCounterparty!.tax_id,
        buyer_director: selectedCounterparty!.director_name,
        buyer_address: selectedCounterparty!.legal_address,
        bank_account_label: selectedBankAccount!.account_label,
        bank_beneficiary: selectedBankAccount!.beneficiary_name,
        bank_name: selectedBankAccount!.bank_name,
        bank_address: selectedBankAccount!.bank_address,
        bank_iban: selectedBankAccount!.iban,
        bank_swift: selectedBankAccount!.swift_bic,
        intermediary_bank: selectedBankAccount!.intermediary_bank_name,
        intermediary_swift: selectedBankAccount!.intermediary_swift,
        currency,
        total_amount: totalAmount,
        amount_in_words: amountInWords,
        notes,
        items: items.map((it) => ({
          description: it.description,
          unit: it.unit,
          unit_price: it.unit_price,
          quantity: it.quantity,
          amount: it.amount,
        })),
      }

      const generatedPath: any = await invoke('generate_pdf_command', {
        payload,
        targetPath,
      })

      setGeneratedPdfPath(generatedPath)
      alert(`Invoice PDF exported & saved successfully to:\n${generatedPath}`)
    } catch (err: any) {
      alert('Typst PDF generation error: ' + String(err))
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('ledger')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ledger
          </Button>
          <div className="h-4 w-px bg-border" />
          <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            <span className="font-mono text-xs text-emerald-500 font-normal">
              ({invoiceNumber})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <DriveSyncBadge invoiceNumber={invoiceNumber} pdfPath={generatedPdfPath || undefined} />

          <Button variant="outline" onClick={handleSaveInvoice} disabled={isSaving} className="gap-1.5">
            <Save className="h-4 w-4 text-slate-400" />
            Save Draft
          </Button>

          <Button onClick={handleExportPdf} className="gap-1.5 shadow-sm">
            <Download className="h-4 w-4" />
            Export & Save PDF
          </Button>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Controls & Input Forms */}
        <div className="col-span-12 lg:col-span-6 p-6 overflow-y-auto space-y-6 border-r border-border bg-background">
          <Card>
            <CardHeader className="py-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                1. Invoice Metadata & Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Invoice Number (YYYYMMDD-XX)
                </label>
                <Input
                  mono
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="20260810-01"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Currency Override
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono font-semibold"
                >
                  <option value="GEL">GEL (Georgian Lari)</option>
                  <option value="EUR">EUR (Euro €)</option>
                  <option value="USD">USD (US Dollar $)</option>
                  <option value="GBP">GBP (British Pound £)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Issue Date *
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Due Date (Optional)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Counterparty & Bank Account Selection */}
          <Card>
            <CardHeader className="py-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                2. Parties & Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <CounterpartyCombobox
                counterparties={counterparties}
                selectedId={selectedCounterparty?.id || null}
                onSelect={(cp) => setSelectedCounterparty(cp)}
                onRefresh={async () => {
                  const updated = await getCounterparties()
                  setCounterparties(updated)
                }}
              />

              <BankAccountSelector
                accounts={bankAccounts}
                selectedId={selectedBankAccount?.id || null}
                onSelect={(ba) => setSelectedBankAccount(ba)}
              />
            </CardContent>
          </Card>

          {/* Line Items Editor */}
          <Card>
            <CardHeader className="py-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                3. Line Items & Calculations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <LineItemsEditor items={items} currency={currency} onChange={setItems} />

              <AmountInWordsBadge amount={totalAmount} currency={currency} />
            </CardContent>
          </Card>

          {/* Notes & Status */}
          <Card>
            <CardHeader className="py-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                4. Notes & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Payment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono font-semibold"
                >
                  <option value="ISSUED">ISSUED</option>
                  <option value="PAID">PAID</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Notes / Terms (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Payment due within 14 days of invoice receipt."
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Live Visual Template Preview */}
        <div className="col-span-12 lg:col-span-6 p-6 bg-slate-950/40 overflow-y-auto">
          <LiveInvoicePreview
            invoiceNumber={invoiceNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            seller={profile}
            bankAccount={selectedBankAccount}
            buyer={selectedCounterparty}
            currency={currency}
            items={items}
            totalAmount={totalAmount}
            amountInWords={amountInWords}
            notes={notes}
          />
        </div>
      </div>
    </div>
  )
}
