import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Eye, Power, X, Phone, User, Calendar, Edit2, Trash2, CreditCard, RefreshCw, AlertTriangle, CheckCircle, Clock, ThumbsUp, ThumbsDown, Trash, Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import {
  apiGetTenants, apiCreateTenant, apiUpdateTenant, apiDeleteTenant,
  apiSetTenantStatus, apiGetSubscriptionPayments, apiCreateSubscriptionPayment,
  apiGetPendingRegistrations, apiApproveRegistration, apiRejectRegistration, apiResetAllData,
  apiGetAdminPayments, apiVerifyAdminPayment, apiGetMasterShopUsers,
  type Tenant, type PendingRegistration, type AdminPaymentRequestRow, type ShopUserRow,
} from '../services/api';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface NewTenantCredentials {
  shopCode: string;
  shopPassword: string;
  adminRolePassword: string;
}

export default function TenantsPage() {
  const { t } = useApp();
  const authToken = useStore((s) => s.authToken);
  const currentUser = useStore((s) => s.currentUser);
  const tok = authToken || undefined;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [editItem, setEditItem] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'tenants' | 'payments' | 'pending' | 'paidqueue' | 'regpay'>('tenants');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newCreds, setNewCreds] = useState<NewTenantCredentials | null>(null);
  const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const [adminPayList, setAdminPayList] = useState<AdminPaymentRequestRow[]>([]);
  const [adminPayLoading, setAdminPayLoading] = useState(false);
  const [regPayNote, setRegPayNote] = useState('');
  const [provisionCreds, setProvisionCreds] = useState<{
    shopCode: string;
    shopPassword: string;
    adminRolePassword: string;
  } | null>(null);
  const [detailUsers, setDetailUsers] = useState<ShopUserRow[]>([]);
  const [detailUsersLoading, setDetailUsersLoading] = useState(false);

  const [form, setForm] = useState({
    shop_name: '', shop_code: '', owner_name: '', owner_phone: '',
    owner_email: '', subscription_plan: 'basic',
  });
  /** فقط ابرادمین — بازنشانی رمز نقش مدیر دکان */
  const [adminRolePasswordReset, setAdminRolePasswordReset] = useState('');
  const [payForm, setPayForm] = useState({
    shop_code: '', amount: 0, plan: 'basic_monthly', method: 'cash', note: '',
  });

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetTenants(tok);
      setTenants(res.tenants);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [tok]);

  const loadPayments = useCallback(async () => {
    try {
      const res = await apiGetSubscriptionPayments(undefined, tok);
      setPayments(res.payments);
    } catch {}
  }, [tok]);

  const loadPendingRegs = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await apiGetPendingRegistrations(tok);
      setPendingRegs(res.registrations);
    } catch {}
    finally { setPendingLoading(false); }
  }, [tok]);

  const loadAdminPayments = useCallback(async () => {
    if (!isSuperAdmin || !tok) return;
    setAdminPayLoading(true);
    try {
      const res = await apiGetAdminPayments(tok);
      setAdminPayList(res.payments);
    } catch {
      setAdminPayList([]);
    } finally {
      setAdminPayLoading(false);
    }
  }, [isSuperAdmin, tok]);

  useEffect(() => {
    void loadTenants();
    void loadPayments();
    void loadPendingRegs();
  }, [loadTenants, loadPayments, loadPendingRegs]);

  useEffect(() => {
    if (isSuperAdmin && tok) void loadAdminPayments();
  }, [isSuperAdmin, tok, loadAdminPayments]);

  const paidQueueList = useMemo(
    () =>
      adminPayList.filter(
        (p) => p.pay_status === 'paid_pending_admin' && !(p.shop_code && String(p.shop_code).trim())
      ),
    [adminPayList]
  );

  useEffect(() => {
    if (!viewTenant?.shop_code || !tok) {
      setDetailUsers([]);
      return;
    }
    setDetailUsersLoading(true);
    void apiGetMasterShopUsers(viewTenant.shop_code, tok)
      .then((r) => setDetailUsers(r.users))
      .catch(() => setDetailUsers([]))
      .finally(() => setDetailUsersLoading(false));
  }, [viewTenant?.shop_code, tok]);

  const handleApprove = async (code: string) => {
    try {
      await apiApproveRegistration(code, tok);
      setPendingRegs(prev => prev.filter(r => r.code !== code));
      void loadTenants();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در تأیید');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await apiRejectRegistration(rejectTarget, rejectReason, tok);
      setPendingRegs(prev => prev.filter(r => r.code !== rejectTarget));
      setRejectTarget(null);
      setRejectReason('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در رد کردن');
    }
  };

  const handleVerifyRegPay = async (id: number, decision: 'approve' | 'reject') => {
    try {
      const res = await apiVerifyAdminPayment(id, decision, regPayNote, tok);
      setAdminPayList((prev) => prev.map((p) => (p.id === id ? res.payment : p)));
      setRegPayNote('');
      if (res.credentials) setProvisionCreds(res.credentials);
      await loadTenants();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در تأیید پرداخت');
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    setResetMsg('');
    try {
      const res = await apiResetAllData(tok);
      setResetMsg(res.message || 'عملیات موفق بود');
      await loadTenants();
      await loadPendingRegs();
      if (isSuperAdmin) void loadAdminPayments();
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : 'خطا در پاک‌سازی');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.shop_name.includes(search) ||
      t.owner_name.includes(search) ||
      (t.shop_code || '').includes(search.toUpperCase()) ||
      t.shop_domain.includes(search);
    const matchFilter =
      filter === 'all' || t.status === filter || t.subscription_status === filter;
    return matchSearch && matchFilter;
  });

  const openAdd = () => {
    setEditItem(null);
    setNewCreds(null);
    setAdminRolePasswordReset('');
    setForm({ shop_name: '', shop_code: '', owner_name: '', owner_phone: '', owner_email: '', subscription_plan: 'basic' });
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditItem(t);
    setNewCreds(null);
    setAdminRolePasswordReset('');
    setForm({
      shop_name: t.shop_name, shop_code: t.shop_code || '',
      owner_name: t.owner_name, owner_phone: t.owner_phone,
      owner_email: t.owner_email || '', subscription_plan: t.subscription_plan,
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editItem) {
        const payload: Parameters<typeof apiUpdateTenant>[1] = {
          shop_name: form.shop_name,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          owner_phone: form.owner_phone,
          subscription_plan: form.subscription_plan as Tenant['subscription_plan'],
        };
        if (isSuperAdmin && adminRolePasswordReset.trim()) {
          payload.admin_role_password = adminRolePasswordReset.trim();
        }
        const res = await apiUpdateTenant(editItem.shop_code, payload, tok);
        setTenants((prev) => prev.map((t) => t.shop_code === editItem.shop_code ? res.tenant : t));
        setShowModal(false);
        setAdminRolePasswordReset('');
      } else {
        const res = await apiCreateTenant(
          {
            shop_name: form.shop_name,
            shop_code: form.shop_code,
            owner_name: form.owner_name,
            owner_email: form.owner_email || undefined,
            owner_phone: form.owner_phone || undefined,
            subscription_plan: form.subscription_plan,
          },
          tok
        );
        setTenants((prev) => [...prev, res.tenant]);
        setNewCreds(res.credentials);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await apiCreateSubscriptionPayment(
        {
          shop_code: payForm.shop_code,
          amount: payForm.amount,
          plan: payForm.plan,
          method: payForm.method,
          note: payForm.note,
        },
        tok
      );
      await loadPayments();
      setShowPayModal(false);
      setPayForm({ shop_code: '', amount: 0, plan: 'basic_monthly', method: 'cash', note: '' });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'خطا در ثبت پرداخت');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (t: Tenant) => {
    const next = t.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await apiSetTenantStatus(t.shop_code, next, tok);
      setTenants((prev) => prev.map((x) => x.shop_code === t.shop_code ? res.tenant : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  };

  const deleteTenant = async (t: Tenant) => {
    if (!window.confirm(`آیا مطمئن هستید؟ دکان "${t.shop_name}" حذف خواهد شد.`)) return;
    try {
      await apiDeleteTenant(t.shop_code, tok);
      setTenants((prev) => prev.filter((x) => x.shop_code !== t.shop_code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('manage_shops')}</h1>
          <p className="text-slate-400 text-sm mt-1">{tenants.length} دکان ثبت‌شده</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              void loadTenants();
              void loadPayments();
              if (isSuperAdmin) void loadAdminPayments();
            }}
            className="p-2.5 glass text-slate-400 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="بارگذاری مجدد"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setShowPayModal(true); setSaveError(''); }}
            className="flex items-center gap-2 glass text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm border border-white/10"
          >
            <CreditCard size={16} /> ثبت پرداخت
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            <Plus size={18} /> دکان جدید
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError('')} className="mr-auto text-rose-300 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* Tabs + Reset Button */}
      <div className="flex gap-2 flex-wrap items-center">
        {([
          ['tenants', '🏪 دکان‌ها'],
          ['payments', '💳 پرداخت‌ها'],
          ['pending', '⏳ انتظار تأیید'],
          ...(isSuperAdmin ? ([['paidqueue', '💰 پرداخت شده — صدور کد'], ['regpay', '🧾 همهٔ پرداخت‌های ثبت‌نام']] as [string, string][]) : []),
        ] as [string, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as 'tenants' | 'payments' | 'pending' | 'paidqueue' | 'regpay')}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
            {label}
            {tab === 'pending' && pendingRegs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingRegs.length}
              </span>
            )}
            {tab === 'paidqueue' && paidQueueList.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                {paidQueueList.length}
              </span>
            )}
          </button>
        ))}
        <div className="mr-auto flex items-center gap-2">
          {resetMsg && (
            <span className="text-xs text-emerald-400 font-bold">{resetMsg}</span>
          )}
          <button onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-sm font-bold transition-all">
            <Trash size={14} /> پاک‌سازی داده‌ها
          </button>
        </div>
      </div>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash size={28} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-black">پاک‌سازی تمام داده‌ها</h3>
            <p className="text-sm text-slate-500">این عملیات تمام دکان‌ها و داده‌های آن‌ها را پاک می‌کند. این عمل قابل بازگشت نیست!</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl glass text-sm font-bold">انصراف</button>
              <button onClick={handleResetData} disabled={isResetting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 disabled:opacity-60 transition-all">
                {isResetting ? 'در حال پاک‌سازی...' : 'تأیید — پاک کن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در دکان‌ها..."
                className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:border-indigo-500 text-sm ${voiceOk ? 'pl-11' : ''}`} />
              {voiceOk && (
                <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[['all', 'همه'], ['active', 'فعال'], ['suspended', 'معلق']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${filter === val ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'کل دکان‌ها', value: tenants.length, color: 'text-white' },
              { label: 'دکان فعال', value: tenants.filter((t) => t.status === 'active').length, color: 'text-emerald-400' },
              { label: 'پریمیوم', value: tenants.filter((t) => t.subscription_plan === 'premium').length, color: 'text-purple-400' },
              { label: 'معلق', value: tenants.filter((t) => t.status !== 'active').length, color: 'text-rose-400' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <div key={t.shop_code} className="glass rounded-2xl p-5 card-hover">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-2xl">
                        🏬
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">{t.shop_name}</h3>
                        <p className="text-slate-500 text-xs">{t.shop_code}</p>
                        <p className="text-slate-600 text-xs">{t.shop_domain}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {t.status === 'active' ? 'فعال' : t.status === 'suspended' ? 'معلق' : 'غیرفعال'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${t.subscription_plan === 'premium' ? 'badge-purple' : 'badge-blue'}`}>
                        {t.subscription_plan === 'premium' ? 'پریمیوم' : 'پایه'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User size={11} className="text-slate-500" />
                      <span>{t.owner_name}</span>
                    </div>
                    {t.owner_phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone size={11} className="text-slate-500" />
                        <span>{t.owner_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar size={11} className="text-slate-500" />
                      <span>انقضا: {t.subscription_end}</span>
                    </div>
                    {t.is_demo && t.trial_ends_at && (
                      <div className="flex items-center gap-2 text-xs text-amber-300/90 font-bold">
                        <Clock size={11} className="text-amber-400" />
                        <span>
                          تریال: {String(t.trial_ends_at).slice(0, 10)}
                          {typeof t.trial_days_remaining === 'number' ? ` — ${t.trial_days_remaining} روز مانده` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                      <p className="text-white font-bold text-sm">{t.users_count}</p>
                      <p className="text-slate-500 text-xs">کاربر</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                      <p className="text-white font-bold text-sm">{t.products_count}</p>
                      <p className="text-slate-500 text-xs">محصول</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-2 text-center">
                      <p className={`font-bold text-xs ${t.is_demo ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {t.is_demo ? 'آزمایشی' : 'واقعی'}
                      </p>
                      <p className="text-slate-500 text-xs">نوع</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex gap-1">
                      <button onClick={() => setViewTenant(t)} className="p-2 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors" title="مشاهده">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg glass text-slate-400 hover:text-indigo-400 transition-colors" title="ویرایش">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => void toggleStatus(t)}
                        className={`p-2 rounded-lg glass transition-colors ${t.status === 'active' ? 'text-slate-400 hover:text-amber-400' : 'text-amber-400 hover:text-green-400'}`}
                        title="تغییر وضعیت"
                      >
                        <Power size={14} />
                      </button>
                      <button onClick={() => void deleteTenant(t)} className="p-2 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors" title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {t.subscription_status === 'expired' && (
                      <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">⚠ منقضی</span>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !loading && (
                <div className="col-span-full text-center py-16 text-slate-400">
                  <p className="text-4xl mb-3">🏬</p>
                  <p>هیچ دکانی یافت نشد</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'payments' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  {['کد دکان', 'مبلغ', 'پلن', 'روش', 'یادداشت', 'تاریخ'].map((h) => (
                    <th key={h} className="text-right text-slate-400 font-medium py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="py-3 px-4 text-white font-mono">{String(p.shop_code || '')}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{Number(p.amount || 0).toLocaleString()} ؋</td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{String(p.plan || '')}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${String(p.method) === 'bank' ? 'badge-blue' : 'badge-green'}`}>
                        {String(p.method) === 'bank' ? 'بانکی' : 'نقدی'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{String(p.note || '—')}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{String(p.created_at || '').slice(0, 10)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">پرداختی ثبت نشده</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'paidqueue' && isSuperAdmin && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm leading-relaxed">
            اینجا فقط درخواست‌هایی هستند که <span className="text-emerald-300 font-semibold">پول پرداخت کرده‌اند</span> و هنوز برایشان{' '}
            <span className="text-white font-semibold">کد فروشگاه صادر نشده</span>. با «تأیید» فروشگاه ساخته می‌شود و کد فروشگاه، رمز فروشگاه و رمز نقش مدیر در پنجرهٔ سبز نمایش داده می‌شود — همان را به مشتری بدهید.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={regPayNote}
              onChange={(e) => setRegPayNote(e.target.value)}
              placeholder="یادداشت ادمین برای تأیید / رد (اختیاری)"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => void loadAdminPayments()}
              className="flex items-center justify-center gap-2 glass px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white border border-white/10"
            >
              <RefreshCw size={14} /> بروزرسانی لیست
            </button>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            {adminPayLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">در حال بارگذاری...</div>
            ) : paidQueueList.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">در حال حاضر پرداخت‌شدهٔ در انتظار صدور کدی نیست.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-white/10">
                      {['#', 'نام', 'ایمیل', 'مبلغ', 'پلن', 'روش', 'وضعیت', 'عمل'].map((h) => (
                        <th key={h} className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paidQueueList.map((p) => {
                      const statusFa: Record<string, string> = {
                        paid_pending_admin: 'پرداخت شده — صدور کد',
                      };
                      return (
                        <tr key={p.id} className="table-row-hover">
                          <td className="py-3 px-3 text-slate-500 font-mono">{p.id}</td>
                          <td className="py-3 px-3 text-white font-medium max-w-[140px] truncate" title={p.owner_name}>{p.owner_name}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs max-w-[160px] truncate" dir="ltr" title={p.email}>{p.email || '—'}</td>
                          <td className="py-3 px-3 text-emerald-400 font-bold whitespace-nowrap">{Number(p.amount_afn || 0).toLocaleString()} ؋</td>
                          <td className="py-3 px-3 text-slate-300 text-xs whitespace-nowrap">{p.plan}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{p.pay_method}</td>
                          <td className="py-3 px-3 text-xs whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-200">
                              {statusFa[p.pay_status] || p.pay_status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => void handleVerifyRegPay(p.id, 'approve')}
                                className="px-2 py-1 rounded-lg bg-emerald-600/25 text-emerald-300 text-xs font-bold hover:bg-emerald-600 hover:text-white"
                              >
                                تأیید و صدور کد
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleVerifyRegPay(p.id, 'reject')}
                                className="px-2 py-1 rounded-lg bg-rose-600/25 text-rose-300 text-xs font-bold hover:bg-rose-600 hover:text-white"
                              >
                                رد
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'regpay' && isSuperAdmin && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            همهٔ درخواست‌های پرداخت ثبت‌نام. صف اختصاصی پرداخت‌شده‌ها در تب «پرداخت شده — صدور کد» است.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={regPayNote}
              onChange={(e) => setRegPayNote(e.target.value)}
              placeholder="یادداشت ادمین برای تأیید / رد (اختیاری)"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => void loadAdminPayments()}
              className="flex items-center justify-center gap-2 glass px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white border border-white/10"
            >
              <RefreshCw size={14} /> بروزرسانی لیست
            </button>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            {adminPayLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">در حال بارگذاری...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-white/10">
                      {['#', 'نام', 'ایمیل', 'مبلغ', 'پلن', 'روش', 'کد دکان', 'وضعیت', 'عمل'].map((h) => (
                        <th key={h} className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {adminPayList.map((p) => {
                      const done = p.pay_status === 'approved' || p.pay_status === 'rejected';
                      const statusFa: Record<string, string> = {
                        manual_pending: 'در انتظار بررسی',
                        gateway_pending: 'درگاه — در انتظار',
                        paid_pending_admin: 'پرداخت شده — تأیید ادمین',
                        approved: 'تأیید شده',
                        rejected: 'رد شده',
                        failed: 'ناموفق',
                        cancelled: 'لغو شده',
                      };
                      return (
                        <tr key={p.id} className="table-row-hover">
                          <td className="py-3 px-3 text-slate-500 font-mono">{p.id}</td>
                          <td className="py-3 px-3 text-white font-medium max-w-[140px] truncate" title={p.owner_name}>{p.owner_name}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs max-w-[160px] truncate" dir="ltr" title={p.email}>{p.email || '—'}</td>
                          <td className="py-3 px-3 text-emerald-400 font-bold whitespace-nowrap">{Number(p.amount_afn || 0).toLocaleString()} ؋</td>
                          <td className="py-3 px-3 text-slate-300 text-xs whitespace-nowrap">{p.plan}</td>
                          <td className="py-3 px-3 text-slate-400 text-xs">{p.pay_method}</td>
                          <td className="py-3 px-3 font-mono text-indigo-300">{p.shop_code || '—'}</td>
                          <td className="py-3 px-3 text-xs whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full ${done ? (p.pay_status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300') : 'bg-amber-500/15 text-amber-200'}`}>
                              {statusFa[p.pay_status] || p.pay_status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {!done ? (
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleVerifyRegPay(p.id, 'approve')}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/25 text-emerald-300 text-xs font-bold hover:bg-emerald-600 hover:text-white"
                                >
                                  تأیید
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleVerifyRegPay(p.id, 'reject')}
                                  className="px-2 py-1 rounded-lg bg-rose-600/25 text-rose-300 text-xs font-bold hover:bg-rose-600 hover:text-white"
                                >
                                  رد
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {adminPayList.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-8 text-slate-400">درخواست پرداختی نیست</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Registrations Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{pendingRegs.length} درخواست در انتظار بررسی</p>
            <button onClick={() => void loadPendingRegs()} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white glass px-3 py-1.5 rounded-lg">
              <RefreshCw size={12} /> بروزرسانی
            </button>
          </div>
          {pendingLoading ? (
            <div className="glass rounded-2xl p-8 text-center text-slate-400">در حال بارگذاری...</div>
          ) : pendingRegs.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">هیچ درخواست انتظاری وجود ندارد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRegs.map((reg) => (
                <div key={reg.code} className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="text-amber-400" />
                      <span className="text-amber-400 text-xs font-bold">انتظار تأیید</span>
                    </div>
                    <p className="text-white font-bold">{reg.name}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User size={11} /> {reg.owner_name}</span>
                      {reg.owner_email && <span className="flex items-center gap-1">✉ {reg.owner_email}</span>}
                      <span className="font-mono text-indigo-300">{reg.code}</span>
                      {reg.registered_at && <span className="flex items-center gap-1"><Calendar size={11} /> {reg.registered_at.slice(0, 10)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => void handleApprove(reg.code)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-all"
                    >
                      <ThumbsUp size={14} /> تأیید
                    </button>
                    <button
                      onClick={() => { setRejectTarget(reg.code); setRejectReason(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all"
                    >
                      <ThumbsDown size={14} /> رد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[110] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-md p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <ThumbsDown size={18} className="text-rose-400" /> رد درخواست {rejectTarget}
            </h3>
            <label className="text-sm text-slate-300 block mb-2">دلیل رد (اختیاری)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-rose-400 resize-none mb-4"
              placeholder="مثال: مدارک ناقص است..."
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium glass text-slate-300 hover:text-white">انصراف</button>
              <button onClick={() => void handleReject()} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-500">رد درخواست</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[110] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold text-lg">{editItem ? 'ویرایش دکان' : 'ایجاد دکان جدید'}</h2>
              <button onClick={() => { setShowModal(false); setNewCreds(null); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {/* Show new credentials after creation */}
            {newCreds && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle size={18} />
                  <span className="font-semibold">دکان با موفقیت ایجاد شد</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-amber-300 text-xs font-bold">⚠ این اطلاعات را برای مشتری ارسال کنید (یک‌بار نمایش داده می‌شود)</p>
                  {[
                    ['کد فروشگاه', newCreds.shopCode],
                    ['رمز فروشگاه', newCreds.shopPassword],
                    ['رمز مدیر (admin)', newCreds.adminRolePassword],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-3 py-2">
                      <span className="text-slate-400 text-xs">{k}</span>
                      <code className="text-indigo-300 font-mono text-sm select-all">{v}</code>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setShowModal(false); setNewCreds(null); }}
                  className="w-full btn-primary text-white py-2.5 rounded-xl text-sm font-semibold"
                >
                  متوجه شدم، بستن
                </button>
              </div>
            )}

            {!newCreds && (
              <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
                {saveError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> {saveError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">نام دکان *</label>
                    <input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" required />
                  </div>
                  {!editItem && (
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">کد دکان (slug) *</label>
                      <input
                        value={form.shop_code}
                        onChange={(e) => setForm({ ...form, shop_code: e.target.value.toUpperCase() })}
                        placeholder="SHOP001"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 font-mono"
                        dir="ltr"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">نام مالک *</label>
                    <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" required />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">موبایل مالک</label>
                    <input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                  </div>
                  <div className={editItem ? '' : 'col-span-2'}>
                    <label className="text-slate-400 text-xs mb-1 block">ایمیل مالک</label>
                    <input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs mb-1 block">طرح اشتراک</label>
                    <select value={form.subscription_plan} onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500">
                      <option value="basic">پایه (Basic)</option>
                      <option value="premium">پریمیوم (Premium)</option>
                    </select>
                  </div>
                  {editItem && isSuperAdmin && (
                    <div className="col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
                      <label className="text-amber-200/90 text-xs font-bold block">بازنشانی رمز نقش مدیر (همان «رمز عبور نقش» در ورود)</label>
                      <input
                        type="password"
                        value={adminRolePasswordReset}
                        onChange={(e) => setAdminRolePasswordReset(e.target.value)}
                        placeholder="خالی بگذارید اگر تغییر نمی‌دهید — حداقل ۴ کاراکتر"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-500 font-mono"
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        برای دکان‌هایی که از اینجا ساخته شده‌اند، رمز نقش مدیر تصادفی بوده و فقط یک‌بار بعد از ایجاد نشان داده می‌شود؛ <code className="text-slate-400">1234</code> فقط برای دکان‌های نمونهٔ توسعه است.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editItem ? 'ذخیره تغییرات' : 'ایجاد دکان')}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 glass text-slate-300 font-semibold py-2.5 rounded-xl text-sm hover:text-white">انصراف</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[110] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold">ثبت پرداخت اشتراک</h2>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => void handlePaySubmit(e)} className="p-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{saveError}</div>
              )}
              <div>
                <label className="text-slate-400 text-xs mb-1 block">دکان *</label>
                <select
                  value={payForm.shop_code}
                  onChange={(e) => setPayForm({ ...payForm, shop_code: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  required
                >
                  <option value="">انتخاب دکان</option>
                  {tenants.map((t) => (
                    <option key={t.shop_code} value={t.shop_code}>{t.shop_name} ({t.shop_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">مبلغ (افغانی) *</label>
                  <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" min="1" required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">پلن</label>
                  <select value={payForm.plan} onChange={(e) => setPayForm({ ...payForm, plan: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500">
                    <option value="basic_monthly">پایه ماهانه - ۱۰۰ ؋</option>
                    <option value="basic_annual">پایه سالانه - ۱۰۰۰ ؋</option>
                    <option value="premium_monthly">پریمیوم ماهانه - ۳۰۰ ؋</option>
                    <option value="premium_annual">پریمیوم سالانه - ۳۰۰۰ ؋</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">روش پرداخت</label>
                  <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500">
                    <option value="cash">نقدی</option>
                    <option value="bank">بانکی</option>
                    <option value="mpaisa">M-Paisa</option>
                    <option value="mhawala">M-Hawala</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">یادداشت</label>
                  <input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ثبت پرداخت'}
                </button>
                <button type="button" onClick={() => setShowPayModal(false)} className="px-5 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewTenant && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[110] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-2xl">🏬</span>
                {viewTenant.shop_name}
              </h2>
              <button onClick={() => setViewTenant(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{viewTenant.users_count}</p>
                  <p className="text-indigo-200 text-xs">کاربران</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{viewTenant.products_count}</p>
                  <p className="text-emerald-200 text-xs">محصولات</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ['کد دکان', viewTenant.shop_code],
                  ['دامنه', viewTenant.shop_domain],
                  ['مالک', viewTenant.owner_name],
                  ['موبایل', viewTenant.owner_phone || '—'],
                  ['ایمیل', viewTenant.owner_email || '—'],
                  ['طرح', viewTenant.subscription_plan === 'premium' ? 'پریمیوم' : 'پایه'],
                  ['شروع اشتراک', viewTenant.subscription_start],
                  ['انقضا اشتراک', viewTenant.subscription_end],
                  ['حداکثر کاربران', String(viewTenant.max_users)],
                  ['حداکثر محصولات', String(viewTenant.max_products)],
                  ['وضعیت', viewTenant.status],
                  ['ثبت‌نام', viewTenant.created_at.slice(0, 10)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm">{k}</span>
                    <span className="text-white text-sm font-medium font-mono">{v}</span>
                  </div>
                ))}
              </div>

              {isSuperAdmin && viewTenant.credential_record && (() => {
                const cr = viewTenant.credential_record;
                const rows = [
                  ['رمز فروشگاه (ذخیره‌شده)', cr.shop_password_plain],
                  ['رمز نقش مدیر (ذخیره‌شده)', cr.admin_role_password_plain],
                ].filter(([, v]) => v && String(v).trim());
                if (!cr.recorded_at && rows.length === 0) return null;
                return (
                  <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
                    <h3 className="text-amber-200 text-xs font-bold uppercase tracking-wide">ذخیرهٔ اعتبارنامه (فقط ابرادمین)</h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      آخرین رمزهایی که هنگام ساخت دکان، تأیید پرداخت یا بازنشانی رمز مدیر در سرور ثبت شده‌اند. برای بقیهٔ نقش‌ها فقط از پنل همان فروشگاه یا بازنشانی مدیر استفاده کنید.
                    </p>
                    {cr.recorded_at && (
                      <p className="text-slate-500 text-[11px]">زمان ثبت: {cr.recorded_at.slice(0, 19).replace('T', ' ')}</p>
                    )}
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center gap-2 bg-slate-900/40 rounded-lg px-3 py-2">
                        <span className="text-slate-400 text-xs shrink-0">{k}</span>
                        <code className="text-indigo-300 font-mono text-sm select-all text-left" dir="ltr">{v}</code>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <User size={16} className="text-indigo-400" />
                  کاربران و نقش‌ها (شناسه و نام کاربری)
                </h3>
                <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
                  رمز سایر نقش‌ها (غیر از مدیر) اینجا ذخیره نمی‌شود. رمز مدیر در بلوک «ذخیرهٔ اعتبارنامه» بالا در صورت وجود دیده می‌شود؛ در غیر این صورت از «ویرایش دکان» بازنشانی کنید.
                </p>
                {detailUsersLoading ? (
                  <p className="text-slate-500 text-sm py-4 text-center">در حال بارگذاری کاربران...</p>
                ) : detailUsers.length === 0 ? (
                  <p className="text-slate-500 text-sm">کاربری ثبت نشده</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-400">
                          <th className="text-right py-2 px-3">شناسه</th>
                          <th className="text-right py-2 px-3">نام کاربری</th>
                          <th className="text-right py-2 px-3">نام</th>
                          <th className="text-right py-2 px-3">نقش</th>
                          <th className="text-right py-2 px-3">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {detailUsers.map((u) => {
                          const roleFa: Record<string, string> = {
                            admin: 'مدیر دکان',
                            seller: 'فروشنده',
                            stock_keeper: 'انباردار',
                            accountant: 'حسابدار',
                            super_admin: 'سوپرادمین',
                          };
                          return (
                            <tr key={u.id} className="text-slate-200">
                              <td className="py-2 px-3 font-mono text-indigo-300">{u.id}</td>
                              <td className="py-2 px-3 font-mono text-left" dir="ltr">{u.username}</td>
                              <td className="py-2 px-3">{u.full_name}</td>
                              <td className="py-2 px-3 whitespace-nowrap">{roleFa[u.role] || u.role}</td>
                              <td className="py-2 px-3">{u.status === 'active' ? 'فعال' : u.status === 'inactive' ? 'غیرفعال' : u.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {provisionCreds && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[120] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle size={20} />
              فروشگاه از روی پرداخت ساخته شد
            </div>
            <p className="text-amber-200/90 text-xs font-bold leading-relaxed">
              این رمزها را فقط یک‌بار اینجا می‌بینید؛ برای مشتری کپی یا ایمیل کنید.
            </p>
            {[
              ['کد فروشگاه', provisionCreds.shopCode],
              ['رمز فروشگاه', provisionCreds.shopPassword],
              ['رمز نقش مدیر', provisionCreds.adminRolePassword],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-3 py-2 gap-2">
                <span className="text-slate-400 text-xs shrink-0">{k}</span>
                <code className="text-indigo-300 font-mono text-sm select-all text-left" dir="ltr">{v}</code>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setProvisionCreds(null)}
              className="w-full btn-primary text-white py-2.5 rounded-xl text-sm font-semibold"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
