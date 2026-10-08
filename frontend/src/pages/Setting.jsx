import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmployeeManagement from '../components/EmployeeManagement';

// tonKey / cubicKey are the field names saved in the user's materialRates
const MATERIALS = [
  { label: '10mm', tonKey: 'tenMmRate', cubicKey: 'tenMmRatePerCubicMeter' },
  { label: '20mm', tonKey: 'twentyMmRate', cubicKey: 'twentyMmRatePerCubicMeter' },
  { label: '40mm', tonKey: 'fortyMmRate', cubicKey: 'fortyMmRatePerCubicMeter' },
  { label: '60mm', tonKey: 'sixtyMmRate', cubicKey: 'sixtyMmRatePerCubicMeter' },
  { label: '6mm', tonKey: 'sixMmRate', cubicKey: 'sixMmRatePerCubicMeter' },
  { label: '4mm', tonKey: 'fourMmRate', cubicKey: 'fourMmRatePerCubicMeter' },
  { label: 'WMM', tonKey: 'wmmRate', cubicKey: 'wmmRatePerCubicMeter' },
  { label: 'GSB', tonKey: 'gsbRate', cubicKey: 'gsbRatePerCubicMeter' },
  { label: 'Dust', tonKey: 'dustRate', cubicKey: 'dustRatePerCubicMeter' }
];
const RATE_KEYS = MATERIALS.flatMap((material) => [material.tonKey, material.cubicKey]);

// Empty box instead of 0 for a rate that is not set
const readUserMaterialRates = (user) => Object.fromEntries(
  RATE_KEYS.map((key) => [key, Number(user?.materialRates?.[key] || 0) || ''])
);

function RateInput({ name, value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      name={name}
      value={value}
      onChange={onChange}
      placeholder="0"
      className="input text-right font-semibold"
    />
  );
}

export default function Setting() {
  const { user, updateUserSettings, logout } = useAuth();
  const navigate = useNavigate();
  const [materialRates, setMaterialRates] = useState(() => readUserMaterialRates(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMaterialRates(readUserMaterialRates(user));
  }, [user]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      navigate('/', { replace: true });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const displayName = String(
    user?.name || user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`
  ).trim() || '-';

  const accountDetails = [
    { label: 'Email', value: user?.email },
    { label: 'Phone', value: user?.mobile || user?.phone },
    { label: 'State', value: user?.state || user?.address?.state },
    { label: 'District', value: user?.district }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMaterialRateChange = (event) => {
    const { name, value } = event.target;
    setMaterialRates((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserSettings({
        materialRates: Object.fromEntries(RATE_KEYS.map((key) => [key, Number(materialRates[key] || 0)]))
      });
      toast.success('Rates saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-fade-in max-w-5xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your account, material rates and staff logins</p>
      </div>

      {/* Account */}
      <section className="card">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700 to-primary-500 text-xl font-bold text-white shadow-lg shadow-primary-700/20">
            {displayName[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900">{displayName}</h2>
            {user?.role && <span className="badge-green capitalize">{user.role}</span>}
          </div>
          <button type="button" className="btn-secondary shrink-0 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 md:grid-cols-4">
          {accountDetails.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <dt className="text-xs font-medium text-slate-500">{detail.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={detail.value || undefined}>{detail.value || '-'}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Material rates */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-bold text-slate-900">Material Rates</h2>
          <p className="text-xs text-slate-500">Your usual selling rates. They fill in automatically when you add a sale.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="tbl-head w-28 md:w-40">Material</th>
                <th className="tbl-head text-right">Rate per Ton (₹)</th>
                <th className="tbl-head text-right">Rate per m³ (₹)</th>
              </tr>
            </thead>
            <tbody>
              {MATERIALS.map((material) => (
                <tr key={material.tonKey} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-2 text-sm font-semibold text-slate-800 md:px-5">{material.label}</td>
                  <td className="px-3 py-2 md:px-5">
                    <RateInput name={material.tonKey} value={materialRates[material.tonKey]} onChange={handleMaterialRateChange} />
                  </td>
                  <td className="px-3 py-2 md:px-5">
                    <RateInput name={material.cubicKey} value={materialRates[material.cubicKey]} onChange={handleMaterialRateChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-3 md:px-5">
          <button type="button" className="btn-primary w-full px-8 sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Rates'}
          </button>
        </div>
      </section>

      {user?.role !== 'employee' && <EmployeeManagement />}
    </div>
  );
}
