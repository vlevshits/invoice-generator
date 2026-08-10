import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Calendar } from 'lucide-react'

interface RecordPaymentModalProps {
  isOpen: boolean
  invoiceNumber?: string
  totalAmount?: number
  currency?: string
  onClose: () => void
  onConfirm: (paidDate: string) => void
}

export function RecordPaymentModal({
  isOpen,
  invoiceNumber,
  totalAmount,
  currency = 'GEL',
  onClose,
  onConfirm,
}: RecordPaymentModalProps) {
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (isOpen) {
      setPaidDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (!paidDate) return
    onConfirm(paidDate)
    onClose()
  }

  const currSym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : 'GEL '

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Record Payment Date
          </DialogTitle>
          <DialogDescription>
            Specify the date when payment was received for invoice{' '}
            <strong className="font-mono text-foreground">{invoiceNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {totalAmount !== undefined && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Total Invoice Amount:</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {currSym}{totalAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Payment Date *
            </label>
            <Input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!paidDate} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
