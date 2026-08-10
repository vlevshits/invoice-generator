import { useState, useEffect } from 'react'
import type {
  InvoiceWithDetails,
  Counterparty,
  BankAccount,
  InvoiceItem,
  Currency,
  InvoiceStatus,
  Profile,
} from '@/types'
import {
  getProfile,
  getBankAccounts,
  getCounterparties,
  saveInvoice,
  saveProfile,
  getNextInvoiceNumber,
  updateInvoiceStatus,
} from '@/lib/db'
import { getValidTransitions, type StateTransition } from '@/lib/invoiceStateMachine'
import { numberToWords } from '@/lib/numberToWords'
import { useAppStore } from '@/store/useAppStore'
import { DriveSyncBadge } from '@/components/domain/DriveSyncBadge'
import { CounterpartyCombobox } from '@/components/domain/CounterpartyCombobox'
import { BankAccountSelector } from '@/components/domain/BankAccountSelector'
import { LineItemsEditor } from '@/components/domain/LineItemsEditor'
import { AmountInWordsBadge } from '@/components/domain/AmountInWordsBadge'
import { RecordPaymentModal } from '@/components/domain/RecordPaymentModal'
import { TemplateLibraryModal } from '@/components/domain/TemplateLibraryModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  Download,
  FileText,
  CheckCircle2,
  RotateCcw,
  Mail,
  LayoutTemplate,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

