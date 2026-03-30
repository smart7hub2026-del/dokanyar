import {
  LayoutDashboard, ShoppingCart, Users, Settings,
  Megaphone, FileText, Building2, LogOut,
  BarChart3, Package, Bell, DollarSign,
  UserCheck, CreditCard, ChevronLeft, Shield, BookOpen, Truck,
  Tags, ScanSearch, ClipboardList, Warehouse,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';

interface SidebarUser {
  id: number;
  full_name: string;
  role: string;
  tenant_id?: number;
}

interface SidebarProps {
  currentUser: SidebarUser;
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
  notifCount?: number;
}

const superAdminLinks = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'tenants', icon: Building2, labelKey: 'manage_shops' },
  { id: 'business-types', icon: Tags, labelKey: 'business_types' },
  { id: 'billing', icon: CreditCard, labelKey: 'billing' },
  { id: 'admin-notifications', icon: Megaphone, labelKey: 'broadcast_notifications' },
  { id: 'reports', icon: FileText, labelKey: 'general_reports' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
];

const adminLinks = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'sales', icon: ShoppingCart, labelKey: 'sales_pos' },
  { id: 'invoices', icon: FileText, labelKey: 'invoices' },
  { id: 'products', icon: Package, labelKey: 'products' },
  { id: 'warehouse', icon: Warehouse, labelKey: 'warehouse_page' },
  { id: 'image-search', icon: ScanSearch, labelKey: 'image_search' },
  { id: 'customers', icon: Users, labelKey: 'customers' },
  { id: 'suppliers', icon: Truck, labelKey: 'suppliers' },
  { id: 'debts', icon: CreditCard, labelKey: 'debts' },
  { id: 'accounting', icon: DollarSign, labelKey: 'accounting' },
  { id: 'staff', icon: UserCheck, labelKey: 'staff_payroll' },
  { id: 'pending', icon: Bell, labelKey: 'pending_sales' },
  { id: 'reminders', icon: BookOpen, labelKey: 'reminders' },
  { id: 'reports', icon: BarChart3, labelKey: 'reports' },
  { id: 'product-sales-ranking', icon: BarChart3, labelKey: 'product_sales_ranking' },
  { id: 'reorder-list', icon: ClipboardList, labelKey: 'reorder_list_title' },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
];

const sellerLinks = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'sales', icon: ShoppingCart, labelKey: 'sales_pos' },
  { id: 'invoices', icon: FileText, labelKey: 'invoices' },
  { id: 'products', icon: Package, labelKey: 'products' },
  { id: 'image-search', icon: ScanSearch, labelKey: 'image_search' },
  { id: 'customers', icon: Users, labelKey: 'customers' },
  { id: 'debts', icon: CreditCard, labelKey: 'debts' },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' },
];

const accountantLinks = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'debts', icon: CreditCard, labelKey: 'debts' },
  { id: 'accounting', icon: DollarSign, labelKey: 'accounting' },
  { id: 'invoices', icon: FileText, labelKey: 'invoices' },
  { id: 'customers', icon: Users, labelKey: 'customers' },
  { id: 'suppliers', icon: Truck, labelKey: 'suppliers' },
  { id: 'staff', icon: UserCheck, labelKey: 'staff_payroll' },
  { id: 'reports', icon: BarChart3, labelKey: 'reports' },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' },
];

const stockLinks = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'products', icon: Package, labelKey: 'inventory_management' },
  { id: 'warehouse', icon: Warehouse, labelKey: 'warehouse_page' },
  { id: 'reorder-list', icon: ClipboardList, labelKey: 'reorder_list_title' },
  { id: 'image-search', icon: ScanSearch, labelKey: 'image_search' },
  { id: 'suppliers', icon: Truck, labelKey: 'suppliers' },
  { id: 'invoices', icon: FileText, labelKey: 'purchase_invoices' },
  { id: 'reports', icon: FileText, labelKey: 'inventory_reports' },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' },
];

const ICON_STROKE = 1.75;
const ICON_STROKE_ACTIVE = 2;

