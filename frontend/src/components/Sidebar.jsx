import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function AssetIcon({ src, alt = '' }) {
  return <img src={src} alt={alt} className="h-9 w-9 object-contain" />;
}

function StockAdjustmentIcon() {
  return <AssetIcon src="/sales_converted (1).avif" />;
}

function PartyIcon() {
  return <AssetIcon src="/party_converted.avif" />;
}

function StockItemIcon() {
  return <AssetIcon src="/stock item_converted.avif" />;
}

function PurchaseIcon() {
  return <AssetIcon src="/purchase_converted.avif" />;
}

function SaleIcon() {
  return <AssetIcon src="/sales_converted.avif" />;
}

function PaymentIcon() {
  return <AssetIcon src="/payment_converted.avif" />;
}

function ReceiptIcon() {
  return <AssetIcon src="/reciept_converted.avif" />;
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

function VoucherIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </svg>
  );
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

function BoulderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="m5 16 3.5-5L13 8l4 3 2 5Z" />
      <path d="M8.5 11 11 16m4-5-1 5" />
    </svg>
  );
}

const menuItems = [
  {
    name: 'Masters',
    Icon: MasterIcon,
    subItems: [
      { name: 'Manage Party', path: '/party', Icon: PartyIcon },
      { name: 'Stock Item', path: '/stock', Icon: StockItemIcon },
      { name: 'Vehicle', path: '/vehicle', Icon: VehicleIcon, dividerBefore: true }
    ]
  },
  {
    name: 'Vouchers',
    Icon: VoucherIcon,
    subItems: [
      { name: 'Boulder', path: '/boulder', Icon: BoulderIcon },
      { name: 'Sale', path: '/sales', Icon: SaleIcon },
      { name: 'Payment', path: '/payments', Icon: PaymentIcon },
      { name: 'Receipt', path: '/receipts', Icon: ReceiptIcon }
    ]
  },
  {
    name: 'Expense',
    Icon: VoucherIcon,
    subItems: [
      { name: 'Expense', path: '/expenses', Icon: ExpenseIcon },
      { name: 'Expense Group', path: '/expense-groups', Icon: ExpenseGroupIcon }
    ]
  },
  { name: 'Reports', path: '/reports', Icon: ReportIcon },
  { name: 'Settings', path: '/settings', Icon: SettingsIcon }
];

const sectionStyles = {
  Masters: {
    headerClass: 'border-cyan-200/70 bg-cyan-50/95',
    accentTextClass: 'text-[28px] leading-none text-cyan-700',
    accentDotClass: 'h-2.5 w-2.5 rounded-full bg-cyan-500',
    label: 'MASTERS',
    activeClass: 'bg-[linear-gradient(90deg,rgba(207,250,254,0.96),rgba(236,254,255,0.94))] text-slate-800',
    hoverClass: 'text-slate-700 hover:bg-cyan-50/90',
    barClass: 'bg-cyan-500'
  },
  Vouchers: {
    headerClass: 'border-amber-200/70 bg-amber-50/95',
    accentTextClass: 'text-[28px] leading-none text-amber-700',
    accentDotClass: 'h-2.5 w-2.5 rounded-full bg-amber-500',
    label: 'VOUCHERS',
    activeClass: 'bg-[linear-gradient(90deg,rgba(254,243,199,0.96),rgba(255,251,235,0.94))] text-slate-800',
    hoverClass: 'text-slate-700 hover:bg-amber-50/90',
    barClass: 'bg-amber-500'
  },
  Expense: {
    headerClass: 'border-emerald-200/70 bg-emerald-50/95',
    accentTextClass: 'text-[28px] leading-none text-emerald-700',
    accentDotClass: 'h-2.5 w-2.5 rounded-full bg-emerald-500',
    label: 'EXPENSE',
    activeClass: 'bg-[linear-gradient(90deg,rgba(209,250,229,0.96),rgba(236,253,245,0.94))] text-slate-800',
    hoverClass: 'text-slate-700 hover:bg-emerald-50/90',
    barClass: 'bg-emerald-500'
  }
};

