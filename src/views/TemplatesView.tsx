import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  INVOICE_TEMPLATES,
  type InvoiceTemplate,
} from '@/lib/templates'
import { getProfile, saveProfile } from '@/lib/db'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LayoutTemplate,
  CheckCircle,
  Sparkles,
  FileCode,
  RotateCcw,
  Save,
  Loader2,
  Copy,
  AlertCircle,
  Building2,
} from 'lucide-react'

export function TemplatesView() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(INVOICE_TEMPLATES[0])
  const [editingMarkup, setEditingMarkup] = useState<string>(INVOICE_TEMPLATES[0].typstMarkup)
  const [isCompiling, setIsCompiling] = useState(false)
  const [pdfPreviewPath, setPdfPreviewPath] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load Profile to know which template is active
  useEffect(() => {
    const load = async () => {
      const p = await getProfile()
      setProfile(p)
      if (p?.custom_typst_template) {
        // Match existing markup with preset if available
        const matched = INVOICE_TEMPLATES.find(
          (t) => t.typstMarkup.trim() === p.custom_typst_template?.trim()
        )
        if (matched) {
          setSelectedTemplate(matched)
          setEditingMarkup(matched.typstMarkup)
        } else {
          // User has custom template
          setEditingMarkup(p.custom_typst_template)
        }
      }
    }
    load()
  }, [])

  // Sample data payload for live preview compilation
  const generateSamplePayload = () => ({
    seller_name: profile?.business_name || 'Teknos Solutions LLC',
    seller_tax_id: profile?.tax_id || '987654321',
    seller_address: profile?.legal_address || '42 Innovation Parkway, Tbilisi, Georgia',
    invoice_number: 'INV-2026-0042',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '2026-08-25',
    buyer_name: 'Acme Enterprise Corp',
    buyer_tax_id: '123456789',
    buyer_director: 'Johnathan Doe (Director)',
    buyer_address: '100 Technology Plaza, San Francisco, CA',
    bank_name: 'Bank of Georgia',
    bank_beneficiary: profile?.business_name || 'Teknos Solutions LLC',
    bank_iban: 'GE29BG0000000123456789',
    bank_swift: 'BAGAGE22',
    intermediary_info: 'Intermediary: Citibank N.A. (CITIUS33)',
    currency_symbol: '$',
    total_amount: '4,250.00',
    amount_in_words: 'Four Thousand Two Hundred Fifty US Dollars',
    notes: 'Payment is due within 15 days of invoice date. Thank you for your business!',
    items: [
      {
        description: 'Software Engineering & Architecture Services (Sprint 12)',
        unit: 'hrs',
        unit_price: 125,
        quantity: 30,
        amount: 3750,
      },
      {
        description: 'Cloud Infrastructure & Automated CI/CD Pipeline Setup',
        unit: 'fixed',
        unit_price: 500,
        quantity: 1,
        amount: 500,
      },
    ],
  })

  // Recompile PDF preview whenever editingMarkup changes
  useEffect(() => {
    let timer: NodeJS.Timeout
    const compilePreview = async () => {
      if (!editingMarkup.trim()) return
      setIsCompiling(true)
      setCompileError(null)

      try {
        const payload = generateSamplePayload()
        const path: string = await invoke('compile_typst_template_preview_command', {
          template: editingMarkup,
          payload,
        })
        setPdfPreviewPath(path)
      } catch (err: any) {
        // Fallback to standard preview compile command if custom command doesn't exist
        try {
          const payload = generateSamplePayload()
          const path: string = await invoke('compile_typst_template', {
            template: editingMarkup,
            payload,
          })
          setPdfPreviewPath(path)
        } catch (innerErr: any) {
          setCompileError(innerErr.message || String(innerErr))
        }
      } finally {
        setIsCompiling(false)
      }
    }

    timer = setTimeout(compilePreview, 400)
    return () => clearTimeout(timer)
  }, [editingMarkup, profile])

  const handleSelectTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplate(t)
    setEditingMarkup(t.typstMarkup)
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
      alert(`Template "${selectedTemplate.name}" set as active for new invoices!`)
    } catch (err: any) {
      alert('Error setting active template: ' + String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setEditingMarkup(selectedTemplate.typstMarkup)
  }

  const isActive =
    profile?.custom_typst_template?.trim() === editingMarkup.trim() ||
    (!profile?.custom_typst_template && selectedTemplate.id === 'standard')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card px-8 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Invoice Templates & Designs
          </h2>
          <p className="text-xs text-muted-foreground">
            Browse built-in layouts, customize Typst markup, and see real-time PDF previews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Template Default
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
          {/* Section 1: Template Presets Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Template Library Presets
            </label>

            <div className="grid grid-cols-2 gap-3">
              {INVOICE_TEMPLATES.map((t) => {
                const isSelected = selectedTemplate.id === t.id
                const isCurrentlyActive =
                  profile?.custom_typst_template?.trim() === t.typstMarkup.trim() ||
                  (!profile?.custom_typst_template && t.id === 'standard')

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          <h4 className="font-semibold text-xs text-foreground truncate">
                            {t.name}
                          </h4>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">
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

          {/* Section 2: Code Editor */}
          <div className="space-y-2.5 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-primary" />
                Typst Markup Source Code
              </label>

              {isCompiling && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Compiling...
                </span>
              )}
            </div>

            <textarea
              value={editingMarkup}
              onChange={(e) => setEditingMarkup(e.target.value)}
              rows={16}
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
              Live PDF Preview Output ({selectedTemplate.name})
            </span>

            {isActive && (
              <Badge variant="paid" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" /> Active Invoice Template
              </Badge>
            )}
          </div>

          {compileError ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs font-mono">
              <div className="space-y-2 text-center max-w-md">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                <p className="font-bold">Typst Compilation Error</p>
                <p className="text-[11px] leading-relaxed">{compileError}</p>
              </div>
            </div>
          ) : pdfPreviewPath ? (
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden shadow-lg">
              <iframe
                src={`${pdfPreviewPath}#toolbar=0&navpanes=0`}
                className="w-full h-full border-none"
                title="Live Invoice Template PDF Preview"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-lg">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Rendering live Typst PDF preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
