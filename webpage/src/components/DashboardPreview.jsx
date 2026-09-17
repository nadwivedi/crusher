export default function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-navy shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
      {/* Browser Header */}
      <div className="flex items-center gap-1.5 border-b border-gray-400 bg-gray-200 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="ml-auto font-mono text-[0.6rem] text-gray-600">
          app.crusherbook.com/dashboard
        </span>
      </div>

      {/* Dashboard Content */}
      <div className="flex min-h-[280px]">
        {/* Sidebar */}
        <aside className="hidden w-32 shrink-0 border-r border-brand-600 bg-brand-navy p-2.5 min-[480px]:block lg:w-36">
          <div className="mx-auto mb-3 h-6 w-[70%] rounded bg-brand-orange/20" />
          {['Dashboard', 'Sales Slips', 'Boulder Entry', 'Stock', 'Ledger', 'Reports'].map((item, i) => (
            <div
              key={item}
              className={`mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-[0.65rem] lg:text-[0.7rem] ${
                i === 0 ? 'bg-brand-orange text-white' : 'text-gray-300'
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              {item}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-brand-navy/80 p-3 lg:p-3.5">
          {/* Stats Grid */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total Sales', value: '₹28.5L', color: 'border-brand-orange' },
              { label: 'Boulder Stock', value: '1,245T', color: 'border-brand-accent' },
              { label: 'Pending Bills', value: '₹4.2L', color: 'border-yellow-500' },
              { label: 'Today Entry', value: '89', color: 'border-green-500' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded border-l-2 ${stat.color} bg-brand-navy/40 px-2 py-2 backdrop-blur-sm`}
              >
                <span className="block text-xs font-bold text-white lg:text-sm">{stat.value}</span>
                <span className="text-[0.6rem] leading-tight text-gray-400 lg:text-[0.65rem]">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Data Table */}
          <div className="overflow-hidden rounded bg-brand-navy/40 text-[0.6rem] lg:text-[0.65rem] backdrop-blur-sm">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-0.5 bg-brand-navy/60 px-2 py-1.5 font-semibold text-gray-400">
              <span>Date</span>
              <span>Boulder Wt</span>
              <span>Party</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>
            {[
              { date: '18 Sep', wt: '45T', party: 'XYZ Corp', rate: '₹850', amt: '₹38.25L' },
              { date: '17 Sep', wt: '52T', party: 'ABC Ltd', rate: '₹820', amt: '₹42.64L' },
              { date: '16 Sep', wt: '38T', party: 'LMN Inc', rate: '₹880', amt: '₹33.44L' },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr] gap-0.5 border-t border-brand-600/30 px-2 py-1.5 text-gray-300"
              >
                <span>{row.date}</span>
                <span className="font-semibold text-brand-orange">{row.wt}</span>
                <span>{row.party}</span>
                <span>{row.rate}</span>
                <span className="font-semibold text-green-400">{row.amt}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
