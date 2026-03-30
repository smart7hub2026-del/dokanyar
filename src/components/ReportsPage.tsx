import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, Users, Filter, Calendar } from 'lucide-react';
import { useToast } from './Toast';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: 12 };
const fmt = (v: unknown) => [`${Number(v).toLocaleString()} ؋`, ''];

export default function ReportsPage() {
  const { formatPrice, t } = useApp();
  const { success } = useToast();
  const invoices = useStore(s => s.invoices);
  const customers = useStore(s => s.customers);
  const products = useStore(s => s.products);
  const debts = useStore(s => s.debts);
  const expenses = useStore(s => s.expenses);

  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'debts' | 'customers'>('sales');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const filteredInvoices = useMemo(
    () => invoices.filter(i => i.invoice_date >= dateFrom && i.invoice_date <= dateTo),
    [invoices, dateFrom, dateTo]
  );

  const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const totalDebts = debts.reduce((s, d) => s + d.remaining_amount, 0);
  const avgSale = filteredInvoices.length ? totalSales / filteredInvoices.length : 0;

  const salesChartData = useMemo(() => {
    const out: { name: string; sales: number; cost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dateTo);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const sales = filteredInvoices.filter(inv => inv.invoice_date === ds).reduce((s, x) => s + x.total, 0);
      const cost = expenses.filter(ex => ex.date === ds).reduce((s, x) => s + x.amount, 0);
      out.push({ name: d.toLocaleDateString('fa-IR', { weekday: 'short' }), sales, cost });
    }
    return out;
  }, [filteredInvoices, expenses, dateTo]);

  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const inv of invoices) {
      const k = inv.invoice_date.slice(0, 7);
      byMonth.set(k, (byMonth.get(k) || 0) + inv.total);
    }
    const keys = [...byMonth.keys()].sort().slice(-8);
    return keys.map(k => ({ name: k, sales: byMonth.get(k) || 0 }));
  }, [invoices]);

  const catData = useMemo(() => {
    const catTotals = new Map<string, number>();
    for (const inv of filteredInvoices) {
      for (const it of inv.items) {
        const prod = products.find(p => p.id === it.product_id);
        const cat = prod?.category_name || 'سایر';
        catTotals.set(cat, (catTotals.get(cat) || 0) + it.total_price);
      }
    }
    const sum = [...catTotals.values()].reduce((a, b) => a + b, 0) || 1;
    const rows = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, v]) => ({ name, value: Math.max(1, Math.round((v / sum) * 100)) }));
    return rows.length ? rows : [{ name: 'بدون فروش در بازه', value: 100 }];
  }, [filteredInvoices, products]);

  const debtData = useMemo(
    () =>
      [...debts]
        .filter(d => d.remaining_amount > 0)
        .sort((a, b) => b.remaining_amount - a.remaining_amount)
        .slice(0, 10)
        .map(d => ({ name: d.customer_name.slice(0, 14), amount: d.remaining_amount })),
    [debts]
  );

  const customerData = useMemo(
    () =>
      [...customers]
        .sort((a, b) => b.total_purchases - a.total_purchases)
        .slice(0, 8)
        .map(c => ({
          name: c.name.split(' ')[0] || c.name,
          خرید: c.total_purchases,
          بدهی: Math.abs(Math.min(0, c.balance)),
        })),
    [customers]
  );

  const maxPurchase = useMemo(
    () => Math.max(1, ...customers.map(c => c.total_purchases)),
    [customers]
  );

  const axisStyle = { fill: '#94a3b8', fontSize: 11 };
  const gridColor = 'rgba(255,255,255,0.06)';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('reports')}</h1>
          <p className="text-slate-400 text-sm mt-1">تحلیل و بررسی عملکرد</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => success('Excel آماده شد', 'فایل در حال دانلود است...')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-sm transition-all">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => success('PDF آماده شد', 'فایل در حال دانلود است...')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 text-sm transition-all">
            <FileText size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'کل فروش (بازه)', value: formatPrice(totalSales), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'کل مانده بدهی', value: formatPrice(totalDebts), icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'میانگین فاکتور', value: formatPrice(avgSale), icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'مشتریان فعال', value: String(customers.filter(c => c.status === 'active').length), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass rounded-2xl p-5 stat-card">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <p className={`text-xl font-bold mt-3 ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-slate-400" />
          <div className="flex gap-1 glass rounded-xl p-1">
            {[['sales', 'فروش'], ['inventory', 'موجودی'], ['debts', 'بدهی'], ['customers', 'مشتریان']].map(([v, l]) => (
              <button key={v} onClick={() => setReportType(v as 'sales' | 'inventory' | 'debts' | 'customers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${reportType === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar size={13} />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs" />
            <span>تا</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs" />
          </div>
        </div>
      </div>

      {/* Charts */}
      {reportType === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">فروش هفتگی</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={v => `${(Number(v)/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="sales" name="فروش" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cost" name="هزینه" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">روند ماهانه</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={v => `${(Number(v)/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
                <Line type="monotone" dataKey="sales" name="فروش" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">فروش بر اساس دسته</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ ...tooltipStyle }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {catData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-300 text-xs">{item.name}</span>
                    </div>
                    <span className="text-white font-bold text-xs">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">آخرین فاکتورها</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredInvoices.slice(0, 20).map(inv => (
                <div key={inv.id} className="flex justify-between bg-slate-800/40 rounded-xl px-3 py-2">
                  <div><p className="text-white text-xs font-bold">{inv.invoice_number}</p><p className="text-slate-400 text-xs">{inv.customer_name}</p></div>
                  <div className="text-right"><p className="text-emerald-400 font-bold text-xs">{inv.total.toLocaleString()} ؋</p><p className="text-slate-500 text-xs">{inv.invoice_date}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-white font-semibold mb-4 text-sm">وضعیت موجودی محصولات</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={products.slice(0, 12).map(p => ({ name: p.name.substring(0, 10), فروشگاه: p.stock_shop, انبار: p.stock_warehouse, حداقل: p.min_stock }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 9 }} />
                <YAxis tick={axisStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="فروشگاه" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="انبار" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="حداقل" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">محصولات کم‌موجودی</h3>
            <div className="space-y-2">
              {products.filter(p => p.stock_shop <= p.min_stock).map(p => (
                <div key={p.id} className="flex justify-between bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <div><p className="text-white text-xs">{p.name}</p><p className="text-slate-400 text-xs">حداقل: {p.min_stock}</p></div>
                  <span className="text-rose-400 font-bold">{p.stock_shop}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">آمار موجودی</h3>
            <div className="space-y-3">
              {[['کل محصولات', products.length, 'text-white'], ['فعال', products.filter(p => p.is_active).length, 'text-emerald-400'], ['کم‌موجودی', products.filter(p => p.stock_shop <= p.min_stock).length, 'text-amber-400'], ['اتمام موجودی', products.filter(p => p.stock_shop === 0).length, 'text-rose-400']].map(([l, v, c]) => (
                <div key={String(l)} className="flex justify-between"><span className="text-slate-400 text-sm">{l}</span><span className={`font-bold text-lg ${c}`}>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportType === 'debts' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">بدهی مشتریان</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={debtData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={axisStyle} tickFormatter={v => `${(Number(v)/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={axisStyle} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
                <Bar dataKey="amount" name="مانده" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10"><h3 className="text-white font-semibold text-sm">جزئیات بدهی‌ها</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-800/50">{['مشتری', 'مبلغ', 'پرداخت', 'مانده', 'وضعیت', 'سررسید'].map(h => <th key={h} className="text-right text-slate-400 text-xs py-3 px-4">{h}</th>)}</tr></thead>
                <tbody>
                  {debts.map(d => (
                    <tr key={d.id} className="border-t border-white/5 table-row-hover">
                      <td className="py-3 px-4 text-white text-xs">{d.customer_name}</td>
                      <td className="py-3 px-4 text-slate-300 text-xs">{d.amount.toLocaleString()} ؋</td>
                      <td className="py-3 px-4 text-emerald-400 text-xs">{d.paid_amount.toLocaleString()} ؋</td>
                      <td className="py-3 px-4 text-rose-400 font-bold text-xs">{d.remaining_amount.toLocaleString()} ؋</td>
                      <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'overdue' ? 'badge-red' : d.status === 'partial' ? 'badge-yellow' : 'badge-blue'}`}>{d.status === 'overdue' ? 'معوق' : d.status === 'partial' ? 'جزئی' : 'انتظار'}</span></td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{d.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-white font-semibold mb-4 text-sm">خرید و بدهی مشتریان</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={customerData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={v => `${(Number(v)/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="خرید" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="بدهی" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">برترین مشتریان</h3>
            <div className="space-y-2">
              {[...customers].sort((a, b) => b.total_purchases - a.total_purchases).slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-3 py-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : 'bg-slate-700 text-white'}`}>{i + 1}</span>
                  <div className="flex-1"><p className="text-white text-xs">{c.name}</p><div className="w-full bg-slate-700 rounded-full h-1 mt-1"><div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${(c.total_purchases / maxPurchase) * 100}%` }} /></div></div>
                  <span className="text-emerald-400 font-bold text-xs">{(c.total_purchases/1000).toFixed(0)}K ؋</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">آمار مشتریان</h3>
            <div className="space-y-4">
              {[['کل', customers.length, '#6366f1'], ['فعال', customers.filter(c => c.status === 'active').length, '#22c55e'], ['بدهکار', customers.filter(c => c.balance < 0).length, '#ef4444'], ['بستانکار', customers.filter(c => c.balance > 0).length, '#f59e0b']].map(([l, v, color]) => (
                <div key={String(l)}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{l}</span><span className="text-white font-bold">{v}</span></div>
                  <div className="h-1.5 bg-slate-700 rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${customers.length ? (Number(v) / customers.length) * 100 : 0}%`, background: String(color) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
