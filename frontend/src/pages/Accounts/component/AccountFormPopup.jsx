import { useState } from 'react';
import FormPopup from '../../../components/FormPopup';
import { ACCOUNT_TYPES } from '../accountUtils';

/** Add or edit a cash book / bank account. `account` is a row from the accounts summary when editing. */
export default function AccountFormPopup({ account = null, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: account?.name || '',
    type: account?.type || 'bank',
    openingBalance: account ? String(account.openingBalance ?? '') : '',
    notes: account?.notes || ''
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Cash Account is the built-in default: its name and type stay fixed
  const isDefault = Boolean(account?.isDefault);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const handleSubmit = async () => {
    if (saving) return;
    const openingBalance = form.openingBalance === '' ? 0 : Number(form.openingBalance);
    if (!form.name.trim()) return setError('Enter the account name');
    if (!Number.isFinite(openingBalance)) return setError('Opening balance must be a number');

    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), type: form.type, totalBalance: openingBalance, notes: form.notes.trim() });
    } catch (err) {
      setError(err?.message || 'Could not save the account');
      setSaving(false);
    }
  };

  return (
    <FormPopup
      title={account ? 'Edit Account' : 'Add Account'}
      subtitle="A bank account or a cash book you keep money in"
      submitLabel={saving ? 'Saving...' : account ? 'Update' : 'Save Account'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div>
        <label className="label">Account Name</label>
        <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. HDFC Bank Account 1, Site Cashbook" disabled={isDefault} autoFocus={!isDefault} />
      </div>

      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ACCOUNT_TYPES).map(([key, type]) => (
            <button
              key={key}
              type="button"
              disabled={isDefault}
              onClick={() => setForm({ ...form, type: key })}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                form.type === key ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {key === 'cash' ? 'Cash Book' : 'Bank Account'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Opening Balance (₹)</label>
        <input className="input" type="number" step="0.01" value={form.openingBalance} onChange={set('openingBalance')} placeholder="0" />
        <p className="mt-1 text-xs text-slate-500">Money already in this account before you start recording entries against it.</p>
      </div>

      <div>
        <label className="label">Notes</label>
        <input className="input" value={form.notes} onChange={set('notes')} placeholder="Optional, e.g. account number" />
      </div>
    </FormPopup>
  );
}
