import { useState, useEffect } from 'react'
import type { Profile, BankAccount, Currency } from '@/types'
import {
  getProfile,
  saveProfile,
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
} from '@/lib/db'
import {
  useAppStore,
  getActiveGoogleClientId,
  getActiveGoogleClientSecret,
} from '@/store/useAppStore'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Building,
  Landmark,
  Plus,
  Trash2,
  Edit,
  Save,
  Cloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCode,
  RotateCcw,
} from 'lucide-react'

export const DEFAULT_TYPST_TEMPLATE = `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(size: 15pt, weight: "bold", fill: rgb("0f172a"))[{{seller_name}}] \\
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

#v(10pt)

#align(right)[
  #block(width: 220pt)[
    #grid(
      columns: (1fr, 1fr),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 12pt, weight: "bold", fill: rgb("10b981"))[{{currency_symbol}}{{total_amount}}]* ]
    )
  ]
]

#v(10pt)
#rect(width: 100%, fill: rgb("f1f5f9"), inset: 8pt, radius: 4pt)[
  #text(size: 8.5pt, weight: "medium", fill: rgb("334155"))[
    *Amount in words:* {{amount_in_words}}
  ]
]

{{notes}}

#v(40pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 40pt,
  align: center,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(4pt)
    #text(size: 8.5pt, weight: "medium")[Seller Signature] \\
    #text(size: 7.5pt, fill: rgb("64748b"))[({{seller_name}})]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(4pt)
    #text(size: 8.5pt, weight: "medium")[Buyer Signature] \\
    #text(size: 7.5pt, fill: rgb("64748b"))[({{buyer_name}})]
  ]
)`

