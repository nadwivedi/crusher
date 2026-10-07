import { Inbox, Plus, Search, Trash2 } from 'lucide-react';
import StatCard from './StatCard';

const PERIODS = [
  { value: '', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last 1 year' }
];

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

/**
 * List page shared by Money Received (receipts) and Money Paid (payments).
 * rows: [{ id, number, date, party, account, reference, notes, amount }]
 * children: the page's own add popup.
 */
export default function MoneyVoucherList({
  title, subtitle, addLabel, onAdd,
  error, stats,
  listTitle, accountLabel, amountClass = 'text-slate-900',
  search, onSearchChange, searchPlaceholder,
  dateFilter, onDateFilterChange,
  loading, rows, emptyTitle, emptyHint,
  canDelete, onDelete,
  children
}) {
  const deleteButton = (row) => (
    <button type="button" className="icon-btn hover:bg-rose-50 hover:text-rose-600" title="Delete" aria-label="Delete" onClick={() => onDelete(row.id)}>
      <Trash2 size={16} />
    </button>
  );

  return (
    <div className="page-fade-in space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <button type="button" className="btn-primary self-start md:self-auto" onClick={onAdd}>
          <Plus size={18} /> {addLabel}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      {/* Phone: two cards side by side, the third full width below */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        {/* A stat can pass `amount` (formatted here as rupees) instead of a ready `value` */}
        {stats.map(({ amount, ...stat }) => (
          <StatCard key={stat.label} {...stat} value={amount === undefined ? stat.value : fmt(amount)} />
        ))}
      </section>

      {children}

      <section className="panel">
        <div className="panel-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{listTitle}</h2>
            <p className="text-xs text-slate-500">{PERIODS.find((period) => period.value === dateFilter)?.label} · newest first</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} />
            </div>
            <select className="input sm:w-44" value={dateFilter} onChange={(event) => onDateFilterChange(event.target.value)} aria-label="Period">
              {PERIODS.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
            </select>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={22} />
            </span>
            <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
            <p className="text-xs text-slate-500">{emptyHint}</p>
          </div>
        ) : (
          <>
            {/* Phone: one compact block per entry */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{row.party || '-'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.number} · {row.date}</p>
                    </div>
                    <p className={`shrink-0 whitespace-nowrap text-base font-bold ${amountClass}`}>{fmt(row.amount)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="badge-blue">{row.account || '-'}</span>
                      <span className="badge-gray">{row.reference}</span>
                    </div>
                    {canDelete && deleteButton(row)}
                  </div>
                  {row.notes && <p className="mt-1.5 text-xs text-slate-500">{row.notes}</p>}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr>
                    <th className="tbl-head">No.</th>
                    <th className="tbl-head">Date</th>
                    <th className="tbl-head">Party</th>
                    <th className="tbl-head">{accountLabel}</th>
                    <th className="tbl-head">Reference</th>
                    <th className="tbl-head">Notes</th>
                    <th className="tbl-head text-right">Amount</th>
                    {canDelete && <th className="tbl-head text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="tbl-row">
                      <td className="tbl-cell whitespace-nowrap font-medium text-slate-500">{row.number}</td>
                      <td className="tbl-cell whitespace-nowrap">{row.date}</td>
                      <td className="tbl-cell font-semibold text-slate-800">{row.party || '-'}</td>
                      <td className="tbl-cell"><span className="badge-blue">{row.account || '-'}</span></td>
                      <td className="tbl-cell whitespace-nowrap text-slate-500">{row.reference}</td>
                      <td className="tbl-cell text-slate-500"><div className="max-w-[18rem] truncate" title={row.notes || undefined}>{row.notes || '-'}</div></td>
                      <td className={`tbl-cell whitespace-nowrap text-right font-bold ${amountClass}`}>{fmt(row.amount)}</td>
                      {canDelete && <td className="tbl-cell text-right">{deleteButton(row)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5">
              Showing {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
