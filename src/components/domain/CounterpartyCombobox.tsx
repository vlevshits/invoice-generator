import { useState } from 'react'
import type { Counterparty } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, UserCheck, Building2 } from 'lucide-react'
import { saveCounterparty } from '@/lib/db'

interface CounterpartyComboboxProps {
  counterparties: Counterparty[]
  selectedId: number | null
  onSelect: (counterparty: Counterparty) => void
  onRefresh: () => void
}

export function CounterpartyCombobox({
  counterparties,
  selectedId,
  onSelect,
  onRefresh,
}: CounterpartyComboboxProps) {
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [actualAddress, setActualAddress] = useState('')

  const selectedItem = counterparties.find((c) => c.id === selectedId)

  const handleCreate = async () => {
    if (!businessName || !taxId || !legalAddress) return

    const newId = await saveCounterparty({
      business_name: businessName,
      tax_id: taxId,
      director_name: directorName || undefined,
      legal_address: legalAddress,
      actual_address: actualAddress || undefined,
    })

    onRefresh()

    const newCounterparty: Counterparty = {
      id: newId,
      business_name: businessName,
      tax_id: taxId,
      director_name: directorName || undefined,
      legal_address: legalAddress,
      actual_address: actualAddress || undefined,
    }
    onSelect(newCounterparty)

    // Reset & close modal
    setBusinessName('')
    setTaxId('')
    setDirectorName('')
    setLegalAddress('')
    setActualAddress('')
    setIsOpenModal(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Counterparty (Buyer) *
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-dashed"
          onClick={() => setIsOpenModal(true)}
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          New Counterparty
        </Button>
      </div>

      <div className="relative">
        <select
          value={selectedId || ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            const found = counterparties.find((c) => c.id === id)
            if (found) onSelect(found)
          }}
          className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium cursor-pointer"
        >
          <option value="" disabled>
            -- Select Counterparty / Buyer --
          </option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name} (Tax ID: {c.tax_id})
            </option>
          ))}
        </select>
      </div>

      {selectedItem && (
        <div className="rounded-md border border-border/80 bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>{selectedItem.business_name}</span>
          </div>
          <p className="text-muted-foreground font-mono">Tax ID: {selectedItem.tax_id}</p>
          {selectedItem.director_name && (
            <p className="text-muted-foreground">Rep: {selectedItem.director_name}</p>
          )}
          <p className="text-muted-foreground">{selectedItem.legal_address}</p>
        </div>
      )}

      {/* Inline Modal to Create Counterparty */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Counterparty</DialogTitle>
            <DialogDescription>
              Add a new buyer to your directory. Details will be saved to your local database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Business / Client Name *</label>
              <Input
                placeholder="e.g. Acme Client Corporation"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tax ID / INN / TIN *</label>
                <Input
                  mono
                  placeholder="e.g. 987654321"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Director / Rep Person</label>
                <Input
                  placeholder="e.g. John Smith"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Legal Address *</label>
              <Input
                placeholder="e.g. 456 Commercial Way, London, EC1A 1BB, UK"
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Actual Address (Optional)</label>
              <Input
                placeholder="Physical address if different"
                value={actualAddress}
                onChange={(e) => setActualAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!businessName || !taxId || !legalAddress}>
              <UserCheck className="h-4 w-4 mr-1.5" />
              Save & Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
