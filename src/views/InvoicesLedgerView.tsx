import { useState, useEffect } from 'react'
import type { InvoiceWithDetails, Counterparty, InvoiceStatus } from '@/types'
import { getInvoices, getCounterparties, deleteInvoice, updateInvoiceStatus } from '@/lib/db'
import { getValidTransitions, type StateTransition } from '@/lib/invoiceStateMachine'
import { useAppStore } from '@/store/useAppStore'
import { performFullGoogleDriveSync } from '@/lib/driveSync'
import { DriveSyncBadge } from '@/components/domain/DriveSyncBadge'
import { RecordPaymentModal } from '@/components/domain/RecordPaymentModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Filter,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  CheckCircle2,
  FileCheck,
  Clock,
  Ban,
  RefreshCw,
  FileText,
  Cloud,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

export function InvoicesLedgerView() {
  const {
    startCreateInvoice,
    startEditInvoice,
    googleAccessToken,
    googleDriveFolderName,
  } = useAppStore()

  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<number | 0>(0)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'ALL'>('ALL')

  // Drive Syncing State
  const [isSyncingDrive, setIsSyncingDrive] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')

  // Payment Date Modal
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean
    invoice?: InvoiceWithDetails
    targetStatus?: InvoiceStatus
  }>({ isOpen: false })

  const loadData = async () => {
    try {
      setLoading(true)
      const [invList, cpList] = await Promise.all([
        getInvoices({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          counterpartyId: selectedCounterpartyId || undefined,
          status: selectedStatus,
        }),
        getCounterparties(),
      ])
      setInvoices(invList)
      setCounterparties(cpList)
    } catch (err: any) {
      console.error('Failed to load ledger data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [startDate, endDate, selectedCounterpartyId, selectedStatus])

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      await deleteInvoice(id)
      loadData()
    }
  }

  const handleStateTransition = async (
    inv: InvoiceWithDetails,
    transition: StateTransition
  ) => {
    if (transition.requiresPaidDateModal) {
      setPaymentModalState({
        isOpen: true,
        invoice: inv,
        targetStatus: transition.targetStatus,
      })
      return
    }
    await updateInvoiceStatus(inv.id!, transition.targetStatus)
    loadData()
  }

  const handleConfirmPaidDate = async (paidDate: string) => {
    if (paymentModalState.invoice?.id) {
      await updateInvoiceStatus(
        paymentModalState.invoice.id,
        paymentModalState.targetStatus || 'PAID',
        paidDate
      )
      loadData()
    }
    setPaymentModalState({ isOpen: false })
  }

  const handleDownloadPdf = async (inv: InvoiceWithDetails) => {
    try {
      const payload = {
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        paid_date: inv.paid_date,
        seller_name: 'Your Business Name',
        seller_tax_id: '123456789',
        seller_address: 'Address',
        buyer_name: inv.counterparty?.business_name || 'Buyer',
        buyer_tax_id: inv.counterparty?.tax_id || '',
        buyer_director: inv.counterparty?.director_name || '',
        buyer_address: inv.counterparty?.legal_address || '',
        bank_account_label: inv.bank_account?.account_label || 'Bank Account',
        bank_beneficiary: inv.bank_account?.beneficiary_name || '',
        bank_name: inv.bank_account?.bank_name || '',
        bank_address: inv.bank_account?.bank_address || '',
        bank_iban: inv.bank_account?.iban || '',
        bank_swift: inv.bank_account?.swift_bic || '',
        intermediary_bank: inv.bank_account?.intermediary_bank_name || '',
        intermediary_swift: inv.bank_account?.intermediary_swift || '',
        currency: inv.currency,
        total_amount: inv.total_amount,
        amount_in_words: inv.amount_in_words,
        notes: inv.notes,
        items: inv.items.map((it) => ({
          description: it.description,
          unit: it.unit,
          unit_price: it.unit_price,
          quantity: it.quantity,
          amount: it.amount,
        })),
      }

      const generatedPath: any = await invoke('generate_pdf_command', {
        payload,
        targetPath: null,
      })

      alert(`PDF generated and saved to:\n${generatedPath}`)
    } catch (err: any) {
      alert('Error generating PDF: ' + String(err))
    }
  }

  const handleDriveSync = async () => {
    if (!googleAccessToken) {
      alert('Please connect your Google Drive in Settings first.')
      return
    }

    try {
      setIsSyncingDrive(true)
      await performFullGoogleDriveSync(
        googleAccessToken,
        googleDriveFolderName,
        (progressStr) => {
          setSyncProgress(progressStr)
        }
      )
      alert(
        `Google Drive Sync Successful!\nAll invoices & Google Sheet summary exported to folder "${googleDriveFolderName}".`
      )
    } catch (err: any) {
      alert('Drive Sync Error: ' + String(err))
    } finally {
      setIsSyncingDrive(false)
      setSyncProgress('')
    }
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    if (status === 'PAID') {
      return <Badge variant="paid">PAID</Badge>
    }
    return <Badge variant="draft">DRAFT</Badge>
  }

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Invoices Ledger
          </h2>
          <p className="text-sm text-muted-foreground">
            Track, filter, export, and sync all generated invoices to Google Drive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {googleAccessToken && (
            <Button
              variant="outline"
              onClick={handleDriveSync}
              disabled={isSyncingDrive}
              className="gap-2 text-xs font-semibold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              {isSyncingDrive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {isSyncingDrive ? 'Syncing to Drive...' : 'Sync to Google Drive'}
            </Button>
          )}

          <Button onClick={startCreateInvoice} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Create New Invoice
          </Button>
        </div>
      </div>

      {/* Progress Banner */}
      {isSyncingDrive && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-md text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-emerald-400" />
          <span>{syncProgress || 'Syncing with Google Drive...'}</span>
        </div>
      )}

      {/* Filter Engine Panel */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filter & Search Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-2">
          {/* Start Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Counterparty Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Counterparty (Buyer)
            </label>
            <select
              value={selectedCounterpartyId}
              onChange={(e) => setSelectedCounterpartyId(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={0}>All Buyers / Counterparties</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Datatable */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[160px] font-mono font-semibold">Invoice No.</TableHead>
                <TableHead className="min-w-[280px]">Buyer / Counterparty</TableHead>
                <TableHead className="w-[120px]">Issue Date</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="text-right w-[150px]">Total Amount</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    No invoices found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const validTransitions = getValidTransitions(inv.status)

                  return (
                    <TableRow key={inv.id} className="group">
                      <TableCell className="font-mono font-semibold">
                        <button
                          onClick={() => startEditInvoice(inv)}
                          className="text-primary hover:underline hover:text-emerald-400 font-mono font-bold transition-colors cursor-pointer text-left inline-flex items-center gap-1 group/btn"
                          title="Click to view and edit invoice details"
                        >
                          {inv.invoice_number}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm">
                          {inv.counterparty?.business_name || 'N/A'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Tax ID: {inv.counterparty?.tax_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {inv.issue_date}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {getStatusBadge(inv.status)}
                          {inv.status === 'PAID' && inv.paid_date && (
                            <div className="text-[10px] font-mono text-emerald-400">
                              Paid: {inv.paid_date}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        {inv.currency === 'EUR'
                          ? '€'
                          : inv.currency === 'USD'
                          ? '$'
                          : inv.currency === 'GBP'
                          ? '£'
                          : 'GEL '}
                        {inv.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleDownloadPdf(inv)}>
                              <Download className="h-4 w-4 mr-2 text-primary" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startEditInvoice(inv)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />

                            {/* State Machine Transition Items */}
                            {validTransitions.map((t) => (
                              <DropdownMenuItem
                                key={t.targetStatus}
                                onClick={() => handleStateTransition(inv, t)}
                              >
                                {t.targetStatus === 'PAID' && (
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                )}
                                {t.targetStatus === 'DRAFT' && (
                                  <RotateCcw className="h-4 w-4 mr-2 text-slate-400" />
                                )}
                                {t.label}
                              </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(inv.id!)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalState.isOpen}
        invoiceNumber={paymentModalState.invoice?.invoice_number}
        totalAmount={paymentModalState.invoice?.total_amount}
        currency={paymentModalState.invoice?.currency}
        onClose={() => setPaymentModalState({ isOpen: false })}
        onConfirm={handleConfirmPaidDate}
      />
    </div>
  )
}
