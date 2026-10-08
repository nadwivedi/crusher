import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Search, Users, Wallet, XCircle, ChevronRight } from 'lucide-react';
import apiClient from '../utils/api';

const PARTY_TYPE_LABELS = {
  supplier: 'Supplier',
  customer: 'Customer',
  transporter: 'Transporter',
  'cash-in-hand': 'Cash In Hand'
};

const formatCurrency = (value) => (
  `Rs ${Math.abs(Number(value || 0)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
);

const getTypeLabel = (type) => PARTY_TYPE_LABELS[type] || 'Supplier';

const getBalanceTone = (balance) => {
  if (Number(balance || 0) > 0) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (Number(balance || 0) < 0) return 'text-rose-700 bg-rose-50 border-rose-200';
  return 'text-slate-700 bg-slate-50 border-slate-200';
};

const getBalanceLabel = (balance) => {
  const numericBalance = Number(balance || 0);
  if (numericBalance < 0) return `-${formatCurrency(numericBalance)}`;
  return formatCurrency(numericBalance);
};

function StatCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 bg-white px-2 py-2.5 sm:px-5 sm:py-4 shadow-md sm:shadow-lg">
      <div className={`absolute right-0 top-0 h-16 w-16 sm:h-24 sm:w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br opacity-10 ${tone}`} />
      <div className="relative z-10 flex items-center justify-between gap-1 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">{title}</p>
          <p className="mt-0.5 text-[11px] sm:text-xl font-black leading-tight text-slate-800 truncate">{value}</p>
          {subtitle ? <p className="mt-0.5 hidden sm:block text-xs font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={`shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br p-1.5 sm:p-2.5 text-white ${tone}`}>
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

export default function PartyLedger() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [outstanding, setOutstanding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadParties();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const loadParties = async () => {
    setLoading(true);
    setError('');
    try {
      const [partiesRes, outstandingRes] = await Promise.all([
        apiClient.get('/parties'),
        apiClient.get('/reports/outstanding')
      ]);
      setParties(Array.isArray(partiesRes) ? partiesRes : []);
      setOutstanding(outstandingRes || null);
    } catch (err) {
      setError(err.message || 'Error loading parties');
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    if (!outstanding?.partyOutstanding) return [];
    const partyOutstanding = outstanding.partyOutstanding;
    
    return parties.map(party => {
      const outstandingData = partyOutstanding.find(p => 
        String(p.partyId) === String(party._id)
      );
      const receivable = outstandingData?.receivable || 0;
      const payable = outstandingData?.payable || 0;
      return {
        ...party,
        receivable,
        payable,
        netBalance: receivable - payable
      };
    }).sort((a, b) => {
      const aBalance = Math.abs(a.netBalance);
      const bBalance = Math.abs(b.netBalance);
      if (bBalance !== aBalance) return bBalance - aBalance;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [parties, outstanding]);

  const visibleRows = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return rows.filter((party) => (
      (party.name || '').toLowerCase().includes(term) ||
      (party.mobile || '').includes(term) ||
      (party.email || '').toLowerCase().includes(term) ||
      getTypeLabel(party.type).toLowerCase().includes(term)
    ));
  }, [rows, searchTerm]);

  const summary = useMemo(() => rows.reduce((acc, party) => {
    acc.totalParties += 1;
    if (party.netBalance > 0) acc.receivable += party.netBalance;
    if (party.netBalance < 0) acc.payable += Math.abs(party.netBalance);
    return acc;
  }, {
    totalParties: 0,
    receivable: 0,
    payable: 0
  }), [rows]);

  const handleRowClick = (party) => {
    navigate(`/party/${party._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="mt-4 text-slate-600 font-semibold">Loading party ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100">
      <div className="mx-auto max-w-[95%] px-4 py-6">
        {error ? (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700 shadow-lg">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700" aria-label="Dismiss error">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <StatCard title="Parties" value={summary.totalParties.toLocaleString('en-IN')} subtitle="ledger accounts" icon={Users} tone="from-blue-500 to-cyan-500" />
          </div>
          <StatCard title="Receivable" value={formatCurrency(summary.receivable).replace('Rs ', '')} subtitle="amount to receive" icon={ArrowUpRight} tone="from-emerald-500 to-teal-500" />
          <StatCard title="Payable" value={formatCurrency(summary.payable).replace('Rs ', '')} subtitle="amount to pay" icon={ArrowDownLeft} tone="from-rose-500 to-pink-500" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start justify-between sm:block">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-800">Party Ledger</h1>
                <p className="mt-1 text-[11px] sm:text-sm text-slate-500">Party name, type, and current running balance</p>
              </div>
              <button
                type="button"
                onClick={loadParties}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:px-4 sm:py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:hidden"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={loadParties}
                className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search party..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-72"
                />
              </div>
            </div>
          </div>

          {visibleRows.length > 0 ? (
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
                {visibleRows.map((party) => (
                  <div
                    key={party._id}
                    onClick={() => handleRowClick(party)}
                    className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-slate-100 bg-white p-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-emerald-500/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-800 transition-colors group-hover:text-emerald-700 sm:text-base">{party.name || '-'}</h3>
                          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{getTypeLabel(party.type)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {party.mobile && (
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          <span className="text-[10px] uppercase tracking-widest text-slate-400">Mobile:</span>
                          {party.mobile}
                        </div>
                      )}

                      <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all ${getBalanceTone(party.netBalance)}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Balance</span>
                        <span className="text-sm font-black sm:text-base">
                          {getBalanceLabel(party.netBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider rounded-tl-2xl">Party Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Party Type</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider rounded-tr-2xl">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/50">
                    {visibleRows.map((party) => (
                      <tr
                        key={party._id}
                        onClick={() => handleRowClick(party)}
                        className="cursor-pointer transition-colors hover:bg-emerald-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-2 text-white">
                              <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="max-w-[280px] truncate text-sm font-bold text-slate-800">{party.name || '-'}</p>
                              {party.mobile ? <p className="mt-0.5 text-xs font-medium text-slate-400">{party.mobile}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700`}>
                            {getTypeLabel(party.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex rounded-md border px-3 py-1.5 text-sm font-black ${getBalanceTone(party.netBalance)}`}>
                            {getBalanceLabel(party.netBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-16 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-600">No parties found</p>
              <p className="mt-1 text-sm text-slate-400">Try adjusting your search or add parties first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