export default function Sidebar({ currentUser, activePage, onPageChange, onLogout, collapsed, onToggle, notifCount = 0 }: SidebarProps) {
  const { isOnline, t, isDark } = useApp();
  const businessType = useStore((s) => s.shopSettings.business_type);
  const productMenuKey = businessType === 'bookstore' ? 'bookstore_inventory' : 'products';
  const stockProductMenuKey = businessType === 'bookstore' ? 'bookstore_inventory' : 'inventory_management';

  const mapProductLabel = <T extends { id: string; labelKey: string }>(list: T[]) =>
    list.map((l) => (l.id === 'products' ? { ...l, labelKey: productMenuKey } as T : l));

  const adminLinksResolved = mapProductLabel(adminLinks);
  const sellerLinksResolved = mapProductLabel(sellerLinks);
  const stockLinksResolved = stockLinks.map((l) =>
    l.id === 'products' ? { ...l, labelKey: stockProductMenuKey } : l
  );

  const links = currentUser.role === 'super_admin' ? superAdminLinks
    : currentUser.role === 'admin' ? adminLinksResolved
    : currentUser.role === 'seller' ? sellerLinksResolved
    : currentUser.role === 'stock_keeper' ? stockLinksResolved
    : accountantLinks;

  const roleInfo: Record<string, { label: string; color: string }> = {
    super_admin: { label: t('role_super_admin'), color: 'badge-emerald' },
    admin: { label: t('role_admin'), color: 'badge-teal' },
    seller: { label: t('role_seller'), color: 'badge-green' },
    stock_keeper: { label: t('role_stock_keeper'), color: 'badge-yellow' },
    accountant: { label: t('role_accountant'), color: 'text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400' },
  };

  const { label: roleLabel, color: roleColor } = roleInfo[currentUser.role] || { label: currentUser.role, color: 'badge-emerald' };

  const shell = isDark
    ? 'glass-dark border-white/10'
    : 'bg-white border-l border-slate-200 shadow-[2px_0_12px_rgba(15,23,42,0.04)]';
  const divider = isDark ? 'border-white/10' : 'border-slate-100';

  return (
    <div className={`relative flex flex-col h-full transition-all duration-300 ${shell} ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'باز کردن' : 'جمع کردن'}
        className={`hidden md:flex absolute -left-3 top-6 z-10 w-6 h-6 rounded-full items-center justify-center text-white transition-colors shadow-md ${
          isDark ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-[#1e3a8a] hover:bg-[#172554]'
        }`}
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} strokeWidth={ICON_STROKE} />
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b ${divider} ${collapsed ? 'justify-center' : ''}`}>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDark
              ? 'bg-gradient-to-br from-indigo-500 to-blue-700 shadow-lg shadow-indigo-900/20'
              : 'bg-[#1e3a8a] shadow-md shadow-blue-900/15'
          }`}
        >
          <Shield size={20} className="text-white" strokeWidth={ICON_STROKE} />
        </div>
        {!collapsed && (
          <div>
            <h1 className={`font-extrabold text-sm leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('app_name')}
            </h1>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-indigo-100' : 'text-slate-500'}`}>
              {t('header_brand_line')}
            </p>
          </div>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className={`p-4 border-b ${divider}`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm relative ${
                isDark
                  ? 'bg-gradient-to-br from-indigo-700 to-indigo-900 text-white shadow-inner'
                  : 'bg-gradient-to-br from-[#1e3a8a] to-[#172554] text-white'
              }`}
            >
              {currentUser.full_name.charAt(0)}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                  isDark ? 'border-indigo-900' : 'border-white'
                } ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentUser.full_name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${roleColor}`}>{roleLabel}</span>
            </div>
          </div>
          <div
            className={`mt-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
              isOnline ? (isDark ? 'text-indigo-100' : 'text-slate-500') : 'text-rose-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isOnline ? t('online') : t('offline')}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = activePage === link.id;
          const hasNotif = link.id === 'notifications' && notifCount > 0;
          const inactiveText = isDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900';
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onPageChange(link.id)}
              className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive ? `active ${isDark ? 'text-white font-bold' : 'font-bold'}` : inactiveText
              } ${collapsed ? 'justify-center' : ''} ${!isDark && !isActive ? 'hover:bg-slate-50' : ''}`}
              title={collapsed ? t(link.labelKey) : ''}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <span
                  className={`rounded-lg flex items-center justify-center ${
                    isActive
                      ? isDark
                        ? 'p-0 text-white'
                        : 'bg-blue-100 p-1.5 text-[#1e3a8a]'
                      : isDark
                        ? 'p-0 text-white/90'
                        : 'p-0 text-slate-500'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? ICON_STROKE_ACTIVE : ICON_STROKE} className={isActive && isDark ? 'text-white' : ''} />
                </span>
                {hasNotif && collapsed && (
                  <span
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${
                      isDark ? 'border-slate-900 bg-rose-500' : 'border-white bg-rose-500'
                    }`}
                  />
                )}
              </div>
              {!collapsed && <span className="flex-1 text-right">{t(link.labelKey)}</span>}
              {!collapsed && hasNotif && (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{notifCount}</span>
              )}
              {!collapsed && isActive && !hasNotif && isDark && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`p-2 border-t ${divider} ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={onLogout}
          className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            collapsed ? 'justify-center w-full' : 'w-full'
          } ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-rose-600 hover:bg-rose-50'}`}
          title={collapsed ? t('logout') : ''}
        >
          <LogOut size={18} strokeWidth={ICON_STROKE} />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}
