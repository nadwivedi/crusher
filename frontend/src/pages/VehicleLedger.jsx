import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarClock, ClipboardList, Inbox, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2, Truck, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../utils/api';
import StatCard from '../components/StatCard';
import Segmented from '../components/Segmented';
import { getBasisLabel, getVehicleCategoryLabel } from '../utils/transport';
import { formatHireDate, formatRupees, toDayInput } from '../utils/monthlyHire';
import AddVehiclePopup from './Vehicle/component/AddVehiclePopup';
import HireEntryPopup from './Vehicle/component/HireEntryPopup';
import MonthlyHireList from './MonthlyHire/component/MonthlyHireList';
import MonthlyHireDetail from './MonthlyHire/component/MonthlyHireDetail';
import MonthlyHireForm from './MonthlyHire/component/MonthlyHireForm';
import AdjustmentPopup from './MonthlyHire/component/AdjustmentPopup';
import CancelHirePopup from './MonthlyHire/component/CancelHirePopup';

const TH = 'tbl-head px-3 py-2 first:pl-5 last:pr-5';
const TD = 'tbl-cell px-3 py-2 first:pl-5 last:pr-5';

const VIEWS = [
  { key: '', label: 'Everything', shortLabel: 'All' },
  { key: 'hire', label: 'Monthly Hire', shortLabel: 'Hire' },
  { key: 'money', label: 'Ledger', icon: Wallet },
  { key: 'load', label: 'Loads Carried', shortLabel: 'Loads' }
];

const formatTon = (kg) => `${(Number(kg || 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })} t`;

// What a ledger entry is, in a few words
const getEntryTitle = (entry) => {
  if (entry.source === 'monthly_hire') return entry.direction === 'receivable' ? 'Monthly rent received' : 'Monthly rent booked';
  if (entry.source === 'sale') return entry.direction === 'receivable' ? 'Transport charged in sale' : 'Hire for a sale trip';
  if (entry.source === 'boulder') return 'Hire for a boulder trip';
  return entry.direction === 'receivable' ? 'Vehicle given (income)' : 'Hire entry';
};

const describeEntry = (entry) => {
  if (entry.source === 'monthly_hire') return String(entry.notes || '').replace(/^Monthly hire /, '');
  const basis = entry.basis === 'fixed'
    ? 'Fixed amount'
    : `${Number(entry.quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} × ₹${Number(entry.rate || 0).toLocaleString('en-IN')} ${getBasisLabel(entry.basis).toLowerCase()}`;
  return [basis, entry.location, entry.notes].filter(Boolean).join(' · ');
};

/**
 * One row per thing that happened to the vehicle, oldest first so the running hire total reads down:
 * hire started / changed / adjusted / cancelled, each month and trip that went to the ledger, and each load it carried.
 */
const buildTimeline = (data) => {
  const rows = [];

  for (const hire of data.hires) {
    for (const [index, event] of (hire.history || []).entries()) {
      rows.push({
        key: `h-${hire._id}-${index}`,
        view: 'hire',
        date: event.at,
        recordedAt: event.at,
        title: `Hire ${event.action.toLowerCase()}`,
        detail: [event.note, hire.partyName].filter(Boolean).join(' · '),
        hireId: hire._id,
        tone: event.action === 'Cancelled' ? 'badge-red' : event.action === 'Started' || event.action === 'Resumed' ? 'badge-green' : 'badge-blue'
      });
    }
  }

  for (const entry of data.transports) {
    rows.push({
      key: `t-${entry._id}`,
      view: 'money',
      date: entry.entryDate,
      recordedAt: entry.createdAt,
      title: getEntryTitle(entry),
      detail: [entry.entryNumber, entry.partyName, describeEntry(entry)].filter(Boolean).join(' · '),
      hireId: entry.hireId,
      // An extra charge added by hand is changed here; the rest come from sales, boulder entries and monthly rent
      entry: entry.source === 'manual' ? entry : null,
      amount: Number(entry.amount || 0),
      direction: entry.direction,
      tone: entry.direction === 'receivable' ? 'badge-green' : 'badge-orange'
    });
  }

  for (const sale of data.sales) {
    rows.push({
      key: `s-${sale._id}`,
      view: 'load',
      date: sale.date,
      recordedAt: sale.createdAt,
      title: 'Sale load',
      detail: [
        sale.invoiceNumber,
        sale.partyName,
        sale.material,
        sale.pricingMode === 'per_cubic_meter' ? `${Number(sale.cubicMeterQty || 0)} m³` : formatTon(sale.netWeight)
      ].filter(Boolean).join(' · '),
      tone: 'badge-blue'
    });
  }

  for (const boulder of data.boulders) {
    rows.push({
      key: `b-${boulder._id}`,
      view: 'load',
      date: boulder.date,
      recordedAt: boulder.createdAt,
      title: 'Boulder load',
      detail: [
        boulder.boulderNumber,
        boulder.partyName,
        boulder.entryMode === 'bulk' ? `${boulder.tripCount} trips` : '',
        formatTon(boulder.netWeight)
      ].filter(Boolean).join(' · '),
      tone: 'badge-blue'
    });
  }

  // By day, then by when it was recorded, so things on the same day stay in the order they happened
  const time = (value) => new Date(value || 0).getTime() || 0;
  rows.sort((a, b) => (
    toDayInput(a.date).localeCompare(toDayInput(b.date))
    || time(a.recordedAt) - time(b.recordedAt)
  ));

  // Hire cost to the owner so far: what I owe for the vehicle, less what it earned when given out
  let running = 0;
  for (const row of rows) {
    if (row.view !== 'money') continue;
    running += row.direction === 'receivable' ? -row.amount : row.amount;
    row.running = running;
  }
  return rows;
};

