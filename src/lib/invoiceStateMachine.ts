import type { InvoiceStatus } from '@/types'

export interface StateTransition {
  targetStatus: InvoiceStatus
  label: string
  variant: 'default' | 'outline' | 'destructive' | 'secondary'
  requiresPaidDateModal?: boolean
}

/**
 * 2-State Machine rules:
 * - DRAFT -> PAID (requires payment date modal)
 * - PAID -> DRAFT (reverts to draft)
 */
export function getValidTransitions(currentStatus: InvoiceStatus): StateTransition[] {
  if (currentStatus === 'PAID') {
    return [
      {
        targetStatus: 'DRAFT',
        label: 'Revert to Draft',
        variant: 'outline',
      },
    ]
  }

  return [
    {
      targetStatus: 'PAID',
      label: 'Mark as Paid',
      variant: 'default',
      requiresPaidDateModal: true,
    },
  ]
}