export function InvoiceBuilderView() {
  const { setCurrentView, editingInvoice } = useAppStore()

  // App Profile & Selection Options
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [paidDate, setPaidDate] = useState<string | undefined>(editingInvoice?.paid_date)
  const [isOpenTemplateModal, setIsOpenTemplateModal] = useState(false)
  const [activeTemplateMarkup, setActiveTemplateMarkup] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('GEL')
  const [status, setStatus] = useState<InvoiceStatus>('DRAFT')
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null)
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      item_order: 1,
      description: 'Consulting Services',
      unit: 'Services',
      unit_price: 1000,
      quantity: 1,
      amount: 1000,
    },
  ])

  // PDF & Saving state
  const [generatedPdfPath, setGeneratedPdfPath] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Payment Date Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [pendingTargetStatus, setPendingTargetStatus] = useState<InvoiceStatus | null>(null)

  const loadInitialData = async () => {
    const [p, bList, cList] = await Promise.all([
      getProfile(),
      getBankAccounts(),
      getCounterparties(),
    ])
    setProfile(p)
    setBankAccounts(bList)
    setCounterparties(cList)
    if (p?.custom_typst_template) setActiveTemplateMarkup(p.custom_typst_template)

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
      setPaidDate(editingInvoice.paid_date)
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

  const handleIssueDateChange = async (newDate: string) => {
    setIssueDate(newDate)
    if (!editingInvoice) {
      const num = await getNextInvoiceNumber(newDate)
      setInvoiceNumber(num)
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const amountInWords = numberToWords(totalAmount, currency)

  const [svgPreview, setSvgPreview] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    const compile = async () => {
      try {
        setCompileError(null)
        const payload = {
          seller_name: profile?.business_name || 'Your Business Name',
          seller_tax_id: profile?.tax_id || '',
          seller_address: profile?.legal_address || '',
          invoice_number: invoiceNumber || 'INV-001',
          issue_date: issueDate || new Date().toISOString().split('T')[0],
          due_date: dueDate || '',
          buyer_name: selectedCounterparty?.business_name || 'Select Counterparty',
          buyer_tax_id: selectedCounterparty?.tax_id || '',
          buyer_director: selectedCounterparty?.director_name || '',
          buyer_address: selectedCounterparty?.legal_address || '',
          bank_account_label: selectedBankAccount?.account_label || '',
          bank_beneficiary: selectedBankAccount?.beneficiary_name || profile?.business_name || '',
          bank_name: selectedBankAccount?.bank_name || '',
          bank_address: selectedBankAccount?.bank_address || '',
          bank_iban: selectedBankAccount?.iban || '',
          bank_swift: selectedBankAccount?.swift_bic || '',
          intermediary_bank: selectedBankAccount?.intermediary_bank_name || '',
          intermediary_swift: selectedBankAccount?.intermediary_swift || '',
          currency: currency,
          total_amount: totalAmount,
          amount_in_words: amountInWords,
          notes: notes,
          custom_typst_template: activeTemplateMarkup || profile?.custom_typst_template || null,
          items: items.map((it) => ({
            description: it.description || '',
            unit: it.unit || '',
            unit_price: Number(it.unit_price) || 0,
            quantity: Number(it.quantity) || 0,
            amount: Number(it.amount) || 0,
          })),
        }
        const svg: string = await invoke('compile_typst_to_svg', { payload })
        setSvgPreview(svg)
      } catch (err: any) {
        setCompileError(err.message || String(err))
      }
    }

    timer = setTimeout(compile, 300)
    return () => clearTimeout(timer)
  }, [
    profile,
    invoiceNumber,
    issueDate,
    dueDate,
    selectedCounterparty,
    selectedBankAccount,
    currency,
    totalAmount,
    amountInWords,
    notes,
    items,
    activeTemplateMarkup,
  ])

  const handleSaveInvoice = async (forcedStatus?: InvoiceStatus, forcedPaidDate?: string): Promise<number | null> => {
    if (!selectedCounterparty) {
      alert('Please select a counterparty (buyer).')
      return null
    }
    if (!selectedBankAccount) {
      alert('Please select a seller bank account.')
      return null
    }

    const finalStatus = forcedStatus || status
    const finalPaidDate = forcedStatus === 'PAID' ? (forcedPaidDate || new Date().toISOString().split('T')[0]) : (forcedStatus ? undefined : paidDate)

    try {
      setIsSaving(true)
      const savedId = await saveInvoice(
        {
          id: editingInvoice?.id,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || undefined,
          paid_date: finalPaidDate,
          counterparty_id: selectedCounterparty.id,
          bank_account_id: selectedBankAccount.id,
          currency,
          total_amount: totalAmount,
          amount_in_words: amountInWords,
          notes: notes || undefined,
          status: finalStatus,
        },
        items
      )
      setStatus(finalStatus)
      if (finalPaidDate !== undefined) setPaidDate(finalPaidDate)
      return savedId
    } catch (err: any) {
      alert('Failed to save invoice: ' + String(err))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleStateTransition = async (transition: StateTransition) => {
    if (transition.requiresPaidDateModal) {
      setPendingTargetStatus(transition.targetStatus)
      setIsPaymentModalOpen(true)
      return
    }

    if (editingInvoice?.id) {
      await updateInvoiceStatus(editingInvoice.id, transition.targetStatus)
      setStatus(transition.targetStatus)
    } else {
      await handleSaveInvoice(transition.targetStatus)
    }
  }

  const handleConfirmPaidDateModal = async (selectedPaidDate: string) => {
    const target = pendingTargetStatus || 'PAID'
    if (editingInvoice?.id) {
      await updateInvoiceStatus(editingInvoice.id, target, selectedPaidDate)
      setStatus(target)
      setPaidDate(selectedPaidDate)
    } else {
      await handleSaveInvoice(target, selectedPaidDate)
    }
    setPendingTargetStatus(null)
  }

  const handleExportPdf = async () => {
    if (!selectedCounterparty || !selectedBankAccount) {
      alert('Please complete Buyer and Bank selection before exporting PDF.')
      return
    }

    const savedId = await handleSaveInvoice()
    if (!savedId) return

    try {
      const targetPath: string | null = await invoke('plugin:dialog|save', {
        options: {
          defaultPath: `Invoice_${invoiceNumber}.pdf`,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        },
      })

      if (!targetPath) return

      const payload = {
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        seller_name: profile?.business_name || 'Your Business Name',
        seller_tax_id: profile?.tax_id || '123456789',
        seller_address: profile?.legal_address || '123 Main Street, Suite 100, City, Country',
        buyer_name: selectedCounterparty.business_name,
        buyer_tax_id: selectedCounterparty.tax_id,
        buyer_director: selectedCounterparty.director_name,
        buyer_address: selectedCounterparty.legal_address,
        bank_account_label: selectedBankAccount.account_label,
        bank_beneficiary: selectedBankAccount.beneficiary_name,
        bank_name: selectedBankAccount.bank_name,
        bank_address: selectedBankAccount.bank_address,
        bank_iban: selectedBankAccount.iban,
        bank_swift: selectedBankAccount.swift_bic,
        intermediary_bank: selectedBankAccount.intermediary_bank_name,
        intermediary_swift: selectedBankAccount.intermediary_swift,
        currency,
        total_amount: totalAmount,
        amount_in_words: amountInWords,
        notes,
        custom_typst_template: activeTemplateMarkup || profile?.custom_typst_template,
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

  const handleSendEmail = async () => {
    if (!selectedCounterparty) {
      alert('Please select a buyer counterparty first.')
      return
    }

    let recipientEmail = selectedCounterparty.email
    if (!recipientEmail) {
      const inputEmail = prompt(
        `Enter email address for ${selectedCounterparty.business_name}:`
      )
      if (!inputEmail) return
      recipientEmail = inputEmail
    }

    const sellerName = profile?.business_name || 'Your Business Name'
    const subject = encodeURIComponent(`Invoice ${invoiceNumber} from ${sellerName}`)
    const bodyText = encodeURIComponent(
      `Dear ${selectedCounterparty.business_name},\n\nPlease find details for Invoice ${invoiceNumber} issued on ${issueDate}.\n\nTotal Amount: ${currency} ${totalAmount.toFixed(2)}\n\nBest regards,\n${sellerName}`
    )

    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${bodyText}`

    try {
      await invoke('plugin:opener|open_url', { url: mailtoUrl })
    } catch (_) {
      window.open(mailtoUrl, '_blank')
    }
  }

  const validTransitions = getValidTransitions(status)

  const getStatusBadge = (st: InvoiceStatus) => {
    if (st === 'PAID') {
      return <Badge variant="paid">PAID</Badge>
    }
    return <Badge variant="draft">DRAFT</Badge>
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
          {getStatusBadge(status)}
          {status === 'PAID' && paidDate && (
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
              Paid: {paidDate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* State Machine Action Controls */}
          {validTransitions.map((t) => (
            <Button
              key={t.targetStatus}
              onClick={() => handleStateTransition(t)}
              className={
                t.targetStatus === 'PAID'
                  ? 'h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs gap-1.5'
                  : 'h-9 px-4 text-xs font-semibold border border-border bg-card text-foreground hover:bg-accent gap-1.5'
              }
            >
              {t.targetStatus === 'PAID' && <CheckCircle2 className="h-4 w-4 text-white" />}
              {t.targetStatus === 'DRAFT' && <RotateCcw className="h-4 w-4 text-muted-foreground" />}
              {t.label}
            </Button>
          ))}

          <Button
            variant="outline"
            onClick={() => handleSaveInvoice()}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-semibold gap-1.5 text-foreground"
          >
            <Save className="h-4 w-4 text-muted-foreground" />
            Save Draft
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpenTemplateModal(true)}
            className="h-9 text-xs font-semibold gap-1.5"
          >
            <LayoutTemplate className="h-4 w-4" />
            Template Library
          </Button>

          <Button
            variant="outline"
            onClick={handleSendEmail}
            className="h-9 px-4 text-xs font-semibold gap-1.5 text-foreground"
          >
            <Mail className="h-4 w-4 text-indigo-400" />
            Send via Email
          </Button>

          <Button onClick={handleExportPdf} className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs gap-1.5">
            <Download className="h-4 w-4 text-white" />
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

          {/* Notes */}
          <Card>
            <CardHeader className="py-3.5">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                4. Payment Terms & Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter payment instructions, terms or bank details note..."
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground resize-y"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Live PDF Vector Preview */}
        <div className="col-span-12 lg:col-span-6 bg-muted/20 p-6 overflow-hidden flex flex-col justify-between">
          {compileError ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs font-mono overflow-auto">
              <div className="space-y-2 text-center max-w-md">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                <p className="font-bold">Typst Preview Compilation Error</p>
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{compileError}</p>
              </div>
            </div>
          ) : svgPreview ? (
            <div className="flex-1 rounded-lg border border-border bg-slate-950/80 p-6 overflow-y-auto shadow-2xl flex justify-center items-start">
              <div
                className="bg-white text-slate-900 rounded-sm shadow-2xl w-full max-w-[640px] p-1 overflow-hidden border border-slate-300 [&_svg]:w-full [&_svg]:h-auto [&_svg]:block"
                dangerouslySetInnerHTML={{ __html: svgPreview }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-lg">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Rendering live Typst vector document preview...</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-4">
            Live preview rendered with dynamic Typst engine formatting.
          </p>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        invoiceNumber={invoiceNumber}
        totalAmount={totalAmount}
        currency={currency}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPendingTargetStatus(null)
        }}
        onConfirm={handleConfirmPaidDateModal}
      />

      {/* Template Library Modal */}
      <TemplateLibraryModal
        isOpen={isOpenTemplateModal}
        onClose={() => setIsOpenTemplateModal(false)}
        currentTemplateMarkup={activeTemplateMarkup || profile?.custom_typst_template || ''}
        onSelectTemplate={async (markup) => {
          setActiveTemplateMarkup(markup)
          if (profile?.id) {
            await saveProfile({
              ...profile,
              custom_typst_template: markup,
            })
          }
        }}
      />
    </div>
  )
}
