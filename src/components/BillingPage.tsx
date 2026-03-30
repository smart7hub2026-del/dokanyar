import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from './Toast';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  Send,
  LayoutDashboard,
  Layers,
  Receipt,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import {
  apiGetTenants,
  apiGetSubscriptionPayments,
  apiCreateSubscriptionPayment,
  type Tenant,
} from '../services/api';
import FormModal from './ui/FormModal';

const plans = [
  { name: 'basic_monthly', label: 'ماهانه پایه', price: 14.9, currency: '$', color: 'teal', features: ['۴ کاربر', '۲۰۰۰ محصول', 'پشتیبانی استاندارد'] },
  { name: 'basic_annual', label: 'سالانه پایه', price: 99, currency: '$', color: 'green', features: ['۴ کاربر', '۵۰۰۰ محصول', 'پشتیبانی اولویت‌دار', 'بکاپ روزانه'] },
  { name: 'premium_monthly', label: 'ماهانه پرمیوم', price: 19.9, currency: '$', color: 'indigo', features: ['کاربر نامحدود', 'محصول نامحدود', 'پشتیبانی ۲۴/۷', 'گزارش پیشرفته'] },
  { name: 'premium_annual', label: 'سالانه پرمیوم', price: 179, currency: '$', color: 'emerald', features: ['کاربر نامحدود', 'محصول نامحدود', 'پشتیبانی ۲۴/۷', 'گزارش پیشرفته', 'دامنه اختصاصی'] },
];

type ApiPayment = {
  id: number;
  shop_code: string;
  amount: number;
  plan?: string;
  method?: string;
  note?: string;
  status?: string;
  created_at?: string;
};

type PaymentRow = {
  id: number;
  shop_code: string;
  tenant_name: string;
  amount: number;
  for_month: string;
  payment_method: string;
  payment_date: string;
  status: 'completed' | 'pending';
};

type BillingSection = 'overview' | 'plans' | 'unpaid' | 'history';

