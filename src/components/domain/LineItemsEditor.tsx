import type { InvoiceItem, Currency } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface LineItemsEditorProps {
  items: InvoiceItem[]
  currency: Currency
  onChange: (items: InvoiceItem[]) => void
}

export function LineItemsEditor({
  items,
  currency,
  onChange,
}: LineItemsEditorProps) {
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item
      const newItem = { ...item, [field]: value }

      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) || 0 : item.quantity
        const price = field === 'unit_price' ? Number(value) || 0 : item.unit_price
        newItem.amount = Number((qty * price).toFixed(2))
      }

      return newItem
    })
    onChange(updated)
  }

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      item_order: items.length + 1,
      description: '',
      unit: 'Services',
      unit_price: 0,
      quantity: 1,
      amount: 0,
    }
    onChange([...items, newItem])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    const updated = items
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, item_order: idx + 1 }))
    onChange(updated)
  }

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : 'GEL '

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Line Items *
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleAddItem}
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          Add Item Row
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center rounded-md border border-border/80 bg-card p-2.5 text-xs shadow-2xs transition-all hover:border-border"
          >
            <div className="col-span-5 space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Description #{index + 1}
              </span>
              <Input
                placeholder="e.g. Software Development Services"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Unit
              </span>
              <select
                value={item.unit}
                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-2 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Services">Services</option>
                <option value="Hours">Hours</option>
                <option value="Units">Units</option>
                <option value="Pcs">Pcs</option>
                <option value="Days">Days</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Qty
              </span>
              <Input
                mono
                type="number"
                step="0.1"
                min="0"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Unit Price ({currency})
              </span>
              <Input
                mono
                type="number"
                step="0.01"
                min="0"
                value={item.unit_price}
                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
              />
            </div>

            <div className="col-span-1 flex items-end justify-center pt-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveItem(index)}
                disabled={items.length <= 1}
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="col-span-12 flex justify-end text-[11px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
              Row Total: <span className="font-semibold text-emerald-500 ml-1">{currencySymbol}{item.amount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
