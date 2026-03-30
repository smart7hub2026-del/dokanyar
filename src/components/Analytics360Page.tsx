import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiGetTenants, apiGetSubscriptionPayments, type Tenant } from '../services/api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type SubPayment = { amount?: number; created_at?: string; shop_code?: string; status?: string };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function Analytics360Page() {
  const authToken = useStore(s => s.authToken);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<SubPayment[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const tok = authToken || undefined;
    if (!tok) return;
    let canceled = false;
    (async () => {
      try {
        const [tr, pr] = await Promise.all([
          apiGetTenants(tok),
          apiGetSubscriptionPayments(undefined, tok),
        ]);
        if (canceled) return;
        setTenants(tr.tenants || []);
        setPayments((pr.payments as SubPayment[]) || []);
        setLoadError('');
      } catch (e) {
        if (!canceled) setLoadError(e instanceof Error ? e.message : 'خطا در دریافت داده');
      }
    })();
    return () => {
      canceled = true;
    };
  }, [authToken]);

  const completedPayments = useMemo(
    () => payments.filter(p => p.status !== 'pending'),
    [payments]
  );

  const totalRevenue = completedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const totalSalesToday = tenants.reduce((s, t) => s + Number(t.sales_today || 0), 0);

  const tenantPerformance = useMemo(
    () =>
      tenants.map(t => ({
        key: String(t.shop_code),
        name: t.shop_name.slice(0, 12),
        shop_name: t.shop_name,
        sales: Number(t.sales_today || 0),
        users: Number(t.users_count || 0),
        products: Number(t.products_count || 0),
        status: t.status,
        risk:
          t.subscription_status === 'expired'
            ? ('high' as const)
            : Number(t.sales_today || 0) === 0
              ? ('medium' as const)
              : ('low' as const),
      })),
    [tenants]
  );

  const highRisk = tenantPerformance.filter(t => t.risk === 'high').length;

  const planDist = useMemo(
    () => [
      { name: 'پریمیوم', value: tenants.filter(t => t.subscription_plan === 'premium').length },
      { name: 'پایه', value: tenants.filter(t => t.subscription_plan === 'basic').length },
    ],
    [tenants]
  );

  const statusDist = useMemo(
    () => [
      { name: 'فعال', value: tenants.filter(t => t.status === 'active').length },
      { name: 'تعلیق', value: tenants.filter(t => t.status === 'suspended').length },
      { name: 'غیرفعال', value: tenants.filter(t => t.status === 'inactive').length },
    ],
    [tenants]
  );

  const daysBack = period === 'week' ? 7 : period === 'month' ? 30 : 365;

  const salesByDay = useMemo(() => {
    const today = startOfDay(new Date());
    const slots: { name: string; sales: number; ts: string }[] = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      slots.push({
        ts: d.toISOString().slice(0, 10),
        name: `${d.getMonth() + 1}/${d.getDate()}`,
        sales: 0,
      });
    }
    completedPayments.forEach(p => {
      const day = String(p.created_at || '').slice(0, 10);
      const slot = slots.find(s => s.ts === day);
      if (slot) slot.sales += Number(p.amount || 0);
    });
    return slots.map(({ name, sales }) => ({ name, sales }));
  }, [completedPayments, daysBack]);

  const monthlyBar = useMemo(() => {
    const byMonth = new Map<string, number>();
    completedPayments.forEach(p => {
      const m = String(p.created_at || '').slice(0, 7);
      if (m.length >= 7) byMonth.set(m, (byMonth.get(m) || 0) + Number(p.amount || 0));
    });
    const keys = [...byMonth.keys()].sort().slice(-8);
    return keys.map(name => ({ name, sales: byMonth.get(name) || 0 }));
  }, [completedPayments]);

  const revenueForecast = useMemo(() => {
    if (monthlyBar.length === 0) return [{ month: '—', actual: null as number | null, forecast: 0 }];
    const last = monthlyBar[monthlyBar.length - 1];
    const prev = monthlyBar[monthlyBar.length - 2];
    const avg =
      monthlyBar.reduce((s, x) => s + x.sales, 0) / Math.max(1, monthlyBar.length);
    const trend = prev ? last.sales - prev.sales : 0;
    return [
      ...monthlyBar.slice(-4).map((row, i, arr) => ({
        month: row.name,
        actual: row.sales,
        forecast: i === arr.length - 1 ? row.sales + Math.max(0, trend) * 0.5 : row.sales,
      })),
      {
        month: 'پیش‌بینی+۱',
        actual: null as number | null,
        forecast: Math.round(avg + Math.max(0, trend)),
      },
    ];
  }, [monthlyBar]);

  const kpiChangeNote = monthlyBar.length >= 2 ? 'بر اساس دو ماه آخر پرداخت' : 'داده کافی برای روند نیست';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">داشبورد ۳۶۰ درجه</h1>
          <p className="text-slate-400 text-sm mt-1">تحلیل بر اساس دکان‌ها و پرداخت‌های اشتراک (API)</p>
          {loadError && <p className="text-rose-400 text-xs mt-1">{loadError}</p>}
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1.5 rounded-xl transition-colors ${period === p ? 'btn-primary text-white' : 'glass text-slate-400 hover:text-white'}`}
            >
              {p === 'week' ? 'هفته' : p === 'month' ? 'ماه' : 'سال'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'جمع پرداخت‌های ثبت‌شده',
            value: `${totalRevenue.toLocaleString()} ؋`,
            change: monthlyBar.length >= 2
              ? `${((monthlyBar[monthlyBar.length - 1].sales - monthlyBar[monthlyBar.length - 2].sales) >= 0 ? '+' : '')}${(monthlyBar[monthlyBar.length - 1].sales - monthlyBar[monthlyBar.length - 2].sales).toLocaleString()} ؋`
              : '—',
            up: monthlyBar.length >= 2 ? monthlyBar[monthlyBar.length - 1].sales >= monthlyBar[monthlyBar.length - 2].sales : true,
            icon: DollarSign,
            iconWrap: 'bg-emerald-500/20',
            iconClass: 'text-emerald-400',
          },
          {
            label: 'دکان‌های فعال',
            value: activeTenants.toString(),
            change: kpiChangeNote,
            up: true,
            icon: Users,
            iconWrap: 'bg-indigo-500/20',
            iconClass: 'text-indigo-400',
          },
          {
            label: 'فروش امروز (جمع دکان‌ها)',
            value: `${totalSalesToday.toLocaleString()} ؋`,
            change: 'از فیلدهای tenant',
            up: true,
            icon: ShoppingCart,
            iconWrap: 'bg-blue-500/20',
            iconClass: 'text-blue-400',
          },
          {
            label: 'دکان با اشتراک منقضی',
            value: highRisk.toString(),
            change: 'نیاز به پیگیری',
            up: false,
            icon: AlertTriangle,
            iconWrap: 'bg-rose-500/20',
            iconClass: 'text-rose-400',
          },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.iconWrap} flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.iconClass} />
            </div>
            <p className="text-slate-400 text-xs">{s.label}</p>
            <p className="text-white text-xl font-bold mt-1">{s.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs ${s.up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {s.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">پرداخت اشتراک به تفکیک روز</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: unknown) => [`${Number(v).toLocaleString()} ؋`, '']}
              />
              <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name="پرداخت" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">فروش امروز — مقایسه دکان‌ها</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenantPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: unknown) => [`${Number(v).toLocaleString()} ؋`, 'فروش امروز']}
              />
              <Bar dataKey="sales" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">توزیع طرح اشتراک</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={planDist}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {planDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">وضعیت دکان‌ها</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusDist.map((_, i) => (
                  <Cell key={i} fill={['#22c55e', '#f59e0b', '#ef4444'][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">روند ماهانه و پیش‌بینی ساده</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={revenueForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="واقعی" connectNulls />
              <Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="پیش‌بینی" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-white font-semibold">تحلیل ریسک دکان‌ها</h2>
          <p className="text-slate-400 text-sm mt-0.5">منقضی = ریسک بالا؛ فروش امروز صفر = ریسک متوسط</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['دکان', 'فروش امروز', 'کاربران', 'محصولات', 'وضعیت', 'سطح ریسک'].map(h => (
                  <th key={h} className="text-right text-slate-400 text-xs font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenantPerformance.map(t => (
                <tr key={t.key} className="table-row-hover">
                  <td className="px-4 py-3 text-white text-sm font-medium">{t.shop_name}</td>
                  <td className="px-4 py-3 text-emerald-400 text-sm">{t.sales.toLocaleString()} ؋</td>
                  <td className="px-4 py-3 text-white text-sm">{t.users}</td>
                  <td className="px-4 py-3 text-white text-sm">{t.products}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${t.status === 'active' ? 'badge-green' : t.status === 'suspended' ? 'badge-red' : 'badge-yellow'}`}
                    >
                      {t.status === 'active' ? 'فعال' : t.status === 'suspended' ? 'تعلیق' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${t.risk === 'low' ? 'badge-green' : t.risk === 'medium' ? 'badge-yellow' : 'badge-red'}`}
                    >
                      {t.risk === 'low' ? '🟢 پایین' : t.risk === 'medium' ? '🟡 متوسط' : '🔴 بالا'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenantPerformance.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">دکانی برای نمایش نیست</div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">پرداخت اشتراک — ماه به ماه</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyBar}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
              formatter={(v: unknown) => [`${Number(v).toLocaleString()} ؋`, '']}
            />
            <Legend />
            <Bar dataKey="sales" fill="#6366f1" name="پرداخت" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
