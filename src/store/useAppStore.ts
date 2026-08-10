import { create } from 'zustand'
import type { InvoiceWithDetails } from '@/types'

export type ActiveView = 'ledger' | 'builder' | 'counterparties' | 'settings'

export const DEFAULT_GOOGLE_CLIENT_ID = '1054238596102-desktop-app.apps.googleusercontent.com'

export function getActiveGoogleClientId(customId?: string): string {
  if (customId && customId.trim() !== '') {
    return customId.trim()
  }
  return DEFAULT_GOOGLE_CLIENT_ID
}

interface AppState {
  currentView: ActiveView
  editingInvoice: InvoiceWithDetails | null
  googleAccessToken: string | null
  googleClientId: string

  setCurrentView: (view: ActiveView) => void
  startCreateInvoice: () => void
  startEditInvoice: (invoice: InvoiceWithDetails) => void
  setGoogleAccessToken: (token: string | null) => void
  setGoogleClientId: (clientId: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'ledger',
  editingInvoice: null,
  googleAccessToken: localStorage.getItem('google_drive_token'),
  googleClientId: localStorage.getItem('google_client_id') || '',

  setCurrentView: (view) => set({ currentView: view }),

  startCreateInvoice: () =>
    set({
      currentView: 'builder',
      editingInvoice: null,
    }),

  startEditInvoice: (invoice) =>
    set({
      currentView: 'builder',
      editingInvoice: invoice,
    }),

  setGoogleAccessToken: (token) => {
    if (token) {
      localStorage.setItem('google_drive_token', token)
    } else {
      localStorage.removeItem('google_drive_token')
    }
    set({ googleAccessToken: token })
  },

  setGoogleClientId: (clientId) => {
    localStorage.setItem('google_client_id', clientId)
    set({ googleClientId: clientId })
  },
}))
