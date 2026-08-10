import type { BankAccount } from '@/types'
import { Landmark } from 'lucide-react'

interface BankAccountSelectorProps {
  accounts: BankAccount[]
  selectedId: number | null
  onSelect: (account: BankAccount) => void
}

export function BankAccountSelector({
  accounts,
  selectedId,
  onSelect,
}: BankAccountSelectorProps) {
  const selectedAccount = accounts.find((a) => a.id === selectedId)

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Seller Bank Account *
      </label>

      <div className="relative">
        <select
          value={selectedId || ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            const found = accounts.find((a) => a.id === id)
            if (found) onSelect(found)
          }}
          className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium cursor-pointer"
        >
          <option value="" disabled>
            -- Select Bank Account --
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_label} ({a.bank_name}) {a.is_default ? '★ Default' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedAccount && (
        <div className="rounded-md border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between font-sans text-foreground">
            <div className="flex items-center gap-1.5 font-semibold">
              <Landmark className="h-3.5 w-3.5 text-primary font-mono" />
              <span>{selectedAccount.bank_name}</span>
            </div>
            <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
              {selectedAccount.account_label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-muted-foreground">
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">IBAN</span>
              <span className="text-foreground tracking-tight">{selectedAccount.iban}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">SWIFT / BIC</span>
              <span className="text-foreground">{selectedAccount.swift_bic}</span>
            </div>
          </div>

          {selectedAccount.intermediary_bank_name && (
            <div className="pt-1 border-t border-border/50 text-[11px] text-muted-foreground font-sans">
              <span className="font-medium text-foreground">Intermediary Bank:</span>{' '}
              {selectedAccount.intermediary_bank_name}{' '}
              {selectedAccount.intermediary_swift && (
                <span className="font-mono text-xs text-muted-foreground">
                  (SWIFT: {selectedAccount.intermediary_swift})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
