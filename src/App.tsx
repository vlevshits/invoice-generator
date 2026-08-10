import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAppStore } from '@/store/useAppStore'

import { InvoicesLedgerView } from '@/views/InvoicesLedgerView'
import { InvoiceBuilderView } from '@/views/InvoiceBuilderView'
import { CounterpartiesView } from '@/views/CounterpartiesView'
import { SettingsView } from '@/views/SettingsView'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const { currentView } = useAppStore()

  const renderView = () => {
    switch (currentView) {
      case 'ledger':
        return <InvoicesLedgerView />
      case 'builder':
        return <InvoiceBuilderView />
      case 'counterparties':
        return <CounterpartiesView />
      case 'settings':
        return <SettingsView />
      default:
        return <InvoicesLedgerView />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="invoice-generator-theme">
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
          {/* Hide Sidebar only on Builder View for maximum editor space */}
          {currentView !== 'builder' && <Sidebar />}

          <main className="flex-1 h-screen overflow-y-auto bg-background">
            {renderView()}
          </main>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