const homeSectionHotkeys = {
  m: 'Masters',
  v: 'Vouchers',
  e: 'Expense',
  r: 'Reports'
};

const getSectionItems = (sectionName) => {
  if (sectionName === 'Reports') {
    return menuItems.filter((item) => !item.subItems?.length);
  }
  return menuItems.find((item) => item.name === sectionName)?.subItems || [];
};

const renderSectionLabel = (label) => {
  const firstChar = String(label || '').charAt(0);
  const remainder = String(label || '').slice(1);
  return (
    <>
      <span className="text-[14px] font-extrabold text-slate-900">{firstChar}</span>
      <span>{remainder}</span>
    </>
  );
};

export default function Sidebar({ variant = 'rail' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState('Masters');
  const [activeHomePath, setActiveHomePath] = useState('/party');
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (!path) return false;
    if (location.pathname === path) return true;
    return location.pathname.startsWith(`${path}/`);
  };

  const isItemOrSubItemActive = (item) => {
    if (item.path && isActive(item.path)) return true;
    if (item.subItems) {
      return item.subItems.some(sub => isActive(sub.path));
    }
    return false;
  };

  useEffect(() => {
    if (variant !== 'home') return;
    const sectionItems = getSectionItems(expandedSection);
    if (sectionItems.length === 0) {
      setActiveHomePath('');
      return;
    }
    setActiveHomePath((currentPath) => (
      sectionItems.some((item) => item.path === currentPath)
        ? currentPath
        : sectionItems[0].path
    ));
  }, [expandedSection, variant]);

  useEffect(() => {
    if (variant !== 'home' || location.pathname !== '/') return;
    const requestedSection = location.state?.homeSection;
    const requestedPath = location.state?.homePath;
    if (!requestedSection || !requestedPath) return;
    const sectionItems = getSectionItems(requestedSection).filter((item) => Boolean(item.path));
    if (!sectionItems.some((item) => item.path === requestedPath)) return;
    setExpandedSection(requestedSection);
    setActiveHomePath(requestedPath);
  }, [location.pathname, location.state, variant]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const isPopupOpen = () => Boolean(document.querySelector('.fixed.inset-0.z-50'));

    const triggerNewAction = () => {
      const visibleButtons = Array.from(document.querySelectorAll('button')).filter(
        (button) => !button.disabled && button.offsetParent !== null
      );
      const patterns = [/^\s*\+\s*add\b/i, /^\s*\+\s*new\b/i, /^\s*new\b/i];
      for (const pattern of patterns) {
        const match = visibleButtons.find((button) => pattern.test((button.textContent || '').trim()));
        if (match) {
          match.click();
          return true;
        }
      }
      return false;
    };

    const closeActivePopup = () => {
      const closeButton = document.querySelector('.fixed.inset-0.z-50 button[aria-label="Close popup"]');
      if (closeButton instanceof HTMLButtonElement) {
        closeButton.click();
        return true;
      }
      return false;
    };

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      const isAltN = event.altKey && !event.ctrlKey && !event.metaKey && key === 'n';
      const isMoveDownKey = key === 'arrowdown' && !event.altKey && !event.metaKey;
      const isMoveUpKey = key === 'arrowup' && !event.altKey && !event.metaKey;

      if (event.defaultPrevented || event.metaKey) return;

      if (variant === 'home' && homeSectionHotkeys[key]) {
        event.preventDefault();
        setExpandedSection(homeSectionHotkeys[key]);
        return;
      }

      if (variant === 'home' && (isMoveDownKey || isMoveUpKey || key === 'enter')) {
        if (isTypingTarget(event.target)) return;
        const sectionItems = getSectionItems(expandedSection).filter((item) => Boolean(item.path));
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
        return;
      }

      if (key === 'escape' && isPopupOpen()) {
        event.preventDefault();
        closeActivePopup();
        return;
      }

      if (isAltN) {
        if (isPopupOpen()) return;
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        triggerNewAction();
        return;
      }

      if (event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (isPopupOpen()) return;

      const sectionSubItems = menuItems
        .filter((item) => item.subItems?.length)
        .map((item) => (item.subItems || []).filter((subItem) => Boolean(subItem.path)));

      if ((isMoveDownKey || isMoveUpKey) && sectionSubItems.some((items) => items.length > 0)) {
        const activeSectionItems = sectionSubItems.find((items) => items.some((subItem) => isActive(subItem.path)));
        if (activeSectionItems?.length) {
          event.preventDefault();
          if (window.innerWidth < 768) setMobileOpen(true);
          const move = isMoveDownKey ? 1 : -1;
          const currentIndex = activeSectionItems.findIndex((subItem) => isActive(subItem.path));
          const nextIndex = (currentIndex + move + activeSectionItems.length) % activeSectionItems.length;
          navigate(activeSectionItems[nextIndex].path);
          return;
        }
      }

      if (event.ctrlKey) return;

      if (key === 'v') {
        event.preventDefault();
        if (window.innerWidth < 768) setMobileOpen(true);
        navigate('/sales');
      } else if (key === 'e') {
        event.preventDefault();
        if (window.innerWidth < 768) setMobileOpen(true);
        navigate('/expenses');
      } else if (key === 'm') {
        event.preventDefault();
        if (window.innerWidth < 768) setMobileOpen(true);
        navigate('/party');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHomePath, expandedSection, navigate, location.pathname, variant]);

  const handleNavLinkClick = () => {
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const renderMenuContent = (onNavigate, options = {}) => (
    <div className="sidebar-scrollbar relative z-10 flex-1 overflow-y-auto pb-8">
      <nav className="flex flex-col">
        {menuItems.filter((item) => item.subItems?.length).map((item, index) => {
          const sectionStyle = sectionStyles[item.name] || sectionStyles.Masters;
          const isExpanded = !options.accordion || expandedSection === item.name;

          return (
            <div key={item.name} className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  if (options.accordion) {
                    setExpandedSection(item.name);
                    setActiveHomePath(getSectionItems(item.name)[0]?.path || '');
                  }
                }}
                className={`flex w-full items-center gap-3 border-y px-5 py-3 text-left text-slate-700 ${sectionStyle.headerClass} ${index > 0 ? 'mt-3' : ''}`}
              >
                <span className={`inline-flex ${index === 0 ? sectionStyle.accentTextClass : sectionStyle.accentDotClass}`}>
                  {index === 0 ? '+' : ''}
                </span>
                <span className="text-[12px] font-bold tracking-[0.16em]">
                  {options.accordion ? renderSectionLabel(item.name.toUpperCase()) : sectionStyle.label}
                </span>
                {options.accordion && (
                  <span className={`ml-auto text-lg text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="border-b border-slate-200/90">
                  {item.subItems.map((subItem) => {
                    const subActive = options.accordion ? activeHomePath === subItem.path : isActive(subItem.path);
                    const SubIcon = subItem.Icon;

                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        onMouseEnter={() => {
                          if (options.accordion) setActiveHomePath(subItem.path);
                        }}
                        onClick={() => {
                          if (options.accordion) setActiveHomePath(subItem.path);
                          onNavigate();
                        }}
                        className={`group relative flex items-center gap-3 border-b border-slate-200/90 px-5 py-2.5 text-[12px] transition-colors duration-200 last:border-b-0 ${
                          subActive ? sectionStyle.activeClass : sectionStyle.hoverClass
                        }`}
                      >
                        {subActive && (
                          <div className={`absolute inset-y-0 left-0 w-1 ${sectionStyle.barClass}`} />
                        )}

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <SubIcon />
                        </div>

                        <span className={`${subActive ? 'font-semibold text-slate-800' : 'font-medium text-slate-700 group-hover:text-slate-900'}`}>
                          {item.name === 'Vouchers' && subItem.name === 'Sale' ? 'Sales'
                            : item.name === 'Vouchers' && subItem.name === 'Purchase' ? 'Purchase'
                              : subItem.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {(() => {
          const isExpanded = !options.accordion || expandedSection === 'Reports';

          return (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  if (options.accordion) {
                    setExpandedSection('Reports');
                    setActiveHomePath(getSectionItems('Reports')[0]?.path || '');
                  }
                }}
                className="mt-3 flex w-full items-center gap-3 border-y border-slate-200 bg-slate-50/90 px-5 py-3 text-left text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <span className="text-[12px] font-bold tracking-[0.16em]">{options.accordion ? renderSectionLabel('REPORTS') : 'REPORTS'}</span>
                {options.accordion && (
                  <span className={`ml-auto text-lg text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                )}
              </button>

              {isExpanded && menuItems.filter((item) => !item.subItems?.length).map((item) => {
                const active = options.accordion ? activeHomePath === item.path : isActive(item.path);
                const Icon = item.Icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => {
                      if (options.accordion) setActiveHomePath(item.path);
                    }}
                    onClick={() => {
                      if (options.accordion) setActiveHomePath(item.path);
                      onNavigate();
                    }}
                    className={`group relative flex items-center gap-3 border-b border-slate-200/90 px-5 py-2.5 text-[12px] transition-colors duration-200 ${
                      active
                        ? 'bg-[linear-gradient(90deg,rgba(224,242,254,0.98),rgba(248,250,252,0.94))] text-slate-800'
                        : 'text-slate-700 hover:bg-cyan-50/90'
                    }`}
                  >
                    {active && <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-700">
                      <Icon />
                    </div>

                    <span className={`${active ? 'font-semibold text-slate-800' : 'font-medium text-slate-700 group-hover:text-slate-900'}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })()}
      </nav>
    </div>
  );

  if (variant === 'home') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(100,116,139,0.18),transparent_24%),linear-gradient(180deg,#334155_0%,#1e293b_52%,#0f172a_100%)] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
          <div className="relative flex w-full max-w-[23rem] flex-col overflow-hidden rounded-[30px] border border-slate-500/60 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_34%,#e2e8f0_72%,#cbd5e1_100%)] shadow-[0_32px_80px_rgba(2,6,23,0.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.35),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-300/80 to-transparent" />

            <div className="relative z-10 border-b border-slate-200 px-5 py-5">
              <p className="text-[15px] font-bold tracking-[0.18em] text-slate-800">CRUSHER</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations Console</p>
            </div>

            {renderMenuContent(() => {}, { accordion: true })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-[60px] border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#f9fafb_55%,#e0f2fe_100%)] px-4 shadow-[0_14px_34px_rgba(148,163,184,0.18)] md:hidden">
        <div className="relative flex h-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-slate-800">CRUSHER</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Operations Console</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white/80 text-slate-700 transition hover:bg-white"
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[3px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[13.25rem] max-w-[82vw] flex-col overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f9fafb_34%,#eff6ff_72%,#e0f2fe_100%)] shadow-[0_28px_60px_rgba(148,163,184,0.22)] transition-transform duration-300 md:z-40 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.35),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-300/80 to-transparent" />

        <div className="relative z-10 flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <Link to="/" className="group flex items-center gap-3.5" onClick={() => setMobileOpen(false)}>
            <div className="flex flex-col">
              <p className="text-[15px] font-bold tracking-[0.18em] text-slate-800">
                CRUSHER
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Operations Console
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white/80 text-slate-700 transition hover:bg-white md:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        {renderMenuContent(handleNavLinkClick)}
      </aside>
    </>
  );
}
