import { useAppStore } from '@/store/useAppStore'
import type { ActiveView } from '@/store/useAppStore'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  FileText,
  PlusCircle,
  Users,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'

export function Sidebar() {
  const { currentView, setCurrentView, startCreateInvoice } = useAppStore()
  const { theme, setTheme } = useTheme()

  const navItems: { id: ActiveView; label: string; icon: any }[] = [
    { id: 'ledger', label: 'Invoices Ledger', icon: FileText },
    { id: 'counterparties', label: 'Counterparties', icon: Users },
    { id: 'settings', label: 'Settings & Bank Accounts', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col justify-between p-4 select-none shrink-0 h-screen">
      {/* Top Logo, Header & Theme Toggle */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Invoice Generator Logo"
              className="h-9 w-9 rounded-lg shadow-sm border border-emerald-500/20 object-cover"
            />
            <div>
              <h1 className="font-display font-bold text-sm text-foreground tracking-tight">
                Invoice Generator
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>Offline SQLite</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>
        </div>

        {/* Primary Create Invoice Button */}
        <Button
          onClick={startCreateInvoice}
          className="w-full justify-start gap-2 h-10 font-semibold shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          New Invoice
        </Button>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
