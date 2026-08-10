import { useState, useEffect } from 'react'
import type { InvoiceWithDetails, Counterparty, InvoiceStatus } from '@/types'
import { getInvoices, getCounterparties, deleteInvoice, updateInvoiceStatus } from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'
import { invoke } from '@tauri-apps/api/core'
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DriveSyncBadge } from '@/components/domain/DriveSyncBadge'
import {
  FileText,
  Plus,
  Download,
  Trash2,
  MoreVertical,
  Filter,
  RefreshCw,
  Edit,
  CheckCircle2,
  Clock,
  Ban,
  FileCheck,
} from 'lucide-react'

export function InvoicesLedgerView() {
  const { startCreateInvoice, startEditInvoice } = useAppStore()
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<number | 0>(0)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'ALL'>('ALL')

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
    } catch (err) {
      console.error('Failed to load invoices:', err)
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

  const handleStatusChange = async (id: number, status: InvoiceStatus) => {
    await updateInvoiceStatus(id, status)
    loadData()
  }

  const handleDownloadPdf = async (invoice: InvoiceWithDetails) => {
    try {
      const defaultName = `Invoice_${invoice.invoice_number}.pdf`
      const targetPath = await saveFileDialog({
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      })

      if (!targetPath) return

      const payload = {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        seller_name: 'Your Business Name',
        seller_tax_id: '123456789',
        seller_address: '123 Main Street, Suite 100, City, Country',
        buyer_name: invoice.counterparty?.business_name || 'Buyer',
        buyer_tax_id: invoice.counterparty?.tax_id || 'N/A',
        buyer_director: invoice.counterparty?.director_name,
        buyer_address: invoice.counterparty?.legal_address || 'N/A',
        bank_account_label: invoice.bank_account?.account_label || 'Bank Account',
        bank_beneficiary: invoice.bank_account?.beneficiary_name || 'Your Business Name',
        bank_name: invoice.bank_account?.bank_name || 'Bank',
        bank_address: invoice.bank_account?.bank_address,
        bank_iban: invoice.bank_account?.iban || 'N/A',
        bank_swift: invoice.bank_account?.swift_bic || 'N/A',
        intermediary_bank: invoice.bank_account?.intermediary_bank_name,
        intermediary_swift: invoice.bank_account?.intermediary_swift,
        currency: invoice.currency,
        total_amount: invoice.total_amount,
        amount_in_words: invoice.amount_in_words,
        notes: invoice.notes,
        items: invoice.items.map((it) => ({
          description: it.description,
          unit: it.unit,
          unit_price: it.unit_price,
          quantity: it.quantity,
          amount: it.amount,
        })),
      }

      await invoke('generate_pdf_command', {
        payload,
        targetPath,
      })

      alert(`PDF downloaded successfully to: ${targetPath}`)
    } catch (err: any) {
      alert('Failed to generate/download PDF: ' + String(err))
    }
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="paid">PAID</Badge>
      case 'ISSUED':
        return <Badge variant="issued">ISSUED</Badge>
      case 'DRAFT':
        return <Badge variant="draft">DRAFT</Badge>
      case 'CANCELLED':
        return <Badge variant="cancelled">CANCELLED</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
            Track, filter, export, and back up all generated invoices locally.
          </p>
        </div>

        <Button onClick={startCreateInvoice} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Create New Invoice
        </Button>
      </div>

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
              <option value="ISSUED">ISSUED</option>
              <option value="PAID">PAID</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CANCELLED">CANCELLED</option>
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
                <TableHead className="w-[140px] font-mono font-semibold">Invoice No.</TableHead>
                <TableHead>Buyer / Counterparty</TableHead>
                <TableHead className="w-[110px]">Issue Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right w-[140px]">Total Amount</TableHead>
                <TableHead className="text-center w-[160px]">Google Drive</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    No invoices found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
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
                      <div className="font-medium text-foreground">
                        {inv.counterparty?.business_name || 'N/A'}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Tax ID: {inv.counterparty?.tax_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {inv.issue_date}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {inv.currency === 'EUR' ? '€' : inv.currency === 'USD' ? '$' : inv.currency === 'GBP' ? '£' : 'GEL '}
                      {inv.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DriveSyncBadge invoiceNumber={inv.invoice_number} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleDownloadPdf(inv)}>
                            <Download className="h-4 w-4 mr-2 text-primary" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEditInvoice(inv)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id!, 'PAID')}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                            Mark as PAID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id!, 'ISSUED')}>
                            <FileCheck className="h-4 w-4 mr-2 text-indigo-400" />
                            Mark as ISSUED
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id!, 'DRAFT')}>
                            <Clock className="h-4 w-4 mr-2 text-amber-500" />
                            Mark as DRAFT
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id!, 'CANCELLED')}>
                            <Ban className="h-4 w-4 mr-2 text-rose-500" />
                            Mark as CANCELLED
                          </DropdownMenuItem>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
