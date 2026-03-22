import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filterRestrictedItems } from '../utils/featureAccess';
import Navbar from '../components/Navbar';

function AssetIcon({ src, alt = '' }) {
  return <img src={src} alt={alt} className="h-9 w-9 object-contain" />;
}

function StockAdjustmentIcon() {
  return <AssetIcon src="/sales_converted (1).avif" />;
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10.5h14" />
      <path d="M6.5 10.5v7.5M10 10.5v7.5M14 10.5v7.5M17.5 10.5v7.5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function PartyIcon() {
  return <AssetIcon src="/party_converted.avif" />;
}

function StockItemIcon() {
  return <AssetIcon src="/stock item_converted.avif" />;
}

function VehicleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M5 14.5 6.8 9h10.4L19 14.5" />
      <path d="M4 14.5h16v3a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 16 17.5V17H8v.5A1.5 1.5 0 0 1 6.5 19h-1A1.5 1.5 0 0 1 4 17.5v-3Z" />
      <circle cx="7.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function ExpenseGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 20V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5V20" />
      <path d="M7.5 16.5 11 13l2.2 2.2 3.3-3.7" />
      <path d="M7.5 8.5h9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 12a7.2 7.2 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.1-1.2l-.4-2.6h-4l-.4 2.6a7.5 7.5 0 0 0-2.1 1.2l-2.4-1-2 3.5 2 1.5a7.2 7.2 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2.1 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.1-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

function MasterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function DayBookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h8A2.5 2.5 0 0 1 19 4.5v15A2.5 2.5 0 0 1 16.5 22h-8A2.5 2.5 0 0 1 6 19.5v-15Z" />
      <path d="M9 7h7M9 11h7M9 15h4" />
      <path d="M4 6.5v11A2.5 2.5 0 0 0 6.5 20H19" />
    </svg>
  );
}

const menuItems = [
  {
    name: 'Manage Vehicle/Party',
    subtitle: 'Manage Party, Stock, Vehicle, Banks',
    Icon: MasterIcon,
    subItems: [
      { name: 'Add Party', path: '/party', Icon: PartyIcon },
      { name: 'Add Vehicle', path: '/vehicle', Icon: VehicleIcon },
      { name: 'Manage Party', path: '/party', Icon: PartyIcon },
      { name: 'Stock Item', path: '/stock', Icon: StockItemIcon },
      { name: 'Manage Vehicle', path: '/vehicle', Icon: VehicleIcon },
      { name: 'Bank', path: '/banks', Icon: BankIcon }
    ]
  },
  {
    name: 'Expense',
    Icon: MasterIcon,
    subItems: [
      { name: 'Expense', path: '/expenses', Icon: ExpenseIcon },
      { name: 'Expense Group', path: '/expense-groups', Icon: ExpenseGroupIcon }
    ]
  },
  { name: 'Reports', path: '/reports', Icon: ReportIcon },
  { name: 'Settings', path: '/settings', Icon: SettingsIcon }
];

const sectionStyles = {
  'Manage Vehicle/Party': {
    headerClass: 'border-indigo-200/70 bg-indigo-50/95',
    accentTextClass: 'text-[28px] leading-none text-indigo-600',
    accentDotClass: 'h-2.5 w-2.5 rounded-full bg-indigo-500',
    activeClass: 'bg-yellow-200 text-slate-900',
    hoverClass: 'text-slate-700 hover:bg-indigo-50/90',
    barClass: 'bg-indigo-500'
  },
  Reports: {
    headerClass: 'border-amber-200/70 bg-amber-50/95',
    accentTextClass: 'text-[28px] leading-none text-amber-600',
    accentDotClass: 'h-2.5 w-2.5 rounded-full bg-amber-500',
    activeClass: 'bg-yellow-200 text-slate-900',
    hoverClass: 'text-slate-700 hover:bg-amber-50/90',
    barClass: 'bg-amber-500'
  }
};

