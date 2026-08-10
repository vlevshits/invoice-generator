import type { Profile, BankAccount, Counterparty, InvoiceItem, Currency } from '@/types'

interface LiveInvoicePreviewProps {
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  seller: Profile | null
  bankAccount: BankAccount | null
  buyer: Counterparty | null
  currency: Currency
  items: InvoiceItem[]
  totalAmount: number
  amountInWords: string
  notes?: string
}

export function LiveInvoicePreview({
  invoiceNumber,
  issueDate,
  dueDate,
  seller,
  bankAccount,
  buyer,
  currency,
  items,
  totalAmount,
  amountInWords,
  notes,
}: LiveInvoicePreviewProps) {
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : 'GEL '

  return (
    <div className="w-full h-full min-h-[680px] bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-start overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Live Invoice Document Preview
      </div>

      {/* A4 Paper Document Canvas */}
      <div className="w-full max-w-[620px] bg-white text-slate-900 rounded-sm shadow-2xl p-8 text-xs font-sans space-y-6 border border-slate-200 transition-all transform scale-[0.98]">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">
              {seller?.business_name || 'Your Seller Business Name'}
            </h1>
            <p className="text-[11px] text-slate-600 font-mono">
              Tax ID / INN: {seller?.tax_id || '123-XXXXX'}
            </p>
            <p className="text-[11px] text-slate-600 max-w-[240px]">
              {seller?.legal_address || 'Seller Legal Address'}
            </p>
          </div>

          <div className="text-right space-y-1">
            <span className="text-2xl font-black text-emerald-600 font-display tracking-tight uppercase">
              INVOICE
            </span>
            <p className="text-xs font-bold text-slate-900 font-mono">
              No. {invoiceNumber || '20260810-01'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Date: {issueDate || 'YYYY-MM-DD'}
            </p>
            {dueDate && (
              <p className="text-[11px] text-slate-500 font-mono">
                Due: {dueDate}
              </p>
            )}
          </div>
        </div>

        {/* Counterparty (Buyer) & Payment Info Grid */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-200/80">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              INVOICE TO:
            </span>
            <p className="text-sm font-bold text-slate-900">
              {buyer?.business_name || 'Select Counterparty / Buyer'}
            </p>
            <p className="text-[11px] text-slate-600 font-mono">
              Tax ID: {buyer?.tax_id || '—'}
            </p>
            {buyer?.director_name && (
              <p className="text-[11px] text-slate-600">
                Rep: {buyer.director_name}
              </p>
            )}
            <p className="text-[11px] text-slate-600">
              {buyer?.legal_address || '—'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              PAYMENT DETAILS:
            </span>
            <p className="text-[11px] text-slate-800 font-semibold">
              Bank: {bankAccount?.bank_name || 'Select Bank Account'}
            </p>
            <p className="text-[11px] text-slate-700">
              Beneficiary: {bankAccount?.beneficiary_name || '—'}
            </p>
            <p className="text-[11px] text-slate-700 font-mono">
              IBAN: {bankAccount?.iban || '—'}
            </p>
            <p className="text-[11px] text-slate-700 font-mono">
              SWIFT/BIC: {bankAccount?.swift_bic || '—'}
            </p>
            {bankAccount?.intermediary_bank_name && (
              <p className="text-[10px] text-slate-500 pt-0.5">
                Intermediary: {bankAccount.intermediary_bank_name} (SWIFT:{' '}
                {bankAccount.intermediary_swift})
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-2.5">Description</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-medium text-slate-800">
                    {item.description || '—'}
                  </td>
                  <td className="p-2.5 text-center text-slate-600 font-mono">
                    {item.quantity} ({item.unit})
                  </td>
                  <td className="p-2.5 text-right text-slate-600 font-mono">
                    {currencySymbol}
                    {item.unit_price.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right font-semibold text-slate-900 font-mono">
                    {currencySymbol}
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total & Amount in Words */}
        <div className="flex flex-col items-end space-y-2 pt-2">
          <div className="flex justify-between items-center w-56 border-t-2 border-slate-900 pt-2 text-sm font-bold">
            <span className="text-slate-700">TOTAL:</span>
            <span className="text-emerald-600 text-base font-mono">
              {currencySymbol}
              {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-slate-100 p-3 rounded text-[11px] border border-slate-200 space-y-1">
          <span className="font-semibold text-slate-700">
            Amount in words:
          </span>
          <p className="italic font-serif text-slate-900">
            {amountInWords || 'Zero ' + currency}
          </p>
        </div>

        {notes && (
          <div className="text-[10px] text-slate-500 space-y-0.5">
            <span className="font-bold">Notes / Terms:</span>
            <p className="whitespace-pre-line">{notes}</p>
          </div>
        )}

        {/* Signature Block (Seller left, Buyer right) */}
        <div className="grid grid-cols-2 gap-12 pt-12 text-center text-[10px] text-slate-600">
          <div className="space-y-1">
            <div className="border-b border-slate-400 mx-auto w-3/4 pb-4" />
            <p className="font-semibold text-slate-900 text-[11px]">
              Seller Signature
            </p>
            <p className="text-slate-500 font-mono">
              ({seller?.business_name || 'Seller'})
            </p>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-400 mx-auto w-3/4 pb-4" />
            <p className="font-semibold text-slate-900 text-[11px]">
              Buyer Signature
            </p>
            <p className="text-slate-500 font-mono">
              ({buyer?.business_name || 'Buyer'})
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
