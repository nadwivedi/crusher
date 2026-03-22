import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFeatureAccess } from '../utils/featureAccess';

const STORAGE_KEY = 'crusher-app-settings';

const defaultSettings = {
  companyLabel: 'Crusher Management',
  consoleLabel: 'Business Console',
  defaultLandingPage: '/',
  defaultReportRoute: '/reports',
  keyboardShortcuts: true,
  showQuickActions: true,
  compactTables: false
};

const landingPageOptions = [
  { value: '/', label: 'Home' },
  { value: '/expense-hub', label: 'Expense' },
  { value: '/reports', label: 'Reports' }
];

const reportOptions = [
  { value: '/reports', label: 'Reports Hub' },
  { value: '/day-book', label: 'Day Book' },
  { value: '/reports/party-ledger', label: 'Party Ledger' },
  { value: '/reports/stock-ledger', label: 'Stock Ledger' },
  { value: '/reports/boulder-ledger', label: 'Boulder Ledger' }
];

const toggleFields = [
  {
    key: 'keyboardShortcuts',
    title: 'Keyboard shortcuts',
    description: 'Keep quick keys active across the app.'
  },
  {
    key: 'showQuickActions',
    title: 'Homepage quick actions',
    description: 'Show shortcut cards on the homepage.'
  },
  {
    key: 'compactTables',
    title: 'Compact table mode',
    description: 'Save this preference for future table screens.'
  }
];

const readStoredSettings = () => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch (error) {
    return defaultSettings;
  }
};

function SettingCard({ icon, title, description, children, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}>
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 translate-y-[-50%] rounded-full bg-gradient-to-br from-sky-50 to-cyan-50 opacity-50"></div>
      <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoBadge({ icon, label, value, color = 'sky' }) {
  const colorClasses = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700'
  };
  
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${colorClasses[color]} px-4 py-3`}>
      {icon && <span className="text-lg">{icon}</span>}
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
        <p className="mt-0.5 font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50">
      <div className="flex-1 pr-4">
        <span className="block font-medium text-slate-800">{label}</span>
        {description && <span className="mt-1 block text-sm text-slate-500">{description}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange({ target: { name: label.toLowerCase().replace(/\s+/g, ''), type: 'checkbox', checked: !checked } })}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-sky-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}></span>
      </button>
    </label>
  );
}

export default function Setting() {
  const { user, logout, updateUserSettings } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);
  const [featureAccess, setFeatureAccess] = useState({ saleReturn: false, stockAdjustment: false });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(readStoredSettings());
    setFeatureAccess(getUserFeatureAccess(user));
    setIsLoaded(true);
  }, [user]);

  const displayName = String(
    user?.name || user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`
  ).trim() || '-';

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleToggle = (key) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const handleFeatureToggle = (key) => {
    setFeatureAccess((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const handleSave = async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    try {
      await updateUserSettings({ featureAccess });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to save settings');
    }
  };

  const handleReset = async () => {
    const resetFeatureAccess = { saleReturn: false, stockAdjustment: false };
    setSettings(defaultSettings);
    setFeatureAccess(resetFeatureAccess);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    try {
      await updateUserSettings({ featureAccess: resetFeatureAccess });
      toast.success('Settings reset to default');
    } catch (error) {
      toast.error(error?.message || 'Failed to reset settings');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const landingPageLabel = landingPageOptions.find((item) => item.value === settings.defaultLandingPage)?.label || 'Home';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700">Configuration</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Manage your application preferences and account settings from one place.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBadge 
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Saved Location" 
            value="This Browser" 
            color="sky" 
          />
          <InfoBadge 
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
            label="Landing Page" 
            value={landingPageLabel} 
            color="amber" 
          />
          <InfoBadge 
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            label="Shortcuts" 
            value={settings.keyboardShortcuts ? 'Enabled' : 'Disabled'} 
            color="emerald" 
          />
          <InfoBadge 
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            label="Quick Actions" 
            value={settings.showQuickActions ? 'Active' : 'Inactive'} 
            color="violet" 
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SettingCard
              title="App Preferences"
              description="These settings are stored locally to customize your app experience."
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Company Label</label>
                    <input
                      type="text"
                      name="companyLabel"
                      value={settings.companyLabel}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Console Label</label>
                    <input
                      type="text"
                      name="consoleLabel"
                      value={settings.consoleLabel}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Default Landing Page</label>
                    <select
                      name="defaultLandingPage"
                      value={settings.defaultLandingPage}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      {landingPageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Default Report Screen</label>
                    <select
                      name="defaultReportRoute"
                      value={settings.defaultReportRoute}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      {reportOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-slate-700">Features</p>
                  {toggleFields.map((field) => (
                    <ToggleSwitch
                      key={field.key}
                      checked={settings[field.key]}
                      onChange={() => handleToggle(field.key)}
                      label={field.title}
                      description={field.description}
                    />
                  ))}
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700">Limited Pages For User</p>
                  <ToggleSwitch
                    checked={featureAccess.saleReturn}
                    onChange={() => handleFeatureToggle('saleReturn')}
                    label="Sale Return"
                    description="Hidden by default. Enable this if the user should see Sale Return."
                  />
                  <ToggleSwitch
                    checked={featureAccess.stockAdjustment}
                    onChange={() => handleFeatureToggle('stockAdjustment')}
                    label="Stock Adjustment"
                    description="Hidden by default. Enable this if the user should see Stock Adjustment."
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isLoaded}
                    className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isLoaded}
                    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Reset Defaults
                  </button>
                </div>
              </div>
            </SettingCard>
          </div>

          <div className="space-y-6">
            <SettingCard
              title="Account"
              description="Your signed-in business profile details."
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            >
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Company</p>
                  <p className="mt-1 font-semibold text-slate-800">{displayName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                  <p className="mt-1 font-semibold text-slate-800">{user?.email || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Phone</p>
                  <p className="mt-1 font-semibold text-slate-800">{user?.mobile || user?.phone || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">State</p>
                  <p className="mt-1 font-semibold text-slate-800">{user?.state || user?.address?.state || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">District</p>
                  <p className="mt-1 font-semibold text-slate-800">{user?.district || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Sale Return Access</p>
                  <p className="mt-1 font-semibold text-slate-800">{featureAccess.saleReturn ? 'Enabled' : 'Hidden'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Stock Adjustment Access</p>
                  <p className="mt-1 font-semibold text-slate-800">{featureAccess.stockAdjustment ? 'Enabled' : 'Hidden'}</p>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Session"
              description="End your current session on this device."
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
            >
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </SettingCard>
          </div>
        </div>
      </div>
    </div>
  );
}
