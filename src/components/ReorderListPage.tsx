import { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Plus, Printer, Trash2, Package } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import type { Product } from '../data/mockData';
import { bookToProductForSale } from '../utils/bookInventory';

function printReorderList(params: {
  critical: Product[];
  manual: { id: number; name: string; note?: string; quantity_hint?: number; created_at: string }[];
  shopName: string;
  printedAt: string;
}) {
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const rowsCrit = params.critical
    .map(
      p => `<tr>
    <td>${esc(p.name)}</td>
    <td>${esc(p.product_code)}</td>
    <td>${esc(p.category_name)}</td>
    <td style="text-align:center">${p.stock_shop}</td>
    <td style="text-align:center">${p.min_stock}</td>
    <td>${p.stock_shop === 0 ? 'تمام شده' : 'زیر حد'}</td>
  </tr>`
    )
    .join('');
  const rowsMan = params.manual
    .map(
      m => `<tr>
    <td>${esc(m.name)}</td>
    <td style="text-align:center">${m.quantity_hint ?? '—'}</td>
    <td>${esc(m.note || '—')}</td>
    <td>${esc(m.created_at)}</td>
  </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>لیست خرید بعدی</title>
<style>
  body { font-family: Tahoma, sans-serif; font-size: 12px; padding: 16mm; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #555; margin-bottom: 16px; }
  h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
  th { background: #f0f0f0; }
</style></head><body>
<h1>لیست تأمین و خرید بعدی</h1>
<div class="sub">${esc(params.shopName)} — چاپ: ${esc(params.printedAt)}</div>
<h2>۱) کالاهای اتمام / کم‌موجودی (اولویت بالا)</h2>
<table>
  <thead><tr><th>نام</th><th>کد</th><th>دسته</th><th>موجودی فروشگاه</th><th>حداقل</th><th>وضعیت</th></tr></thead>
  <tbody>${rowsCrit || '<tr><td colspan="6" style="text-align:center">موردی نیست</td></tr>'}</tbody>
</table>
<h2>۲) اقلام دستی (برای خرید بعدی)</h2>
<table>
  <thead><tr><th>نام</th><th>تعداد تقریبی</th><th>یادداشت</th><th>تاریخ ثبت</th></tr></thead>
  <tbody>${rowsMan || '<tr><td colspan="4" style="text-align:center">موردی اضافه نشده</td></tr>'}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export default function ReorderListPage() {
  const { t, isDark } = useApp();
  const products = useStore(s => s.products);
  const books = useStore(s => s.books);
  const shopSettings = useStore(s => s.shopSettings);
  const manual = useStore(s => s.procurementManualLines);
  const addManual = useStore(s => s.addProcurementManualLine);
  const deleteManual = useStore(s => s.deleteProcurementManualLine);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [qtyHint, setQtyHint] = useState('');

  const critical = useMemo(() => {
    const pool: Product[] =
      shopSettings.business_type === 'bookstore'
        ? books.filter((b) => b.is_active).map(bookToProductForSale)
        : products.filter((p) => p.is_active);
    return pool
      .filter((p) => p.stock_shop === 0 || p.stock_shop <= p.min_stock)
      .sort((a, b) => {
        if (a.stock_shop === 0 && b.stock_shop !== 0) return -1;
        if (b.stock_shop === 0 && a.stock_shop !== 0) return 1;
        return a.stock_shop - b.stock_shop;
      });
  }, [products, books, shopSettings.business_type]);

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-slate-400' : 'text-slate-600';
  const card = isDark ? 'glass rounded-2xl border border-white/10' : 'bg-white border border-slate-200 rounded-2xl shadow-sm';
  const input = isDark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white'
    : 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

  const handleAddManual = () => {
    const n = name.trim();
    if (!n) return;
    addManual({
      name: n,
      note: note.trim() || undefined,
      quantity_hint: qtyHint === '' ? undefined : Math.max(0, Math.floor(Number(qtyHint) || 0)),
    });
    setName('');
    setNote('');
    setQtyHint('');
  };

  return (
    <div className="fade-in space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className={`text-2xl font-bold ${textMain} flex items-center gap-2`}>
            <ClipboardList className="text-amber-400" size={26} />
            {t('reorder_list_title')}
          </h1>
          <p className={`mt-1 text-sm ${sub}`}>
            کالاهای تمام‌شده یا زیر حد در ابتدای لیست؛ می‌توانید اقلام دیگر را برای خرید بعدی دستی اضافه کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            printReorderList({
              critical,
              manual,
              shopName: shopSettings.shop_name || 'فروشگاه',
              printedAt: new Date().toLocaleString('fa-IR'),
            })
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
        >
          <Printer size={18} /> چاپ لیست
        </button>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className={`flex items-center gap-2 border-b px-4 py-3 ${isDark ? 'border-white/10 bg-rose-950/20' : 'border-rose-100 bg-rose-50'}`}>
          <AlertTriangle className="text-rose-500" size={20} />
          <h2 className={`font-bold ${textMain}`}>اولویت: اتمام یا کم‌موجودی فروشگاه</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-white/10 text-slate-400' : 'border-b border-slate-200 text-slate-600'}>
                <th className="py-3 px-3 text-right font-semibold">نام</th>
                <th className="py-3 px-3 text-right font-semibold">کد</th>
                <th className="py-3 px-3 text-right font-semibold">دسته</th>
                <th className="py-3 px-3 text-center font-semibold">موجودی</th>
                <th className="py-3 px-3 text-center font-semibold">حداقل</th>
                <th className="py-3 px-3 text-left font-semibold">وضعیت</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {critical.map(p => (
                <tr key={p.id} className={isDark ? 'bg-rose-950/10 hover:bg-rose-950/20' : 'bg-rose-50/40 hover:bg-rose-50'}>
                  <td className={`px-3 py-2.5 font-medium ${textMain}`}>{p.name}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs ${sub}`}>{p.product_code}</td>
                  <td className={`px-3 py-2.5 text-xs ${sub}`}>{p.category_name}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-rose-500">{p.stock_shop}</td>
                  <td className={`px-3 py-2.5 text-center ${sub}`}>{p.min_stock}</td>
                  <td className="px-3 py-2.5 text-left">
                    <span className="rounded-lg bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-500">
                      {p.stock_shop === 0 ? 'تمام شده' : 'زیر حد'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {critical.length === 0 && (
            <div className={`flex flex-col items-center gap-2 py-10 ${sub}`}>
              <Package size={32} className="opacity-40" />
              <p className="text-sm">کالایی در وضعیت اتمام یا کم‌موجودی نیست.</p>
            </div>
          )}
        </div>
      </div>

      <div className={`${card} p-4 sm:p-5`}>
        <h2 className={`mb-4 flex items-center gap-2 font-bold ${textMain}`}>
          <Plus size={18} className="text-emerald-400" />
          افزودن قلم دستی (خرید بعدی)
        </h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className={`mb-1 block text-xs ${sub}`}>نام کالا *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: روغن ۵ لیتری" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={`mb-1 block text-xs ${sub}`}>تعداد تقریبی</label>
            <input
              type="number"
              min={0}
              value={qtyHint}
              onChange={e => setQtyHint(e.target.value)}
              placeholder="—"
              className={input}
            />
          </div>
          <div className="sm:col-span-5">
            <label className={`mb-1 block text-xs ${sub}`}>یادداشت</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="برند، سایز، تأمین‌کننده…" className={input} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddManual}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
        >
          <Plus size={16} /> افزودن به جدول
        </button>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className={isDark ? 'border-b border-white/10 text-slate-400' : 'border-b border-slate-200 text-slate-600'}>
                <th className="py-2.5 px-2 text-right font-semibold">نام</th>
                <th className="py-2.5 px-2 text-center font-semibold">تعداد</th>
                <th className="py-2.5 px-2 text-right font-semibold">یادداشت</th>
                <th className="py-2.5 px-2 text-right font-semibold">تاریخ</th>
                <th className="py-2.5 px-2 text-left font-semibold"> </th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {manual.map(m => (
                <tr key={m.id} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                  <td className={`px-2 py-2 font-medium ${textMain}`}>{m.name}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{m.quantity_hint ?? '—'}</td>
                  <td className={`px-2 py-2 text-xs ${sub}`}>{m.note || '—'}</td>
                  <td className={`px-2 py-2 font-mono text-xs ${sub}`}>{m.created_at}</td>
                  <td className="px-2 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => deleteManual(m.id)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {manual.length === 0 && <p className={`py-6 text-center text-sm ${sub}`}>هنوز قلم دستی اضافه نشده است.</p>}
        </div>
      </div>
    </div>
  );
}
