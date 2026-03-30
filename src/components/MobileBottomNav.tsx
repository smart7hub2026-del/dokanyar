import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Menu,
  Building2,
  BarChart3,
  Wallet,
  Truck,
  Receipt,
  Search,
  Warehouse,
} from 'lucide-react';
type Role = 'super_admin' | 'admin' | 'seller' | 'stock_keeper' | 'accountant';
import { PAGE_TO_PATH } from '../config/pageRoutes';
import { useApp } from '../context/AppContext';

type NavDef = { page: string; icon: typeof LayoutDashboard; labelKey: string };

const ICON = 1.75;
const ICON_ACTIVE = 2;

const SUPER_NAV: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'tenants', icon: Building2, labelKey: 'tenants' },
  { page: 'reports', icon: BarChart3, labelKey: 'reports' },
  { page: 'billing', icon: Wallet, labelKey: 'billing' },
];

const ADMIN_NAV: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'sales', icon: ShoppingCart, labelKey: 'sales' },
  { page: 'products', icon: Package, labelKey: 'products' },
  { page: 'warehouse', icon: Warehouse, labelKey: 'warehouse_page' },
];

const SELLER_NAV: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'sales', icon: ShoppingCart, labelKey: 'sales' },
  { page: 'customers', icon: Users, labelKey: 'customers' },
  { page: 'products', icon: Package, labelKey: 'products' },
];

const STOCK_NAV: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'products', icon: Package, labelKey: 'products' },
  { page: 'warehouse', icon: Warehouse, labelKey: 'warehouse_page' },
  { page: 'suppliers', icon: Truck, labelKey: 'suppliers' },
];

const ACCOUNTANT_NAV: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'accounting', icon: Wallet, labelKey: 'accounting' },
  { page: 'debts', icon: Receipt, labelKey: 'debts' },
  { page: 'reports', icon: BarChart3, labelKey: 'reports' },
];

function navForRole(role: Role): NavDef[] {
  if (role === 'super_admin') return SUPER_NAV;
  if (role === 'seller') return SELLER_NAV;
  if (role === 'stock_keeper') return STOCK_NAV;
  if (role === 'accountant') return ACCOUNTANT_NAV;
  return ADMIN_NAV;
}

/** صفحهٔ مرکزی بزرگ: فروش در اولویت؛ در غیر این صورت محصولات / مستاجرین / حسابداری */
function centerPageFor(role: Role, items: NavDef[]): string | null {
  if (items.some(i => i.page === 'sales')) return 'sales';
  if (role === 'stock_keeper') return 'products';
  if (role === 'accountant') return 'accounting';
  if (role === 'super_admin') return 'tenants';
  return null;
}

export default function MobileBottomNav({
  role,
  activePage,
  onNavigate,
  onOpenMenu,
  onOpenSearch,
}: {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  const { t, isDark } = useApp();
  const items = role === 'super_admin' ? SUPER_NAV : navForRole(role);
  const centerPage = centerPageFor(role, items);
  const sideItems = centerPage ? items.filter(i => i.page !== centerPage) : items;
  const mid = Math.ceil(sideItems.length / 2);
  const left = sideItems.slice(0, mid);
  const right = sideItems.slice(mid);
  const centerItem = centerPage ? items.find(i => i.page === centerPage) : null;

  const bar = isDark
    ? 'border-white/10 bg-slate-950/92 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.35)]'
    : 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,58,138,0.08)]';

  const renderItem = (page: string, Icon: typeof LayoutDashboard, labelKey: string, fab = false) => {
    const path = PAGE_TO_PATH[page];
    if (!path) return null;
    const active = activePage === page;
    if (fab) {
      return (
        <button
          key={page}
          type="button"
          onClick={() => onNavigate(page)}
          className={`relative flex flex-col items-center justify-center -mt-5 mb-0.5 min-w-[4.25rem] rounded-2xl px-3 py-2 shadow-lg transition-all ${
            active
              ? isDark
                ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                : 'bg-[#1e3a8a] text-white shadow-blue-900/25'
              : isDark
                ? 'bg-slate-800 text-slate-200 border border-white/10'
                : 'bg-[#1e3a8a] text-white border border-blue-900/20 opacity-95'
          }`}
        >
          <Icon size={26} strokeWidth={active ? ICON_ACTIVE : ICON} className="shrink-0" />
          <span className="text-[10px] font-extrabold mt-1 leading-none text-center">{t(labelKey)}</span>
        </button>
      );
    }
    return (
      <button
        key={page}
        type="button"
        onClick={() => onNavigate(page)}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 px-1 rounded-xl transition-all flex-1 max-w-[4.5rem] ${
          active
            ? isDark
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-[#1e3a8a] bg-blue-50'
            : isDark
              ? 'text-slate-500 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
      >
        <Icon size={20} strokeWidth={active ? ICON_ACTIVE : ICON} className="shrink-0" />
        <span className="text-[9px] font-bold truncate max-w-[3.75rem] text-center leading-tight">{t(labelKey)}</span>
      </button>
    );
  };

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t ${bar}`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      dir="rtl"
    >
      <div className="flex items-end justify-between max-w-lg mx-auto min-h-[3.5rem] px-1.5 pt-1 gap-0.5">
        <div className="flex flex-1 items-end justify-evenly min-w-0">{left.map(i => renderItem(i.page, i.icon, i.labelKey))}</div>

        {centerItem ? renderItem(centerItem.page, centerItem.icon, centerItem.labelKey, true) : null}

        <div className="flex flex-1 items-end justify-evenly min-w-0">{right.map(i => renderItem(i.page, i.icon, i.labelKey))}</div>

        <button
          type="button"
          onClick={onOpenSearch}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 px-1 rounded-xl flex-1 max-w-[3.5rem] transition-all ${
            isDark ? 'text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-slate-500 hover:text-[#1e3a8a] hover:bg-blue-50'
          }`}
        >
          <Search size={20} strokeWidth={ICON} className="shrink-0" />
          <span className="text-[9px] font-bold truncate">{t('search')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-0 py-1.5 px-1 rounded-xl flex-1 max-w-[3.5rem] transition-all ${
            isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Menu size={20} strokeWidth={ICON} className="shrink-0" />
          <span className="text-[9px] font-bold truncate">منو</span>
        </button>
      </div>
    </nav>
  );
}