const HOME_SECTION_ORDER = ['Manage Vehicle/Party', 'Reports'];
const homeQuickShortcuts = [
  {
    label: 'Boulder Entry',
    hint: '',
    combo: '',
    accent: 'from-cyan-500 to-sky-500',
    stateKey: 'homeQuickBoulder',
    imageSrc: '/buttons/boulder.png'
  },
  {
    label: 'New Sale',
    hint: '',
    combo: '',
    accent: 'from-emerald-500 to-teal-500',
    stateKey: 'homeQuickSale',
    imageSrc: '/buttons/add sales.png'
  },
  {
    label: 'New Purchase',
    hint: '',
    combo: '',
    accent: 'from-blue-500 to-cyan-500',
    stateKey: 'homeQuickPurchase',
    imageSrc: '/buttons/add purchase.png'
  },
  {
    label: 'New Payment',
    hint: 'Money Paid',
    combo: '',
    accent: 'from-amber-500 to-orange-500',
    stateKey: 'homeQuickPayment',
    imageSrc: '/buttons/money paid.png'
  },
  {
    label: 'New Receipt',
    hint: 'Money Received',
    combo: '',
    accent: 'from-fuchsia-500 to-pink-500',
    stateKey: 'homeQuickReceipt',
    imageSrc: '/buttons/money received.png'
  },
  {
    label: 'Material Used',
    hint: '',
    combo: '',
    accent: 'from-slate-500 to-slate-700',
    stateKey: 'homeQuickMaterialUsed',
    imageSrc: '/buttons/material used.png'
  },
  { label: 'New Expense', hint: '', combo: 'Alt + 6', accent: 'from-emerald-500 to-lime-500', stateKey: 'homeQuickExpense' },
  { label: 'Expense Group', hint: '', combo: '', accent: 'from-teal-500 to-cyan-500', path: '/expense-groups' },
  { label: 'Purchase Return', hint: '', combo: '', accent: 'from-rose-500 to-pink-500', stateKey: 'homeQuickPurchaseReturn' }
];

const getSectionItems = (sectionName) => {
  if (sectionName === 'Reports') {
    return [
      { name: 'Reports', path: '/reports', Icon: ReportIcon },
      { name: 'Day Book', path: '/day-book', Icon: DayBookIcon }
    ];
  }

  return menuItems.find((item) => item.name === sectionName)?.subItems || [];
};

const activateHomeSection = (sectionName, navigate, setExpandedSection, setActiveHomePath) => {
  setExpandedSection(sectionName);

  if (sectionName === 'Manage Vehicle/Party') {
    navigate('/masters');
    return;
  }

  if (sectionName === 'Reports') {
    navigate('/reports');
    return;
  }

  setActiveHomePath(getSectionItems(sectionName)[0]?.path || '');
};

