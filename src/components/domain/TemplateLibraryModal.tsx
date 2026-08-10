import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { INVOICE_TEMPLATES, type InvoiceTemplate } from '@/lib/templates'
import { LayoutTemplate, Check, FileCode, RotateCcw, Sparkles } from 'lucide-react'

interface TemplateLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  currentTemplateMarkup: string
  onSelectTemplate: (markup: string) => void
}

export function TemplateLibraryModal({
  isOpen,
  onClose,
  currentTemplateMarkup,
  onSelectTemplate,
}: TemplateLibraryModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('standard')
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [customMarkup, setCustomMarkup] = useState(currentTemplateMarkup)

  const handleChooseTemplate = (t: InvoiceTemplate) => {
    setSelectedTemplateId(t.id)
    setCustomMarkup(t.typstMarkup)
    onSelectTemplate(t.typstMarkup)
  }

  const handleApplyCustomMarkup = () => {
    onSelectTemplate(customMarkup)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Invoice Template Library
          </DialogTitle>
          <DialogDescription>
            Choose from professionally designed Typst invoice layouts or customize your own markup.
          </DialogDescription>
        </DialogHeader>

        {/* View Toggle */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <Button
              variant={!isCustomizing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsCustomizing(false)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Template Library
            </Button>
            <Button
              variant={isCustomizing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsCustomizing(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <FileCode className="h-3.5 w-3.5" />
              Customize Typst Code
            </Button>
          </div>
        </div>

        {/* Tab 1: Template Cards Gallery */}
        {!isCustomizing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 overflow-y-auto pr-1">
            {INVOICE_TEMPLATES.map((t) => {
              const isSelected =
                currentTemplateMarkup.trim() === t.typstMarkup.trim() ||
                selectedTemplateId === t.id

              return (
                <div
                  key={t.id}
                  onClick={() => handleChooseTemplate(t)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: t.accentColor }}
                        />
                        <h3 className="font-semibold text-sm text-foreground">{t.name}</h3>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {t.badge}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Typst Vector Layout
                    </span>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <Check className="h-4 w-4" /> Active Template
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Use Template
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Tab 2: Custom Typst Code Editor */
          <div className="space-y-3 py-3 flex-1 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileCode className="h-4 w-4 text-primary" />
                Typst Markup Editor
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setCustomMarkup(INVOICE_TEMPLATES[0].typstMarkup)}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Standard Template
              </Button>
            </div>

            <textarea
              rows={14}
              value={customMarkup}
              onChange={(e) => setCustomMarkup(e.target.value)}
              className="w-full flex-1 rounded-md border border-input bg-muted/40 p-4 text-xs font-mono text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed resize-none"
              placeholder="Enter Typst markup code..."
            />

            <div className="flex justify-end pt-2">
              <Button onClick={handleApplyCustomMarkup} size="sm" className="gap-1.5 font-semibold">
                Apply Custom Code
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