/** A vehicle's full record: its pay terms, every monthly hire and what happened to it, its ledger, and the loads it carried. */
export default function VehicleLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('');
  const [popup, setPopup] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await apiClient.get(`/vehicles/${id}/ledger`));
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Error loading vehicle ledger');
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    apiClient.get(`/vehicles/${id}/ledger`)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || 'Error loading vehicle ledger');
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || popup || document.querySelector('.fixed.inset-0.z-50')) return;
      navigate('/vehicle');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, popup]);

  const timeline = useMemo(() => (data ? buildTimeline(data) : []), [data]);
  const visibleRows = useMemo(() => timeline.filter((row) => !view || row.view === view).reverse(), [timeline, view]);

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete hire entry ${entry.entryNumber}?`)) return;
    try {
      await apiClient.delete(`/transport/${entry._id}`);
      toast.success('Entry deleted');
      load();
    } catch (deleteError) {
      toast.error(deleteError?.message || 'Error deleting entry');
    }
  };

  const renderEntryActions = (row) => row.entry && (
    <span className="inline-flex items-center" onClick={(event) => event.stopPropagation()}>
      <button type="button" title="Edit entry" aria-label="Edit entry" className="icon-btn p-1.5 hover:bg-blue-50 hover:text-blue-600" onClick={() => setPopup({ entry: row.entry })}>
        <Pencil size={14} />
      </button>
      <button type="button" title="Delete entry" aria-label="Delete entry" className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => deleteEntry(row.entry)}>
        <Trash2 size={14} />
      </button>
    </span>
  );

  const closePopup = (changed = false) => {
    setPopup(null);
    if (changed) load();
  };

  if (error && !data) {
    return <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>;
  }
  if (!data) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading vehicle…</p>;
  }

  const { vehicle, hires } = data;
  const isHired = vehicle.ownership === 'hired';
  const isMonthly = isHired && vehicle.hireBasis === 'per_month';
  const runningHire = hires.find((hire) => String(hire._id) === String(vehicle.monthlyHire?._id)) || null;
  const hireCost = timeline.filter((row) => row.view === 'money').reduce((total, row) => total + (row.direction === 'receivable' ? -row.amount : row.amount), 0);
  const monthsBooked = data.transports.filter((entry) => entry.source === 'monthly_hire').length;
  const loads = data.sales.length + data.boulders.length;

  const payTerms = !isHired
    ? 'My vehicle'
    : isMonthly
      ? `Monthly rent ${formatRupees(vehicle.hireRate)}`
      : vehicle.hireBasis === 'per_trip'
        ? `Per trip · ${(vehicle.tripRates || []).length} location(s)`
        : `${getBasisLabel(vehicle.hireBasis)} ${formatRupees(vehicle.hireRate)}`;

  const hireForPopups = runningHire && { ...runningHire, vehicleNo: vehicle.vehicleNo };
  const ownerId = typeof vehicle.partyId === 'object' ? vehicle.partyId?._id : vehicle.partyId;

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {popup === 'edit' && <AddVehiclePopup vehicle={vehicle} onClose={() => closePopup()} onSave={() => closePopup(true)} />}
      {popup === 'again' && (
        <MonthlyHireForm
          preset={{ direction: 'payable', partyId: ownerId, vehicleNo: vehicle.vehicleNo, monthlyRate: vehicle.hireRate }}
          onClose={() => closePopup()}
          onSaved={() => closePopup(true)}
        />
      )}
      {popup === 'adjust' && hireForPopups && <AdjustmentPopup hire={hireForPopups} onClose={() => closePopup()} onDone={() => closePopup(true)} />}
      {popup === 'cancel' && hireForPopups && <CancelHirePopup hire={hireForPopups} onClose={() => closePopup()} onDone={() => closePopup(true)} />}
      {(popup === 'entry' || popup?.entry) && (
        <HireEntryPopup vehicle={vehicle} entry={popup?.entry || null} onClose={() => closePopup()} onSaved={() => closePopup(true)} />
      )}
      {popup?.hireId && (
        <MonthlyHireDetail hireId={popup.hireId} canEdit onClose={() => closePopup(true)} onChanged={load} />
      )}

      <div className="page-header gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/vehicle" aria-label="Back to vehicles" className="icon-btn shrink-0"><ArrowLeft size={18} /></Link>
          <div className="min-w-0">
            <h1 className="page-title font-mono">{vehicle.vehicleNo}</h1>
            <p className="page-subtitle">
              {[getVehicleCategoryLabel(vehicle.category), isHired ? `Hired from ${vehicle.ownerName || '—'}` : 'My vehicle', payTerms].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {runningHire && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setPopup('adjust')}><SlidersHorizontal size={16} /> Adjust A Month</button>
              <button type="button" className="btn-secondary text-amber-700" onClick={() => setPopup('cancel')}><Ban size={16} /> Cancel Rent</button>
            </>
          )}
          {isMonthly && !runningHire && (
            <button type="button" className="btn-primary" onClick={() => setPopup('again')}><RotateCcw size={16} /> Hire Again</button>
          )}
          {isHired && (
            <button type="button" className="btn-secondary" onClick={() => setPopup('entry')}><Plus size={16} /> Add Entry</button>
          )}
          <button type="button" className="btn-secondary" onClick={() => setPopup('edit')}><Pencil size={16} /> Edit Vehicle</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <StatCard
          compact
          icon={CalendarClock}
          tone={runningHire ? 'emerald' : 'amber'}
          label="Monthly Rent"
          value={runningHire ? 'Running' : isMonthly ? 'Stopped' : 'Not monthly'}
          hint={runningHire ? `Since ${formatHireDate(runningHire.startDate)}` : isMonthly ? 'Use Hire Again to start it' : payTerms}
        />
        <StatCard compact icon={Wallet} tone="rose" label="Hire Cost So Far" value={formatRupees(hireCost)} hint={isHired ? `Owed to ${vehicle.ownerName || 'the owner'} in all` : 'Income less cost'} />
        <StatCard compact icon={ClipboardList} tone="indigo" label="Months Booked" value={String(monthsBooked)} hint={`${hires.length} monthly hire(s)`} />
        <StatCard compact icon={Truck} tone="blue" label="Loads Carried" value={String(loads)} hint={`${data.sales.length} sale · ${data.boulders.length} boulder`} />
      </section>

      {hires.length > 0 && (
        <section className="panel">
          <div className="panel-header py-2.5">
            <h2 className="text-sm font-bold text-slate-800">Monthly Hires</h2>
            <span className="text-xs text-slate-500">Tap one for its months, adjustments and history</span>
          </div>
          <MonthlyHireList hires={[...hires].reverse()} showParty onOpen={(hire) => setPopup({ hireId: hire._id })} />
        </section>
      )}

      <section className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2 py-2.5">
          <h2 className="text-sm font-bold text-slate-800">Track Record</h2>
          <Segmented options={VIEWS} value={view} onChange={setView} />
        </div>

        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">Nothing recorded yet</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {visibleRows.map((row) => (
                <li key={row.key} className={`px-4 py-2.5 ${row.hireId ? 'cursor-pointer active:bg-slate-50' : ''}`} onClick={row.hireId ? () => setPopup({ hireId: row.hireId }) : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={row.tone}>{row.title}</span>
                    {row.amount !== undefined && (
                      <span className={`shrink-0 text-sm font-bold ${row.direction === 'receivable' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {row.direction === 'receivable' ? '+' : '−'} {formatRupees(row.amount)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-600">{row.detail}</p>
                    {renderEntryActions(row)}
                  </div>
                  <p className="text-[11px] text-slate-400">{formatHireDate(row.date)}{row.running !== undefined ? ` · hire cost so far ${formatRupees(row.running)}` : ''}</p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>What Happened</th>
                    <th className={TH}>Details</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={`${TH} text-right`}>Hire Cost So Far</th>
                    <th className={`${TH} w-16`} />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.key} className={`tbl-row ${row.hireId ? 'cursor-pointer' : ''}`} onClick={row.hireId ? () => setPopup({ hireId: row.hireId }) : undefined}>
                      <td className={`${TD} whitespace-nowrap`}>{formatHireDate(row.date)}</td>
                      <td className={`${TD} whitespace-nowrap`}><span className={row.tone}>{row.title}</span></td>
                      <td className={`${TD} max-w-[28rem] text-sm text-slate-600`}>{row.detail}</td>
                      <td className={`${TD} whitespace-nowrap text-right font-semibold ${row.direction === 'receivable' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {row.amount !== undefined ? `${row.direction === 'receivable' ? '+' : '−'} ${formatRupees(row.amount)}` : ''}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-right font-semibold text-slate-800`}>
                        {row.running !== undefined ? formatRupees(row.running) : ''}
                      </td>
                      <td className={`${TD} py-1!`}>{renderEntryActions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:px-5">
              Newest first. Hire actions show the day they were done; each month shows the day it ended. Tap a hire row for its detail.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