export default function BillingPage() {
  const { isDark } = useApp();
  const { success, info, error } = useToast();
  const authToken = useStore(s => s.authToken);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rawPayments, setRawPayments] = useState<ApiPayment[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedShopCode, setSelectedShopCode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [newPayment, setNewPayment] = useState({
    shop_code: '',
    amount: 800,
    plan: 'basic_monthly',
    method: 'manual',
    note: '',
  });
  const [activeSection, setActiveSection] = useState<BillingSection>('overview');

  const refresh = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    try {
      const [tr, pr] = await Promise.all([
        apiGetTenants(tok),
        apiGetSubscriptionPayments(undefined, tok),
      ]);
      setTenants(tr.tenants || []);
      setRawPayments((pr.payments as ApiPayment[]) || []);
      setLoadErr('');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'خطا در بارگذاری');
    }
  }, [authToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const payments: PaymentRow[] = useMemo(() => {
    return rawPayments.map(p => ({
      id: p.id,
      shop_code: String(p.shop_code || '').toUpperCase(),
      tenant_name: tenants.find(t => String(t.shop_code).toUpperCase() === String(p.shop_code).toUpperCase())?.shop_name || String(p.shop_code),
      amount: Number(p.amount || 0),
      for_month: String(p.created_at || '').slice(0, 7),
      payment_date: String(p.created_at || '').slice(0, 10),
      payment_method: p.method === 'manual' || !p.method ? 'cash' : p.method,
      status: p.status === 'pending' ? 'pending' : 'completed',
    }));
  }, [rawPayments, tenants]);

  const filtered = payments.filter(p => filterStatus === 'all' || p.status === filterStatus);
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidShopCodes = new Set(
    payments.filter(p => p.for_month === thisMonth && p.status === 'completed').map(p => p.shop_code)
  );
  const unpaidTenants = tenants.filter(
    t => t.status === 'active' && !paidShopCodes.has(String(t.shop_code).toUpperCase())
  );

  const handleAddPayment = async () => {
    const tok = authToken || undefined;
    if (!tok) {
      error('ورود', 'ابتدا وارد شوید');
      return;
    }
    if (!newPayment.shop_code.trim()) {
      info('انتخاب دکان', 'کد فروشگاه را انتخاب کنید');
      return;
    }
    try {
      await apiCreateSubscriptionPayment(
        {
          shop_code: newPayment.shop_code.trim().toUpperCase(),
          amount: newPayment.amount,
          plan: newPayment.plan,
          method: newPayment.method,
          note: newPayment.note,
        },
        tok
      );
      success('پرداخت ثبت شد', 'در سرور ذخیره شد');
      setShowAddModal(false);
      await refresh();
    } catch (e) {
      error('خطا', e instanceof Error ? e.message : 'ثبت ناموفق');
    }
  };

  const handleSendReminder = (tenantName: string) => {
    info('یادآوری', `الگوی یادآوری برای ${tenantName} (ارسال واقعی نیاز به سرویس پیامک/ایمیل دارد)`);
  };

  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const panelClass = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';

  const sectionTabs: {
    id: BillingSection;
    label: string;
    Icon: typeof LayoutDashboard;
    gradientDark: string;
    gradientLight: string;
    hint: string;
  }[] = [
    {
      id: 'overview',
      label: 'نما',
      Icon: LayoutDashboard,
      gradientDark: 'from-emerald-600/50 via-slate-900 to-slate-950',
      gradientLight: 'from-emerald-500/25 via-white to-slate-50',
      hint: 'جمع دریافتی، معوقه و روند ماه جاری از API',
    },
    {
      id: 'plans',
      label: 'طرح‌ها',
      Icon: Layers,
      gradientDark: 'from-indigo-600/50 via-slate-900 to-slate-950',
      gradientLight: 'from-indigo-500/20 via-white to-slate-50',
      hint: 'اشتراک دکان‌ها بر اساس طرح ثبت‌شده در سرور',
    },
    {
      id: 'unpaid',
      label: 'معوق',
      Icon: AlertTriangle,
      gradientDark: 'from-amber-600/45 via-slate-900 to-slate-950',
      gradientLight: 'from-amber-500/25 via-white to-amber-50/30',
      hint: 'دکان‌های فعال بدون پرداخت ثبت‌شده این ماه',
    },
    {
      id: 'history',
      label: 'پرداخت',
      Icon: Receipt,
      gradientDark: 'from-violet-600/45 via-slate-900 to-slate-950',
      gradientLight: 'from-violet-500/20 via-white to-slate-50',
      hint: 'تاریخچه کامل از GET /api/platform/... (همان دادهٔ ادمین)',
    },
  ];

  const activeMeta = sectionTabs.find(s => s.id === activeSection)!;
  const heroGradient = isDark ? activeMeta.gradientDark : activeMeta.gradientLight;

  return (
    <div className="space-y-5 md:space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${headingClass}`}>مدیریت صورتحساب</h1>
          <p className={`${mutedClass} text-sm mt-1`}>پرداخت اشتراک مستر — همگام با بک‌اند</p>
          {loadErr && <p className="text-rose-500 text-xs mt-1 font-medium">{loadErr}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} /> ثبت پرداخت
        </button>
      </div>

      {/* نوار بخش‌ها + کارت هیرو */}
      <div className={`${panelClass} p-3 sm:p-4`}>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {sectionTabs.map(tab => {
            const on = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`shrink-0 flex flex-col items-center gap-1 min-w-[4.5rem] px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-bold transition-all border ${
                  on
                    ? isDark
                      ? 'bg-indigo-500/25 border-indigo-400/50 text-white shadow-lg shadow-indigo-900/20'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm'
                    : isDark
                      ? 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.Icon size={20} className={on ? (isDark ? 'text-indigo-300' : 'text-indigo-600') : ''} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          className={`mt-4 rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${heroGradient} border ${
            isDark ? 'border-white/10' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-white/10 text-white' : 'bg-white/80 text-indigo-700 shadow-sm'
              }`}
            >
              <activeMeta.Icon size={22} />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeMeta.label}
              </h2>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-200/85' : 'text-slate-600'}`}>
                {activeMeta.hint}
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeSection === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className={`${panelClass} rounded-2xl p-4 stat-card`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
              <DollarSign size={20} className="text-emerald-500" />
            </div>
            <p className={`${mutedClass} text-xs`}>جمع دریافتی (ثبت‌شده)</p>
            <p className={`${headingClass} text-lg sm:text-xl font-bold mt-1 tabular-nums`}>
              {totalRevenue.toLocaleString()} ؋
            </p>
          </div>
          <div className={`${panelClass} rounded-2xl p-4 stat-card`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
              <Clock size={20} className="text-amber-600" />
            </div>
            <p className={`${mutedClass} text-xs`}>در انتظار</p>
            <p className={`${headingClass} text-lg sm:text-xl font-bold mt-1 tabular-nums`}>
              {pendingRevenue.toLocaleString()} ؋
            </p>
          </div>
          <div className={`${panelClass} rounded-2xl p-4 stat-card`}>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mb-3">
              <AlertTriangle size={20} className="text-rose-500" />
            </div>
            <p className={`${mutedClass} text-xs`}>بدون پرداخت این ماه</p>
            <p className={`${headingClass} text-lg sm:text-xl font-bold mt-1`}>{unpaidTenants.length}</p>
          </div>
          <div className={`${panelClass} rounded-2xl p-4 stat-card col-span-2 lg:col-span-1`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-indigo-600" />
            </div>
            <p className={`${mutedClass} text-xs`}>رکورد پرداخت</p>
            <p className={`${headingClass} text-lg sm:text-xl font-bold mt-1`}>{payments.length}</p>
          </div>
        </div>
      )}

      {activeSection === 'plans' && (
        <div className={`${panelClass} p-4 sm:p-6`}>
          <h2 className={`${headingClass} font-semibold mb-4 sm:mb-6`}>طرح‌های اشتراک</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {plans.map(plan => {
              const planKey = plan.name.split('_')[0] as 'basic' | 'premium';
              const count = tenants.filter(t => t.subscription_plan === planKey).length;
              const border =
                plan.color === 'teal'
                  ? 'border-teal-500/30 bg-teal-500/5'
                  : plan.color === 'green'
                    ? 'border-green-500/30 bg-green-500/5'
                    : plan.color === 'indigo'
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : 'border-emerald-500/30 bg-emerald-500/5';
              const accent =
                plan.color === 'teal'
                  ? 'text-teal-500'
                  : plan.color === 'green'
                    ? 'text-green-600'
                    : plan.color === 'indigo'
                      ? 'text-indigo-600'
                      : 'text-emerald-600';
              const titleC = isDark ? 'text-white' : 'text-slate-900';
              const featC = isDark ? 'text-slate-300' : 'text-slate-600';
              return (
                <div key={plan.name} className={`border rounded-2xl p-5 sm:p-6 flex flex-col ${border}`}>
                  <div className="mb-5">
                    <h3 className={`${titleC} font-bold text-base sm:text-lg mb-2`}>{plan.label}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className={`${accent} text-2xl sm:text-3xl font-extrabold tabular-nums`}>
                        {plan.price.toLocaleString()}
                      </span>
                      <span className={`${accent} text-sm font-medium opacity-80`}>{plan.currency}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className={`${featC} text-sm flex items-start gap-2`}>
                        <CheckCircle size={16} className={`${accent} mt-0.5 shrink-0`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-auto pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className={`text-xs ${mutedClass} text-center`}>
                      {count} دکان — {planKey === 'basic' ? 'پایه' : 'پریمیوم'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'unpaid' && (
        <div>
          {unpaidTenants.length === 0 ? (
            <div className={`${panelClass} p-8 text-center ${mutedClass}`}>
              <CheckCircle className="mx-auto mb-2 text-emerald-500 opacity-70" size={36} />
              <p className={headingClass}>همه دکان‌های فعال در این ماه پرداخت دارند یا لیست خالی است.</p>
            </div>
          ) : (
            <div className={`${panelClass} p-4 sm:p-5 border ${isDark ? 'border-amber-500/25' : 'border-amber-200'}`}>
              <h2 className="text-amber-600 font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle size={18} /> بدون پرداخت ثبت‌شده ({unpaidTenants.length})
              </h2>
              <div className="space-y-2">
                {unpaidTenants.map(t => (
                  <div
                    key={String(t.id)}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl px-4 py-3 ${
                      isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}
                  >
                    <div>
                      <p className={`${headingClass} text-sm font-medium`}>{t.shop_name}</p>
                      <p className={`${mutedClass} text-xs`}>
                        {t.owner_name} — {t.shop_code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendReminder(t.shop_name)}
                      className="text-xs px-3 py-2 bg-amber-500/20 text-amber-700 rounded-xl hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1 shrink-0"
                    >
                      <Send size={12} /> یادآوری
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'history' && (
        <div className={`${panelClass} overflow-hidden`}>
          <div
            className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <h2 className={`${headingClass} font-semibold text-sm sm:text-base`}>تاریخچه پرداخت‌ها</h2>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'completed', 'pending'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-3 py-2 rounded-xl transition-colors font-medium ${
                    filterStatus === s
                      ? 'bg-indigo-600 text-white'
                      : isDark
                        ? 'glass text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'all' ? 'همه' : s === 'completed' ? 'تکمیل' : 'در انتظار'}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                  {['دکان', 'کد', 'مبلغ', 'ماه', 'روش', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                    <th
                      key={h}
                      className={`text-right ${mutedClass} text-xs font-medium px-4 py-3 whitespace-nowrap`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
                {filtered.map(p => (
                  <tr key={p.id} className={isDark ? 'table-row-hover' : 'hover:bg-slate-50/80'}>
                    <td className={`px-4 py-3 text-sm ${headingClass}`}>{p.tenant_name}</td>
                    <td className={`px-4 py-3 text-xs font-mono ${mutedClass}`}>{p.shop_code}</td>
                    <td className="px-4 py-3 text-emerald-600 text-sm font-medium tabular-nums">
                      {p.amount.toLocaleString()} ؋
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {p.for_month}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {p.payment_method === 'cash' ? 'نقدی' : p.payment_method}
                    </td>
                    <td className={`px-4 py-3 text-sm ${mutedClass}`}>{p.payment_date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${p.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}
                      >
                        {p.status === 'completed' ? 'تکمیل' : 'انتظار'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShopCode(p.shop_code);
                          setShowInvoiceModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-500 text-xs flex items-center gap-1"
                      >
                        <Eye size={12} /> فاکتور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-3 space-y-3">
            {filtered.map(p => (
              <div
                key={p.id}
                className={`rounded-2xl p-4 border ${
                  isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className={`font-bold text-[15px] ${headingClass}`}>{p.tenant_name}</p>
                    <p className={`text-xs font-mono ${mutedClass}`}>{p.shop_code}</p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${p.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}
                  >
                    {p.status === 'completed' ? 'تکمیل' : 'انتظار'}
                  </span>
                </div>
                <p
                  className={`text-xl font-black mt-3 tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                >
                  {p.amount.toLocaleString()} ؋
                </p>
                <div className={`mt-2 space-y-1 text-xs ${mutedClass}`}>
                  <div className="flex justify-between">
                    <span>ماه</span>
                    <span className={headingClass}>{p.for_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>روش</span>
                    <span>{p.payment_method === 'cash' ? 'نقدی' : p.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاریخ</span>
                    <span>{p.payment_date}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShopCode(p.shop_code);
                    setShowInvoiceModal(true);
                  }}
                  className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border ${
                    isDark
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/35'
                      : 'bg-indigo-600/10 text-indigo-700 border-indigo-200'
                  }`}
                >
                  <Eye size={16} /> مشاهده فاکتور
                </button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={`text-center py-12 ${mutedClass}`}>
              <CreditCard size={40} className="mx-auto mb-2 opacity-30" />
              <p>پرداختی یافت نشد</p>
            </div>
          )}
        </div>
      )}

      <FormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="ثبت پرداخت جدید"
        size="md"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => void handleAddPayment()} className="btn-primary flex-1 rounded-xl py-2.5 text-sm font-medium text-white">
              ثبت پرداخت
            </button>
            <button type="button" onClick={() => setShowAddModal(false)} className="glass flex-1 rounded-xl py-2.5 text-sm text-slate-300">
              انصراف
            </button>
          </div>
        }
      >
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1">فروشگاه</label>
                <select value={newPayment.shop_code} onChange={e => setNewPayment({ ...newPayment, shop_code: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500">
                  <option value="">انتخاب...</option>
                  {tenants.map(t => (
                    <option key={String(t.id)} value={t.shop_code}>{t.shop_name} — {t.shop_code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">مبلغ (AFN)</label>
                <input type="number" value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: +e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">طرح</label>
                <select value={newPayment.plan} onChange={e => setNewPayment({ ...newPayment, plan: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500">
                  {plans.map(pl => <option key={pl.name} value={pl.name}>{pl.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">یادداشت</label>
                <input value={newPayment.note} onChange={e => setNewPayment({ ...newPayment, note: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500" />
              </div>
            </div>
      </FormModal>

      {showInvoiceModal && selectedShopCode && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="print-preview p-6">
              <div className="text-center border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">فاکتور اشتراک</h2>
                <p className="text-gray-500 text-sm">سیستم مدیریت فروشگاه</p>
              </div>
              {(() => {
                const t = tenants.find(tn => String(tn.shop_code).toUpperCase() === selectedShopCode);
                const p = payments.find(pm => pm.shop_code === selectedShopCode);
                return t && p ? (
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between"><span>نام دکان:</span><strong>{t.shop_name}</strong></div>
                    <div className="flex justify-between"><span>مالک:</span><strong>{t.owner_name}</strong></div>
                    <div className="flex justify-between"><span>ماه:</span><strong>{p.for_month}</strong></div>
                    <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                      <span>مبلغ:</span><span className="text-green-600">{p.amount.toLocaleString()} ؋</span>
                    </div>
                  </div>
                ) : <p className="text-gray-600 text-sm">رکوردی یافت نشد</p>;
              })()}
            </div>
            <button type="button" onClick={() => { window.print(); }} className="btn-primary text-white w-full py-2.5 rounded-xl text-sm mt-4">چاپ فاکتور</button>
          </div>
        </div>
      )}
    </div>
  );
}
