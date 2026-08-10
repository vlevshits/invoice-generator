import { create } from 'zustand'
import type { InvoiceWithDetails } from '@/types'

export type ActiveView = 'ledger' | 'builder' | 'counterparties' | 'templates' | 'settings'

export const DEFAULT_GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ''
export const DEFAULT_GOOGLE_CLIENT_SECRET =
  (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string) || ''

export function getActiveGoogleClientId(customId?: string): string {
  if (customId && customId.trim() !== '') {
    return customId.trim()
  }
  return DEFAULT_GOOGLE_CLIENT_ID
}

export function getActiveGoogleClientSecret(customSecret?: string): string {
  if (customSecret && customSecret.trim() !== '') {
    return customSecret.trim()
  }
  return DEFAULT_GOOGLE_CLIENT_SECRET
}

interface AppState {
  currentView: ActiveView
  editingInvoice: InvoiceWithDetails | null
  googleAccessToken: string | null
  googleClientId: string
  googleClientSecret: string
  googleDriveFolderName: string

  setCurrentView: (view: ActiveView) => void
  startCreateInvoice: () => void
  startEditInvoice: (invoice: InvoiceWithDetails) => void
  setGoogleAccessToken: (token: string | null) => void
  setGoogleClientId: (clientId: string) => void
  setGoogleClientSecret: (clientSecret: string) => void
  setGoogleDriveFolderName: (folderName: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'ledger',
  editingInvoice: null,
  googleAccessToken: localStorage.getItem('google_drive_token'),
  googleClientId: localStorage.getItem('google_client_id') || '',
  googleClientSecret: localStorage.getItem('google_client_secret') || '',
  googleDriveFolderName: localStorage.getItem('google_drive_folder_name') || 'Invoice Generator',

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

  setGoogleClientSecret: (clientSecret) => {
    localStorage.setItem('google_client_secret', clientSecret)
    set({ googleClientSecret: clientSecret })
  },

  setGoogleDriveFolderName: (folderName) => {
    const val = folderName.trim() || 'Invoice Generator'
    localStorage.setItem('google_drive_folder_name', val)
    set({ googleDriveFolderName: val })
  },
}))