export default function Home() {
  const [expandedSection, setExpandedSection] = useState('Manage Vehicle/Party');
  const [activeHomePath, setActiveHomePath] = useState('/party');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleMenuItems = menuItems.map((item) => (
    item.subItems ? { ...item, subItems: filterRestrictedItems(item.subItems, user) } : item
  ));

  const getVisibleSectionItems = (sectionName) => {
    if (sectionName === 'Reports') {
      return [
        { name: 'Reports', path: '/reports', Icon: ReportIcon },
        { name: 'Day Book', path: '/day-book', Icon: DayBookIcon }
      ];
    }

    return visibleMenuItems.find((item) => item.name === sectionName)?.subItems || [];
  };

  const handleQuickShortcutOpen = (stateKey) => {
    const directShortcut = homeQuickShortcuts.find((shortcut) => shortcut.stateKey === stateKey || shortcut.path === stateKey);
    if (directShortcut?.path) {
      navigate(directShortcut.path);
      return;
    }

    const currentState = location.state || {};

    navigate('/', {
      replace: true,
          state: {
            ...currentState,
            homeQuickBoulder: stateKey === 'homeQuickBoulder',
            homeQuickSale: stateKey === 'homeQuickSale',
            homeQuickPurchase: stateKey === 'homeQuickPurchase',
            homeQuickPayment: stateKey === 'homeQuickPayment',
            homeQuickReceipt: stateKey === 'homeQuickReceipt',
            homeQuickMaterialUsed: stateKey === 'homeQuickMaterialUsed',
            homeQuickPurchaseReturn: stateKey === 'homeQuickPurchaseReturn',
            homeQuickExpense: stateKey === 'homeQuickExpense'
          }
    });
  };

  useEffect(() => {
    const sectionItems = getVisibleSectionItems(expandedSection);
    if (sectionItems.length === 0) {
      setActiveHomePath('');
      return;
    }

    setActiveHomePath((currentPath) => (
      sectionItems.some((item) => item.path === currentPath)
        ? currentPath
        : sectionItems[0].path
    ));
  }, [expandedSection, user]);

  useEffect(() => {
    if (location.pathname !== '/') return;

    const requestedSection = location.state?.homeSection;
    const requestedPath = location.state?.homePath;
    if (!requestedSection || !requestedPath) return;

    const sectionItems = getVisibleSectionItems(requestedSection).filter((item) => Boolean(item.path));
    if (!sectionItems.some((item) => item.path === requestedPath)) return;

    setExpandedSection(requestedSection);
    setActiveHomePath(requestedPath);
  }, [location.pathname, location.state, user]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const isPopupOpen = () => Boolean(document.querySelector('.fixed.inset-0.z-50'));

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      const isMoveDownKey = key === 'arrowdown' && !event.altKey && !event.metaKey;
      const isMoveUpKey = key === 'arrowup' && !event.altKey && !event.metaKey;
      const quickShortcutMap = {
        '6': 'homeQuickExpense'
      };

      if (event.defaultPrevented || event.metaKey) return;

      if (event.altKey && quickShortcutMap[key]) {
        if (isTypingTarget(event.target) || isPopupOpen()) return;
        event.preventDefault();
        handleQuickShortcutOpen(quickShortcutMap[key]);
        return;
      }

      if (isMoveDownKey || isMoveUpKey || key === 'enter') {
        if (isTypingTarget(event.target) || isPopupOpen()) return;

        if (isMoveDownKey || isMoveUpKey) {
          event.preventDefault();
          const currentIndex = HOME_SECTION_ORDER.indexOf(expandedSection);
          const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
          const move = isMoveDownKey ? 1 : -1;
          const nextSection = HOME_SECTION_ORDER[(safeCurrentIndex + move + HOME_SECTION_ORDER.length) % HOME_SECTION_ORDER.length];

          setExpandedSection(nextSection);
          if (nextSection === 'Reports') {
            setActiveHomePath((currentPath) => currentPath || getVisibleSectionItems('Reports')[0]?.path || '');
          }
          return;
        }

        if (HOME_SECTION_ORDER.includes(expandedSection) && key === 'enter') {
          event.preventDefault();
          activateHomeSection(expandedSection, navigate, setExpandedSection, setActiveHomePath);
          return;
        }

        const sectionItems = getVisibleSectionItems(expandedSection).filter((item) => Boolean(item.path));
        if (sectionItems.length === 0) return;

        if (key === 'enter') {
          event.preventDefault();
          const targetPath = activeHomePath || sectionItems[0].path;
          if (targetPath) navigate(targetPath);
          return;
        }

        event.preventDefault();
        const currentIndex = Math.max(
          sectionItems.findIndex((item) => item.path === activeHomePath),
          0
        );
        const move = isMoveDownKey ? 1 : -1;
        const nextIndex = (currentIndex + move + sectionItems.length) % sectionItems.length;
        setActiveHomePath(sectionItems[nextIndex].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHomePath, expandedSection, location.state, navigate, user]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617]">
      <div className="flex flex-col">
        <Navbar />

        <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center">
        <div className="flex w-full max-w-5xl flex-row items-stretch justify-center gap-2 sm:gap-4 lg:flex-row lg:items-stretch">
          <div className="relative flex min-w-0 flex-1 basis-[54%] flex-col overflow-hidden rounded-[20px] border border-white/20 bg-gradient-to-br from-white/95 via-white/90 to-white/80 shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm sm:max-w-[23rem] sm:rounded-[30px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.1),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />

          <div className="sidebar-scrollbar relative z-10 flex-1 overflow-y-auto pb-4 sm:pb-8">
            <nav className="flex flex-col">
              {visibleMenuItems.filter((item) => HOME_SECTION_ORDER.includes(item.name)).map((item, index) => {
                const sectionStyle = sectionStyles[item.name] || sectionStyles['Manage Vehicle/Party'];
                const isExpanded = false;
                const isSelectedSection = expandedSection === item.name;

                return (
                  <div key={item.name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        if (HOME_SECTION_ORDER.includes(item.name)) {
                          activateHomeSection(item.name, navigate, setExpandedSection, setActiveHomePath);
                          return;
                        }

                        setExpandedSection(item.name);
                        setActiveHomePath(getVisibleSectionItems(item.name)[0]?.path || '');
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2.5 border-y px-3 py-2.5 text-left text-slate-700 transition-all duration-200 sm:gap-3 sm:px-5 sm:py-3 ${isSelectedSection ? 'bg-yellow-200 ring-2 ring-yellow-300 shadow-sm' : sectionStyle.headerClass} ${index > 0 ? 'mt-2 sm:mt-3' : ''} hover:shadow-sm`}
                    >
                      <span className={`inline-flex flex-col ${index === 0 ? sectionStyle.accentTextClass : sectionStyle.accentDotClass}`}>
                        {index === 0 ? '+' : ''}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-[0.12em] sm:text-[12px] sm:tracking-[0.16em]">
                          {item.name.toUpperCase()}
                        </span>
                        {item.subtitle && (
                          <span className="hidden text-[8px] font-medium tracking-[0.08em] text-slate-500 sm:block sm:text-[9px] sm:tracking-[0.1em]">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      <span className={`ml-auto text-lg text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ›
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-b border-slate-200/90">
                        {item.subItems.map((subItem) => {
                          const subActive = activeHomePath === subItem.path;
                          const SubIcon = subItem.Icon;

                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onMouseEnter={() => setActiveHomePath(subItem.path)}
                              onClick={() => setActiveHomePath(subItem.path)}
                              className={`group relative flex cursor-pointer items-center gap-3 border-b border-slate-200/90 px-5 py-2.5 text-[12px] transition-colors duration-200 last:border-b-0 ${subActive ? sectionStyle.activeClass : sectionStyle.hoverClass}`}
                            >
                              {subActive && <div className={`absolute inset-y-0 left-0 w-1 ${sectionStyle.barClass}`} />}

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                                <SubIcon />
                              </div>

                              <span className={subActive ? 'font-semibold text-slate-800' : 'font-medium text-slate-700 group-hover:text-slate-900'}>
                                {subItem.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <Link
                to="/settings"
                className="mt-2 flex w-full cursor-pointer items-center gap-2.5 border-y border-cyan-200/70 bg-cyan-50/95 px-3 py-2.5 text-left text-slate-700 transition-all duration-200 hover:shadow-sm sm:mt-3 sm:gap-3 sm:px-5 sm:py-3"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 sm:h-10 sm:w-10">
                  <SettingsIcon />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-[0.12em] sm:text-[12px] sm:tracking-[0.16em]">
                    SETTING
                  </span>
                  <span className="hidden text-[8px] font-medium tracking-[0.08em] text-slate-500 sm:block sm:text-[9px] sm:tracking-[0.1em]">
                    App preferences and logout
                  </span>
                </div>
              </Link>

              <div className="hidden">
                <button
                  type="button"
                  onClick={() => activateHomeSection('Reports', navigate, setExpandedSection, setActiveHomePath)}
                  className={`mt-3 flex w-full cursor-pointer items-center gap-3 border-y border-slate-200/60 px-5 py-3 text-left text-slate-700 ${expandedSection === 'Reports' ? 'bg-yellow-200 ring-2 ring-yellow-300 shadow-sm' : 'bg-slate-50/80'}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-700">
                    <ReportIcon />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.16em]">REPORTS</span>
                  <span className="ml-auto hidden">
                    ›
                  </span>
                </button>

              </div>
            </nav>
          </div>
          </div>

          <aside className="relative min-w-0 flex-1 basis-[46%] overflow-hidden rounded-[20px] border border-slate-200/15 bg-[linear-gradient(165deg,rgba(30,41,59,0.92),rgba(51,65,85,0.9),rgba(71,85,105,0.88))] shadow-[0_24px_60px_rgba(15,23,42,0.34),0_0_42px_rgba(14,165,233,0.08)] sm:max-w-[22rem] sm:rounded-[30px] lg:max-w-[18rem]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_28%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="border-b border-white/10 px-3 py-3 sm:px-5 sm:py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200 sm:text-[10px] sm:tracking-[0.24em]">Quick Keys</p>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-3">
                {homeQuickShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.stateKey || shortcut.path}
                    type="button"
                    onClick={() => handleQuickShortcutOpen(shortcut.stateKey || shortcut.path)}
                    className={
                      shortcut.imageSrc
                        ? 'cursor-pointer overflow-visible rounded-xl bg-transparent px-0 py-0.5 text-left shadow-none transition hover:-translate-y-0.5 hover:shadow-none'
                        : 'cursor-pointer rounded-xl border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-2 text-left shadow-[0_14px_30px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(148,163,184,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] sm:rounded-2xl sm:p-2.5'
                    }
                  >
                    {shortcut.imageSrc ? (
                      <div className="relative">
                        <img
                          src={shortcut.imageSrc}
                          alt={shortcut.hint || shortcut.label}
                          className="h-auto w-full scale-100 object-contain mix-blend-multiply sm:scale-95"
                        />
                        {shortcut.combo && (
                          <span className="absolute right-2 top-2 hidden rounded-full border border-sky-200 bg-sky-50/95 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-sky-700 sm:inline-flex">
                            {shortcut.combo}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`h-7 w-1.5 rounded-full bg-gradient-to-b sm:h-8 ${shortcut.accent}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold leading-tight text-slate-800 sm:text-[12px]">{shortcut.label}</p>
                          {shortcut.hint && (
                            <p className="mt-0.5 hidden text-[10px] font-medium text-slate-500 sm:block">{shortcut.hint}</p>
                          )}
                        </div>
                        {shortcut.combo && (
                          <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-sky-700 sm:inline-flex">
                            {shortcut.combo}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
