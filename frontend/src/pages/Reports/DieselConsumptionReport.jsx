import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Truck, 
  Calendar, 
  Filter, 
  Search, 
  TrendingUp, 
  Info,
  ChevronRight,
  Download,
  AlertCircle,
  Fuel,
  Activity,
  History,
  Droplets,
  Layers,
  MapPin,
  Clock,
  Printer
} from 'lucide-react';
import apiClient from '../../utils/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export default function DieselConsumptionReport() {
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: [], ledger: [], totalDieselUsed: 0, productName: 'Diesel', unit: 'Ltrs' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        const now = new Date();
        let fromDate;
        if (dateRange === '1') fromDate = new Date(now.setDate(now.getDate() - 1));
        else if (dateRange === '7') fromDate = new Date(now.setDate(now.getDate() - 7));
        else if (dateRange === '30') fromDate = new Date(now.setDate(now.getDate() - 30));
        else if (dateRange === '90') fromDate = new Date(now.setDate(now.getDate() - 90));
        if (fromDate) params.append('fromDate', fromDate.toISOString());
      }

      const response = await apiClient.get(`/reports/diesel-consumption?${params.toString()}`);
      setData(response || { summary: [], ledger: [], totalDieselUsed: 0, productName: 'Diesel', unit: 'Ltrs' });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') navigate('/reports');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const filteredSummary = useMemo(() => {
    if (!searchQuery) return data.summary;
    return data.summary.filter(v => v.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data.summary, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="mx-auto max-w-[1600px] px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/reports"
              className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-sm border border-slate-100"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            </Link>
            <div className="h-10 w-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Fuel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
                  Fuel Dynamics <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Analytics</span>
                </h1>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Vehicle Diesel Consumption Engine</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['1', '7', '30', '90', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    dateRange === range 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {range === 'all' ? 'All' : `${range}D`}
                </button>
              ))}
            </div>
            <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] px-6 py-10">
        {error && (
          <div className="mb-8 flex items-center gap-4 rounded-[2rem] border border-rose-100 bg-rose-50/50 p-6 text-rose-700 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest">System Error</p>
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar - Vehicle Performance Ranking */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Fleet Ranking</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sorting by high usage</p>
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="ID Lookup..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold py-2.5 pl-9 pr-4 rounded-xl w-40 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSummary.length > 0 ? filteredSummary.map((v, idx) => (
                <div key={v.vehicleId} className="group relative rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-[900] text-sm ${
                        idx === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                        idx === 1 ? 'bg-slate-800 text-white' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight">{v.vehicleNo}</p>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{v.entryCount} Refills</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-[900] text-slate-900">{formatNumber(v.totalUsed)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.unit}</p>
                    </div>
                  </div>
                  
                  <div className="relative h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                        idx === 0 ? 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'bg-slate-400'
                      }`}
                      style={{ width: `${(v.totalUsed / data.totalDieselUsed) * 100}%` }}
                    />
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Intensity Index</span>
                    <span className="text-slate-900">{Math.round((v.totalUsed / data.totalDieselUsed) * 100)}%</span>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                    <Truck className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching units</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Temporal Ledger */}
          <div className="lg:col-span-8">
            <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 overflow-hidden min-h-[700px] flex flex-col">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-b from-white to-slate-50/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-[900] text-slate-900 tracking-tight">Movement Registry</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Inward & Outward Log</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inward</p>
                      <p className="text-sm font-black text-emerald-600">{formatNumber(data.totalDieselPurchased)} <span className="text-[9px] text-slate-400">{data.unit}</span></p>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outward</p>
                      <p className="text-sm font-black text-blue-600">{formatNumber(data.totalDieselUsed)} <span className="text-[9px] text-slate-400">{data.unit}</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Timestamp</th>
                        <th className="px-8 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Type</th>
                        <th className="px-8 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Source/Party</th>
                        <th className="px-8 py-3 text-right text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">In</th>
                        <th className="px-8 py-3 text-right text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        [...Array(10)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan="5" className="px-8 py-4">
                              <div className="h-6 bg-slate-50 rounded-lg w-full" />
                            </td>
                          </tr>
                        ))
                      ) : data.ledger.length > 0 ? data.ledger.map((entry) => (
                        <tr key={`${entry.type}-${entry._id}`} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-blue-200 group-hover:text-blue-500 transition-all duration-300">
                                <Calendar className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-900 leading-tight">{formatDate(entry.date)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                  {entry.type === 'in' ? 'Purchase' : 'Refill'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              entry.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {entry.type === 'in' ? 'IN' : 'OUT'}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-md ${
                                entry.type === 'in' ? 'bg-emerald-600 shadow-emerald-900/10' : 'bg-slate-900 shadow-slate-900/10'
                              }`}>
                                {entry.type === 'in' ? <Search className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                              </div>
                              <div>
                                <span className="text-[11px] font-[900] text-slate-900 tracking-tight block">{entry.partyName}</span>
                                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px] block">Ref: {entry.refNo}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right">
                            {entry.type === 'in' && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-sm font-black text-emerald-600">+{formatNumber(entry.qty)}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.unit}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-4 text-right">
                            {entry.type === 'out' && (
                              <div className="inline-flex flex-col items-end">
                                <span className="text-sm font-black text-blue-600">{formatNumber(Math.abs(entry.qty))}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.unit}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )) : (
                      <tr>
                        <td colSpan="4" className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-6">
                            <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner">
                              <Droplets className="h-10 w-10" />
                            </div>
                            <div>
                              <p className="text-lg font-black text-slate-900 mb-1">Zero Activity Found</p>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Deployment range shows no consumption logs</p>
                            </div>
                            <button onClick={loadData} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-xl shadow-slate-900/10 hover:shadow-blue-500/20">
                              Re-Initialize Probe
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-top-4 { from { transform: translateY(-1rem); } to { transform: translateY(0); } }
        
        body {
          letter-spacing: -0.01em;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}
