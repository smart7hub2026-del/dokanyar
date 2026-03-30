import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Users, Package, CreditCard, TrendingUp,
  AlertTriangle, PlusCircle, ArrowUpRight, ArrowDownRight,
  Briefcase, FileText, Settings, BarChart3, ClipboardList,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { User, type Product } from '../data/mockData';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import { bookToProductForSale } from '../utils/bookInventory';

interface Props { currentUser: User; }

const StatCard = ({ icon: Icon, label, value, sub, color, textColor, trend }: any) => (
  <div className="stat-card glass-dark rounded-2xl p-6 card-hover group border border-white/10">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="flex flex-col items-end">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${textColor || 'text-slate-400'}`}>{sub}</span>}
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      <p className="text-slate-200 text-sm font-medium">{label}</p>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-2xl glass-dark hover:bg-white/10 transition-all group border border-white/10"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:-translate-y-1 ${color}`}>
      <Icon size={24} />
    </div>
    <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{label}</span>
  </button>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark rounded-xl p-4 border border-white/10 shadow-2xl">
        <p className="text-slate-300 text-xs font-bold mb-2 border-b border-white/5 pb-2 uppercase tracking-widest">{label}</p>
        <div className="space-y-2">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-8">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
              <span className="text-xs font-black text-white">{p.value.toLocaleString()} ؋</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ShopDashboard({ currentUser }: Props) {
  const { t } = useApp();
  const navigate = useNavigate();
  const products = useStore(s => s.products);
  const books = useStore(s => s.books);
  const shopSettings = useStore(s => s.shopSettings);
  const invoices = useStore(s => s.invoices);
  const debts = useStore(s => s.debts);
  const expenses = useStore(s => s.expenses);

  const todayStr = new Date().toISOString().slice(0, 10);

  const todaySales = useMemo(
    () => invoices.filter(i => i.invoice_date === todayStr).reduce((s, i) => s + i.total, 0),
    [invoices, todayStr]
  );

  const isBookstore = shopSettings.business_type === 'bookstore';

  const lowStock = useMemo(() => {
    if (isBookstore) {
      return books.filter((b) => b.stock_shop <= b.min_stock && b.is_active).map(bookToProductForSale);
    }
    return products.filter((p) => p.stock_shop <= p.min_stock && p.is_active);
  }, [isBookstore, books, products]);

  const overdueDebts = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return debts.filter(d => {
      if (d.remaining_amount <= 0) return false;
      if (!d.due_date) return false;
      const due = new Date(d.due_date);
      due.setHours(0, 0, 0, 0);
      return due < t;
    });
  }, [debts]);

  const totalDebts = useMemo(
    () => debts.filter(d => d.remaining_amount > 0).reduce((s, d) => s + d.remaining_amount, 0),
    [debts]
  );

  const overdueDebtTotal = useMemo(
    () => overdueDebts.reduce((s, d) => s + d.remaining_amount, 0),
    [overdueDebts]
  );

  const monthProfit = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthInv = invoices
      .filter(i => {
        const d = new Date(i.invoice_date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((s, i) => s + i.total, 0);
    const monthExp = expenses
      .filter(e => {
        const d = new Date(e.date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((s, e) => s + e.amount, 0);
    return monthInv - monthExp;
  }, [invoices, expenses]);

  const salesChartData = useMemo(() => {
    const out: { name: string; sales: number; cost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const sales = invoices.filter(inv => inv.invoice_date === ds).reduce((s, x) => s + x.total, 0);
      const cost = expenses.filter(ex => ex.date === ds).reduce((s, x) => s + x.amount, 0);
      out.push({
        name: d.toLocaleDateString('fa-IR', { weekday: 'short' }),
        sales,
        cost,
      });
    }
    return out;
  }, [invoices, expenses]);

  const topSellingData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const qtyByProduct = new Map<number, number>();
    for (const inv of invoices) {
      if (new Date(inv.invoice_date) < cutoff) continue;
      for (const it of inv.items) {
        qtyByProduct.set(it.product_id, (qtyByProduct.get(it.product_id) || 0) + it.quantity);
      }
    }
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const rows = [...qtyByProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid, q], i) => {
        let label = `کالا ${pid}`;
        if (isBookstore) {
          const b = books.find((x) => x.id === pid);
          label = b?.title || label;
        } else {
          const p = products.find((x) => x.id === pid);
          label = p?.name || label;
        }
        return {
          name: label.slice(0, 22),
          value: q,
          color: colors[i % colors.length],
        };
      });
    return rows.length > 0
      ? rows
      : [{ name: 'هنوز فروشی ثبت نشده', value: 0, color: '#64748b' }];
  }, [invoices, products, books, isBookstore]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || '') || b.id - a.id)
      .slice(0, 5);
  }, [invoices]);

  const productTableRows = useMemo(() => {
    const activeCatalog: Product[] = isBookstore
      ? books.filter((b) => b.is_active).map(bookToProductForSale)
      : products.filter((p) => p.is_active);
    if (lowStock.length > 0) {
      return lowStock.slice(0, 8).map((p) => ({ ...p, rowKind: 'low' as const }));
    }
    return activeCatalog
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
      .slice(0, 8)
      .map((p) => ({ ...p, rowKind: 'normal' as const }));
  }, [lowStock, products, books, isBookstore]);

  return (
    <div className="space-y-8 fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('welcome_message')}، {currentUser.full_name}</h1>
          <p className="text-slate-200 text-sm mt-1 font-medium flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-300" /> فقط از روی داده‌های همین دکان در سیستم — بدون پیش‌فرض نمونه
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-dark rounded-xl px-4 py-2 flex items-center gap-2 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-black">فعال</span>
          </div>
          <button className="p-2 rounded-xl glass-dark text-slate-300 hover:text-white transition-colors border border-white/10">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <QuickAction icon={PlusCircle} label="فروش جدید" color="bg-indigo-600 shadow-indigo-500/20" onClick={() => navigate('/sales')} />
        <QuickAction icon={Package} label="کالاها" color="bg-blue-600 shadow-blue-500/20" onClick={() => navigate('/products')} />
        <QuickAction icon={Users} label="مشتریان" color="bg-emerald-600 shadow-emerald-500/20" onClick={() => navigate('/customers')} />
        <QuickAction icon={FileText} label="فاکتورها" color="bg-teal-600 shadow-teal-500/20" onClick={() => navigate('/invoices')} />
        <QuickAction icon={BarChart3} label={t('product_sales_ranking')} color="bg-violet-600 shadow-violet-500/20" onClick={() => navigate('/product-sales-ranking')} />
        <QuickAction icon={ClipboardList} label={t('reorder_list_title')} color="bg-amber-600 shadow-amber-500/20" onClick={() => navigate('/reorder-list')} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={ShoppingCart} label="فروش امروز" 
          value={`${todaySales.toLocaleString()} ؋`} 
          sub="از فاکتورهای ثبت‌شده"
          color="bg-gradient-to-br from-indigo-500 to-blue-600" 
        />
        <StatCard 
          icon={TrendingUp} label="سود خالص ماهانه (تقریبی)" 
          value={`${monthProfit.toLocaleString()} ؋`} 
          sub="فروش ماه − هزینه‌های ماه"
          color="bg-gradient-to-br from-emerald-500 to-teal-600" 
        />
        <StatCard 
          icon={Package} label="کم‌موجودی (فروشگاه)" 
          value={String(lowStock.length)} 
          sub={lowStock.length > 0 ? 'زیر حداقل تعیین‌شده' : 'بدون هشدار موجودی'} 
          textColor={lowStock.length > 0 ? 'text-amber-400' : 'text-emerald-400'} 
          color="bg-gradient-to-br from-amber-500 to-orange-600" 
        />
        <StatCard 
          icon={CreditCard} label="بدهی معوق" 
          value={`${overdueDebtTotal.toLocaleString()} ؋`} 
          sub={overdueDebts.length > 0 ? `${overdueDebts.length} فقره سررسید گذشته` : totalDebts > 0 ? 'بدون معوق؛ بدهی باز دارد' : 'بدون بدهی باز'} 
          textColor="text-rose-400" 
          color="bg-gradient-to-br from-rose-500 to-red-600" 
        />
      </div>

      {/* Main Content: Charts & Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 glass-dark rounded-3xl p-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-white text-lg font-black tracking-tight">نمودار فروش و هزینه</h3>
              <p className="text-slate-300 text-xs mt-1 font-medium">تحلیل عملکرد در ۷ روز گذشته</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                <span className="text-slate-200 text-[10px] font-bold uppercase tracking-widest">فروش</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
                <span className="text-slate-200 text-[10px] font-bold uppercase tracking-widest">هزینه</span>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesChartData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} 
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} 
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 2 }} />
              <Area 
                type="monotone" 
                dataKey="sales" 
                name="فروش" 
                stroke="#10b981" 
                strokeWidth={3} 
                fill="url(#salesGrad)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="cost" 
                name="هزینه" 
                stroke="#f59e0b" 
                strokeWidth={3} 
                fill="url(#costGrad)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="glass-dark rounded-3xl p-6 border border-white/10 flex flex-col">
          <div className="mb-8">
            <h3 className="text-white text-lg font-black tracking-tight">پرفروش‌ترین کالاها</h3>
            <p className="text-slate-300 text-xs mt-1 font-medium">۳۰ روز اخیر — تعداد فروش</p>
          </div>
          
          <div className="flex flex-1 flex-col justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topSellingData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="glass-dark px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase">
                          {payload[0].value} واحد
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {topSellingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock & Recent Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Invoices Table */}
        <div className="glass-dark rounded-3xl p-6 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-lg font-black tracking-tight">آخرین فاکتورهای فروش</h3>
            <button type="button" onClick={() => navigate('/invoices')} className="text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors">مشاهده همه</button>
          </div>
          <div className="space-y-4">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-black">{inv.customer_name}</p>
                    <p className="text-slate-300 text-[10px] font-bold mt-0.5">{inv.invoice_number} • {inv.invoice_date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-black">{inv.total.toLocaleString()} ؋</p>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 ${inv.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {inv.payment_method === 'cash' ? 'نقد' : 'نسیه'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-3 text-lg font-black tracking-tight text-white">
              {lowStock.length > 0 ? (
                <>
                  <AlertTriangle size={20} className="text-rose-500" />
                  کم‌موجودی فروشگاه
                </>
              ) : (
                <>
                  <Package size={20} className="text-indigo-400" />
                  نمونه کالاها
                </>
              )}
            </h3>
            <button type="button" onClick={() => navigate('/products')} className="text-xs font-bold text-indigo-300 transition-colors hover:text-indigo-200">
              مدیریت کالا
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-300">
                  <th className="pb-3 text-right font-black">نام</th>
                  <th className="pb-3 text-center font-black">کد</th>
                  <th className="pb-3 text-center font-black">موجودی</th>
                  <th className="pb-3 text-left font-black">قیمت فروش</th>
                  <th className="pb-3 text-left font-black">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {productTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      کالایی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  productTableRows.map(p => (
                    <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 text-sm font-bold text-white">{p.name}</td>
                      <td className="py-3 text-center font-mono text-xs text-slate-400">{p.product_code}</td>
                      <td className="py-3 text-center text-sm text-slate-200">
                        <span className={p.rowKind === 'low' ? 'font-black text-rose-400' : ''}>{p.stock_shop}</span>
                        {p.rowKind === 'low' ? <span className="mr-1 text-[10px] text-slate-500">/{p.min_stock}</span> : null}
                      </td>
                      <td className="py-3 text-left text-sm font-semibold text-emerald-400">{p.sale_price.toLocaleString()} ؋</td>
                      <td className="py-3 text-left">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            p.rowKind === 'low'
                              ? p.stock_shop === 0
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                              : p.is_active
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {p.rowKind === 'low' ? (p.stock_shop === 0 ? 'ناموجود' : 'کم‌موجودی') : p.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
