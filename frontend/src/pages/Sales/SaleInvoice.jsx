import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatGstRate, getSavedSaleGst } from '../../utils/saleGst';
import { getSavedSaleRoyalty } from '../../utils/saleRoyalty';
import { getSaleTransportCharge } from '../../utils/transport';

const MATERIAL_NAMES = {
  dust: 'Stone Dust',
  wmm: 'WMM (Wet Mix Macadam)',
  gsb: 'GSB (Granular Sub Base)'
};

const getMaterialName = (stoneSize) => {
  const value = String(stoneSize || '').trim().toLowerCase();
  if (!value) return 'Material';
  if (MATERIAL_NAMES[value]) return MATERIAL_NAMES[value];
  return `Stone Aggregate ${value.toUpperCase()}`;
};

const formatMoney = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQty = (value, digits = 3) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: digits });
const formatKg = (value) => `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// 152450 -> "One Lakh Fifty Two Thousand Four Hundred Fifty"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const belowThousand = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
};
const numberToIndianWords = (value) => {
  let n = Math.floor(Math.abs(Number(value || 0)));
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return parts.join(' ');
};
const amountInWords = (value) => {
  const rupees = Math.floor(Number(value || 0));
  const paise = Math.round((Number(value || 0) - rupees) * 100);
  return `Rupees ${numberToIndianWords(rupees)}${paise > 0 ? ` and ${belowHundred(paise)} Paise` : ''} Only`;
};

const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// The invoice of one sale: the crusher on top, the party it is billed to, the material sold,
// royalty and GST when the sale has them. Transport is left out of the invoice.
export default function SaleInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get(`/sales/${id}/invoice`)
      .then((response) => { if (active) setData(response); })
      .catch((err) => { if (active) setError(err?.message || 'Could not load the invoice'); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (data?.sale?.invoiceNumber) document.title = `Invoice ${data.sale.invoiceNumber}`;
  }, [data]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/reports/sales-report');
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-4 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button type="button" className="btn-primary px-4" onClick={goBack}>Go back</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const { sale, party, seller } = data;
  const byCubic = sale.pricingMode === 'per_cubic_meter';
  const gstAmount = getSavedSaleGst(sale);
  const royaltyAmount = getSavedSaleRoyalty(sale);
  const transportCharge = getSaleTransportCharge(sale);
  // The material on its own, as saved: the sale total less transport, royalty and GST
  const materialAmount = Math.max(0, Number(sale.totalAmount || 0) - transportCharge - royaltyAmount - gstAmount);
  const netWeight = Number(sale.netWeight || 0);
  const quantity = byCubic ? Number(sale.cubicMeterQty || 0) : netWeight / 1000;
  const taxableAmount = materialAmount + royaltyAmount;
  const invoiceTotal = taxableAmount + gstAmount;
  const roundedTotal = Math.round(invoiceTotal);
  const roundOff = roundedTotal - invoiceTotal;
  const isGst = gstAmount > 0;
  const gstRate = Number(sale.gstRate || 0);
  // Inside the same state GST is split into CGST + SGST; to another state it is IGST
  const isInterState = Boolean(seller?.state && party?.state && !sameText(seller.state, party.state));

  const items = [
    {
      key: 'material',
      name: getMaterialName(sale.stoneSize || sale.materialType),
      note: netWeight > 0
        ? `Gross ${formatKg(sale.grossWeight)} · Tare ${formatKg(sale.tareWeight)} · Net ${formatKg(netWeight)}`
        : '',
      qty: byCubic ? formatQty(quantity, 2) : formatQty(quantity),
      unit: byCubic ? 'Cft' : 'Ton',
      rate: Number(sale.rate || 0),
      amount: materialAmount
    },
    ...(royaltyAmount > 0
      ? [{
          key: 'royalty',
          name: 'Royalty',
          note: sale.royaltyNo ? `Royalty No ${sale.royaltyNo}` : '',
          qty: formatQty(sale.royaltyQty),
          unit: 'Ton',
          rate: Number(sale.royaltyRate || 0),
          amount: royaltyAmount
        }]
      : [])
  ];

  const sellerPlace = [seller?.district, seller?.state].filter(Boolean).join(', ');
  const partyPlace = [party?.state, party?.pincode].filter(Boolean).join(' - ');
  const details = [
    { label: 'Invoice No', value: sale.invoiceNumber || '-' },
    { label: 'Date', value: formatDate(sale.saleDate || sale.createdAt) },
    { label: 'Vehicle No', value: sale.vehicleNo || '-' },
    ...(sale.rstNo ? [{ label: 'RST No', value: sale.rstNo }] : []),
    ...(royaltyAmount > 0 && sale.royaltyNo ? [{ label: 'Royalty No', value: sale.royaltyNo }] : [])
  ];

  const TH = 'border border-slate-300 px-2 py-1.5 text-left text-[11px] font-bold uppercase text-slate-700';
  const TD = 'border border-slate-300 px-2 py-1.5 align-top';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-4 text-slate-900 sm:px-4 print:bg-white print:p-0">
      <style>{'@page { size: A4; margin: 10mm; } @media print { body { background: #fff !important; } }'}</style>

      {/* Not printed */}
      <div className="mx-auto mb-3 flex max-w-[210mm] items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={goBack} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-1.5 px-4">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200 sm:p-8 print:max-w-none print:p-0 print:shadow-none print:ring-0">
        {/* Crusher */}
        <header className="border-b-2 border-slate-800 pb-3 text-center">
          <h1 className="text-xl font-extrabold uppercase tracking-wide sm:text-2xl">{seller?.name || 'Crusher'}</h1>
          {seller?.address && <p className="mt-0.5 text-xs text-slate-700">{seller.address}</p>}
          {sellerPlace && <p className="text-xs text-slate-700">{sellerPlace}</p>}
          <p className="mt-0.5 text-xs text-slate-700">
            {[seller?.mobile ? `Mobile: ${seller.mobile}` : '', seller?.email ? `Email: ${seller.email}` : ''].filter(Boolean).join('  |  ')}
          </p>
          {seller?.gstin && <p className="mt-0.5 text-xs font-bold">GSTIN: {seller.gstin}</p>}
        </header>

        <h2 className="my-3 text-center text-base font-bold uppercase tracking-widest">{isGst ? 'Tax Invoice' : 'Invoice'}</h2>

        {/* Billed to / invoice details */}
        <section className="grid grid-cols-1 border border-slate-300 sm:grid-cols-2 print:grid-cols-2">
          <div className="border-b border-slate-300 p-3 sm:border-b-0 sm:border-r print:border-b-0 print:border-r">
            <p className="text-[11px] font-bold uppercase text-slate-500">Billed To</p>
            <p className="mt-0.5 text-base font-bold">{party?.name || '-'}</p>
            {party?.address && <p className="text-xs text-slate-700">{party.address}</p>}
            {partyPlace && <p className="text-xs text-slate-700">{partyPlace}</p>}
            {party?.mobile && <p className="text-xs text-slate-700">Mobile: {party.mobile}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-3 text-xs">
            {details.map((row) => (
              <div key={row.label} className="contents">
                <dt className="font-semibold text-slate-500">{row.label}</dt>
                <dd className="font-bold">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What is sold */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs print:min-w-0">
            <thead className="bg-slate-100">
              <tr>
                <th className={`${TH} w-8`}>#</th>
                <th className={TH}>Item</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={TH}>Unit</th>
                <th className={`${TH} text-right`}>Rate (Rs)</th>
                <th className={`${TH} text-right`}>Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.key}>
                  <td className={TD}>{index + 1}</td>
                  <td className={TD}>
                    <span className="font-semibold">{item.name}</span>
                    {item.note && <span className="block text-[11px] text-slate-500">{item.note}</span>}
                  </td>
                  <td className={`${TD} text-right`}>{item.qty}</td>
                  <td className={TD}>{item.unit}</td>
                  <td className={`${TD} text-right`}>{formatMoney(item.rate)}</td>
                  <td className={`${TD} text-right font-semibold`}>{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <section className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
          <div className="text-xs sm:max-w-[55%] print:max-w-[55%]">
            <p className="font-semibold text-slate-500">Amount in words</p>
            <p className="mt-0.5 font-bold">{amountInWords(roundedTotal)}</p>
          </div>
          <table className="w-full border-collapse text-xs sm:w-72 print:w-72">
            <tbody>
              {(isGst || royaltyAmount > 0) && (
                <tr>
                  <td className={TD}>{isGst ? 'Taxable Amount' : 'Sub Total'}</td>
                  <td className={`${TD} text-right`}>{formatMoney(taxableAmount)}</td>
                </tr>
              )}
              {isGst && (isInterState ? (
                <tr>
                  <td className={TD}>IGST @ {formatGstRate(gstRate)}</td>
                  <td className={`${TD} text-right`}>{formatMoney(gstAmount)}</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className={TD}>CGST @ {formatGstRate(gstRate / 2)}</td>
                    <td className={`${TD} text-right`}>{formatMoney(gstAmount / 2)}</td>
                  </tr>
                  <tr>
                    <td className={TD}>SGST @ {formatGstRate(gstRate / 2)}</td>
                    <td className={`${TD} text-right`}>{formatMoney(gstAmount / 2)}</td>
                  </tr>
                </>
              ))}
              {Math.abs(roundOff) >= 0.005 && (
                <tr>
                  <td className={TD}>Round Off</td>
                  <td className={`${TD} text-right`}>{roundOff > 0 ? '+' : '-'}{formatMoney(Math.abs(roundOff))}</td>
                </tr>
              )}
              <tr className="bg-slate-100">
                <td className={`${TD} text-sm font-bold`}>Total</td>
                <td className={`${TD} text-right text-sm font-bold`}>Rs {formatMoney(roundedTotal)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Signature */}
        <footer className="mt-10 flex items-end justify-between gap-4 text-xs">
          <p className="text-slate-500">This is a computer generated invoice.</p>
          <div className="text-right">
            <p className="font-bold">For {seller?.name || 'Crusher'}</p>
            <p className="mt-10 border-t border-slate-400 pt-1 text-slate-600">Authorised Signatory</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
