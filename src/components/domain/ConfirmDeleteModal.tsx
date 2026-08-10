import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title?: string
  description?: string
  errorMessage?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteModal({
  isOpen,
  title = 'Confirm Deletion',
  description = 'Are you sure you want to proceed? This action cannot be undone.',
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-foreground/90 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onCancel}>
            {errorMessage ? 'Close' : 'Cancel'}
          </Button>
          {!errorMessage && (
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
