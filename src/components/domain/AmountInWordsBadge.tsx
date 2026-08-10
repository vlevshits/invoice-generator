import { numberToWords } from '@/lib/numberToWords'
import type { Currency } from '@/types'
import { FileText } from 'lucide-react'

interface AmountInWordsBadgeProps {
  amount: number
  currency: Currency
}

export function AmountInWordsBadge({ amount, currency }: AmountInWordsBadgeProps) {
  const spelled = numberToWords(amount, currency)

  return (
    <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold uppercase text-[10px] tracking-wider">
        <FileText className="h-3.5 w-3.5" />
        <span>Amount Spelled Out in English</span>
      </div>
      <p className="font-serif italic text-foreground text-sm font-medium">"{spelled}"</p>
    </div>
  )
}
