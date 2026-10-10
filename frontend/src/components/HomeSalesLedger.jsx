import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, ReceiptText, ShoppingCart, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import { PERIOD_BASES, getBasisUnit, getSaleTransportCharge } from '../utils/transport';

const formatCurrency = (value) => (
  `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
);

/**
 * How the load was carried, in one line: "Party vehicle", "My vehicle · ₹800", or
 * "Hired · Sharma Transport · ₹500 / trip · ₹800" (the rate paid to the transporter, then what the party is charged).
 */
const describeSaleTransport = (sale, partyMap) => {
  const mode = sale.transportMode || 'party';
  if (mode === 'party') return 'Party vehicle';
  const charge = getSaleTransportCharge(sale);
  const parts = [mode === 'hired' ? 'Hired' : 'My vehicle'];
  if (mode === 'hired') {
    const transporter = partyMap.get(String(sale.transporterId?._id || sale.transporterId || ''));
    const unit = getBasisUnit(sale.transportBasis);
    if (transporter) parts.push(transporter);
    if (PERIOD_BASES.includes(sale.transportBasis)) parts.push('monthly rent');
    else if (Number(sale.transportRate || 0) > 0) parts.push(`₹${Number(sale.transportRate).toLocaleString('en-IN')}${unit ? ` / ${unit}` : ''}`);
  }
  if (charge > 0) parts.push(`charged ₹${charge.toLocaleString('en-IN')}`);
  return parts.join(' · ');
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const formatTime = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '-';
};

const formatSaleTypeLabel = (value) => {
  if (value === 'partial') return 'Partial';
  if (value === 'cash') return 'Cash';
  return 'Credit';
};

const getSaleQtyLabel = (sale) => {
  if (sale?.pricingMode === 'per_cubic_meter') {
    return `${formatNumber(sale?.cubicMeterQty || 0)} m³`;
  }

  const netWeight = Number(sale?.netWeight || sale?.materialWeight || 0);
  return `${formatNumber(netWeight)} kg (${formatNumber(netWeight / 1000)} ton)`;
};

const getMaterialBadgeClass = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === '10mm') return 'border border-sky-200 bg-sky-50 text-sky-700';
  if (normalized === '20mm') return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === '40mm') return 'border border-violet-200 bg-violet-50 text-violet-700';
  return 'border border-amber-200 bg-amber-50 text-amber-700';
};

function StatCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)] lg:px-3 lg:py-2.5 xl:px-4 xl:py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-[7px] xl:text-[10px]">{title}</p>
          <p className="mt-1 text-lg font-black text-slate-800 lg:text-[12px] xl:text-lg">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500 lg:text-[9px] xl:text-xs">{subtitle}</p>
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2 text-white lg:p-1.5 xl:p-2 ${tone}`}>
          <Icon className="h-4 w-4 lg:h-3 lg:w-3 xl:h-4 xl:w-4" />
        </div>
      </div>
    </div>
  );
}

