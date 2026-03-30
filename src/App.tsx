import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { useStore } from './store/useStore';
import WelcomePage from './pages/WelcomePage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import OnboardingModal, { isOnboardingDone } from './components/OnboardingModal';
import Sidebar from './components/Sidebar';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import TenantsPage from './components/TenantsPage';
import ShopDashboard from './components/ShopDashboard';
import ProductsRouter from './components/ProductsRouter';
import WarehousePage from './components/WarehousePage';
import CustomersPage from './components/CustomersPage';
import SalesPage from './components/SalesPage';
import DebtsPage from './components/DebtsPage';
import PendingPage from './components/PendingPage';
import ReportsPage from './components/ReportsPage';
import RemindersPage from './components/RemindersPage';
import NotificationsPage from './components/NotificationsPage';
import BusinessTypesPage from './components/BusinessTypesPage';
import ImageSearchPage from './components/ImageSearchPage';
import SettingsPage from './components/SettingsPage';
import AdminNotificationsPage from './components/AdminNotificationsPage';
import BillingPage from './components/BillingPage';
// Removed: ArchitecturePage, Analytics360Page (not needed in current panel)
import SuppliersPage from './components/SuppliersPage';
// Removed: SecurityAnalysisPage (not needed in current panel)
import AccountingPage from './components/AccountingPage';
// Removed: SystemAnalysisPage (not needed in current panel)
import StaffPage from './components/StaffPage';
import InvoicesPage from './components/InvoicesPage';
import ProductSalesRankingPage from './components/ProductSalesRankingPage';
import ReorderListPage from './components/ReorderListPage';
import GlobalSearchModal from './components/GlobalSearchModal';
import MobileBottomNav from './components/MobileBottomNav';
import ShopGateModal from './components/ShopGateModal';
import { mockNotifications } from './data/mockData';
import { isNotificationVisibleToUser } from './utils/notificationVisibility';
import { Bell, Menu, Settings, Search, Wifi, WifiOff, X } from 'lucide-react';
import {
  apiLoadState, apiLogin, apiMe, apiSaveState, apiGoogleLogin, apiDemoLogin,
  apiLogout, apiVerifyTwoFactor, apiGetPendingRegistrations,
  type AuthMeResponse,
  type LoginResult,
  type ShopSessionPayload,
} from './services/api';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
import { PAGE_TO_PATH, PATH_TO_PAGE } from './config/pageRoutes';
import { applyAuthMeResponse } from './utils/applyAuthMeResponse';

export type Role = 'super_admin' | 'admin' | 'seller' | 'stock_keeper' | 'accountant';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  status: 'active' | 'inactive';
  last_login: string;
  tenant_id?: number;
  two_factor_enabled?: boolean;
  shop_code?: string;
}

/** همگام‌سازی نقش/دکان/مدت نشست با سرور — بعد از F5 و در polling دوره‌ای */
function syncStoreFromAuthMe(data: AuthMeResponse) {
  applyAuthMeResponse(data);
}

