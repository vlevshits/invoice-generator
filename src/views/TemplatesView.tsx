import { useState, useEffect } from 'react'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { readFile } from '@tauri-apps/plugin-fs'
import {
  INVOICE_TEMPLATES,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  type InvoiceTemplate,
} from '@/lib/templates'
import { getProfile, saveProfile, getBankAccounts, getCounterparties } from '@/lib/db'
import type { Profile, BankAccount, Counterparty } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDeleteModal } from '@/components/domain/ConfirmDeleteModal'
import {
  LayoutTemplate,
  CheckCircle,
  Sparkles,
  FileCode,
  RotateCcw,
  Plus,
  Copy,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export function TemplatesView() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(INVOICE_TEMPLATES[0])
  
  // Active editing state
  const [editingName, setEditingName] = useState<string>(INVOICE_TEMPLATES[0].name)
  const [editingMarkup, setEditingMarkup] = useState<string>(INVOICE_TEMPLATES[0].typstMarkup)
  const [isCompiling, setIsCompiling] = useState(false)
  const [svgPreview, setSvgPreview] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<InvoiceTemplate | null>(null)

  const reloadData = async () => {
    const [p, bList, cList] = await Promise.all([
      getProfile(),
      getBankAccounts(),
      getCounterparties(),
    ])
    setProfile(p)
    setBankAccounts(bList)
    setCounterparties(cList)
    const customList = getCustomTemplates()
    setCustomTemplates(customList)

    if (p?.custom_typst_template) {
      const allTemplates = [...INVOICE_TEMPLATES, ...customList]
      const matched = allTemplates.find(
        (t) => t.typstMarkup.trim() === p.custom_typst_template?.trim()
      )
      if (matched) {
        setSelectedTemplate(matched)
        setEditingName(matched.name)
        setEditingMarkup(matched.typstMarkup)
      } else {
        // Unmatched custom markup
        const userCustom: InvoiceTemplate = {
          id: 'active_custom',
          name: 'Active Custom Template',
          description: 'User saved custom template',
          badge: 'Custom',
          accentColor: '#6366f1',
          typstMarkup: p.custom_typst_template,
        }
        setSelectedTemplate(userCustom)
        setEditingName(userCustom.name)
        setEditingMarkup(p.custom_typst_template)
      }
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Sample data payload matching Rust GeneratePdfPayload struct
  const generateSamplePayload = () => {
    const primaryBank = bankAccounts[0]
    const primaryCounterparty = counterparties[0]

    return {
      seller_name: profile?.business_name || 'Teknos Solutions LLC',
      seller_tax_id: profile?.tax_id || '987654321',
      seller_address: profile?.legal_address || '42 Innovation Parkway, Tbilisi, Georgia',
      invoice_number: 'INV-2026.07.01-01',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '2026-08-25',
      buyer_name: primaryCounterparty?.business_name || 'Acme Enterprise Corp',
      buyer_tax_id: primaryCounterparty?.tax_id || '123456789',
      buyer_director: primaryCounterparty?.director_name
        ? primaryCounterparty.director_name
        : 'Johnathan Doe (Director)',
      buyer_address: primaryCounterparty?.legal_address || '100 Technology Plaza, San Francisco, CA',
      bank_account_label: primaryBank?.account_label || 'Main Corporate Account',
      bank_beneficiary: primaryBank?.beneficiary_name || profile?.business_name || 'Teknos Solutions LLC',
      bank_name: primaryBank?.bank_name || 'Bank of Georgia',
      bank_address: primaryBank?.bank_address || 'Tbilisi, Georgia',
      bank_iban: primaryBank?.iban || 'GE29BG0000000123456789',
      bank_swift: primaryBank?.swift_bic || 'BAGAGE22',
      intermediary_bank: primaryBank?.intermediary_bank_name || 'Citibank N.A.',
      intermediary_swift: primaryBank?.intermediary_swift || 'CITIUS33',
      currency: profile?.default_currency || 'USD',
      total_amount: 4250.0,
      amount_in_words: 'Four Thousand Two Hundred Fifty US Dollars',
      notes: 'Payment is due within 15 days of invoice date. Thank you for your business!',
      custom_typst_template: editingMarkup,
      items: [
        {
          description: 'Software Engineering & Architecture Services (Sprint 12)',
          unit: 'hrs',
          unit_price: 125.0,
          quantity: 30.0,
          amount: 3750.0,
        },
        {
          description: 'Cloud Infrastructure & Automated CI/CD Pipeline Setup',
          unit: 'fixed',
          unit_price: 500.0,
          quantity: 1.0,
          amount: 500.0,
        },
      ],
    }
  }

  // Recompile Typst SVG preview whenever editingMarkup changes
  useEffect(() => {
    let timer: NodeJS.Timeout
    const compilePreview = async () => {
      if (!editingMarkup.trim()) return
      setIsCompiling(true)
      setCompileError(null)

      try {
        const payload = generateSamplePayload()
        const svg: string = await invoke('compile_typst_to_svg', { payload })
        setSvgPreview(svg)
      } catch (err: any) {
        setCompileError(err.message || String(err))
      } finally {
        setIsCompiling(false)
      }
    }

    timer = setTimeout(compilePreview, 350)
    return () => clearTimeout(timer)
  }, [editingMarkup, profile])

  const handleSelectTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplate(t)
    setEditingName(t.name)
    setEditingMarkup(t.typstMarkup)
  }

  const handleCreateNewCustom = () => {
    const newId = `custom_${Date.now()}`
    const newTemplate: InvoiceTemplate = {
      id: newId,
      name: `Custom Template ${customTemplates.length + 1}`,
      description: 'Custom user-created invoice template',
      badge: 'Custom',
      accentColor: '#3b82f6',
      typstMarkup: INVOICE_TEMPLATES[0].typstMarkup,
    }
    saveCustomTemplate(newTemplate)
    setCustomTemplates(getCustomTemplates())
    handleSelectTemplate(newTemplate)
  }

  const handleDuplicateTemplate = () => {
    const newId = `custom_${Date.now()}`
    const duplicated: InvoiceTemplate = {
      id: newId,
      name: `${selectedTemplate.name} (Copy)`,
      description: `Copy of ${selectedTemplate.name}`,
      badge: 'Custom',
      accentColor: '#8b5cf6',
      typstMarkup: editingMarkup,
    }
    saveCustomTemplate(duplicated)
    setCustomTemplates(getCustomTemplates())
    handleSelectTemplate(duplicated)
  }

  const handleSaveCustomChanges = () => {
    if (!selectedTemplate.id.startsWith('custom_') && selectedTemplate.id !== 'active_custom') {
      // If user edits a preset, auto-create a custom copy for them
      handleDuplicateTemplate()
      return
    }

    const updated: InvoiceTemplate = {
      ...selectedTemplate,
      name: editingName,
      typstMarkup: editingMarkup,
    }
    saveCustomTemplate(updated)
    setCustomTemplates(getCustomTemplates())
    setSelectedTemplate(updated)
    alert(`Custom template "${editingName}" saved successfully!`)
  }

  const handleConfirmDeleteCustom = () => {
    if (!deleteTarget) return
    deleteCustomTemplate(deleteTarget.id)
    setDeleteTarget(null)
    const freshCustoms = getCustomTemplates()
    setCustomTemplates(freshCustoms)
    handleSelectTemplate(INVOICE_TEMPLATES[0])
  }

  const handleSetActive = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      await saveProfile({
        ...profile,
        custom_typst_template: editingMarkup,
      })
      const fresh = await getProfile()
      setProfile(fresh)
      alert(`Template "${editingName}" set as active for new invoices!`)
    } catch (err: any) {
      alert('Error setting active template: ' + String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setEditingMarkup(selectedTemplate.typstMarkup)
    setEditingName(selectedTemplate.name)
  }

  const allTemplates = [...INVOICE_TEMPLATES, ...customTemplates]
  const isActive =
    profile?.custom_typst_template?.trim() === editingMarkup.trim() ||
    (!profile?.custom_typst_template && selectedTemplate.id === 'standard')

  const isUserCustom =
    selectedTemplate.id.startsWith('custom_') || selectedTemplate.id === 'active_custom'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card px-8 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Invoice Templates Library
          </h2>
          <p className="text-xs text-muted-foreground">
            Create, duplicate, edit custom layouts, and preview live Typst PDF output.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewCustom}
            className="h-9 text-xs gap-1.5 font-semibold"
          >
            <Plus className="h-4 w-4 text-primary" />
            New Custom Template
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicateTemplate}
            className="h-9 text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>

          <Button
            onClick={handleSetActive}
            disabled={isSaving || isActive}
            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isActive ? 'Active Template' : 'Set as Active Template'}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-12 flex-1 overflow-hidden">
        {/* Left Column: Template Cards + Code Editor */}
        <div className="col-span-12 lg:col-span-5 border-r border-border p-6 flex flex-col space-y-6 overflow-y-auto bg-card/50">
          {/* Section 1: Template Presets & Custom Templates Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Available Templates ({allTemplates.length})
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[285px] overflow-y-auto pr-1">
              {allTemplates.map((t) => {
                const isSelected = selectedTemplate.id === t.id
                const isCurrentlyActive =
                  profile?.custom_typst_template?.trim() === t.typstMarkup.trim() ||
                  (!profile?.custom_typst_template && t.id === 'standard')

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          <h4 className="font-semibold text-xs text-foreground truncate">
                            {t.name}
                          </h4>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {t.badge}
                      </span>
                      {isCurrentlyActive && (
                        <Badge variant="paid" className="text-[9px] px-1.5 py-0">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Code & Template Settings Editor */}
          <div className="space-y-3 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between gap-2">
              {isUserCustom ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Template Name..."
                  className="font-semibold text-xs h-8 max-w-[200px]"
                />
              ) : (
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  Source Code: {selectedTemplate.name}
                </label>
              )}

              <div className="flex items-center gap-1.5">
                {isUserCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(selectedTemplate)}
                    className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveCustomChanges}
                  className="h-7 text-xs gap-1 px-2.5 font-semibold"
                >
                  <Save className="h-3.5 w-3.5 text-primary" />
                  {isUserCustom ? 'Save Changes' : 'Save as Custom Copy'}
                </Button>
              </div>
            </div>

            {isCompiling && (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Compiling live preview...
              </span>
            )}

            <textarea
              value={editingMarkup}
              onChange={(e) => setEditingMarkup(e.target.value)}
              rows={14}
              className="w-full flex-1 rounded-md border border-input bg-muted/40 p-4 text-xs font-mono text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed resize-none"
              placeholder="Edit Typst markup code..."
            />
          </div>
        </div>

        {/* Right Column: Live PDF Preview */}
        <div className="col-span-12 lg:col-span-7 bg-muted/20 p-6 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Live PDF Output Preview ({editingName})
            </span>

            {isActive && (
              <Badge variant="paid" className="gap-1 text-xs whitespace-nowrap">
                <CheckCircle className="h-3 w-3" /> Active
              </Badge>
            )}
          </div>

          {compileError ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs font-mono overflow-auto">
              <div className="space-y-2 text-center max-w-md">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                <p className="font-bold">Typst Compilation Error</p>
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
                <p className="text-xs text-muted-foreground">Rendering live Typst vector preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Custom Template"
        description={
          deleteTarget
            ? `Are you sure you want to delete custom template "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        onConfirm={handleConfirmDeleteCustom}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
