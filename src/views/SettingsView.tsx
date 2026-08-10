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
} from 'lucide-react'

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
    })
    alert('Seller profile updated successfully!')
    loadData()
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
      alert('OAuth Error: ' + String(err))
    } finally {
      setIsOAuthRunning(false)
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings & Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your legal seller details, multiple bank accounts, default currency, and Google Drive OAuth.
        </p>
      </div>

      {/* 1. Seller Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Seller Business Profile
          </CardTitle>
          <CardDescription>
            Your legal business entity details rendered at the top of every generated invoice.
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

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSaveProfile} className="gap-2">
              <Save className="h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Multi-Bank Accounts Manager Card */}
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

      {/* 3. Google Drive Automatic Cloud Backup Card */}
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
              <Button
                onClick={handleGoogleOAuth}
                disabled={isOAuthRunning}
                className="gap-2 font-semibold shadow-xs"
              >
                {isOAuthRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                {googleAccessToken ? 'Re-authorize Google Drive' : 'Sign in with Google Drive'}
              </Button>

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
