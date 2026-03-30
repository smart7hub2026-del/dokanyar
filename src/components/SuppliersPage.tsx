import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Phone, MapPin, MessageCircle, Mail, TrendingDown, Printer, Building2, Eye, Mic, MicOff } from 'lucide-react';
import { Supplier } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';

type PrintSize = 'A4' | 'A5' | '80mm' | '58mm';

function DeleteConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" style={{ overscrollBehavior: 'contain' }}>
      <div className="glass-dark rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">آیا مطمئنید؟</h3>
        <p className="text-slate-400 text-sm mb-1">تأمین‌کننده <span className="text-white font-medium">"{name}"</span> حذف شود؟</p>
        <p className="text-rose-400 text-xs mb-6">این عمل قابل بازگشت نیست.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl">بله، حذف شود</button>
          <button onClick={onClose} className="flex-1 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
        </div>
      </div>
    </div>
  );
}

function SupplierDetailModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const [printSize, setPrintSize] = useState<PrintSize>('A4');
  const [printPickOpen, setPrintPickOpen] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handlePrint = () => {
    const sizeMap: Record<PrintSize, string> = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const fontSize = printSize === '58mm' ? '8px' : printSize === '80mm' ? '10px' : '12px';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>پروفایل تأمین‌کننده</title>
      <style>
        @page { size: ${sizeMap[printSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 3mm; font-size: calc(${fontSize} + 4px); }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 5mm 0; }
        .info-item { background: #f9f9f9; padding: 3mm; border-radius: 2mm; border: 1px solid #eee; }
        .label { color: #666; font-size: calc(${fontSize} - 1px); margin-bottom: 1mm; }
        .value { font-weight: bold; }
        .debt { color: #dc2626; }
        .footer { margin-top: 8mm; border-top: 1px solid #ddd; padding-top: 3mm; text-align: center; color: #666; font-size: calc(${fontSize} - 1px); }
      </style></head><body>
      <h1>پروفایل تأمین‌کننده</h1>
      <div class="info-grid">
        <div class="info-item"><div class="label">نام شرکت</div><div class="value">${supplier.company_name}</div></div>
        <div class="info-item"><div class="label">کد تأمین‌کننده</div><div class="value">${supplier.supplier_code}</div></div>
        <div class="info-item"><div class="label">نام مسئول</div><div class="value">${supplier.contact_name}</div></div>
        <div class="info-item"><div class="label">شماره تماس</div><div class="value">${supplier.phone}</div></div>
        <div class="info-item"><div class="label">واتساپ</div><div class="value">${supplier.whatsapp || '-'}</div></div>
        <div class="info-item"><div class="label">ایمیل</div><div class="value">${supplier.email || '-'}</div></div>
        <div class="info-item"><div class="label">آدرس</div><div class="value">${supplier.address}</div></div>
        <div class="info-item"><div class="label">نوع کالا</div><div class="value">${supplier.product_types}</div></div>
        <div class="info-item"><div class="label">بدهی به تأمین‌کننده</div><div class="value class="${supplier.balance < 0 ? 'debt' : ''}">${supplier.balance < 0 ? Math.abs(supplier.balance).toLocaleString() + ' ؋ بدهکار' : 'تسویه'}</div></div>
        <div class="info-item"><div class="label">کل خرید از تأمین‌کننده</div><div class="value">${supplier.total_purchases.toLocaleString()} ؋</div></div>
      </div>
      ${supplier.notes ? `<div style="background:#fff3cd;padding:3mm;border-radius:2mm;border:1px solid #ffc107;margin-top:5mm"><strong>یادداشت:</strong> ${supplier.notes}</div>` : ''}
      <div class="footer">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} | سیستم مدیریت فروشگاه</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
    setPrintPickOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" style={{ overscrollBehavior: 'contain' }}>
      <div className="glass-dark relative z-[1] max-h-[min(92dvh,calc(100dvh-1.5rem))] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 glass-dark z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center">
              <Building2 size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">{supplier.company_name}</h2>
              <p className="text-slate-400 text-xs">{supplier.supplier_code} | {supplier.contact_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPrintPickOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 text-sm">
              <Printer size={14} /> چاپ
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'کل خرید', value: `${supplier.total_purchases.toLocaleString()} ؋`, color: 'text-blue-400' },
              { label: 'بدهی ما', value: supplier.balance < 0 ? `${Math.abs(supplier.balance).toLocaleString()} ؋` : 'تسویه', color: supplier.balance < 0 ? 'text-rose-400' : 'text-emerald-400' },
              { label: 'وضعیت', value: supplier.status === 'active' ? 'فعال' : 'غیرفعال', color: supplier.status === 'active' ? 'text-emerald-400' : 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-slate-400" /><span className="text-slate-300">{supplier.phone}</span></div>
            <div className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-slate-400" /><span className="text-slate-300">{supplier.address}</span></div>
            {supplier.whatsapp && <div className="flex items-center gap-2 text-sm"><MessageCircle size={14} className="text-green-400" /><span className="text-green-300">{supplier.whatsapp}</span></div>}
            {supplier.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-blue-400" /><span className="text-blue-300">{supplier.email}</span></div>}
            <div className="col-span-2 text-sm text-slate-400">نوع کالا: <span className="text-white">{supplier.product_types}</span></div>
          </div>

          {supplier.notes && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-400 text-xs font-medium mb-1">یادداشت</p>
              <p className="text-slate-300 text-sm">{supplier.notes}</p>
            </div>
          )}
        </div>
        {printPickOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl">
              <p className="text-white text-sm font-bold mb-3">انتخاب سایز چاپ</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['58mm', '80mm', 'A5', 'A4'] as PrintSize[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrintSize(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${printSize === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPrintPickOpen(false)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm">
                  انصراف
                </button>
                <button type="button" onClick={() => void handlePrint()} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                  <Printer size={14} /> چاپ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { isDark } = useApp();
  const suppliers = useStore(s => s.suppliers);
  const addSupplier = useStore(s => s.addSupplier);
  const updateSupplier = useStore(s => s.updateSupplier);
  const deleteSupplier = useStore(s => s.deleteSupplier);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [deleteItem, setDeleteItem] = useState<Supplier | null>(null);
  const [listPrintOpen, setListPrintOpen] = useState(false);
  const [listPrintSize, setListPrintSize] = useState<PrintSize>('A4');

  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const [form, setForm] = useState({
    company_name: '', contact_name: '', phone: '', whatsapp: '',
    email: '', address: '', product_types: '', notes: '',
  });

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const filtered = suppliers.filter(s => {
    const ms = s.company_name.includes(search) || s.contact_name.includes(search) || s.phone.includes(search) || s.supplier_code.includes(search);
    const mf = filter === 'all' || s.status === filter || (filter === 'debtor' && s.balance < 0);
    return ms && mf;
  });

  const totalDebt = suppliers.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const totalPurchases = suppliers.reduce((sum, s) => sum + s.total_purchases, 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({ company_name: '', contact_name: '', phone: '', whatsapp: '', email: '', address: '', product_types: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ company_name: s.company_name, contact_name: s.contact_name, phone: s.phone, whatsapp: s.whatsapp || '', email: s.email || '', address: s.address, product_types: s.product_types, notes: s.notes || '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      updateSupplier({
        ...editItem,
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        product_types: form.product_types,
        notes: form.notes || undefined,
      });
    } else {
      addSupplier({
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        product_types: form.product_types,
        notes: form.notes || undefined,
        balance: 0,
        total_purchases: 0,
        status: 'active',
      });
    }
    setShowModal(false);
  };

  const doDelete = () => {
    if (deleteItem) {
      deleteSupplier(deleteItem.id);
      setDeleteItem(null);
    }
  };

  const handlePrintAll = () => {
    const sizeMap: Record<PrintSize, string> = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const fontSize = listPrintSize === '58mm' ? '8px' : listPrintSize === '80mm' ? '10px' : '12px';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>لیست تامین‌کنندگان</title>
      <style>
        @page { size: ${sizeMap[listPrintSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 3mm; }
        table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
        th { background: #333; color: white; padding: 2mm; text-align: right; }
        td { padding: 2mm; border-bottom: 1px solid #eee; }
        .debt { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 5mm; text-align: center; color: #666; font-size: calc(${fontSize} - 1px); }
      </style></head><body>
      <h1>لیست تامین‌کنندگان</h1>
      <p style="color:#666">تاریخ: ${new Date().toLocaleDateString('fa-IR')} | تعداد: ${filtered.length}</p>
      <table>
        <tr><th>#</th><th>نام شرکت</th><th>مسئول</th><th>تماس</th><th>نوع کالا</th><th>بدهی ما</th><th>کل خرید</th></tr>
        ${filtered.map((s, i) => `<tr>
          <td>${i + 1}</td><td>${s.company_name}</td><td>${s.contact_name}</td>
          <td>${s.phone}</td><td>${s.product_types}</td>
          <td class="${s.balance < 0 ? 'debt' : ''}">${s.balance < 0 ? Math.abs(s.balance).toLocaleString() + ' ؋' : 'تسویه'}</td>
          <td>${s.total_purchases.toLocaleString()} ؋</td>
        </tr>`).join('')}
      </table>
      <div class="footer">جمع بدهی‌ها: ${totalDebt.toLocaleString()} ؋ | کل خرید: ${totalPurchases.toLocaleString()} ؋</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
    setListPrintOpen(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>مدیریت تامین‌کنندگان</h1>
          <p className={`${subText} text-sm mt-1`}>{suppliers.length} تامین‌کننده ثبت‌شده</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setListPrintOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-slate-300 hover:text-white text-sm transition-all">
            <Printer size={16} /> چاپ لیست
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            <Plus size={18} /> تامین‌کننده جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'کل تامین‌کنندگان', value: suppliers.length, color: textColor },
          { label: 'فعال', value: suppliers.filter(s => s.status === 'active').length, color: 'text-emerald-400' },
          { label: 'کل بدهی ما', value: `${(totalDebt / 1000).toFixed(0)}K ؋`, color: 'text-rose-400' },
          { label: 'کل خرید', value: `${(totalPurchases / 1000).toFixed(0)}K ؋`, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className={`${cardBg} p-4 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`${subText} text-xs mt-1`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو (نام، کد، تماس)..."
            className={`${inputClass} pr-10 ${voiceOk ? 'pl-11' : ''}`} />
          {voiceOk && (
            <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[['all', 'همه'], ['active', 'فعال'], ['inactive', 'غیرفعال'], ['debtor', 'بدهکار']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className={`${cardBg} overflow-hidden`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                {['کد', 'نام شرکت', 'مسئول', 'تماس', 'نوع کالا', 'بدهی ما', 'کل خرید', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className={`text-right ${subText} font-medium py-3 px-4 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filtered.map(s => (
                <tr key={s.id} className={isDark ? 'table-row-hover' : 'hover:bg-slate-50 transition-colors'}>
                  <td className={`py-3 px-4 ${subText} text-xs font-mono`}>{s.supplier_code}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Building2 size={14} className="text-orange-400" />
                      </div>
                      <div>
                        <p className={`${textColor} font-medium`}>{s.company_name}</p>
                        {s.address && <p className={`${subText} text-xs`}>{s.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{s.contact_name}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-xs font-mono`}>{s.phone}</p>
                      <div className="flex gap-1">
                        {s.whatsapp && <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">WA</span>}
                        {s.email && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400"><Mail size={10} /></span>}
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${subText} text-xs max-w-32 truncate`}>{s.product_types}</td>
                  <td className="py-3 px-4">
                    {s.balance < 0
                      ? <span className="text-rose-400 font-bold flex items-center gap-1"><TrendingDown size={12} />{Math.abs(s.balance).toLocaleString()} ؋</span>
                      : <span className="text-emerald-400 text-sm">تسویه</span>}
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium`}>{s.total_purchases.toLocaleString()} ؋</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => setDetailItem(s)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-purple-400 transition-colors"><Eye size={14} /></button>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteItem(s)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {filtered.map(s => (
            <div
              key={s.id}
              className={`rounded-2xl p-4 border ${
                isDark ? 'bg-slate-800/70 border-white/10' : 'bg-slate-50/90 border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-[15px] ${textColor}`}>{s.company_name}</p>
                  <p className={`text-xs ${subText}`}>{s.contact_name}</p>
                  <p className={`text-[11px] font-mono mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{s.phone}</p>
                  <p className={`text-[10px] font-mono ${subText}`}>{s.supplier_code}</p>
                  {s.address && <p className={`text-[11px] ${subText} mt-1 line-clamp-2`}>{s.address}</p>}
                  {s.product_types && (
                    <p className={`text-[11px] mt-2 ${subText} line-clamp-2`}>{s.product_types}</p>
                  )}
                </div>
              </div>
              <div className={`mt-3 pt-3 border-t flex flex-wrap justify-between gap-2 text-sm ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div>
                  <p className={`text-[10px] ${subText}`}>بدهی</p>
                  {s.balance < 0 ? (
                    <span className="text-rose-500 font-bold flex items-center gap-1 tabular-nums">
                      <TrendingDown size={14} />
                      {Math.abs(s.balance).toLocaleString()} ؋
                    </span>
                  ) : (
                    <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>تسویه</span>
                  )}
                </div>
                <div>
                  <p className={`text-[10px] ${subText}`}>خرید</p>
                  <p className={`font-medium tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {s.total_purchases.toLocaleString()} ؋
                  </p>
                </div>
                <span className={`self-center text-[11px] px-2 py-0.5 rounded-full ${s.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                  {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="flex gap-1.5 mt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDetailItem(s)}
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteItem(s)}
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-rose-500`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <Building2 size={18} className="shrink-0 text-orange-400" />
            {editItem ? 'ویرایش تأمین‌کننده' : 'تأمین‌کننده جدید'}
          </span>
        }
        footer={
          <div className="flex gap-3">
            <button type="submit" form="supplier-add-edit-form" className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold text-white">
              {editItem ? 'ذخیره تغییرات' : 'ثبت تأمین‌کننده'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="supplier-add-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">نام شرکت / فرد <span className="text-rose-400">*</span></label>
                  <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">نام مسئول <span className="text-rose-400">*</span></label>
                  <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><Phone size={11} className="inline ml-1" />شماره تماس <span className="text-rose-400">*</span></label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><MessageCircle size={11} className="inline ml-1 text-green-400" />واتساپ <span className="text-slate-500">(اختیاری)</span></label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><Mail size={11} className="inline ml-1 text-blue-400" />ایمیل <span className="text-slate-500">(اختیاری)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block"><MapPin size={11} className="inline ml-1" />آدرس</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">نوع کالاهای تامین‌شده</label>
                  <input value={form.product_types} onChange={e => setForm({ ...form, product_types: e.target.value })} className={inputClass} placeholder="مثال: مواد غذایی، روغن، شکر" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">یادداشت</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none resize-none" />
                </div>
              </div>
            </form>
      </FormModal>

      {listPrintOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-dark w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Printer size={16} className="text-indigo-400" /> انتخاب سایز چاپ لیست
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['58mm', '80mm', 'A5', 'A4'] as PrintSize[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setListPrintSize(s)}
                  className={`py-2.5 rounded-xl text-xs font-bold ${listPrintSize === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setListPrintOpen(false)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm">
                انصراف
              </button>
              <button type="button" onClick={() => void handlePrintAll()} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold">
                چاپ
              </button>
            </div>
          </div>
        </div>
      )}

      {detailItem && <SupplierDetailModal supplier={detailItem} onClose={() => setDetailItem(null)} />}
      {deleteItem && <DeleteConfirmModal name={deleteItem.company_name} onConfirm={doDelete} onClose={() => setDeleteItem(null)} />}
    </div>
  );
}
