import { useMemo, useState } from 'react';
import { Warehouse, ArrowDownToLine, Search, Package, Plus, Trash2, Mic, MicOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';
import { useToast } from './Toast';
import type { Product } from '../data/mockData';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { bookToProductForSale } from '../utils/bookInventory';

export default function WarehousePage() {
  const { t, formatPrice, isDark } = useApp();
  const { success, error } = useToast();
  const products = useStore(s => s.products);
  const books = useStore(s => s.books);
  const shopSettings = useStore(s => s.shopSettings);
  const updateProduct = useStore(s => s.updateProduct);
  const updateBook = useStore(s => s.updateBook);
  const warehouses = useStore(s => s.warehouses);
  const addWarehouse = useStore(s => s.addWarehouse);
  const removeWarehouse = useStore(s => s.removeWarehouse);
  const currentUser = useStore(s => s.currentUser);
  const addPendingApproval = useStore(s => s.addPendingApproval);
  const reportStaffActivityToAdmins = useStore(s => s.reportStaffActivityToAdmins);
  const [search, setSearch] = useState('');
  const [moveProduct, setMoveProduct] = useState<Product | null>(null);
  const [moveQty, setMoveQty] = useState('');
  const [newBinName, setNewBinName] = useState('');

  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const catalogProducts = useMemo((): Product[] => {
    if (shopSettings.business_type === 'bookstore') {
      return books.filter((b) => b.is_active).map(bookToProductForSale);
    }
    return products;
  }, [shopSettings.business_type, books, products]);

  const rows = useMemo(() => {
    const q = search.trim();
    return catalogProducts
      .filter(p => p.is_active)
      .filter(p => !q || p.name.includes(q) || p.product_code.includes(q) || (p.barcode && p.barcode.includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [catalogProducts, search]);

  const confirmMoveToShop = () => {
    if (!moveProduct) return;
    const n = Math.floor(Number(moveQty));
    if (!n || n < 1) {
      error('خطا', 'تعداد معتبر وارد کنید');
      return;
    }
    if (n > moveProduct.stock_warehouse) {
      error('خطا', 'موجودی انبار کافی نیست');
      return;
    }
    if (currentUser?.role === 'admin') {
      if (shopSettings.business_type === 'bookstore') {
        const b = books.find((x) => x.id === moveProduct.id);
        if (b) {
          updateBook({
            ...b,
            stock_warehouse: b.stock_warehouse - n,
            stock_shop: b.stock_shop + n,
          });
        }
      } else {
        updateProduct({
          ...moveProduct,
          stock_warehouse: moveProduct.stock_warehouse - n,
          stock_shop: moveProduct.stock_shop + n,
        });
      }
      success('انتقال انجام شد', `${n} واحد از انبار به مغازه`);
    } else {
      addPendingApproval({
        type: 'warehouse_transfer',
        title: `انتقال به مغازه: ${moveProduct.name}`,
        description: `${n} واحد از انبار به مغازه`,
        data: {
          product_id: moveProduct.id,
          product_name: moveProduct.name,
          quantity: n,
        },
        submitted_by: currentUser?.full_name || 'کاربر',
        submitted_by_role: currentUser?.role || '',
      });
      reportStaffActivityToAdmins(
        'درخواست انتقال انبار → مغازه',
        `${currentUser?.full_name} درخواست انتقال ${n} عدد «${moveProduct.name}» به مغازه داد.`,
        currentUser?.id ?? 0,
        currentUser?.full_name || 'کاربر'
      );
      success('ارسال شد', 'تا تأیید مدیر در «تأیید فروش»، موجودی تغییر نمی‌کند.');
    }
    setMoveProduct(null);
    setMoveQty('');
  };

  const handleAddWarehouse = () => {
    const name = newBinName.trim();
    if (!name) {
      error('خطا', 'نام انبار را وارد کنید');
      return;
    }
    addWarehouse(name);
    setNewBinName('');
    success('انبار اضافه شد', name);
  };

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-600';
  const panelClass = isDark ? 'border-white/10 glass' : 'border-slate-200 bg-white shadow-sm';

  return (
    <div className="space-y-6 fade-in" dir="rtl">
      <div>
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${textMain}`}>
          <Warehouse size={26} className="text-amber-400 shrink-0" />
          {t('warehouse_page')}
        </h1>
        <p className={`${textSub} text-sm mt-1 max-w-2xl`}>{t('warehouse_subtitle')}</p>
      </div>

      <div className={`rounded-2xl border p-4 space-y-3 ${panelClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h2 className={`text-sm font-bold ${textMain}`}>انباربندی (چند انبار)</h2>
            <p className={`text-xs mt-0.5 ${textSub}`}>
              نام انبارها برای سازمان‌دهی است؛ موجودی کل همان ستون «انبار» در کالاهاست.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={newBinName}
              onChange={e => setNewBinName(e.target.value)}
              placeholder="نام انبار جدید"
              className={`min-w-[160px] flex-1 sm:flex-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 ${
                isDark ? 'bg-slate-800/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleAddWarehouse}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-500"
            >
              <Plus size={14} /> افزودن انبار
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {warehouses.map(w => (
            <span
              key={w.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                isDark ? 'bg-slate-800/80 border-white/10 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              {w.name}
              {w.id !== 1 && (
                <button
                  type="button"
                  title="حذف"
                  onClick={() => {
                    removeWarehouse(w.id);
                    success('حذف شد', w.name);
                  }}
                  className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search_product')}
          className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none focus:border-indigo-500 ${
            voiceOk ? 'pl-11' : ''
          } ${isDark ? 'bg-slate-800/50 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
        />
        {voiceOk && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`}
            title="جستجوی صوتی"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>

      <div className={`rounded-2xl border overflow-hidden ${panelClass}`}>
        {/* دسکتاپ: جدول */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className={isDark ? 'bg-slate-800/60 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}>
                {['کالا', 'کد', 'موجودی انبار', 'مغازه', 'حداقل', ''].map(h => (
                  <th key={h || 'a'} className={`text-right py-3 px-3 font-medium ${textSub} text-xs`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Package className={`mx-auto mb-2 opacity-30 ${textSub}`} size={40} />
                    <p className={textSub}>کالایی برای نمایش نیست</p>
                  </td>
                </tr>
              ) : (
                rows.map(p => (
                  <tr key={p.id} className={isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}>
                    <td className={`py-3 px-3 font-medium ${textMain} max-w-[200px]`}>
                      <span className="line-clamp-2">{p.name}</span>
                      <span className={`block text-[11px] ${textSub}`}>{p.category_name}</span>
                    </td>
                    <td className={`py-3 px-3 font-mono text-xs ${textSub}`} dir="ltr">
                      {p.product_code}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-400 font-bold tabular-nums">{p.stock_warehouse}</span>
                    </td>
                    <td className={`py-3 px-3 tabular-nums ${textSub}`}>{p.stock_shop}</td>
                    <td className={`py-3 px-3 tabular-nums ${textSub}`}>{p.min_stock}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={p.stock_warehouse <= 0}
                        onClick={() => {
                          setMoveProduct(p);
                          setMoveQty(String(Math.min(1, p.stock_warehouse) || 1));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ArrowDownToLine size={14} />
                        به مغازه
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* موبایل: کارت */}
        <div className={`md:hidden ${isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-200'}`}>
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <Package className={`mx-auto mb-2 opacity-30 ${textSub}`} size={40} />
              <p className={textSub}>کالایی برای نمایش نیست</p>
            </div>
          ) : (
            rows.map(p => (
              <div
                key={p.id}
                className={`p-4 space-y-2 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${textMain} line-clamp-2`}>{p.name}</p>
                    <p className={`text-[11px] ${textSub}`}>{p.category_name}</p>
                  </div>
                  <span className={`font-mono text-[10px] shrink-0 ${textSub}`} dir="ltr">
                    {p.product_code}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>انبار</span>
                    <p className="text-amber-400 font-black tabular-nums">{p.stock_warehouse}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>مغازه</span>
                    <p className={`font-bold tabular-nums ${textMain}`}>{p.stock_shop}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>حداقل</span>
                    <p className={`font-bold tabular-nums ${textSub}`}>{p.min_stock}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={p.stock_warehouse <= 0}
                  onClick={() => {
                    setMoveProduct(p);
                    setMoveQty(String(Math.min(1, p.stock_warehouse) || 1));
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold bg-indigo-600 text-white disabled:opacity-40"
                >
                  <ArrowDownToLine size={14} />
                  انتقال به مغازه
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        open={!!moveProduct}
        onClose={() => {
          setMoveProduct(null);
          setMoveQty('');
        }}
        title={moveProduct ? `انتقال از انبار — ${moveProduct.name}` : ''}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmMoveToShop}
              className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold"
            >
              تأیید انتقال
            </button>
            <button
              type="button"
              onClick={() => {
                setMoveProduct(null);
                setMoveQty('');
              }}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass"
            >
              انصراف
            </button>
          </div>
        }
      >
        {moveProduct ? (
          <div className="space-y-4 text-right">
            <p className="text-slate-400 text-xs">
              موجودی انبار: <strong className="text-amber-300">{moveProduct.stock_warehouse}</strong> — قیمت فروش:{' '}
              {formatPrice(moveProduct.sale_price)}
            </p>
            <div>
              <label className="text-slate-400 text-xs block mb-1">تعداد انتقال به مغازه</label>
              <input
                type="number"
                min={1}
                max={moveProduct.stock_warehouse}
                value={moveQty}
                onChange={e => setMoveQty(e.target.value)}
                className="w-full rounded-xl bg-slate-800/50 border border-slate-600 px-3 py-2.5 text-white text-sm"
                dir="ltr"
              />
            </div>
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}
