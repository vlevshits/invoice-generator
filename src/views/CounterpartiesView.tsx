import { useState, useEffect } from 'react'
import type { Counterparty } from '@/types'
import { getCounterparties, saveCounterparty, deleteCounterparty } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Users, Plus, Search, Building2, Trash2, Edit, UserCheck } from 'lucide-react'

export function CounterpartiesView() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)

  // Edit / Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [actualAddress, setActualAddress] = useState('')

  const loadData = async () => {
    const list = await getCounterparties()
    setCounterparties(list)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setBusinessName('')
    setTaxId('')
    setDirectorName('')
    setLegalAddress('')
    setActualAddress('')
    setIsOpenModal(true)
  }

  const handleOpenEdit = (c: Counterparty) => {
    setEditingId(c.id)
    setBusinessName(c.business_name)
    setTaxId(c.tax_id)
    setDirectorName(c.director_name || '')
    setLegalAddress(c.legal_address)
    setActualAddress(c.actual_address || '')
    setIsOpenModal(true)
  }

  const handleSave = async () => {
    if (!businessName || !taxId || !legalAddress) return

    await saveCounterparty({
      id: editingId || undefined,
      business_name: businessName,
      tax_id: taxId,
      director_name: directorName || undefined,
      legal_address: legalAddress,
      actual_address: actualAddress || undefined,
    })

    setIsOpenModal(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this counterparty?')) {
      await deleteCounterparty(id)
      loadData()
    }
  }

  const filtered = counterparties.filter(
    (c) =>
      c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tax_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.director_name && c.director_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Counterparties Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage client businesses, tax registration details, and legal addresses.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Add New Counterparty
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search counterparties by name, tax ID, or director..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0"
          />
        </CardContent>
      </Card>

      {/* Grid of Counterparties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="relative group hover:border-primary/50 transition-all">
            <CardHeader className="py-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.business_name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">Tax ID: {c.tax_id}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs py-2 text-muted-foreground">
              {c.director_name && (
                <p>
                  <span className="font-semibold text-foreground">Director / Rep:</span>{' '}
                  {c.director_name}
                </p>
              )}
              <p>
                <span className="font-semibold text-foreground">Legal Address:</span>{' '}
                {c.legal_address}
              </p>
              {c.actual_address && (
                <p>
                  <span className="font-semibold text-foreground">Actual Address:</span>{' '}
                  {c.actual_address}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => handleOpenEdit(c)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Counterparty' : 'Add New Counterparty'}</DialogTitle>
            <DialogDescription>
              Enter the client's legal details for invoice signature and tax compliance.
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
            <Button onClick={handleSave} disabled={!businessName || !taxId || !legalAddress}>
              <UserCheck className="h-4 w-4 mr-1.5" />
              Save Counterparty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
