import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeftRight, Banknote, BookOpenText, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import apiClient from '../../utils/api';
import StatCard from '../../components/StatCard';
import AccountFormPopup from './component/AccountFormPopup';
import TransferPopup from './component/TransferPopup';
import { ACCOUNT_TYPES, fmt } from './accountUtils';

const TOAST_OPTIONS = { autoClose: 1200 };

/** Cash books and bank accounts with their current balance. */
export default function Accounts() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // null | { kind: 'account', account? } | { kind: 'transfer' }
  const [popup, setPopup] = useState(null);

  const loadSummary = async () => {
    try {
      setSummary(await apiClient.get('/banks/summary'));
      setError('');
    } catch (err) {
      setError(err?.message || 'Unable to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const accounts = summary?.accounts || [];

  const saveAccount = async (payload) => {
    const editing = popup?.account;
    if (editing) await apiClient.put(`/banks/${editing._id}`, payload);
    else await apiClient.post('/banks', payload);
    toast.success(editing ? 'Account updated' : 'Account added', TOAST_OPTIONS);
    setPopup(null);
    loadSummary();
  };

  const saveTransfer = async (payload) => {
    await apiClient.post('/banks/transfers', payload);
    toast.success('Transfer saved', TOAST_OPTIONS);
    setPopup(null);
    loadSummary();
  };

  const deleteAccount = async (account) => {
    if (!window.confirm(`Delete the account "${account.name}"?`)) return;
    try {
      await apiClient.delete(`/banks/${account._id}`);
      toast.success('Account deleted', TOAST_OPTIONS);
      loadSummary();
    } catch (err) {
      toast.error(err?.message || 'Could not delete the account');
    }
  };

  const stats = [
    { icon: Wallet, label: 'Total Balance', tone: 'blue', value: fmt(summary?.totalBalance), hint: `Across ${accounts.length} account${accounts.length === 1 ? '' : 's'}` },
    { icon: Banknote, label: 'Cash in Hand', tone: 'emerald', value: fmt(summary?.cashBalance), hint: 'All cash books' },
    { icon: Landmark, label: 'In Bank', tone: 'indigo', value: fmt(summary?.bankBalance), hint: 'All bank accounts' }
  ];

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cash &amp; Bank</h1>
          <p className="page-subtitle">Your cash books and bank accounts, and how much is in each one</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setPopup({ kind: 'transfer' })}>
            <ArrowLeftRight size={16} /> Transfer
          </button>
          <button type="button" className="btn-primary" onClick={() => setPopup({ kind: 'account' })}>
            <Plus size={18} /> Add Account
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="text-sm text-slate-400">Loading accounts…</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-4">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="text-sm font-bold text-slate-900">Accounts</h2>
              <p className="text-xs text-slate-500">Balance = opening balance + money in − money out. Open a ledger to see every entry.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr>
                    <th className="tbl-head">Account</th>
                    <th className="tbl-head text-right">Opening</th>
                    <th className="tbl-head text-right">Money In</th>
                    <th className="tbl-head text-right">Money Out</th>
                    <th className="tbl-head text-right">Balance</th>
                    <th className="tbl-head text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const Icon = account.type === 'cash' ? Banknote : Landmark;
                    return (
                      <tr key={account._id} className="tbl-row cursor-pointer" onClick={() => navigate(`/accounts/${account._id}`)}>
                        <td className="tbl-cell">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${account.type === 'cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-blue-50 text-blue-700 ring-blue-100'}`}>
                              <Icon size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                                {account.name}
                                {account.isDefault && <span className="badge-gray" title="Used when an entry has no account chosen">Default</span>}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className={ACCOUNT_TYPES[account.type].badge}>{ACCOUNT_TYPES[account.type].label}</span>
                                <span className="truncate">{account.entryCount} entr{account.entryCount === 1 ? 'y' : 'ies'}{account.notes ? ` · ${account.notes}` : ''}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="tbl-cell whitespace-nowrap text-right">{fmt(account.openingBalance)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right text-emerald-700">{fmt(account.moneyIn)}</td>
                        <td className="tbl-cell whitespace-nowrap text-right text-rose-700">{fmt(account.moneyOut)}</td>
                        <td className={`tbl-cell whitespace-nowrap text-right text-base font-bold ${account.currentBalance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                          {fmt(account.currentBalance)}
                        </td>
                        <td className="tbl-cell" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/accounts/${account._id}`} className="btn-secondary btn-sm">
                              <BookOpenText size={14} /> Ledger
                            </Link>
                            <button type="button" className="icon-btn hover:bg-blue-50 hover:text-blue-600" title="Edit" onClick={() => setPopup({ kind: 'account', account })}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="icon-btn hover:bg-rose-50 hover:text-rose-600" title="Delete" onClick={() => deleteAccount(account)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="tbl-cell font-bold text-slate-900" colSpan={4}>Total</td>
                    <td className="tbl-cell whitespace-nowrap text-right text-base font-bold text-slate-900">{fmt(summary?.totalBalance)}</td>
                    <td className="tbl-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {popup?.kind === 'account' && (
        <AccountFormPopup account={popup.account} onSave={saveAccount} onClose={() => setPopup(null)} />
      )}
      {popup?.kind === 'transfer' && (
        <TransferPopup accounts={accounts} onSave={saveTransfer} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}