export function SettingsView() {
  const {
    googleAccessToken,
    googleClientId,
    googleClientSecret,
    setGoogleAccessToken,
    setGoogleClientId,
    setGoogleClientSecret,
  } = useAppStore()

  // Seller Profile Form
  const [businessName, setBusinessName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('GEL')
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('')
  const [customTypstTemplate, setCustomTypstTemplate] = useState('')

  // Bank Accounts List
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [isOpenBankModal, setIsOpenBankModal] = useState(false)

  // Bank Account Modal Form
  const [editingBankId, setEditingBankId] = useState<number | null>(null)
  const [accountLabel, setAccountLabel] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAddress, setBankAddress] = useState('')
  const [iban, setIban] = useState('')
  const [swiftBic, setSwiftBic] = useState('')
  const [intermediaryBankName, setIntermediaryBankName] = useState('')
  const [intermediarySwift, setIntermediarySwift] = useState('')
  const [isDefaultBank, setIsDefaultBank] = useState(false)

  const [isOAuthRunning, setIsOAuthRunning] = useState(false)
  const [customClientIdInput, setCustomClientIdInput] = useState(googleClientId)
  const [customClientSecretInput, setCustomClientSecretInput] = useState(googleClientSecret)

  const loadData = async () => {
    const [p, bList] = await Promise.all([getProfile(), getBankAccounts()])
    if (p) {
      setBusinessName(p.business_name)
      setTaxId(p.tax_id)
      setLegalAddress(p.legal_address)
      setDefaultCurrency(p.default_currency)
      setDefaultPaymentTerms(p.default_payment_terms || '')
      setCustomTypstTemplate(p.custom_typst_template || DEFAULT_TYPST_TEMPLATE)
    } else {
      setCustomTypstTemplate(DEFAULT_TYPST_TEMPLATE)
    }
    setBankAccounts(bList)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveProfile = async () => {
    await saveProfile({
      business_name: businessName,
      tax_id: taxId,
      legal_address: legalAddress,
      default_currency: defaultCurrency,
      default_payment_terms: defaultPaymentTerms,
      custom_typst_template: customTypstTemplate,
    })
    alert('Settings & Invoice Template updated successfully!')
    loadData()
  }

  const handleResetTemplate = () => {
    if (confirm('Reset invoice template back to standard default layout?')) {
      setCustomTypstTemplate(DEFAULT_TYPST_TEMPLATE)
    }
  }

  const handleOpenAddBank = () => {
    setEditingBankId(null)
    setAccountLabel('Bank of Georgia EUR')
    setBeneficiaryName(businessName || 'Your Business Name')
    setBankName('')
    setBankAddress('')
    setIban('')
    setSwiftBic('')
    setIntermediaryBankName('')
    setIntermediarySwift('')
    setIsDefaultBank(bankAccounts.length === 0)
    setIsOpenBankModal(true)
  }

  const handleOpenEditBank = (b: BankAccount) => {
    setEditingBankId(b.id)
    setAccountLabel(b.account_label)
    setBeneficiaryName(b.beneficiary_name)
    setBankName(b.bank_name)
    setBankAddress(b.bank_address || '')
    setIban(b.iban)
    setSwiftBic(b.swift_bic)
    setIntermediaryBankName(b.intermediary_bank_name || '')
    setIntermediarySwift(b.intermediary_swift || '')
    setIsDefaultBank(b.is_default)
    setIsOpenBankModal(true)
  }

  const handleSaveBank = async () => {
    if (!accountLabel || !beneficiaryName || !bankName || !iban || !swiftBic) return

    await saveBankAccount({
      id: editingBankId || undefined,
      account_label: accountLabel,
      beneficiary_name: beneficiaryName,
      bank_name: bankName,
      bank_address: bankAddress || undefined,
      iban: iban,
      swift_bic: swiftBic,
      intermediary_bank_name: intermediaryBankName || undefined,
      intermediary_swift: intermediarySwift || undefined,
      is_default: isDefaultBank,
    })

    setIsOpenBankModal(false)
    loadData()
  }

  const handleDeleteBank = async (id: number) => {
    if (confirm('Delete this bank account?')) {
      await deleteBankAccount(id)
      loadData()
    }
  }

  const handleGoogleOAuth = async () => {
    const activeClientId = getActiveGoogleClientId(customClientIdInput)
    const activeClientSecret = getActiveGoogleClientSecret(customClientSecretInput)

    try {
      setIsOAuthRunning(true)
      const tokens: any = await invoke('start_google_oauth', {
        clientId: activeClientId,
        clientSecret: activeClientSecret,
      })
      if (tokens && tokens.access_token) {
        setGoogleAccessToken(tokens.access_token)
        if (customClientIdInput) setGoogleClientId(customClientIdInput)
        if (customClientSecretInput) setGoogleClientSecret(customClientSecretInput)
        alert('Google Drive authorization successful!')
      }
    } catch (err: any) {
      alert('Google OAuth login notice: ' + String(err))
    } finally {
      setIsOAuthRunning(false)
    }
  }

  const handleCancelOAuth = () => {
    setIsOAuthRunning(false)
  }

  const templateVariables = [
    '{{seller_name}}',
    '{{seller_tax_id}}',
    '{{seller_address}}',
    '{{buyer_name}}',
    '{{buyer_tax_id}}',
    '{{buyer_address}}',
    '{{invoice_number}}',
    '{{issue_date}}',
    '{{due_date}}',
    '{{bank_name}}',
    '{{bank_beneficiary}}',
    '{{bank_iban}}',
    '{{bank_swift}}',
    '{{items_table_rows}}',
    '{{currency_symbol}}',
    '{{total_amount}}',
    '{{amount_in_words}}',
    '{{notes}}',
  ]

  return (
    <div className="space-y-6 p-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings & Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your legal seller details, default payment terms, custom PDF layout template, bank accounts, and Google Drive.
        </p>
      </div>

      {/* 1. Seller Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Seller Business Profile & Payment Terms
          </CardTitle>
          <CardDescription>
            Your legal business entity details and default payment terms rendered on generated invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Legal Business Name *
              </label>
              <Input
                placeholder="e.g. Acme Business Solutions LLC"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Tax ID / Personal ID / INN / TIN *
              </label>
              <Input
                mono
                placeholder="e.g. 123456789"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Legal Address *
            </label>
            <Input
              placeholder="e.g. 123 Main Street, Suite 100, City, Country"
              value={legalAddress}
              onChange={(e) => setLegalAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              App-Level Default Currency
            </label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
              className="w-48 h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono font-semibold"
            >
              <option value="GEL">GEL (Georgian Lari)</option>
              <option value="EUR">EUR (Euro €)</option>
              <option value="USD">USD (US Dollar $)</option>
              <option value="GBP">GBP (British Pound £)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Default Payment Terms & Invoice Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Payment due within 14 calendar days of invoice issuance. Please include invoice number in bank transfer description."
              value={defaultPaymentTerms}
              onChange={(e) => setDefaultPaymentTerms(e.target.value)}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground resize-y"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSaveProfile} className="gap-2">
              <Save className="h-4 w-4" />
              Save Profile & Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Custom Typst Invoice Template Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" />
              Custom PDF Invoice Template (Typst Markup)
            </CardTitle>
            <CardDescription>
              Customize your PDF layout using clean Typst markup. Dynamic placeholder tags are substituted automatically.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTemplate}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-2">
              Available Placeholder Variables:
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {templateVariables.map((v) => (
                <span key={v} className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={14}
              value={customTypstTemplate}
              onChange={(e) => setCustomTypstTemplate(e.target.value)}
              className="w-full rounded-md border border-input bg-muted/40 p-4 text-xs font-mono text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed resize-y"
              placeholder="Enter Typst markup template..."
            />
          </div>

          <div className="pt-1 flex justify-end">
            <Button onClick={handleSaveProfile} className="gap-2">
              <Save className="h-4 w-4" />
              Save Custom Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Multi-Bank Accounts Manager Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              Seller Bank Accounts
            </CardTitle>
            <CardDescription>
              Manage multi-bank accounts (GEL, EUR, USD) with IBAN, SWIFT, and optional Intermediary details.
            </CardDescription>
          </div>

          <Button onClick={handleOpenAddBank} size="sm" className="gap-1.5 border-dashed">
            <Plus className="h-4 w-4" />
            Add Bank Account
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {bankAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              No bank accounts configured yet. Click "Add Bank Account" to create your first bank profile.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground font-display">
                        {b.account_label}
                      </span>
                      {b.is_default && (
                        <Badge variant="paid" className="text-[10px] py-0">
                          Default
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenEditBank(b)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBank(b.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-muted-foreground">{b.bank_name}</p>
                  <p className="font-mono text-foreground font-semibold">IBAN: {b.iban}</p>
                  <p className="font-mono text-muted-foreground">SWIFT: {b.swift_bic}</p>

                  {b.intermediary_bank_name && (
                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Intermediary:</span>{' '}
                      {b.intermediary_bank_name} ({b.intermediary_swift})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Google Drive Automatic Cloud Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            Google Drive Automatic Cloud Backup
          </CardTitle>
          <CardDescription>
            One-click Google OAuth2 desktop authentication using local loopback PKCE listener and <code>drive.file</code> scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              {googleAccessToken ? (
                <Badge variant="paid" className="gap-1 px-3 py-1 text-xs">
                  <CheckCircle className="h-4 w-4" />
                  Google Drive Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 px-3 py-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Not Connected
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {googleAccessToken
                  ? 'Your account is linked. PDFs can be synced directly to your Drive.'
                  : 'Sign in to grant 1-click PDF upload permission.'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isOAuthRunning ? (
                <Button
                  variant="outline"
                  onClick={handleCancelOAuth}
                  className="gap-2 text-amber-500 border-amber-500/40 text-xs"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancel Waiting
                </Button>
              ) : (
                <Button
                  onClick={handleGoogleOAuth}
                  className="gap-2 font-semibold shadow-xs"
                >
                  <Cloud className="h-4 w-4" />
                  {googleAccessToken ? 'Re-authorize Google Drive' : 'Sign in with Google Drive'}
                </Button>
              )}

              {googleAccessToken && (
                <Button
                  variant="outline"
                  onClick={() => setGoogleAccessToken(null)}
                  className="text-destructive hover:text-destructive text-xs"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Bank Account Modal */}
      <Dialog open={isOpenBankModal} onOpenChange={setIsOpenBankModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBankId ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
            <DialogDescription>
              Bank details populated on generated invoices. Multi-currency supported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Account Label *</label>
                <Input
                  placeholder="e.g. Bank of Georgia GEL"
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Beneficiary Name *</label>
                <Input
                  placeholder="e.g. Your Business Name"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Bank Name *</label>
                <Input
                  placeholder="e.g. Bank of Georgia"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Bank Address</label>
                <Input
                  placeholder="e.g. Tbilisi, Georgia"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">IBAN *</label>
                <Input
                  mono
                  placeholder="e.g. GE00BG0000000000000000"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">SWIFT / BIC *</label>
                <Input
                  mono
                  placeholder="e.g. BAGAGE22"
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Optional Intermediary Bank Details
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Intermediary Bank Name
                  </label>
                  <Input
                    placeholder="e.g. Commerzbank AG"
                    value={intermediaryBankName}
                    onChange={(e) => setIntermediaryBankName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Intermediary SWIFT
                  </label>
                  <Input
                    mono
                    placeholder="e.g. COBADEFF"
                    value={intermediarySwift}
                    onChange={(e) => setIntermediarySwift(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefaultBank"
                checked={isDefaultBank}
                onChange={(e) => setIsDefaultBank(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="isDefaultBank" className="text-xs font-medium text-foreground cursor-pointer">
                Set as default bank account for new invoices
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenBankModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBank}
              disabled={!accountLabel || !beneficiaryName || !bankName || !iban || !swiftBic}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save Bank Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
