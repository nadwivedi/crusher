import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Ban, Pencil, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import apiClient from '../../../utils/api';
import { formatHireDate, formatRupees, getHireStatus } from '../../../utils/monthlyHire';
import MonthlyHireForm from './MonthlyHireForm';
import CancelHirePopup from './CancelHirePopup';
import AdjustmentPopup from './AdjustmentPopup';

const describeAdjustment = (adjustment) => {
  if (adjustment.kind === 'off_days') return `${adjustment.days} off day${adjustment.days === 1 ? '' : 's'}`;
  if (adjustment.kind === 'deduct') return `${formatRupees(adjustment.amount)} less`;
  return `${formatRupees(adjustment.amount)} extra`;
};

// A ledger note reads "Monthly hire 01 Oct 2026 - 31 Oct 2026, 10 of 31 days; less ..."; the dates are shown already
const describeEntry = (notes) => String(notes || '')
  .split(' | ')[0]
  .replace(/^Monthly hire .+? - \S+ \S+ \d{4}/, '')
  .replace(/^[,;]\s*/, '') || 'Full month';

function Section({ title, hint, children }) {
  return (
    <section className="rounded-xl ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

/** One monthly hire: what it has put in the ledger, its adjustments and history, and the actions on it. */
export default function MonthlyHireDetail({ hireId, canEdit, onClose, onChanged }) {
  const [hire, setHire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setHire(await apiClient.get(`/monthly-hires/${hireId}`));
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Error loading monthly hire');
    } finally {
      setLoading(false);
    }
  }, [hireId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !popup) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, popup]);

  const afterChange = async () => {
    setPopup('');
    await load();
    onChanged();
  };

  const runAction = async (request, message) => {
    try {
      await request();
      toast.success(message);
      await afterChange();
    } catch (actionError) {
      toast.error(actionError?.message || 'Something went wrong');
    }
  };

  const handleDelete = () => {
    const booked = hire.bookedMonths > 0 ? ` Its ${hire.bookedMonths} month(s) in the ledger, ${formatRupees(hire.bookedAmount)}, will be removed too.` : '';
    if (!window.confirm(`Delete this monthly hire?${booked}`)) return;
    apiClient.delete(`/monthly-hires/${hire._id}`)
      .then(() => {
        toast.success('Monthly hire deleted');
        onChanged();
        onClose();
      })
      .catch((deleteError) => toast.error(deleteError?.message || 'Error deleting monthly hire'));
  };

  const status = hire ? getHireStatus(hire) : null;
  const isPayable = hire?.direction !== 'receivable';
  const history = [...(hire?.history || [])].reverse();
  const adjustments = [...(hire?.adjustments || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
        <div
          className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex-shrink-0 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:px-5 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold md:text-xl">{hire?.partyName || 'Monthly Hire'}</h2>
                {hire && (
                  <p className="mt-0.5 text-xs text-slate-300 md:text-sm">
                    {isPayable ? 'Hired vehicle' : 'My vehicle given'}{hire.vehicleNo ? ` · ${hire.vehicleNo}` : ''} · {formatRupees(hire.monthlyRate)} a month
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close popup" className="rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2">
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3 md:p-5">
            {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            {loading && !hire && <p className="py-8 text-center text-sm text-slate-400">Loading…</p>}

            {hire && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Status</p>
                    <span className={`${status.className} mt-1 inline-block`}>{status.label}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Period</p>
                    <p className="text-sm font-semibold text-slate-800">{formatHireDate(hire.startDate)}</p>
                    <p className="text-xs text-slate-500">to {status.stop ? formatHireDate(status.stop) : 'until cancelled'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">In Ledger</p>
                    <p className={`text-sm font-bold ${isPayable ? 'text-rose-700' : 'text-emerald-700'}`}>{formatRupees(hire.bookedAmount)}</p>
                    <p className="text-xs text-slate-500">{hire.bookedMonths} month(s)</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">This Month</p>
                    {hire.runningMonth ? (
                      <>
                        <p className="text-sm font-bold text-slate-800">{formatRupees(hire.runningMonth.amount)}</p>
                        <p className="text-xs text-slate-500">added on {formatHireDate(hire.runningMonth.toDate)}</p>
                      </>
                    ) : <p className="text-sm text-slate-500">Nothing running</p>}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setPopup('edit')}><Pencil size={16} /> Edit</button>
                    <button type="button" className="btn-secondary" onClick={() => setPopup('adjust')}><SlidersHorizontal size={16} /> Adjust A Month</button>
                    {hire.cancelledAt ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => runAction(() => apiClient.post(`/monthly-hires/${hire._id}/resume`), 'Monthly hire resumed')}
                      >
                        <RotateCcw size={16} /> Resume
                      </button>
                    ) : status.key !== 'ended' && (
                      <button type="button" className="btn-secondary text-amber-700" onClick={() => setPopup('cancel')}><Ban size={16} /> Cancel Hire</button>
                    )}
                    <button type="button" className="btn-secondary text-rose-700" onClick={handleDelete}><Trash2 size={16} /> Delete</button>
                  </div>
                )}

                <Section title="Months In Ledger" hint="Each month is added when it ends">
                  {hire.entries?.length > 0 || hire.runningMonth ? (
                    <ul className="divide-y divide-slate-100">
                      {(hire.entries || []).map((entry) => (
                        <li key={entry._id} className="flex items-start justify-between gap-3 py-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{formatHireDate(entry.fromDate)} – {formatHireDate(entry.toDate)}</p>
                            <p className="text-[11px] text-slate-500">{entry.entryNumber} · {describeEntry(entry.notes)}</p>
                          </div>
                          <span className={`shrink-0 text-sm font-bold ${isPayable ? 'text-rose-700' : 'text-emerald-700'}`}>{formatRupees(entry.amount)}</span>
                        </li>
                      ))}
                      {hire.runningMonth && (
                        <li className="flex items-start justify-between gap-3 py-1.5 opacity-70">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{formatHireDate(hire.runningMonth.fromDate)} – {formatHireDate(hire.runningMonth.toDate)}</p>
                            <p className="text-[11px] text-slate-500">Running · added to the ledger on {formatHireDate(hire.runningMonth.toDate)}</p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-slate-500">{formatRupees(hire.runningMonth.amount)}</span>
                        </li>
                      )}
                    </ul>
                  ) : <p className="py-1 text-sm text-slate-500">No month has ended yet.</p>}
                </Section>

                <Section title="Adjustments" hint="Off days, less or extra amounts">
                  {adjustments.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {adjustments.map((adjustment) => (
                        <li key={adjustment._id} className="flex items-center justify-between gap-3 py-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{describeAdjustment(adjustment)}</p>
                            <p className="text-[11px] text-slate-500">{formatHireDate(adjustment.date)}{adjustment.note ? ` · ${adjustment.note}` : ''}</p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              title="Remove adjustment"
                              aria-label="Remove adjustment"
                              className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => {
                                if (!window.confirm('Remove this adjustment? Its month in the ledger is worked out again.')) return;
                                runAction(() => apiClient.delete(`/monthly-hires/${hire._id}/adjustments/${adjustment._id}`), 'Adjustment removed');
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="py-1 text-sm text-slate-500">None. Use &quot;Adjust A Month&quot; for a breakdown or an extra charge.</p>}
                </Section>

                <Section title="History">
                  <ul className="space-y-1.5">
                    {history.map((event, index) => (
                      <li key={`${event.at}-${index}`} className="flex gap-3 text-sm">
                        <span className="w-24 shrink-0 text-[11px] text-slate-400">{formatHireDate(event.at)}</span>
                        <span className="min-w-0"><span className="font-semibold text-slate-800">{event.action}</span>{event.note ? <span className="text-slate-600"> · {event.note}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>

      {hire && popup === 'edit' && <MonthlyHireForm hire={hire} onClose={() => setPopup('')} onSaved={afterChange} />}
      {hire && popup === 'cancel' && <CancelHirePopup hire={hire} onClose={() => setPopup('')} onDone={afterChange} />}
      {hire && popup === 'adjust' && <AdjustmentPopup hire={hire} onClose={() => setPopup('')} onDone={afterChange} />}
    </>
  );
}
