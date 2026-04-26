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
  AlertCircle
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
      // The apiClient interceptor returns response.data directly
      const result = response; 
      setData(result || { summary: [], ledger: [], totalDieselUsed: 0, productName: 'Diesel', unit: 'Ltrs' });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="mx-auto max-w-[98%] px-4 py-6 md:px-6">
        
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/reports"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Truck className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-black text-slate-800 tracking-tight tracking-tight">Vehicle Diesel Consumption</h1>
              </div>
              <p className="text-sm font-medium text-slate-500 italic">Track exact diesel movement per vehicle unit</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold py-3 pl-4 pr-10 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer uppercase tracking-wider"
              >
                <option value="all">All Time</option>
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-6 py-4 text-rose-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Top Summary Card */}
        <div className="mb-8 overflow-hidden rounded-[2.5rem] border border-white bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl text-white relative">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Aggregate Consumption</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-6xl font-black">{formatNumber(data.totalDieselUsed)}</h2>
                <span className="text-xl font-bold text-slate-400 uppercase tracking-widest">{data.unit}</span>
              </div>
            </div>
            <div className="h-px w-full bg-white/10 md:h-16 md:w-px" />
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Active Vehicles</p>
                <p className="text-2xl font-black">{data.summary.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Entries</p>
                <p className="text-2xl font-black">{data.ledger.length}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Vehicle Summary List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-slate-800">Vehicle Ranking</h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Filter vehicle..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 text-xs py-2 pl-8 pr-4 rounded-xl w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSummary.length > 0 ? filteredSummary.map((v, idx) => (
                <div key={v.vehicleId} className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-black text-xs">
                        #{idx + 1}
                      </div>
                      <p className="font-black text-slate-800 tracking-tight">{v.vehicleNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-800">{formatNumber(v.totalUsed)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.unit}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(v.totalUsed / data.totalDieselUsed) * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{v.entryCount} refills</span>
                    <span>{Math.round((v.totalUsed / data.totalDieselUsed) * 100)}% of total</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Truck className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">No vehicles found</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Ledger */}
          <div className="lg:col-span-2">
            <div className="rounded-[2.5rem] bg-white shadow-xl border border-slate-100 overflow-hidden min-h-[600px]">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Consumption Ledger</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Exact Refill Timeline</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest">Vehicle No</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest">Quantity</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="4" className="px-8 py-4"><div className="h-10 bg-slate-100 rounded-2xl w-full" /></td>
                        </tr>
                      ))
                    ) : data.ledger.length > 0 ? data.ledger.map((entry) => (
                      <tr key={entry._id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-800">{formatDate(entry.date)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Entry Verified</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              <Truck className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-black text-slate-700 tracking-tight">{entry.vehicleNo}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-base font-black text-blue-600">{formatNumber(entry.qty)}</span>
                          <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.unit}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-medium text-slate-500 italic max-w-[200px] truncate">{entry.note}</p>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                              <Info className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No consumption records found for this period</p>
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
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
