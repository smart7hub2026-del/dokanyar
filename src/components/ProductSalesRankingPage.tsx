import { useMemo, useState } from 'react';
import { BarChart3, Calendar, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import { bookToProductForSale } from '../utils/bookInventory';

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ProductSalesRankingPage() {
  const { t, isDark } = useApp();
  const invoices = useStore(s => s.invoices);
  const products = useStore(s => s.products);
  const books = useStore(s => s.books);
  const businessType = useStore(s => s.shopSettings.business_type);
  const categories = useStore(s => s.categories);

  const catalog = useMemo(() => {
    if (businessType === 'bookstore') {
      return books.filter((b) => b.is_active).map(bookToProductForSale);
    }
    return products;
  }, [businessType, books, products]);

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = addDays(today, -30);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);
  const [categoryId, setCategoryId] = useState<number>(0);

  const rows = useMemo(() => {
    const from = fromDate || '1970-01-01';
    const to = toDate || '2999-12-31';
    const qty = new Map<number, number>();
    const revenue = new Map<number, number>();

    for (const inv of invoices) {
      const d = inv.invoice_date || '';
      if (d < from || d > to) continue;
      for (const it of inv.items) {
        const pid = it.product_id;
        qty.set(pid, (qty.get(pid) || 0) + it.quantity);
        revenue.set(pid, (revenue.get(pid) || 0) + it.total_price);
      }
    }

    const list = products
      .filter(p => (categoryId === 0 || p.category_id === categoryId) && p.is_active)
      .map(p => ({
        id: p.id,
        name: p.name,
        code: p.product_code,
        category: p.category_name,
        quantity: qty.get(p.id) || 0,
        amount: revenue.get(p.id) || 0,
      }))
      .sort((a, b) => b.quantity - a.quantity || b.amount - a.amount);

    return list.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [invoices, catalog, fromDate, toDate, categoryId]);

  const chartData = useMemo(() => {
    return rows
      .filter(r => r.quantity > 0)
      .slice(0, 12)
      .map(r => ({
        name: r.name.length > 14 ? r.name.slice(0, 14) + '…' : r.name,
        qty: r.quantity,
      }));
  }, [rows]);

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-slate-400' : 'text-slate-600';
  const card = isDark ? 'glass rounded-2xl border border-white/10' : 'bg-white border border-slate-200 rounded-2xl shadow-sm';

  return (
    <div className="fade-in space-y-6 pb-10">
      <div>
        <h1 className={`text-2xl font-bold ${textMain} flex items-center gap-2`}>
          <BarChart3 className="text-indigo-400" size={26} />
          {t('product_sales_ranking')}
        </h1>
        <p className={`mt-1 text-sm ${sub}`}>
          بر اساس فاکتورهای ثبت‌شده در بازه تاریخ؛ پرفروش در بالای جدول، کم‌فروش در پایین.
        </p>
      </div>

      <div className={`${card} p-4 sm:p-5`}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className={`mb-1 flex items-center gap-1 text-xs font-medium ${sub}`}>
              <Calendar size={12} /> از تاریخ
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'
              }`}
            />
          </div>
          <div>
            <label className={`mb-1 flex items-center gap-1 text-xs font-medium ${sub}`}>
              <Calendar size={12} /> تا تاریخ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'
              }`}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className={`mb-1 flex items-center gap-1 text-xs font-medium ${sub}`}>
              <Filter size={12} /> دسته‌بندی
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(+e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'
              }`}
            >
              <option value={0}>همه دسته‌ها</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="mb-8 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff18' : '#e2e8f0'} horizontal={false} />
                <XAxis type="number" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                />
                <Bar dataKey="qty" name="تعداد فروش" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'][i % 12]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={`mb-6 text-center text-sm ${sub}`}>در این بازه فروشی برای نمودار ثبت نشده است.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-white/10 text-slate-400' : 'border-b border-slate-200 text-slate-600'}>
                <th className="py-3 pr-2 text-right font-semibold">رتبه</th>
                <th className="py-3 px-2 text-right font-semibold">نام کالا</th>
                <th className="py-3 px-2 text-right font-semibold">کد</th>
                <th className="py-3 px-2 text-right font-semibold">دسته</th>
                <th className="py-3 px-2 text-center font-semibold">تعداد فروش</th>
                <th className="py-3 pl-2 text-left font-semibold">مبلغ فروش (؋)</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {rows.map(r => (
                <tr key={r.id} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                  <td className={`py-2.5 pr-2 font-mono ${sub}`}>{r.rank}</td>
                  <td className={`py-2.5 px-2 font-medium ${textMain}`}>{r.name}</td>
                  <td className={`py-2.5 px-2 font-mono text-xs ${sub}`}>{r.code}</td>
                  <td className={`py-2.5 px-2 text-xs ${sub}`}>{r.category}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums">{r.quantity.toLocaleString()}</td>
                  <td className={`py-2.5 pl-2 text-left tabular-nums font-medium ${r.amount > 0 ? 'text-emerald-500' : sub}`}>
                    {r.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className={`py-8 text-center text-sm ${sub}`}>کالای فعالی در این فیلتر وجود ندارد.</p>}
        </div>
      </div>
    </div>
  );
}
