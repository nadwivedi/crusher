function AssetIcon({ src, alt = '' }) {
  return <img src={src} alt={alt} className="h-10 w-10 object-contain" />;
}

function StockAdjustmentIcon() {
  return <AssetIcon src="/sales_converted (1).avif" />;
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
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

function VehicleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M5 14.5 6.8 9h10.4L19 14.5" />
      <path d="M4 14.5h16v3a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 16 17.5V17H8v.5A1.5 1.5 0 0 1 6.5 19h-1A1.5 1.5 0 0 1 4 17.5v-3Z" />
      <circle cx="7.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function ExpenseGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M4 20V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5V20" />
      <path d="M7.5 16.5 11 13l2.2 2.2 3.3-3.7" />
      <path d="M7.5 8.5h9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 12a7.2 7.2 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.1-1.2l-.4-2.6h-4l-.4 2.6a7.5 7.5 0 0 0-2.1 1.2l-2.4-1-2 3.5 2 1.5a7.2 7.2 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2.1 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.1-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

function MasterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function VoucherIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </svg>
  );
}

function SaleReturnIcon() {
  return <AssetIcon src="/sales return_converted.avif" />;
}

function PurchaseReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M8 7H4v4" />
      <path d="M4 11a8 8 0 1 0 2.3-5.6L4 7" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function BoulderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="m5 16 3.5-5L13 8l4 3 2 5Z" />
      <path d="M8.5 11 11 16m4-5-1 5" />
    </svg>
  );
}

function MaterialUsedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M6 6h12v12H6z" />
      <path d="M9 9h6M9 12h6M9 15h3" />
    </svg>
  );
}

function DayBookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h8A2.5 2.5 0 0 1 19 4.5v15A2.5 2.5 0 0 1 16.5 22h-8A2.5 2.5 0 0 1 6 19.5v-15Z" />
      <path d="M9 7h7M9 11h7M9 15h4" />
      <path d="M4 6.5v11A2.5 2.5 0 0 0 6.5 20H19" />
    </svg>
  );
}

function BoulderLedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="m5 16 3.5-5L13 8l4 3 2 5Z" />
      <path d="M6 20h12" />
      <path d="M8.5 11 11 16m4-5-1 5" />
    </svg>
  );
}

function MaterialUsedLedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M6 6h12v12H6z" />
      <path d="M9 9h6M9 12h6M9 15h3" />
    </svg>
  );
}

export const SECTION_CONFIG = {
  Masters: {
    name: 'Masters',
    subtitle: 'Manage Party, Stock, Vehicle, Banks',
    hubPath: '/masters',
    Icon: MasterIcon,
    description: 'Parties, stock items, stock groups, units, vehicles, and bank accounts',
    theme: {
      card: 'from-indigo-500 via-blue-500 to-cyan-500',
      soft: 'from-indigo-50 via-blue-50 to-cyan-50',
      ring: 'ring-indigo-200/70',
      icon: 'bg-indigo-100 text-indigo-700',
      accent: 'bg-indigo-500'
    },
    items: [
      { name: 'Manage Party', path: '/party', Icon: PartyIcon },
      { name: 'Stock Item', path: '/stock', Icon: StockItemIcon },
      { name: 'Manage Vehicle', path: '/vehicle', Icon: VehicleIcon },
      { name: 'Bank', path: '/banks', Icon: BankIcon }
    ]
  },
  Vouchers: {
    name: 'Vouchers',
    subtitle: 'Add sales, purchases, payments and returns',
    hubPath: '/vouchers',
    Icon: VoucherIcon,
    description: 'Sales, purchases, payments, receipts, returns, and stock flow',
    theme: {
      card: 'from-violet-500 via-fuchsia-500 to-pink-500',
      soft: 'from-violet-50 via-fuchsia-50 to-pink-50',
      ring: 'ring-violet-200/70',
      icon: 'bg-violet-100 text-violet-700',
      accent: 'bg-violet-500'
    },
    items: [
      { name: 'Boulder Entry', path: '/boulder-entry', Icon: BoulderIcon },
      { name: 'Sales', path: '/sales', Icon: SaleIcon },
      { name: 'Purchase', path: '/purchases', Icon: PurchaseIcon },
      { name: 'Sale Return', path: '/sale-return', Icon: SaleReturnIcon },
      { name: 'Purchase Return', path: '/purchase-return', Icon: PurchaseReturnIcon },
      { name: 'Material Used', path: '/material-used', Icon: MaterialUsedIcon },
      { name: 'Stock Adjustment', path: '/stock-adjustment', Icon: StockAdjustmentIcon },
      { name: 'Payment', hint: 'Money paid to supplier', path: '/payments', Icon: PaymentIcon },
      { name: 'Receipt', hint: 'Money received from customer', path: '/receipts', Icon: ReceiptIcon }
    ]
  },
  Expense: {
    name: 'Expense',
    hubPath: '/expenses',
    Icon: ExpenseIcon,
    description: 'Expenses and expense groups in one place',
    theme: {
      card: 'from-emerald-500 via-teal-500 to-cyan-500',
      soft: 'from-emerald-50 via-teal-50 to-cyan-50',
      ring: 'ring-emerald-200/70',
      icon: 'bg-emerald-100 text-emerald-700',
      accent: 'bg-emerald-500'
    },
    items: [
      { name: 'Manage Expense', path: '/expenses', Icon: ExpenseIcon },
      { name: 'Expense Group', path: '/expense-groups', Icon: ExpenseGroupIcon }
    ]
  },
  Reports: {
    name: 'Reports',
    hubPath: '/reports',
    Icon: ReportIcon,
    description: 'Reports and settings shortcuts',
    theme: {
      card: 'from-amber-500 via-orange-500 to-rose-500',
      soft: 'from-amber-50 via-orange-50 to-rose-50',
      ring: 'ring-amber-200/70',
      icon: 'bg-amber-100 text-amber-700',
      accent: 'bg-amber-500'
    },
    items: [
      { name: 'Reports', path: '/reports', Icon: ReportIcon },
      { name: 'Boulder Ledger', path: '/reports/boulder-ledger', Icon: BoulderLedgerIcon },
      { name: 'Material Used Ledger', path: '/reports/material-used-ledger', Icon: MaterialUsedLedgerIcon },
      { name: 'Day Book', path: '/day-book', Icon: DayBookIcon },
      { name: 'Settings', path: '/settings', Icon: SettingsIcon }
    ]
  }
};

export const SECTION_ORDER = ['Masters', 'Vouchers', 'Expense', 'Reports'];

export const SECTION_HUB_PATHS = SECTION_ORDER.map((sectionName) => SECTION_CONFIG[sectionName].hubPath);

export const getSectionConfig = (sectionName) => SECTION_CONFIG[sectionName] || null;

export const getSectionForPath = (pathname) => {
  if (!pathname) return null;

  return SECTION_ORDER.find((sectionName) => {
    const config = SECTION_CONFIG[sectionName];
    return config.items.some(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
    );
  }) || null;
};

export const getHubPathForPath = (pathname) => {
  const sectionName = getSectionForPath(pathname);
  return sectionName ? SECTION_CONFIG[sectionName].hubPath : '/';
};
