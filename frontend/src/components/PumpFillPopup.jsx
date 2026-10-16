import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, Fuel, Search } from 'lucide-react';
import apiClient from '../utils/api';
import useAccounts from '../utils/useAccounts';
import AccountSelect from './AccountSelect';
import FormPopup from './FormPopup';
import OptionList from './OptionList';
import { describeVehicle, meterUnitFor, sortVehiclesForFuel } from '../utils/diesel';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../utils/useFloatingDropdownPosition';

const TOAST_OPTIONS = { position: 'top-right', autoClose: 2200 };
const MAX_OPTIONS = 50;

const todayKey = () => new Date().toLocaleDateString('en-CA');
const toDateKey = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-CA') : todayKey();
};
const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
// Two decimals at most, without trailing zeros: 92.5, 104.17
const round2 = (value) => String(Math.round(Number(value) * 100) / 100);
const isCash = (party) => String(party?.name || '').trim().toLowerCase() === 'cash';

/** Type-to-search box with a list under it (party, vehicle). */
function PickField({ id, label, placeholder, options, value, onPick, getLabel, getHint, emptyText, autoFocus }) {
  const boxRef = useRef(null);
  const [query, setQuery] = useState(null); // null: show the picked option instead of a search
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((option) => String(option._id) === String(value)) || null;
  const shown = useMemo(() => {
    const needle = String(query || '').trim().toLowerCase();
    const matches = needle
      ? options.filter((option) => `${getLabel(option)} ${getHint?.(option) || ''}`.toLowerCase().includes(needle))
      : options;
    return matches.slice(0, MAX_OPTIONS);
  }, [options, query, getLabel, getHint]);
  const style = useFloatingDropdownPosition(boxRef, open, [shown.length, active]);

  const pick = (option) => {
    onPick(option);
    setQuery(null);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => Math.max(0, Math.min(shown.length - 1, current + step)));
    } else if (event.key === 'Enter' && open && shown[active]) {
      event.preventDefault();
      event.stopPropagation();
      pick(shown[active]);
    }
  };

  return (
    <div>
      <label className="label" htmlFor={id}>{label} <span className="text-rose-500">*</span></label>
      <div
        ref={boxRef}
        className="relative"
        onBlurCapture={(event) => {
          if (boxRef.current?.contains(event.relatedTarget)) return;
          setOpen(false);
          setQuery(null);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          className="input pl-9 pr-9 font-semibold"
          type="text"
          value={query ?? (selected ? getLabel(selected) : '')}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
          onFocus={(event) => { setOpen(true); setActive(0); event.target.select(); }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open && style && (
          <OptionList
            style={style}
            options={shown}
            activeIndex={active}
            emptyText={emptyText}
            getKey={(option) => option._id}
            getLabel={getLabel}
            getHint={getHint}
            isSelected={(option) => String(option._id) === String(value)}
            onHover={setActive}
            onPick={pick}
          />
        )}
      </div>
    </div>
  );
}

const emptyForm = (vehicleId = '') => ({
  purchaseDate: todayKey(),
  party: '',
  vehicle: vehicleId,
  litres: '',
  rate: '',
  amount: '',
  paidNow: false,
  paymentAmount: '',
  account: '',
  supplierInvoice: '',
  meter: '',
  notes: ''
});

/**
 * Pump Fill: diesel bought at a petrol pump straight into a vehicle.
 * Saved as a purchase from the pump (party ledger, payment, cash / bank as usual) that also issues the diesel
 * to the vehicle, so stock stays the same. `editing` is a saved pump fill purchase; `presetVehicle` picks a vehicle.
 */
export default function PumpFillPopup({ editing = null, presetVehicle = '', onClose, onSaved }) {
  const { accounts, defaultAccountId } = useAccounts();
  const [parties, setParties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diesel, setDiesel] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => {
    if (!editing) return emptyForm(presetVehicle);
    const line = editing.items?.[0] || {};
    const total = Number(editing.totalAmount || 0);
    const paid = Number(editing.paidAmount || 0);
    return {
      purchaseDate: toDateKey(editing.purchaseDate),
      party: String(editing.party?._id || editing.party || ''),
      vehicle: String(editing.fillVehicle?._id || editing.fillVehicle || ''),
      litres: line.quantity ? String(line.quantity) : '',
      rate: line.unitPrice ? String(line.unitPrice) : '',
      amount: total ? String(total) : '',
      paidNow: paid > 0,
      paymentAmount: paid > 0 ? String(paid) : '',
      account: String(editing.account?._id || editing.account || ''),
      supplierInvoice: editing.supplierInvoice || '',
      meter: editing.fillMeter !== null && editing.fillMeter !== undefined ? String(editing.fillMeter) : '',
      notes: editing.notes || ''
    };
  });

  useEffect(() => {
    let live = true;
    Promise.all([apiClient.get('/parties'), apiClient.get('/vehicles'), apiClient.get('/products')])
      .then(([partyResponse, vehicleResponse, productResponse]) => {
        if (!live) return;
        const partyList = Array.isArray(partyResponse) ? partyResponse : [];
        setParties([...partyList].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
        setVehicles(sortVehiclesForFuel(Array.isArray(vehicleResponse) ? vehicleResponse : []));
        const products = productResponse?.data || [];
        const editingProduct = editing?.items?.[0]?.product;
        const item = (editingProduct && products.find((product) => String(product._id) === String(editingProduct?._id || editingProduct)))
          || products.find((product) => product.isDiesel);
        if (item) setDiesel(item);
        else setLoadError('The Diesel item is missing. Open Stock and add an item named Diesel.');
      })
      .catch((err) => live && setLoadError(err.message || 'Could not load parties and vehicles'));
    return () => { live = false; };
  }, [editing]);

  const selectedParty = parties.find((party) => String(party._id) === form.party) || null;
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle._id) === form.vehicle) || null;
  const meterUnit = meterUnitFor('vehicle', selectedVehicle?.category);
  const unit = diesel?.unit || 'ltr';
  const amount = Number(form.amount || 0);
  const cashParty = isCash(selectedParty);
  const paid = cashParty ? amount : form.paidNow ? Math.min(amount, Number(form.paymentAmount || 0)) : 0;

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Litres × rate = amount. Typing the amount works out the rate, as the pump slip shows litres and amount.
  const changeLitres = (event) => {
    const litres = event.target.value;
    setForm((prev) => ({
      ...prev,
      litres,
      amount: litres && prev.rate ? round2(Number(litres) * Number(prev.rate)) : prev.amount
    }));
  };
  const changeRate = (event) => {
    const rate = event.target.value;
    setForm((prev) => ({
      ...prev,
      rate,
      amount: rate && prev.litres ? round2(Number(prev.litres) * Number(rate)) : prev.amount
    }));
  };
  const changeAmount = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      amount: value,
      rate: value && Number(prev.litres) > 0 ? round2(Number(value) / Number(prev.litres)) : prev.rate
    }));
  };

  const handleSubmit = async () => {
    if (!diesel) return toast.error(loadError || 'Loading…', TOAST_OPTIONS);
    if (!form.party) return toast.error('Select the petrol pump (party)', TOAST_OPTIONS);
    if (!form.vehicle) return toast.error('Select the vehicle', TOAST_OPTIONS);
    if (!form.purchaseDate) return toast.error('Enter the date', TOAST_OPTIONS);
    const litres = Number(form.litres);
    if (!(litres > 0)) return toast.error(`Enter the ${unit === 'ltr' ? 'litres' : 'quantity'}`, TOAST_OPTIONS);
    if (!(amount > 0)) return toast.error('Enter the amount', TOAST_OPTIONS);
    if (form.meter !== '' && !(Number(form.meter) >= 0)) return toast.error('Meter reading must be a number', TOAST_OPTIONS);

    const rate = Number(form.rate) > 0 ? Number(form.rate) : amount / litres;
    const payload = {
      party: form.party,
      purchaseDate: form.purchaseDate,
      supplierInvoice: form.supplierInvoice.trim(),
      items: [{
        product: diesel._id,
        productName: diesel.name,
        unit,
        quantity: litres,
        unitPrice: Math.round(rate * 100) / 100,
        total: amount
      }],
      totalAmount: amount,
      paymentAmount: paid,
      account: form.account || defaultAccountId || undefined,
      notes: form.notes.trim(),
      fillVehicle: form.vehicle,
      fillMeter: form.meter === '' ? null : Number(form.meter)
    };

    try {
      setSaving(true);
      if (editing) await apiClient.put(`/purchases/${editing._id}`, payload);
      else await apiClient.post('/purchases', payload);
      toast.success(editing ? 'Pump fill updated' : `Pump fill saved · ${form.litres} ${unit} to ${selectedVehicle?.vehicleNo || 'vehicle'}`, TOAST_OPTIONS);
      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Could not save the pump fill', TOAST_OPTIONS);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={editing ? 'Edit Pump Fill' : 'Pump Fill'}
      subtitle="Diesel filled at a petrol pump straight into a vehicle — not added to stock"
      submitLabel={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
      submitDisabled={saving || !diesel}
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
      maxWidth="max-w-lg"
    >
      {loadError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{loadError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PickField
          id="pump-party"
          label="Petrol Pump (Party)"
          placeholder="Search party"
          options={parties}
          value={form.party}
          onPick={(party) => setForm((prev) => ({ ...prev, party: String(party._id) }))}
          getLabel={(party) => party.name || 'Party'}
          getHint={(party) => party.mobile || ''}
          emptyText="No party found. Add the pump in Party first."
          autoFocus={!editing}
        />
        <PickField
          id="pump-vehicle"
          label="Vehicle"
          placeholder="Search vehicle no."
          options={vehicles}
          value={form.vehicle}
          onPick={(vehicle) => setForm((prev) => ({ ...prev, vehicle: String(vehicle._id) }))}
          getLabel={(vehicle) => vehicle.vehicleNo || 'Vehicle'}
          getHint={describeVehicle}
          emptyText="No vehicle found."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date <span className="text-rose-500">*</span></label>
          <input type="date" className="input" value={form.purchaseDate} onChange={set('purchaseDate')} />
        </div>
        <div>
          <label className="label">Pump Bill No.</label>
          <input className="input" placeholder="Optional" value={form.supplierInvoice} onChange={set('supplierInvoice')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">{unit === 'ltr' ? 'Litres' : 'Quantity'} <span className="text-rose-500">*</span></label>
          <div className="relative">
            <input type="number" min="0" step="any" className="input pr-9" placeholder="0" value={form.litres} onChange={changeLitres} />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{unit}</span>
          </div>
        </div>
        <div>
          <label className="label">Rate</label>
          <input type="number" min="0" step="any" className="input" placeholder={`₹ / ${unit}`} value={form.rate} onChange={changeRate} />
        </div>
        <div>
          <label className="label">Amount <span className="text-rose-500">*</span></label>
          <input type="number" min="0" step="any" className="input font-semibold" placeholder="₹" value={form.amount} onChange={changeAmount} />
        </div>
      </div>

      <div>
        <label className="label">Payment</label>
        {cashParty ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">Cash party: paid in full ({formatRupees(amount)})</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[{ key: false, label: 'Credit (pay later)' }, { key: true, label: 'Paid now' }].map((option) => (
              <button
                key={String(option.key)}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, paidNow: option.key, paymentAmount: option.key && !prev.paymentAmount ? prev.amount : prev.paymentAmount }))}
                aria-pressed={form.paidNow === option.key}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                  form.paidNow === option.key
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(cashParty || form.paidNow) && (
        <div className="grid grid-cols-2 gap-3">
          {!cashParty && (
            <div>
              <label className="label">Amount Paid</label>
              <input type="number" min="0" step="any" className="input" placeholder="₹" value={form.paymentAmount} onChange={set('paymentAmount')} />
            </div>
          )}
          <div className={cashParty ? 'col-span-2' : ''}>
            <label className="label">Paid From</label>
            <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} value={form.account} onChange={set('account')} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{meterUnit === 'hr' ? 'Hour Meter' : 'KM Reading'} at Pump</label>
          <div className="relative">
            <input type="number" min="0" step="any" className="input pr-10" placeholder="Optional" value={form.meter} onChange={set('meter')} />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">{meterUnit}</span>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" placeholder="Optional" value={form.notes} onChange={set('notes')} />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
        <Fuel size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p>
          {amount > 0 && form.litres
            ? <><span className="font-semibold">{form.litres} {unit}</span> to <span className="font-semibold">{selectedVehicle?.vehicleNo || 'the vehicle'}</span> · {formatRupees(amount)}{' '}
                {selectedParty ? <>in <span className="font-semibold">{selectedParty.name}</span>&apos;s ledger</> : ''}
                {amount - paid > 0 ? <> · <span className="font-semibold">{formatRupees(amount - paid)} due</span></> : ' · paid'}.{' '}</>
            : ''}
          Stock does not change: the diesel goes straight into the vehicle and shows as a pump fill in the diesel report.
        </p>
      </div>
    </FormPopup>
  );
}
