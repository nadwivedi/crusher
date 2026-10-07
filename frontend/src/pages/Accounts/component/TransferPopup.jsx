import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import FormPopup from '../../../components/FormPopup';
import { fmt, toDateKey } from '../accountUtils';

/** Move money from one account to another, e.g. cash deposited in the bank. `accounts` are summary rows. */
export default function TransferPopup({ accounts, defaultFromId = '', onSave, onClose }) {
  const [fromAccount, setFromAccount] = useState(defaultFromId || accounts[0]?._id || '');
  const [toAccount, setToAccount] = useState(() => accounts.find((account) => account._id !== (defaultFromId || accounts[0]?._id))?._id || '');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(toDateKey(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const balanceOf = (id) => accounts.find((account) => account._id === id)?.currentBalance;

  const handleSubmit = async () => {
    if (saving) return;
    const value = Number(amount);
    if (!fromAccount || !toAccount) return setError('Choose both accounts');
    if (fromAccount === toAccount) return setError('Choose two different accounts');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter the amount');

    setSaving(true);
    setError('');
    try {
      await onSave({ fromAccount, toAccount, amount: value, transferDate, notes: notes.trim() });
    } catch (err) {
      setError(err?.message || 'Could not save the transfer');
      setSaving(false);
    }
  };

  const renderAccountField = (label, value, onChange) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {accounts.map((account) => <option key={account._id} value={account._id}>{account.name}</option>)}
      </select>
      {value && <p className="mt-1 text-xs text-slate-500">Balance: <span className="font-semibold text-slate-700">{fmt(balanceOf(value))}</span></p>}
    </div>
  );

  return (
    <FormPopup
      title="Transfer Money"
      subtitle="Move money between your own accounts"
      submitLabel={saving ? 'Saving...' : 'Transfer'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      {accounts.length < 2 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-700">Add one more account first. A transfer needs two accounts.</p>
      ) : (
        <>
          {renderAccountField('From', fromAccount, setFromAccount)}
          <div className="flex justify-center text-slate-400"><ArrowDown size={18} /></div>
          {renderAccountField('To', toAccount, setToAccount)}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" autoFocus />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={transferDate} max={toDateKey(new Date())} onChange={(event) => setTransferDate(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
          </div>
        </>
      )}
    </FormPopup>
  );
}
