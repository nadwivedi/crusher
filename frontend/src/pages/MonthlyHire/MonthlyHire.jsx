import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Inbox, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Segmented from '../../components/Segmented';
import { formatRupees, getHireStatus } from '../../utils/monthlyHire';
import MonthlyHireList from './component/MonthlyHireList';
import MonthlyHireForm from './component/MonthlyHireForm';
import MonthlyHireDetail from './component/MonthlyHireDetail';

const STATUS_FILTERS = [
  { key: 'running', label: 'Running' },
  { key: 'stopped', label: 'Cancelled / Ended', shortLabel: 'Stopped' },
  { key: '', label: 'All' }
];

/** Vehicles on monthly rent: hired from a party, or mine given to a party. */
export default function MonthlyHire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAdd = user?.role === 'owner' || user?.permissions?.add;
  const canEdit = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('running');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [openHireId, setOpenHireId] = useState('');

  const loadHires = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/monthly-hires');
      setHires(Array.isArray(response) ? response : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Error loading monthly hires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHires();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !showForm && !openHireId) navigate(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showForm, openHireId]);

  const filteredHires = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return hires.filter((hire) => {
      const status = getHireStatus(hire).key;
      if (statusFilter === 'running' && !['running', 'upcoming'].includes(status)) return false;
      if (statusFilter === 'stopped' && !['cancelled', 'ended'].includes(status)) return false;
      if (!search) return true;
      return [hire.partyName, hire.vehicleNo, hire.notes].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [hires, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const running = hires.filter((hire) => getHireStatus(hire).key === 'running');
    const sum = (list, direction, field) => list
      .filter((hire) => (hire.direction === 'receivable') === (direction === 'receivable'))
      .reduce((total, hire) => total + Number(hire[field] || 0), 0);
    return [
      { icon: Truck, label: 'Running Hires', tone: 'indigo', value: String(running.length), hint: `${hires.length} in all` },
      { icon: ArrowUpRight, label: 'You Pay Monthly', tone: 'rose', value: formatRupees(sum(running, 'payable', 'monthlyRate')), hint: 'Running hired vehicles' },
      { icon: ArrowDownLeft, label: 'You Receive Monthly', tone: 'emerald', value: formatRupees(sum(running, 'receivable', 'monthlyRate')), hint: 'Your vehicles given' },
      { icon: CalendarClock, label: 'Hire In Ledger', tone: 'amber', value: formatRupees(sum(hires, 'payable', 'bookedAmount')), hint: 'All months booked for hired vehicles' }
    ];
  }, [hires]);

  return (
    <div className="page-fade-in space-y-3.5 px-3 pb-6 pt-3.5 md:space-y-4 lg:px-6 lg:pt-4">
      {showForm && (
        <MonthlyHireForm
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            loadHires();
            if (saved?._id) setOpenHireId(saved._id);
          }}
        />
      )}
      {openHireId && (
        <MonthlyHireDetail hireId={openHireId} canEdit={canEdit} onClose={() => setOpenHireId('')} onChanged={loadHires} />
      )}

      <div className="page-header gap-2.5">
        <div className="min-w-0">
          <h1 className="page-title">Monthly Hire</h1>
          <p className="page-subtitle">Vehicles on monthly rent · each month goes to the party ledger when it ends</p>
        </div>
        {canAdd && (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Start Monthly Hire
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} compact {...stat} />)}
      </section>

      <section className={`panel transition-opacity ${loading && hires.length > 0 ? 'opacity-50' : ''}`}>
        <div className="panel-header flex flex-wrap items-center justify-between gap-2.5 py-2.5">
          <Segmented options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
          <div className="flex min-w-0 flex-1 basis-56 items-center justify-end gap-2">
            <div className="relative min-w-0 flex-1 md:max-w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" className="input pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search party or vehicle" />
            </div>
            <button type="button" className="icon-btn shrink-0" title="Refresh" aria-label="Refresh" onClick={loadHires}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && hires.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading monthly hires…</p>
        ) : filteredHires.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
            <p className="text-sm font-semibold text-slate-800">{hires.length === 0 ? 'No monthly hires yet' : 'Nothing here'}</p>
            <p className="text-xs text-slate-500">
              {hires.length === 0 ? 'Use "Start Monthly Hire" when you take a vehicle, or give yours, on monthly rent.' : 'Try another filter or search.'}
            </p>
          </div>
        ) : (
          <MonthlyHireList hires={filteredHires} onOpen={(hire) => setOpenHireId(hire._id)} />
        )}
      </section>
    </div>
  );
}
