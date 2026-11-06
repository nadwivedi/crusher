import { useEffect, useRef } from 'react';
import { FileText, ImageIcon, Pencil, Trash2, X } from 'lucide-react';
import { getOwnershipLabel } from '../../../utils/transport';

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const qty = (value, digits = 2) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: digits });

const formatDay = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatStamp = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PAYMENT_LABELS = { cash: 'Cash (paid in full)', partial: 'Part paid', credit: 'Credit (not paid)' };
const PAYMENT_BADGES = { cash: 'badge-green', partial: 'badge-orange', credit: 'badge-red' };

/** A card of label / value rows; rows with no value are left out, and an empty card is not shown. */
function Section({ title, rows }) {
  const shown = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== '');
  if (shown.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="divide-y divide-slate-100">
        {shown.map((row) => (
          <div key={row.label} className={`flex items-start justify-between gap-3 px-3.5 py-2 text-sm ${row.strong ? 'bg-slate-50' : ''}`}>
            <dt className="shrink-0 text-slate-500">{row.label}</dt>
            <dd className={`min-w-0 break-words text-right ${row.strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'} ${row.tone || ''}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Everything saved on one sale: bill, party, vehicle and transport, weights, amounts with royalty and GST,
 * payment, slip photo and who added it.
 * view: the row values the Sales page works out for the sale (party name, material amount, transport...).
 */
export default function SaleDetailsPopup({ sale, view, accountName, onClose, onOpenInvoice, onEdit, onDelete }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Esc closes it (before the page's own Esc handler sees the key); the page behind does not scroll
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey, true);
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
    };
  }, []);

  const isCubic = sale.pricingMode === 'per_cubic_meter';
  const gross = Number(sale.grossWeight || 0);
  const tare = Number(sale.tareWeight || 0);
  const net = Number(view.netWeight || 0);
  const cft = Number(sale.cubicMeterQty || 0);
  const total = Number(sale.totalAmount || 0);
  const paid = Number(sale.paidAmount || 0);
  const balance = Math.max(0, total - paid);
  const royaltyQty = Number(sale.royaltyQty || 0);
  const royaltyRate = Number(sale.royaltyRate || 0);
  const hasRoyalty = Boolean(sale.isRoyalty) || view.royaltyAmount > 0;
  const hasGst = Boolean(sale.isGst) || view.gstAmount > 0;
  const transportMode = view.transportMode || 'party';
  const materialLabel = String(view.material || '').toUpperCase();

  const createdBy = sale.createdBy?.name ? `${sale.createdBy.name}${sale.createdAt ? ` · ${formatStamp(sale.createdAt)}` : ''}` : formatStamp(sale.createdAt);
  const updatedBy = sale.updatedBy?.name
    ? `${sale.updatedBy.name}${sale.updatedByAt ? ` · ${formatStamp(sale.updatedByAt)}` : ''}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sale details"
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-2xl md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:px-5 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold md:text-xl">Sale {sale.invoiceNumber || ''}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-300 md:text-sm">
                {[formatDay(sale.saleDate), view.party !== '—' ? view.party : '', materialLabel].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={PAYMENT_BADGES[sale.type] || 'badge-red'}>{PAYMENT_LABELS[sale.type] || 'Credit (not paid)'}</span>
                {hasGst && <span className="badge-blue">GST</span>}
                {hasRoyalty && <span className="badge-orange">Royalty</span>}
                {sale.weightSource === 'weighbridge' && <span className="badge-green">Weighbridge</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-right">
                <span className="block text-[11px] text-slate-300">Total</span>
                <span className="block text-lg font-bold md:text-xl">{rupees(total)}</span>
              </span>
              <button type="button" onClick={onClose} aria-label="Close popup" className="rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2">
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 content-start gap-3 overflow-y-auto overscroll-contain p-3 md:grid-cols-2 md:p-5">
          <Section
            title="Bill"
            rows={[
              { label: 'Invoice No', value: sale.invoiceNumber },
              { label: 'RST No', value: sale.rstNo },
              { label: 'Royalty No', value: hasRoyalty ? sale.royaltyNo || 'Not entered' : '' },
              { label: 'Date', value: formatDay(sale.saleDate) },
              { label: 'Entry time', value: sale.entryTime },
              { label: 'Exit time', value: sale.exitTime },
              { label: 'GST', value: hasGst ? `Yes · ${qty(sale.gstRate)}%` : 'No' },
              { label: 'Royalty', value: hasRoyalty ? 'Yes' : 'No' }
            ]}
          />

          <Section
            title="Party"
            rows={[
              { label: 'Party', value: view.party !== '—' ? view.party : '' },
              { label: 'Dispatch to', value: sale.dispatchLocation }
            ]}
          />

          <Section
            title="Vehicle & Transport"
            rows={[
              { label: 'Vehicle No', value: sale.vehicleNo ? <span className="font-mono">{sale.vehicleNo}</span> : '' },
              { label: 'Driver', value: sale.driverName },
              { label: 'Vehicle', value: getOwnershipLabel(transportMode) },
              { label: 'Transporter', value: view.transporter },
              { label: 'Transport place', value: sale.transportLocation },
              { label: 'Transporter rate', value: view.transportRate },
              { label: 'Paid to transporter', value: view.transportCost > 0 ? rupees(view.transportCost) : '' },
              { label: 'Transport charged to party', value: view.transportCharge > 0 ? rupees(view.transportCharge) : '' }
            ]}
          />

          <Section
            title="Material & Weight"
            rows={[
              { label: 'Material', value: materialLabel },
              { label: 'Billed by', value: isCubic ? 'Cubic feet (cft)' : 'Weight (ton)' },
              { label: 'Gross weight', value: gross ? `${qty(gross)} kg` : '' },
              { label: 'Tare weight', value: tare ? `${qty(tare)} kg` : '' },
              { label: 'Net weight', value: net ? `${qty(net)} kg · ${qty(net / 1000, 3)} T` : '', tone: 'text-emerald-700' },
              { label: 'Cubic feet', value: cft ? `${qty(cft)} cft` : '' },
              { label: 'Weights from', value: sale.weightSource === 'weighbridge' ? 'Weighbridge ticket' : 'Entered by hand' }
            ]}
          />

          <Section
            title="Amount"
            rows={[
              { label: 'Rate', value: Number(sale.rate || 0) ? `${rupees(sale.rate)} / ${isCubic ? 'cft' : 'ton'}` : '' },
              { label: 'Material amount', value: rupees(view.materialAmount) },
              {
                label: 'Royalty',
                value: hasRoyalty
                  ? `${royaltyQty && royaltyRate ? `${qty(royaltyQty, 3)} T × ${rupees(royaltyRate)} = ` : ''}${rupees(view.royaltyAmount)}`
                  : '',
                tone: 'text-orange-700'
              },
              { label: `GST${hasGst ? ` (${qty(sale.gstRate)}%)` : ''}`, value: hasGst ? rupees(view.gstAmount) : '', tone: 'text-sky-700' },
              { label: 'Transport charge', value: view.transportCharge > 0 ? rupees(view.transportCharge) : '' },
              { label: 'Total', value: rupees(total), strong: true }
            ]}
          />

          <Section
            title="Payment"
            rows={[
              { label: 'Payment', value: PAYMENT_LABELS[sale.type] || 'Credit (not paid)' },
              { label: 'Paid', value: rupees(paid), tone: paid > 0 ? 'text-emerald-700' : '' },
              { label: 'Received in', value: paid > 0 ? accountName || 'Cash Account' : '' },
              { label: 'Balance', value: rupees(balance), tone: balance > 0 ? 'text-rose-600' : '', strong: true }
            ]}
          />

          {sale.slipImg && (
            <section className="rounded-xl border border-slate-200 bg-white md:col-span-2">
              <h3 className="border-b border-slate-100 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Slip photo</h3>
              <a href={sale.slipImg} target="_blank" rel="noreferrer" className="block p-3" title="Open the slip in a new tab">
                <img src={sale.slipImg} alt="Weighbridge slip" className="mx-auto max-h-72 rounded-lg object-contain ring-1 ring-slate-200" />
                <span className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-primary-600">
                  <ImageIcon size={14} /> Open full size
                </span>
              </a>
            </section>
          )}

          <div className="md:col-span-2">
            <Section
              title="Entry"
              rows={[
                { label: 'Added by', value: createdBy },
                { label: 'Last changed by', value: updatedBy }
              ]}
            />
          </div>
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 bg-white p-3 md:gap-3 md:p-4 [&>button]:flex-1 md:[&>button]:flex-none">
          {onDelete && (
            <button type="button" className="btn-secondary text-rose-600 hover:bg-rose-50 md:mr-auto" onClick={onDelete}>
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-secondary" onClick={onOpenInvoice}>
            <FileText size={16} /> Invoice
          </button>
          {onEdit && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <Pencil size={16} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
