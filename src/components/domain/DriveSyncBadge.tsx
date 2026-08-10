import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cloud, CloudUpload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface DriveSyncBadgeProps {
  invoiceNumber?: string
  pdfPath?: string
  onSyncSuccess?: () => void
}

export function DriveSyncBadge({ invoiceNumber, pdfPath, onSyncSuccess }: DriveSyncBadgeProps) {
  const { googleAccessToken, googleClientId, setGoogleAccessToken } = useAppStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleConnectDrive = async () => {
    if (!googleClientId) {
      alert('Please configure your Google OAuth Client ID in Settings first.')
      return
    }

    try {
      setIsSyncing(true)
      const tokens: any = await invoke('start_google_oauth', { clientId: googleClientId })
      if (tokens && tokens.access_token) {
        setGoogleAccessToken(tokens.access_token)
      }
    } catch (err: any) {
      alert('Google OAuth login error: ' + String(err))
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUploadInvoice = async () => {
    if (!googleAccessToken) {
      await handleConnectDrive()
      return
    }

    if (!pdfPath || !invoiceNumber) {
      alert('PDF document path missing. Please generate the PDF first.')
      return
    }

    try {
      setIsSyncing(true)
      setSyncStatus('idle')
      const fileName = `Invoice_${invoiceNumber}.pdf`

      await invoke('upload_pdf_to_google_drive', {
        accessToken: googleAccessToken,
        filePath: pdfPath,
        fileName,
      })

      setSyncStatus('success')
      if (onSyncSuccess) onSyncSuccess()
    } catch (err: any) {
      setSyncStatus('error')
      setErrorMessage(String(err))
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {googleAccessToken ? (
        <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          <CheckCircle className="h-3 w-3" />
          Drive Connected
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Drive Offline
        </Badge>
      )}

      {pdfPath && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleUploadInvoice}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CloudUpload className="h-3.5 w-3.5 text-primary" />
          )}
          {syncStatus === 'success' ? 'Uploaded to Drive!' : 'Upload to Drive'}
        </Button>
      )}

      {syncStatus === 'error' && (
        <span className="text-[10px] text-destructive">{errorMessage}</span>
      )}
    </div>
  )
}
