import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import apiClient from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { formatRupees, getHireStatus } from '../../../utils/monthlyHire';
import MonthlyHireList from './MonthlyHireList';
import MonthlyHireForm from './MonthlyHireForm';
import MonthlyHireDetail from './MonthlyHireDetail';

/** A party's monthly hires on its ledger page: see them, start one, cancel or adjust. onChanged reloads the ledger. */
export default function PartyMonthlyHires({ partyId, onChanged }) {
  const { user } = useAuth();
  const canAdd = user?.role === 'owner' || user?.permissions?.add;
  const canEdit = user?.role !== 'employee' && (user?.role === 'owner' || user?.permissions?.edit);
  const [hires, setHires] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [openHireId, setOpenHireId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    apiClient.get('/monthly-hires', { params: { partyId } })
      .then((response) => {
        if (active) setHires(Array.isArray(response) ? response : []);
      })
      .catch((error) => console.error('Error loading monthly hires:', error));
    return () => {
      active = false;
    };
  }, [partyId, reloadKey]);

  const handleChanged = useCallback(() => {
    setReloadKey((key) => key + 1);
    onChanged();
  }, [onChanged]);

  const running = hires.filter((hire) => getHireStatus(hire).key === 'running');
  const monthlyPay = running.filter((hire) => hire.direction !== 'receivable').reduce((total, hire) => total + Number(hire.monthlyRate || 0), 0);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {showForm && (
        <MonthlyHireForm
          defaultPartyId={partyId}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            handleChanged();
            if (saved?._id) setOpenHireId(saved._id);
          }}
        />
      )}
      {openHireId && (
        <MonthlyHireDetail hireId={openHireId} canEdit={canEdit} onClose={() => setOpenHireId('')} onChanged={handleChanged} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock size={18} className="shrink-0 text-indigo-600" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Monthly Hire</h2>
            <p className="text-xs text-gray-500">
              {hires.length === 0
                ? 'No vehicle on monthly rent with this party'
                : `${running.length} running${monthlyPay > 0 ? ` · you pay ${formatRupees(monthlyPay)} a month` : ''} · tap one to cancel or adjust`}
            </p>
          </div>
        </div>
        {canAdd && (
          <button type="button" className="btn-secondary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Start Monthly Hire
          </button>
        )}
      </div>

      {hires.length > 0 && <MonthlyHireList hires={hires} showParty={false} onOpen={(hire) => setOpenHireId(hire._id)} />}
    </div>
  );
}
