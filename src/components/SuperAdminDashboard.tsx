import { useEffect, useState, useMemo, useCallback } from 'react';
import { Building2, AlertCircle, CheckCircle, DollarSign, Users, TrendingUp, CreditCard, Database, ScrollText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useStore } from '../store/useStore';
import {
  apiGetTenants,
  apiGetSubscriptionPayments,
  apiMasterPlatformBackup,
  apiMasterLoginAudit,
  type Tenant,
} from '../services/api';

const StatCard = ({ icon: Icon, label, value, sub, color, subColor }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string; subColor?: string }) => (
  <div className="stat-card glass rounded-2xl p-5 card-hover">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      {sub && <span className={`text-xs px-2 py-1 rounded-full ${subColor || 'badge-green'}`}>{sub}</span>}
    </div>
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-slate-400 text-sm">{label}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark rounded-xl p-3 text-sm">
        <p className="text-slate-300 mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString()}</p>
        ))}
      </div>
    );
  }
  return null;
};

type SubPayment = { amount?: number; created_at?: string; shop_code?: string };

export default function SuperAdminDashboard() {
  const authToken = useStore(s => s.authToken);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<SubPayment[]>([]);
  const [loadError, setLoadError] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>([]);
  const [auditError, setAuditError] = useState('');
  const [opsBusy, setOpsBusy] = useState(false);

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
    return () => { canceled = true; };
  }, [authToken]);

  const handlePlatformBackup = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    setOpsBusy(true);
    setBackupMsg('');
    try {
      const r = await apiMasterPlatformBackup(tok);
      setBackupMsg(`پشتیبان ذخیره شد: ${r.path}`);
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : 'خطا در پشتیبان');
    } finally {
      setOpsBusy(false);
    }
  }, [authToken]);

  const loadLoginAudit = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    setOpsBusy(true);
    setAuditError('');
    try {
      const r = await apiMasterLoginAudit(80, tok);
      setAuditRows(Array.isArray(r.entries) ? r.entries : []);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'خطا در دریافت لاگ');
      setAuditRows([]);
    } finally {
      setOpsBusy(false);
    }
  }, [authToken]);

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const expiredTenants = tenants.filter(t => t.subscription_status === 'expired').length;
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalUsers = tenants.reduce((s, t) => s + Number(t.users_count || 0), 0);
  const premiumTenants = tenants.filter(t => t.subscription_plan === 'premium').length;
  const salesToday = tenants.reduce((s, t) => s + Number(t.sales_today || 0), 0);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { sales: number; tenants: number }>();
    payments.forEach((pay) => {
      const at = String(pay.created_at || '').slice(0, 7);
      if (at.length < 7) return;
      const cur = byMonth.get(at) || { sales: 0, tenants: 0 };
      cur.sales += Number(pay.amount || 0);
      byMonth.set(at, cur);
    });
    const keys = [...byMonth.keys()].sort().slice(-8);
    if (keys.length === 0) {
      const now = new Date();
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { name: d.toISOString().slice(0, 7), sales: 0, tenants: 0 };
      });
    }
    return keys.map((k) => ({
      name: k,
      sales: byMonth.get(k)!.sales,
      tenants: Math.max(1, Math.round(byMonth.get(k)!.sales / 50000)),
    }));
  }, [payments]);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">داشبورد ابرادمین</h1>
        <p className="text-slate-400 text-sm mt-1">دادهٔ زنده از API پلتفرم (دکان‌ها و پرداخت‌های اشتراک)</p>
        {loadError && <p className="text-rose-400 text-xs mt-2">{loadError}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="کل دکان‌ها" value={String(tenants.length)} sub={`${activeTenants} فعال`} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
        <StatCard icon={CheckCircle} label="دکان‌های فعال" value={String(activeTenants)} sub={`${premiumTenants} پریمیوم`} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard icon={AlertCircle} label="اشتراک منقضی" value={String(expiredTenants)} sub="پیگیری" subColor="badge-red" color="bg-gradient-to-br from-rose-500 to-rose-600" />
        <StatCard icon={DollarSign} label="جمع پرداخت‌های ثبت‌شده" value={`${totalRevenue.toLocaleString()} ؋`} color="bg-gradient-to-br from-amber-500 to-amber-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="کاربران (جمع users_count)" value={String(totalUsers)} color="bg-gradient-to-br from-purple-500 to-purple-600" />
        <StatCard icon={TrendingUp} label="فروش امروز (جمع sales_today)" value={`${salesToday.toLocaleString()} ؋`} color="bg-gradient-to-br from-teal-500 to-teal-600" />
        <StatCard icon={CreditCard} label="رکورد پرداخت اشتراک" value={String(payments.length)} color="bg-gradient-to-br from-pink-500 to-pink-600" />
        <StatCard icon={Building2} label="طرح پریمیوم" value={String(premiumTenants)} sub={`از ${tenants.length || 1} دکان`} color="bg-gradient-to-br from-cyan-600 to-cyan-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">درآمد اشتراک (ماه)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGradSa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" name="مبلغ" stroke="#6366f1" strokeWidth={2} fill="url(#salesGradSa)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">دکان‌های جدید (شاخص ماهانه)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tenants" name="شاخص" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">دکان‌ها</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['نام', 'کد', 'مالک', 'طرح', 'پایان اشتراک', 'فروش امروز', 'وضعیت'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map(t => (
                <tr key={String(t.id)} className="table-row-hover">
                  <td className="py-3 px-3">
                    <p className="text-white font-medium">{t.shop_name}</p>
                    <p className="text-slate-500 text-xs">{t.shop_domain || t.shop_code}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-xs">{t.shop_code}</td>
                  <td className="py-3 px-3 text-slate-300 text-sm">{t.owner_name}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${t.subscription_plan === 'premium' ? 'badge-purple' : 'badge-blue'}`}>
                      {t.subscription_plan === 'premium' ? 'پریمیوم' : 'پایه'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs">{t.subscription_end}</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">{Number(t.sales_today || 0).toLocaleString()} ؋</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'active' ? 'badge-green' : t.status === 'suspended' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {t.status === 'active' ? 'فعال' : t.status === 'suspended' ? 'معلق' : 'غیرفعال'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && !loadError && (
            <p className="text-slate-500 text-sm text-center py-8">دکانی ثبت نشده یا توکن نامعتبر است.</p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-emerald-500/10">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Database size={18} className="text-emerald-400" /> عملیات پلتفرم
        </h3>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          کپی SQLite به <span className="font-mono text-slate-300">server/backups</span>؛ لاگ ورودهای موفق (رمز، گوگل، ۲FA، آزمایشی سریع).
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={() => void handlePlatformBackup()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <Database size={16} /> پشتیبان پایگاه داده
          </button>
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={() => void loadLoginAudit()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <ScrollText size={16} /> نمایش لاگ ورود
          </button>
        </div>
        {backupMsg && (
          <p className={`text-xs mt-3 font-medium ${backupMsg.includes('خطا') ? 'text-rose-400' : 'text-emerald-400'}`}>{backupMsg}</p>
        )}
        {auditError && <p className="text-rose-400 text-xs mt-3">{auditError}</p>}
        {auditRows.length > 0 && (
          <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800/95">
                <tr className="text-slate-400 text-right border-b border-white/10">
                  <th className="py-2 px-2">زمان</th>
                  <th className="py-2 px-2">دکان</th>
                  <th className="py-2 px-2">نقش</th>
                  <th className="py-2 px-2">روش</th>
                  <th className="py-2 px-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {auditRows.map((row) => (
                  <tr key={String(row.id ?? row.created_at)}>
                    <td className="py-1.5 px-2 whitespace-nowrap">{String(row.created_at || '').slice(0, 19)}</td>
                    <td className="py-1.5 px-2 font-mono">{String(row.shop_code || '')}</td>
                    <td className="py-1.5 px-2">{String(row.role || '')}</td>
                    <td className="py-1.5 px-2">{String(row.method || '')}</td>
                    <td className="py-1.5 px-2 font-mono text-[10px]">{String(row.ip || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