export default function HomeSalesLedger() {
  const [sales, setSales] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        const [salesRes, partiesRes] = await Promise.all([
          apiClient.get('/sales'),
          apiClient.get('/parties')
        ]);
        setSales(Array.isArray(salesRes) ? salesRes : []);
        setParties(Array.isArray(partiesRes) ? partiesRes : []);
        setError('');
      } catch (err) {
        setError(err.message || 'Unable to load sales ledger');
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, []);

  const partyMap = useMemo(() => new Map(
    parties.map((party) => [String(party._id), party.name || 'Unknown'])
  ), [parties]);

  const sortedSales = useMemo(() => (
    [...sales].sort((a, b) => {
      const aTime = new Date(a.saleDate || a.createdAt).getTime() || 0;
      const bTime = new Date(b.saleDate || b.createdAt).getTime() || 0;
      return bTime - aTime;
    })
  ), [sales]);

  const summary = useMemo(() => sortedSales.reduce((acc, sale) => ({
    count: acc.count + 1,
    totalAmount: acc.totalAmount + Number(sale.totalAmount || 0),
    paidAmount: acc.paidAmount + Number(sale.paidAmount || 0),
    dueAmount: acc.dueAmount + Math.max(0, Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0))
  }), {
    count: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0
  }), [sortedSales]);

  const recentSales = sortedSales.slice(0, 8);

  return (
    <div className="space-y-5 p-5 sm:p-6 lg:space-y-4 lg:p-4 xl:space-y-5 xl:p-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2.5 xl:gap-3">
        <StatCard title="Invoices" value={summary.count} subtitle="total sales entries" icon={ReceiptText} tone="from-sky-500 to-cyan-500" />
        <StatCard title="Total Sale" value={formatCurrency(summary.totalAmount)} subtitle="billed amount" icon={ShoppingCart} tone="from-emerald-500 to-teal-500" />
        <StatCard title="Paid" value={formatCurrency(summary.paidAmount)} subtitle="received amount" icon={IndianRupee} tone="from-violet-500 to-fuchsia-500" />
        <StatCard title="Due" value={formatCurrency(summary.dueAmount)} subtitle="pending amount" icon={Truck} tone="from-amber-500 to-orange-500" />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white lg:rounded-[20px] xl:rounded-[24px]">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm font-medium text-slate-500">Loading sales ledger...</div>
        ) : recentSales.length > 0 ? (
          <>
            <div className="space-y-3 p-3 lg:hidden">
              {recentSales.map((sale) => {
                const partyName = partyMap.get(String(sale.partyId || sale.party)) || sale.customerName || '-';
                const materialName = sale.materialType || sale.stoneSize || '-';
                return (
                  <div key={sale._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 p-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{partyName}</p>
                        <p className="text-xs text-slate-500">{sale.invoiceNumber || '-'} • {formatDate(sale.saleDate || sale.createdAt)}{sale.dispatchLocation ? ` • to ${sale.dispatchLocation}` : ''}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getMaterialBadgeClass(materialName)}`}>{String(materialName).toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Vehicle</p><p className="mt-1 text-sm font-semibold text-slate-800">{sale.vehicleNo || '-'}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Sale Type</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatSaleTypeLabel(sale.saleType)}</p></div>
                      <div className="col-span-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Transport</p><p className="mt-1 text-sm text-slate-800">{describeSaleTransport(sale, partyMap)}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-3">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Entry Time</p><p className="mt-1 text-sm text-slate-800">{formatTime(sale.entryTime)}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Exit Time</p><p className="mt-1 text-sm text-slate-800">{formatTime(sale.exitTime)}</p></div>
                    </div>
                    <div className="border-t border-slate-100 p-3">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Qty</p><p className="mt-1 text-sm font-bold text-sky-700">{getSaleQtyLabel(sale)}</p></div>
                    </div>
                    <div className="border-t border-slate-100 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Total</p>
                      <p className="mt-1 text-sm font-bold text-emerald-600">{formatCurrency(sale.totalAmount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1040px] xl:min-w-[1140px]">
              <thead>
                <tr className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Transport</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Party</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Exit</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] lg:px-2 lg:py-1 lg:text-[8px] xl:px-4 xl:py-3 xl:text-xs">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale) => {
                  const partyName = partyMap.get(String(sale.partyId || sale.party)) || sale.customerName || '-';
                  const materialName = sale.materialType || sale.stoneSize || '-';
                  return (
                    <tr key={sale._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{formatDate(sale.saleDate || sale.createdAt)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{sale.invoiceNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{sale.vehicleNo || '-'}</td>
                      <td className="max-w-[16rem] px-4 py-3 text-xs text-amber-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[11px]">{describeSaleTransport(sale, partyMap)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">
                        {partyName}
                        {sale.dispatchLocation && <span className="block text-[11px] text-slate-500 lg:text-[8px] xl:text-[11px]">To {sale.dispatchLocation}</span>}
                      </td>
                      <td className="px-4 py-3 lg:px-2 lg:py-1.5 xl:px-4 xl:py-3">
                        {materialName && materialName !== '-' ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold lg:px-1.5 lg:py-0.5 lg:text-[9px] xl:px-2.5 xl:py-1 xl:text-xs ${getMaterialBadgeClass(materialName)}`}>
                            {String(materialName).toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-700 lg:text-[9px] xl:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{formatTime(sale.entryTime)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{formatTime(sale.exitTime)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-sky-700 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{getSaleQtyLabel(sale)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600 lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-4 xl:py-3 xl:text-[12px]">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <ShoppingCart className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">No sales found</p>
            <p className="mt-1 text-sm text-slate-500">Recent sales entries will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
