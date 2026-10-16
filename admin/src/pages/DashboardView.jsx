import { useMemo, useState } from 'react'
import { IndianRupee, Repeat, UserPlus, Users2 } from 'lucide-react'
import StatCard from '../components/StatCard'

// Months are counted in India time so the admin's device timezone can't move a user to another month
const IST = 'Asia/Kolkata'
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYY-MM' of a date in India time
const monthKeyOf = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: IST }).slice(0, 7)
const currentMonthKey = () => monthKeyOf(Date.now())

// 'YYYY-MM' moved by a number of months
const shiftMonth = (key, months) => {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (key, withYear = true) => {
  const [y, m] = key.split('-').map(Number)
  return withYear ? `${MONTH_NAMES[m - 1]} ${y}` : MONTH_NAMES[m - 1]
}

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// "₹1.2L", "₹45K" for chart axes where space is short
const formatShortRupees = (value) => {
  const n = Number(value || 0)
  if (n >= 10000000) return `₹${+(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${+(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${+(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

// A rounded maximum for the chart scale so the grid lines land on even numbers
const niceMax = (value) => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)
  return step * power
}

/** Single-series bar chart, one bar per month, with a hover tooltip. */
function MonthBars({ title, subtitle, data, format, axisFormat = format, barClass }) {
  const [hovered, setHovered] = useState(null)
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const gridLines = [1, 0.5, 0]

  return (
    <section className="rounded-2xl border border-stone-200 bg-[#fbfaf7] p-4 shadow-xs md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-stone-800">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>

      <div className="relative mt-4 flex h-52 gap-2">
        {/* Scale on the left */}
        <div className="flex w-10 shrink-0 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-stone-400">
          {gridLines.map((g) => <span key={g} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">{axisFormat(max * g)}</span>)}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grid */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
            {gridLines.map((g) => <div key={g} className={`border-t ${g === 0 ? 'border-stone-300' : 'border-dashed border-stone-200'}`} />)}
          </div>

          <div className="absolute inset-0 flex gap-0.5">
            {data.map((d, i) => {
              const height = (d.value / max) * 100
              const isHovered = hovered === i
              return (
                <div
                  key={d.key}
                  className="relative flex min-w-0 flex-1 cursor-default flex-col"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(isHovered ? null : i)}
                >
                  <div className="relative flex flex-1 items-end justify-center px-[12%]">
                    {isHovered && <div className="absolute inset-0 rounded-md bg-stone-200/40" />}
                    <div
                      className={`relative w-full max-w-9 rounded-t transition-opacity ${barClass} ${hovered !== null && !isHovered ? 'opacity-50' : ''}`}
                      style={{ height: d.value > 0 ? `max(${height}%, 3px)` : 0 }}
                    />
                  </div>
                  <span className={`h-5 truncate pt-1 text-center text-[10px] leading-none ${isHovered ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>{monthLabel(d.key, false)}</span>

                  {isHovered && (
                    <div className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-white shadow-lg ${i < data.length / 2 ? 'left-0' : 'right-0'}`}>
                      <p className="font-semibold">{monthLabel(d.key)}</p>
                      <p className="tabular-nums text-stone-200">{format(d.value)}{d.note ? ` · ${d.note}` : ''}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Admin dashboard: revenue and new users per month.
 * Revenue for a month is the plan price of the users who joined in that month (their first payment).
 */
function DashboardView({ users }) {
  const thisMonth = currentMonthKey()
  const years = useMemo(() => {
    const first = users.reduce((min, u) => (u.createdAt && monthKeyOf(u.createdAt) < min ? monthKeyOf(u.createdAt) : min), thisMonth)
    const list = []
    for (let y = Number(thisMonth.slice(0, 4)); y >= Number(first.slice(0, 4)); y -= 1) list.push(String(y))
    return list
  }, [users, thisMonth])
  const [period, setPeriod] = useState('last12')

  // Every month that has users: { joined, yearly, lifetime, revenue }
  const byMonth = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      if (!u.createdAt) return
      const key = monthKeyOf(u.createdAt)
      const row = map[key] || (map[key] = { joined: 0, yearly: 0, lifetime: 0, revenue: 0 })
      row.joined += 1
      row[u.planType === 'lifetime' ? 'lifetime' : 'yearly'] += 1
      row.revenue += Number(u.planPrice || 0)
    })
    return map
  }, [users])

  const months = useMemo(() => {
    const start = period === 'last12' ? shiftMonth(thisMonth, -11) : `${period}-01`
    return Array.from({ length: 12 }, (_, i) => shiftMonth(start, i))
  }, [period, thisMonth])

  const rows = months.map((key) => ({ key, ...(byMonth[key] || { joined: 0, yearly: 0, lifetime: 0, revenue: 0 }) }))
  const periodRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  const periodJoined = rows.reduce((sum, r) => sum + r.joined, 0)

  const current = byMonth[thisMonth] || { joined: 0, revenue: 0 }
  const previous = byMonth[shiftMonth(thisMonth, -1)] || { joined: 0, revenue: 0 }
  const totalRevenue = users.reduce((sum, u) => sum + Number(u.planPrice || 0), 0)
  const activeYearly = users.filter((u) => u.planType !== 'lifetime' && u.isActive !== false)
  const yearlyRecurring = activeYearly.reduce((sum, u) => sum + Number(u.planPrice || 0), 0)

  const compare = (now, before, format) => {
    const diff = now - before
    if (diff === 0) return `Same as last month (${format(before)})`
    return `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))} vs last month`
  }

  const periodText = period === 'last12' ? `${monthLabel(months[0])} – ${monthLabel(months[11])}` : period
  const futureMonth = (key) => key > thisMonth

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-stone-500">Monthly revenue and new users. Revenue is the plan price of users who joined that month.</p>
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 outline-none focus:border-stone-500 focus:ring-4 focus:ring-stone-200 sm:w-44"
          aria-label="Period"
        >
          <option value="last12">Last 12 months</option>
          {years.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>

      <section className="grid grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4">
        <StatCard compact icon={IndianRupee} tone="emerald" label="Revenue This Month" value={formatRupees(current.revenue)} hint={compare(current.revenue, previous.revenue, formatRupees)} />
        <StatCard compact icon={UserPlus} tone="blue" label="Joined This Month" value={String(current.joined)} hint={compare(current.joined, previous.joined, String)} />
        <StatCard compact icon={Users2} tone="indigo" label="Total Revenue" value={formatRupees(totalRevenue)} hint={`From ${users.length} users, all time`} />
        <StatCard compact icon={Repeat} tone="amber" label="Yearly Renewals" value={formatRupees(yearlyRecurring)} hint={`Due each year from ${activeYearly.length} active yearly users`} />
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <MonthBars
          title="Monthly Revenue"
          subtitle={`${formatRupees(periodRevenue)} · ${periodText}`}
          data={rows.map((r) => ({ key: r.key, value: r.revenue, note: `${r.joined} joined` }))}
          format={formatRupees}
          axisFormat={formatShortRupees}
          barClass="bg-emerald-600"
        />
        <MonthBars
          title="Users Joined"
          subtitle={`${periodJoined} users · ${periodText}`}
          data={rows.map((r) => ({ key: r.key, value: r.joined, note: `${r.yearly} yearly, ${r.lifetime} lifetime` }))}
          format={(v) => `${v} ${v === 1 ? 'user' : 'users'}`}
          axisFormat={(v) => (Number.isInteger(v) ? String(v) : '')}
          barClass="bg-blue-600"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-xs">
        <h2 className="border-b border-stone-200 px-4 py-3 text-sm font-bold text-stone-800 md:px-5">
          Month by Month
          <span className="ml-2 text-xs font-normal text-stone-500">{periodText}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="bg-stone-100/70 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-2.5 md:px-5">Month</th>
                <th className="px-3 py-2.5 text-right">Joined</th>
                <th className="px-3 py-2.5 text-right">Yearly</th>
                <th className="px-3 py-2.5 text-right">Lifetime</th>
                <th className="px-4 py-2.5 text-right md:px-5">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().filter((r) => !futureMonth(r.key)).map((r) => (
                <tr key={r.key} className={`border-t border-stone-200 tabular-nums ${r.joined ? 'text-stone-800' : 'text-stone-400'}`}>
                  <td className="px-4 py-2 font-medium md:px-5">
                    {monthLabel(r.key)}
                    {r.key === thisMonth && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-600">This month</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{r.joined}</td>
                  <td className="px-3 py-2 text-right">{r.yearly}</td>
                  <td className="px-3 py-2 text-right">{r.lifetime}</td>
                  <td className="px-4 py-2 text-right font-semibold md:px-5">{formatRupees(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-300 bg-stone-100/70 font-bold tabular-nums text-stone-900">
                <td className="px-4 py-2.5 md:px-5">Total</td>
                <td className="px-3 py-2.5 text-right">{periodJoined}</td>
                <td className="px-3 py-2.5 text-right">{rows.reduce((s, r) => s + r.yearly, 0)}</td>
                <td className="px-3 py-2.5 text-right">{rows.reduce((s, r) => s + r.lifetime, 0)}</td>
                <td className="px-4 py-2.5 text-right md:px-5">{formatRupees(periodRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  )
}

export default DashboardView