function NotifDropdown({ notifications, onClose, onGo, onMarkAllRead, pendingRegCount, onGoTenants }: {
  notifications: typeof mockNotifications; onClose: () => void; onGo: () => void; onMarkAllRead: () => void;
  pendingRegCount?: number; onGoTenants?: () => void;
}) {
  const { t } = useApp();
  const unread = notifications.filter(n => !n.is_read);
  const typeIcon = (type: string) => ({ debt: '💰', stock: '📦', expiry: '⏰', pending: '⏳' })[type] || '🔔';

  return (
    <div className="notif-dropdown absolute left-0 top-full mt-2 w-80 border rounded-2xl shadow-2xl z-50 overflow-hidden glass-dark border-white/10"
      style={{ animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold text-sm">{t('notifications')}</span>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <>
              <button onClick={onMarkAllRead} className="text-emerald-400 hover:text-emerald-300 text-xs">{t('read_all')}</button>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">{unread.length}</span>
            </>
          )}
          <button onClick={onClose} className="text-slate-300 hover:text-white"><X size={16} /></button>
        </div>
      </div>
      {/* Pending registrations alert for super_admin */}
      {(pendingRegCount ?? 0) > 0 && onGoTenants && (
        <button onClick={() => { onGoTenants(); onClose(); }}
          className="w-full px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3 hover:bg-amber-500/20 transition-colors">
          <span className="text-xl">⏳</span>
          <div className="flex-1 text-right">
            <p className="text-amber-300 text-sm font-bold">{pendingRegCount} ثبت‌نام در انتظار تأیید</p>
            <p className="text-amber-400/70 text-xs">کلیک کنید تا بررسی کنید</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
        </button>
      )}
      <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
        {notifications.slice(0, 6).map(n => (
          <div key={n.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-emerald-500/5' : ''}`}>
            <span className="text-lg">{typeIcon(n.type)}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${!n.is_read ? 'text-white' : 'text-slate-200'}`}>{n.title}</p>
              <p className="text-slate-300 text-xs mt-0.5 truncate">{n.message}</p>
              <p className="text-slate-500 text-xs mt-0.5">{n.created_at}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />}
          </div>
        ))}
        {notifications.length === 0 && (pendingRegCount ?? 0) === 0 && (
          <div className="text-center py-8 text-slate-300 text-sm">{t('no_notifications')}</div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/10">
        <button onClick={onGo} className="w-full text-center text-emerald-400 text-sm hover:text-emerald-300 transition-colors">{t('view_all_notifications')} →</button>
      </div>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, theme, isDark, t } = useApp();
  const storeLogin = useStore(s => s.login);
  const storeLogout = useStore(s => s.logout);
  const demoTrialBlocked = useStore(s => s.demoTrialBlocked);
  const shopSuspended = useStore(s => s.shopSuspended);
  const setAuthToken = useStore(s => s.setAuthToken);
  const authToken = useStore(s => s.authToken);
  const storeUser = useStore(s => s.currentUser);
  const storeIsDemo = useStore(s => s.isDemo);
  const storeNotifications = useStore(s => s.notifications);
  const storeMarkAllRead = useStore(s => s.markAllRead);
  const storeCheckSession = useStore(s => s.checkSession);
  const storeSessionExpiry = useStore(s => s.sessionExpiry);
  const storeShopCode = useStore(s => s.shopCode);
  const hydrateFromServer = useStore(s => s.hydrateFromServer);
  const buildSyncPayload = useStore(s => s.buildSyncPayload);

  const activePage = PATH_TO_PAGE[location.pathname] || 'dashboard';
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [syncSavePending, setSyncSavePending] = useState(false);
  const pendingSyncRef = useRef<string | null>(null);

  // Use store user as the current user
  const currentUser = storeUser as User | null;
  const notifications = storeNotifications;
  const visibleNotifications = useMemo(
    () => notifications.filter((n) => isNotificationVisibleToUser(n, currentUser)),
    [notifications, currentUser]
  );
  /** پنل مادر فقط برای ابرادمین پلتفرم؛ مدیر هر فروشگاه (حتی دیمو) فقط پنل همان دکان را می‌بیند */
  const masterDashboardAccess = currentUser?.role === 'super_admin';
  const unreadNotifCount =
    visibleNotifications.filter((n) => !n.is_read).length + (masterDashboardAccess ? pendingRegCount : 0);
  const goToPage = (page: string) => navigate(PAGE_TO_PATH[page] || '/dashboard');

  // Restore session from httpOnly cookie on startup
  useEffect(() => {
    let mounted = true;
    apiMe()
      .then((data) => {
        if (mounted && data.user) syncStoreFromAuthMe(data);
      })
      .catch(() => { /* no valid cookie — show login */ })
      .finally(() => { if (mounted) setIsCheckingSession(false); });
    return () => { mounted = false; };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (storeUser && !storeCheckSession()) {
        navigate('/dashboard');
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [storeUser, storeCheckSession, storeSessionExpiry, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowGlobalSearch(true); }
      if (e.key === 'Escape') { setShowGlobalSearch(false); setShowNotifDropdown(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Poll pending registrations — فقط ابرادمین
  useEffect(() => {
    if (!masterDashboardAccess) return;
    const fetchPending = async () => {
      try {
        const res = await apiGetPendingRegistrations(authToken || undefined);
        setPendingRegCount(res.registrations.length);
      } catch { /* silently ignore */ }
    };
    void fetchPending();
    const timer = setInterval(fetchPending, 30000);
    return () => clearInterval(timer);
  }, [masterDashboardAccess, authToken]);

  useEffect(() => {
    const handler = () => { setShowNotifDropdown(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleLogin = async (
    shopCode: string,
    shopPassword: string,
    role: string,
    rolePassword: string
  ): Promise<{ ok: boolean; message?: string; code?: string; twoFactorRequired?: boolean; pendingToken?: string }> => {
    try {
      const normalizedRole = role.trim() === 'stock' ? 'stock_keeper' : role.trim();
      const res: LoginResult = await apiLogin({ shopCode, shopPassword, role: normalizedRole, rolePassword });

      if ('twoFactorRequired' in res && res.twoFactorRequired) {
        return { ok: false, twoFactorRequired: true, pendingToken: res.pendingToken };
      }

      const fullRes = res as Exclude<LoginResult, { twoFactorRequired: true }>;
      setAuthToken(fullRes.token);
      const meta = fullRes.shop_meta;
      const isDemoUser = Boolean(fullRes.user?.is_demo || meta?.is_demo);
      storeLogin(
        fullRes.user as any,
        fullRes.shop.code,
        isDemoUser,
        Number(fullRes.sessionTimeoutMinutes || 120),
        meta?.trial_ends_at ?? null
      );
      navigate('/dashboard');
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || 'خطا در ورود';
      const code = (err as Error & { code?: string }).code;
      if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        return { ok: false, message: 'سرور API فعال نیست. لطفاً ابتدا npm run server را اجرا کنید' };
      }
      return { ok: false, message: msg, code };
    }
  };

  const handleTwoFactorVerify = async (pendingToken: string, totpCode: string): Promise<{ ok: boolean; message?: string; code?: string }> => {
    try {
      const res = await apiVerifyTwoFactor(pendingToken, totpCode);
      setAuthToken(res.token);
      const meta = res.shop_meta;
      const isDemoUser = Boolean(res.user?.is_demo || meta?.is_demo);
      storeLogin(
        res.user as any,
        res.shop.code,
        isDemoUser,
        Number(res.sessionTimeoutMinutes || 120),
        meta?.trial_ends_at ?? null
      );
      navigate('/dashboard');
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { ok: false, message: err.message || 'کد نادرست است', code: (err as Error & { code?: string }).code };
    }
  };

  const handleGoogleLogin = async (email: string, fullName: string): Promise<{ ok: boolean; message?: string; code?: string }> => {
    try {
      const res = await apiGoogleLogin({ email, fullName });
      setAuthToken(res.token);
      const meta = res.shop_meta;
      const isDemoUser = Boolean(res.user?.is_demo || meta?.is_demo);
      storeLogin(
        res.user as any,
        res.shop.code,
        isDemoUser,
        Number(res.sessionTimeoutMinutes || 120),
        meta?.trial_ends_at ?? null
      );
      navigate('/dashboard');
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || 'خطا در ورود با گوگل';
      return { ok: false, message: msg, code: (err as Error & { code?: string }).code };
    }
  };

  const handleDemoLogin = async (payload: {
    mode?: 'register' | 'login';
    phone?: string;
    password?: string;
    name?: string;
    familyName?: string;
    email?: string;
    idToken?: string;
    businessType?: string;
  }): Promise<
    | { ok: true }
    | {
        ok: true;
        registered: true;
        shopCode: string;
        shopPassword: string;
        adminFullName: string;
        adminRoleTitle: string;
        adminRolePassword: string;
        message?: string;
      }
    | { ok: false; message?: string; code?: string }
  > => {
    try {
      const res = await apiDemoLogin(payload as Parameters<typeof apiDemoLogin>[0]);
      if ('registered' in res && res.registered) {
        return {
          ok: true,
          registered: true,
          shopCode: res.shopCode,
          shopPassword: res.shopPassword,
          adminFullName: res.adminFullName,
          adminRoleTitle: res.adminRoleTitle,
          adminRolePassword: res.adminRolePassword,
          message: res.message,
        };
      }
      const sess = res as ShopSessionPayload;
      setAuthToken(sess.token);
      storeLogin(
        sess.user as any,
        sess.shop.code,
        true,
        Number(sess.sessionTimeoutMinutes || 10080),
        sess.trialEndsAt ?? null
      );
      navigate('/dashboard');
      return { ok: true };
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      const msg = err?.message || 'خطا در ورود آزمایشی';
      return { ok: false, message: msg, code: err.code };
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || storeIsDemo || shopSuspended) return;
    if (isOnboardingDone()) return;
    const t = window.setTimeout(() => setOnboardingOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [currentUser, storeIsDemo, shopSuspended]);

  // همگام‌سازی نشست با سرور؛ وابسته به id/role/shop نه کل آبجکت user تا هر login() حلقهٔ بی‌پایان نسازد
  useEffect(() => {
    if (!storeUser?.id) return;
    let mounted = true;
    const validate = () => {
      apiMe(authToken || undefined)
        .then((data) => {
          if (!mounted) return;
          if (data.user) syncStoreFromAuthMe(data);
          else storeLogout();
        })
        .catch((e: any) => {
          if (mounted && (e.status === 401 || e.status === 404)) {
            storeLogout();
          }
        });
    };
    validate();
    const tick = window.setInterval(validate, 3 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(tick);
    };
  }, [authToken, storeUser?.id, storeUser?.role, storeShopCode, storeLogout]);

  useEffect(() => {
    if (!storeUser || storeUser.role === 'super_admin' || shopSuspended) return;
    let canceled = false;
    let lastSnapshot = '';
    const boot = async () => {
      try {
        const res = await apiLoadState(authToken || undefined, storeShopCode);
        if (!canceled) {
          hydrateFromServer((res.state ?? {}) as Record<string, unknown>);
        }
        if (!canceled) {
          lastSnapshot = JSON.stringify(buildSyncPayload());
        }
      } catch (e: unknown) {
        const c = (e as Error & { code?: string }).code;
        if (c === 'TRIAL_EXPIRED') {
          useStore.getState().setDemoTrialBlocked(true);
        }
        if (c === 'SHOP_SUSPENDED') {
          useStore.getState().setShopSuspended(true);
        }
      }
    };
    const sync = async () => {
      const payload = buildSyncPayload();
      const next = JSON.stringify(payload);
      if (next === lastSnapshot) return;
      try {
        await apiSaveState(authToken || undefined, payload, storeShopCode);
        lastSnapshot = next;
        pendingSyncRef.current = null;
        if (!canceled) setSyncSavePending(false);
      } catch (e: unknown) {
        const c = (e as Error & { code?: string }).code;
        if (c === 'TRIAL_EXPIRED') {
          useStore.getState().setDemoTrialBlocked(true);
        }
        if (c === 'SHOP_SUSPENDED') {
          useStore.getState().setShopSuspended(true);
        }
        const msg = e instanceof Error ? e.message : String(e);
        const net =
          /failed to fetch|networkerror|load failed|سرور در دسترس نیست/i.test(msg);
        if (net || !c) {
          pendingSyncRef.current = next;
          if (!canceled) setSyncSavePending(true);
        }
      }
    };
    void boot();
    const id = window.setInterval(() => { void sync(); }, 5000);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [authToken, storeUser, storeShopCode, hydrateFromServer, buildSyncPayload, shopSuspended]);

  useEffect(() => {
    if (!isOnline || !storeUser || storeUser.role === 'super_admin' || shopSuspended) return;
    const pending = pendingSyncRef.current;
    if (!pending || !syncSavePending) return;
    let canceled = false;
    const retry = async () => {
      try {
        const payload = JSON.parse(pending) as Record<string, unknown>;
        await apiSaveState(authToken || undefined, payload, storeShopCode);
        if (!canceled) {
          pendingSyncRef.current = null;
          setSyncSavePending(false);
        }
      } catch {
        /* stays pending */
      }
    };
    void retry();
    const id = window.setInterval(() => { void retry(); }, 15_000);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [isOnline, syncSavePending, storeUser, shopSuspended, authToken, storeShopCode]);

  const handleLogout = () => {
    apiLogout().catch(() => {});
    storeLogout();
    navigate('/');
  };
  const goSuspendedPayment = () => {
    apiLogout().catch(() => {});
    storeLogout();
    navigate('/?renew=1');
  };
  const markAllRead = () => storeMarkAllRead();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f2f5' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{t('loading_session')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={
          <WelcomePage
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onDemoLogin={handleDemoLogin}
            onTwoFactorVerify={handleTwoFactorVerify}
          />
        } />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const renderPage = () => {
    return (
      <Routes>
        {masterDashboardAccess ? (
          <>
            <Route path="/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/admin-notifications" element={<AdminNotificationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/business-types" element={<BusinessTypesPage />} />
            <Route path="/support" element={<Navigate to="/settings?section=support" replace />} />
            <Route path="/settings" element={<SettingsPage currentUser={currentUser} authToken={authToken || ''} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<ShopDashboard currentUser={currentUser as any} />} />
            <Route path="/products" element={<ProductsRouter />} />
            {['admin', 'stock_keeper'].includes(currentUser.role) && (
              <Route path="/warehouse" element={<WarehousePage />} />
            )}
            <Route path="/image-search" element={<ImageSearchPage />} />
            <Route path="/print-settings" element={<Navigate to="/settings?section=print" replace />} />
            <Route path="/offline" element={<Navigate to="/settings?section=offline" replace />} />
            <Route path="/support" element={<Navigate to="/settings?section=support" replace />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/product-sales-ranking" element={<ProductSalesRankingPage />} />
            <Route path="/reorder-list" element={<ReorderListPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/debts" element={<DebtsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            {['admin', 'accountant'].includes(currentUser.role) && (
              <Route path="/accounting" element={<AccountingPage />} />
            )}
            <Route path="/purchase-invoice" element={<InvoicesPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            {currentUser.role === 'admin' && (
              <Route path="/users" element={<Navigate to="/settings?section=users" replace />} />
            )}
            {['admin', 'accountant'].includes(currentUser.role) && (
              <Route path="/reports" element={<ReportsPage />} />
            )}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage currentUser={currentUser} authToken={authToken || ''} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    );
  };

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-[#0a1628]';

  const shellHeader =
    theme === 'light'
      ? 'bg-white border-b border-slate-200 shadow-sm'
      : 'border-b border-sky-900/50 bg-[#0c2139]/95 backdrop-blur-md';
  const shellHeaderTitle = theme === 'light' ? 'text-slate-900' : 'text-slate-100';
  const shellHeaderSub = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const shellControl =
    theme === 'light'
      ? 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      : 'glass text-sky-100/90 hover:text-white border border-sky-800/40';
  const shellMainCol = theme === 'light' ? 'bg-white' : 'bg-[#0a1628]';

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: t('role_super_admin'), admin: t('role_admin'), seller: t('role_seller'),
      stock_keeper: t('role_stock_keeper'), accountant: t('role_accountant'),
    };
    return labels[role] || role;
  };

  return (
    <>
    <div className={`min-h-screen ${bgClass} flex`}>
      <div className="hidden md:flex flex-shrink-0" style={{ width: sidebarCollapsed ? '64px' : '256px', transition: 'width 0.3s ease' }}>
        <Sidebar currentUser={currentUser as any} activePage={activePage} onPageChange={goToPage}
          onLogout={handleLogout} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          notifCount={unreadNotifCount} />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72">
            <Sidebar currentUser={currentUser as any} activePage={activePage}
              onPageChange={(p) => { goToPage(p); setMobileMenuOpen(false); }}
              onLogout={handleLogout} collapsed={false} onToggle={() => setMobileMenuOpen(false)}
              notifCount={unreadNotifCount} />
          </div>
        </div>
      )}

      <div className={`app-shell flex-1 flex flex-col min-h-screen overflow-hidden ${shellMainCol}`}>
        <header className={`px-3 sm:px-5 py-2.5 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 ${shellHeader}`}>
          <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => setMobileMenuOpen(true)} className={`md:hidden p-2 rounded-xl ${shellControl}`}>
                <Menu size={20} strokeWidth={1.75} />
              </button>
              <div className="flex flex-col">
                <div className={`font-extrabold text-lg sm:text-2xl tracking-tight ${shellHeaderTitle}`}>{t('app_name')}</div>
                <div className={`hidden sm:block text-[10px] font-bold uppercase tracking-widest ${shellHeaderSub}`}>{t('header_brand_line')}</div>
              </div>
            <button
              type="button"
              className={`hidden sm:flex items-center gap-2 rounded-xl px-3 py-2 transition-all cursor-pointer border ${
                isDark ? 'bg-white/5 border-white/10 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 hover:border-[#1e3a8a]/40'
              }`}
              onClick={() => setShowGlobalSearch(true)}
            >
              <Search size={14} className={shellHeaderSub} strokeWidth={1.75} />
              <span className={`text-sm w-32 ${shellHeaderSub}`}>{t('search')}... (Ctrl+K)</span>
            </button>
            <button type="button" onClick={() => setShowGlobalSearch(true)} className={`sm:hidden p-2 rounded-xl ${shellControl}`}>
              <Search size={18} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className={`hidden lg:flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
                isOnline
                  ? isDark
                    ? 'text-emerald-400 bg-emerald-500/10 border-transparent'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                  : isDark
                    ? 'text-rose-400 bg-rose-500/10 border-transparent'
                    : 'text-rose-700 bg-rose-50 border-rose-100'
              }`}
            >
              {isOnline ? <Wifi size={12} strokeWidth={1.75} /> : <WifiOff size={12} strokeWidth={1.75} />}
              <span>{isOnline ? t('online') : t('offline')}</span>
            </div>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => { setShowNotifDropdown(!showNotifDropdown); }}
                className={`relative p-2 rounded-xl transition-colors ${shellControl}`}
              >
                <Bell size={17} strokeWidth={1.75} />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadNotifCount}</span>
                )}
              </button>
              {showNotifDropdown && (
                <NotifDropdown notifications={visibleNotifications} onClose={() => setShowNotifDropdown(false)}
                  onGo={() => { goToPage('notifications'); setShowNotifDropdown(false); }}
                  onMarkAllRead={markAllRead}
                  pendingRegCount={pendingRegCount}
                  onGoTenants={masterDashboardAccess ? () => goToPage('tenants') : undefined} />
              )}
            </div>

            <button
              type="button"
              className={`hidden sm:block p-2 rounded-xl ${shellControl}`}
              onClick={() => goToPage('settings')}
            >
              <Settings size={17} strokeWidth={1.75} />
            </button>

            <button
              type="button"
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 cursor-pointer border ${
                isDark ? 'glass border-white/5' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => goToPage('settings')}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                  isDark ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-[#1e3a8a] to-[#172554]'
                }`}
              >
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden lg:block text-right">
                <p className={`text-xs font-semibold leading-tight ${shellHeaderTitle}`}>{currentUser.full_name}</p>
                <p className={`text-[10px] leading-tight ${shellHeaderSub}`}>{getRoleLabel(currentUser.role)}</p>
              </div>
            </button>
          </div>
        </header>

        {demoTrialBlocked && currentUser?.role !== 'super_admin' && !shopSuspended && (
          <div className="bg-rose-600/25 border-b border-rose-500/40 px-4 py-2.5 text-center text-sm text-rose-100 font-bold">
            دورهٔ آزمایشی ۳ روزه تمام شده است. برای ادامهٔ کار لطفاً اشتراک تهیه کنید یا با پشتیبانی تماس بگیرید.
          </div>
        )}
        {syncSavePending && currentUser?.role !== 'super_admin' && !shopSuspended && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-200 font-semibold">
            {t('sync_pending_banner')}
          </div>
        )}
        {!isOnline && (
          <div className="bg-rose-500/20 border-b border-rose-500/30 px-4 py-2 flex items-center gap-2 text-sm text-rose-300">
            <WifiOff size={14} />
            <span>{t('offline_banner')}</span>
          </div>
        )}

        <main className="mobile-shell-main flex-1 overflow-y-auto p-3 sm:p-5 pb-[4.5rem] md:pb-5">
          <div className="max-w-7xl mx-auto pb-6 md:pb-6">
            {renderPage()}
          </div>
        </main>
      </div>

      {showGlobalSearch && <GlobalSearchModal onClose={() => setShowGlobalSearch(false)} />}

      {currentUser && (
        <MobileBottomNav
          role={currentUser.role}
          activePage={activePage}
          onNavigate={(p) => goToPage(p)}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setShowGlobalSearch(true)}
        />
      )}
    </div>

      {currentUser?.role !== 'super_admin' && shopSuspended && (
        <ShopGateModal
          open
          variant="suspended"
          onGoPayment={goSuspendedPayment}
          onLogout={handleLogout}
        />
      )}
      {currentUser?.role === 'admin' && !storeIsDemo && (
        <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  );
}
