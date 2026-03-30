import { useState, useMemo, useRef, type FormEvent } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Barcode, Printer,
  RefreshCw, Download, ChevronRight, ChevronLeft, BookMarked,
} from 'lucide-react';
import { Book, type CurrencyCode } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import FormModal from './ui/FormModal';
import { compressImageToDataUrl } from '../utils/compressImage';

const ITEMS_PER_PAGE = 10;

function exportToCSV(data: Record<string, string | number>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((obj) => Object.values(obj).map((val) => `"${val}"`).join(',')).join('\n');
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers + '\n' + rows;
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function generateIsbnPlaceholder(): string {
  return String(Math.floor(1000000000000 + Math.random() * 9000000000000));
}

function PrintLabelModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const { formatPrice } = useApp();
  const priceLabel = formatPrice(book.sale_price, book.currency_code ?? 'AFN');
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="glass-dark relative w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Printer size={18} className="text-indigo-400" /> چاپ لیبل کتاب
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="text-center space-y-3">
          <p className="text-white font-bold">{book.title}</p>
          <p className="text-slate-400 text-xs">
            {book.author_name} — {book.publisher_name}
          </p>
          <p className="text-slate-400 font-mono text-sm">{book.isbn}</p>
          <p className="text-emerald-400 font-bold">{priceLabel}</p>
          <button
            type="button"
            onClick={() => {
              const win = window.open('', '_blank');
              if (!win) return;
              win.document.write(`
                <html dir="rtl"><head><title>لیبل</title></head><body style="font-family:Tahoma;padding:8mm">
                <div style="border:1px solid #333;padding:4mm;text-align:center">
                  <div style="font-weight:bold">${book.title}</div>
                  <div style="font-size:11px;color:#555">${book.author_name} | ${book.publisher_name}</div>
                  <div style="font-family:monospace;margin:4px 0">${book.isbn}</div>
                  <div style="font-weight:bold;color:#1a56db">${priceLabel.replace(/</g, '')}</div>
                </div>
                <script>window.onload=()=>{window.print();window.close();}</script>
                </body></html>`);
              win.document.close();
            }}
            className="w-full btn-primary text-white font-semibold py-2.5 rounded-xl"
          >
            چاپ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookstoreInventoryPage() {
  const { isDark, currencies, formatPrice } = useApp();
  const books = useStore((s) => s.books);
  const categories = useStore((s) => s.categories);
  const currentUser = useStore((s) => s.currentUser);
  const addBook = useStore((s) => s.addBook);
  const updateBook = useStore((s) => s.updateBook);
  const deleteBook = useStore((s) => s.deleteBook);
  const addCategoryStore = useStore((s) => s.addCategory);

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Book | null>(null);
  const [printBook, setPrintBook] = useState<Book | null>(null);
  const [deleteItem, setDeleteItem] = useState<Book | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  type NumField = number | '';
  const parseFormNum = (v: NumField) => (v === '' ? 0 : Number(v) || 0);

  const [form, setForm] = useState({
    sku: '',
    isbn: '',
    title: '',
    author_name: '',
    publisher_name: '',
    category_id: 1,
    purchase_price: '' as NumField,
    sale_price: '' as NumField,
    stock_shop: '' as NumField,
    stock_warehouse: '' as NumField,
    min_stock: '' as NumField,
    image_url: '',
    currency_code: 'AFN' as CurrencyCode,
  });
  const imageRef = useRef<HTMLInputElement>(null);

  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => setSearch(text));

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const c = addCategoryStore(newCategoryName.trim());
    setForm((f) => ({ ...f, category_id: c.id }));
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return books.filter((b) => {
      const okSearch =
        !q ||
        b.title.includes(q) ||
        b.sku.includes(q) ||
        b.isbn.includes(q) ||
        b.author_name.includes(q) ||
        b.publisher_name.includes(q);
      const okCat = catFilter === 0 || b.category_id === catFilter;
      return okSearch && okCat;
    });
  }, [books, search, catFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openAdd = () => {
    setEditItem(null);
    const next = books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1;
    const defCat = categories[0]?.id ?? 1;
    setForm({
      sku: `B${String(next).padStart(3, '0')}`,
      isbn: '',
      title: '',
      author_name: '',
      publisher_name: '',
      category_id: defCat,
      purchase_price: '',
      sale_price: '',
      stock_shop: '',
      stock_warehouse: '',
      min_stock: '',
      image_url: '',
      currency_code: 'AFN',
    });
    setShowModal(true);
  };

  const openEdit = (b: Book) => {
    setEditItem(b);
    setForm({
      sku: b.sku,
      isbn: b.isbn,
      title: b.title,
      author_name: b.author_name,
      publisher_name: b.publisher_name,
      category_id: b.category_id,
      purchase_price: b.purchase_price,
      sale_price: b.sale_price,
      stock_shop: b.stock_shop,
      stock_warehouse: b.stock_warehouse,
      min_stock: b.min_stock,
      image_url: b.image_url || '',
      currency_code: b.currency_code ?? 'AFN',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.isbn.trim()) {
      alert('شابک / بارکد اجباری است');
      return;
    }
    const cat = categories.find((c) => c.id === form.category_id);
    const tenantId = currentUser?.tenant_id ?? 1;
    const purchase_price = parseFormNum(form.purchase_price);
    const sale_price = parseFormNum(form.sale_price);
    const stock_shop = parseFormNum(form.stock_shop);
    const stock_warehouse = parseFormNum(form.stock_warehouse);
    const min_stock = parseFormNum(form.min_stock);
    const base = {
      sku: form.sku.trim(),
      isbn: form.isbn.trim(),
      title: form.title.trim(),
      author_name: form.author_name.trim(),
      publisher_name: form.publisher_name.trim(),
      category_id: form.category_id,
      category_name: cat?.name || '',
      purchase_price,
      sale_price,
      stock_shop,
      stock_warehouse,
      min_stock,
      is_active: true,
      tenant_id: tenantId,
      image_url: form.image_url || undefined,
      currency_code: form.currency_code,
    };
    if (editItem) {
      updateBook({ ...editItem, ...base });
    } else {
      addBook(base);
    }
    setShowModal(false);
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((b) => ({
        کد: b.sku,
        شابک: b.isbn,
        عنوان: b.title,
        مؤلف: b.author_name,
        ناشر: b.publisher_name,
        دسته: b.category_name,
        'قیمت خرید': b.purchase_price,
        'قیمت فروش': b.sale_price,
        'موجودی مغازه': b.stock_shop,
        انبار: b.stock_warehouse,
        وضعیت: b.is_active ? 'فعال' : 'غیرفعال',
      })),
      'books_inventory'
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className={`${cardBg} p-4 md:p-6`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <BookMarked size={24} />
            </div>
            <div>
              <h1 className={`text-xl font-black ${textColor}`}>انبار کتابفروشی</h1>
              <p className={`text-sm ${subText}`}>
                دادهٔ کتاب‌ها جدا از کالاهای فروشگاه عمومی است و فقط در این بخش و فروش دیده می‌شود.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-white text-sm"
            >
              <Download size={16} /> خروجی CSV
            </button>
            <button type="button" onClick={openAdd} className="btn-primary text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2">
              <Plus size={18} /> کتاب جدید
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو: عنوان، مؤلف، ناشر، شابک، کد..."
              className={`${inputClass} pr-10`}
            />
          </div>
          {voiceOk && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${isListening ? 'bg-rose-600 text-white' : 'glass text-slate-300'}`}
            >
              {isListening ? 'توقف' : 'جستجوی صوتی'}
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <button
            type="button"
            onClick={() => setCatFilter(0)}
            className={`px-3 py-2 rounded-xl text-xs font-medium ${catFilter === 0 ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
          >
            همه دسته‌ها
          </button>
          {categories
            .filter((c) => !c.parent_id)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatFilter(c.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium ${
                  catFilter === c.id ? 'bg-indigo-600 text-white' : 'glass text-slate-400'
                }`}
              >
                {c.name}
              </button>
            ))}
        </div>

        <div className={`${cardBg} overflow-hidden`}>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                  {['کد', 'شابک', 'عنوان', 'مؤلف', 'ناشر', 'دسته', 'خرید', 'فروش', 'مغازه', 'انبار', 'عملیات'].map((h) => (
                    <th key={h} className={`text-right ${subText} font-medium py-3 px-3 whitespace-nowrap`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {paginated.map((b) => (
                  <tr key={b.id} className={isDark ? 'table-row-hover' : 'hover:bg-slate-50'}>
                    <td className={`py-2.5 px-3 font-mono text-xs ${subText}`}>{b.sku}</td>
                    <td className={`py-2.5 px-3 font-mono text-xs ${subText}`}>{b.isbn}</td>
                    <td className={`py-2.5 px-3 ${textColor} font-medium max-w-[200px]`}>{b.title}</td>
                    <td className={`py-2.5 px-3 text-xs ${subText} max-w-[120px]`}>{b.author_name}</td>
                    <td className={`py-2.5 px-3 text-xs ${subText} max-w-[100px]`}>{b.publisher_name}</td>
                    <td className={`py-2.5 px-3 text-xs ${subText}`}>{b.category_name}</td>
                    <td className="py-2.5 px-3 text-amber-400 text-xs">{formatPrice(b.purchase_price, b.currency_code ?? 'AFN')}</td>
                    <td className="py-2.5 px-3 text-emerald-400 text-xs">{formatPrice(b.sale_price, b.currency_code ?? 'AFN')}</td>
                    <td className={`py-2.5 px-3 font-bold ${textColor}`}>{b.stock_shop}</td>
                    <td className={`py-2.5 px-3 ${subText}`}>{b.stock_warehouse}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEdit(b)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400">
                          <Edit2 size={14} />
                        </button>
                        <button type="button" onClick={() => setPrintBook(b)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-indigo-400">
                          <Printer size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleteItem(b)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl glass text-sm disabled:opacity-40"
            >
              <ChevronRight size={18} /> قبلی
            </button>
            <span className={`text-sm ${subText}`}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl glass text-sm disabled:opacity-40"
            >
              بعدی <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          <span className="flex items-center gap-2 text-white">
            <BookMarked size={18} className="text-indigo-400" />
            {editItem ? 'ویرایش کتاب' : 'کتاب جدید'}
          </span>
        }
        footer={
          <div className="flex gap-3">
            <button type="submit" form="book-form" className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm">
              {editItem ? 'ذخیره' : 'ثبت'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="px-5 glass text-slate-300 py-2.5 rounded-xl text-sm">
              انصراف
            </button>
          </div>
        }
      >
        <form id="book-form" onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">کد داخلی (SKU)</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                <Barcode size={11} /> شابک / بارکد
              </label>
              <div className="flex gap-2">
                <input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  className={`flex-1 ${inputClass}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isbn: generateIsbnPlaceholder() })}
                  className="shrink-0 px-3 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-slate-400 text-xs mb-1 block">عنوان کتاب</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">مؤلف</label>
              <input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">انتشارات</label>
              <input value={form.publisher_name} onChange={(e) => setForm({ ...form, publisher_name: e.target.value })} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-slate-400 text-xs mb-1 block">دسته</label>
              <div className="flex gap-2">
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: +e.target.value })}
                  className={`flex-1 ${inputClass}`}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="px-3 rounded-xl bg-emerald-600/25 text-emerald-400 text-xs">
                  + دسته
                </button>
              </div>
              {showAddCategory && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className={`flex-1 ${inputClass}`}
                    placeholder="نام دسته"
                  />
                  <button type="button" onClick={handleAddCategory} className="px-3 bg-emerald-600 text-white rounded-xl text-xs">
                    افزودن
                  </button>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-slate-400 text-xs mb-1 block">واحد پول</label>
              <select
                value={form.currency_code}
                onChange={(e) => setForm({ ...form, currency_code: e.target.value as CurrencyCode })}
                className={inputClass}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} — {c.code}
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                ['قیمت خرید', 'purchase_price'],
                ['قیمت فروش', 'sale_price'],
                ['موجودی مغازه', 'stock_shop'],
                ['موجودی انبار', 'stock_warehouse'],
                ['حداقل موجودی', 'min_stock'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className={key === 'min_stock' ? 'col-span-2' : ''}>
                <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                <input
                  type="number"
                  value={form[key] === '' ? '' : form[key]}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, [key]: v === '' ? '' : Number(v) }));
                  }}
                  className={inputClass}
                  min="0"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-slate-400 text-xs mb-1 block">تصویر (اختیاری)</label>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const dataUrl = await compressImageToDataUrl(file, { force: true, minFileSizeToCompress: 0, maxEdge: 720, maxBytes: 100_000 });
                setForm((f) => ({ ...f, image_url: dataUrl }));
                e.target.value = '';
              }} />
              <button type="button" onClick={() => imageRef.current?.click()} className="w-full py-2 rounded-xl glass text-slate-300 text-sm">
                انتخاب تصویر
              </button>
            </div>
          </div>
        </form>
      </FormModal>

      {printBook && <PrintLabelModal book={printBook} onClose={() => setPrintBook(null)} />}

      {deleteItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4">
          <div className="glass-dark rounded-2xl p-6 max-w-sm text-center">
            <p className="text-white mb-4">حذف «{deleteItem.title}»؟</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  deleteBook(deleteItem.id);
                  setDeleteItem(null);
                }}
                className="flex-1 bg-rose-600 text-white py-2 rounded-xl font-bold"
              >
                حذف
              </button>
              <button type="button" onClick={() => setDeleteItem(null)} className="flex-1 glass text-slate-300 py-2 rounded-xl">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
