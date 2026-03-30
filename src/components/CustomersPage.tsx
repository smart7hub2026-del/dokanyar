import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Phone, MapPin, MessageCircle, Mail, Bell, BellOff, Eye, Printer, Send, History, TrendingDown, TrendingUp, ChevronRight, Mic, MicOff } from 'lucide-react';
import { Customer, Invoice, Debt } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
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
        <p className="text-slate-400 text-sm mb-1">مشتری <span className="text-white font-medium">"{name}"</span> حذف شود؟</p>
        <p className="text-rose-400 text-xs mb-2">این عمل قابل بازگشت نیست.</p>
        <p className="text-amber-400 text-xs mb-6">⚠️ سوابق خرید این مشتری محفوظ می‌ماند.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors">بله، حذف شود</button>
          <button onClick={onClose} className="flex-1 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
        </div>
      </div>
    </div>
  );
}

function SendMessageModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [method, setMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [msg, setMsg] = useState(
    `مشتری گرامی ${customer.name}، ${Math.abs(customer.balance).toLocaleString()} افغانی بدهی شما سررسید شده است. لطفاً برای تسویه حساب اقدام فرمایید.`
  );
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (method === 'whatsapp' && customer.whatsapp) {
      const text = encodeURIComponent(msg);
      window.open(`https://wa.me/${customer.whatsapp.replace(/^0/, '93')}?text=${text}`, '_blank');
    } else if (method === 'email' && customer.email) {
      window.open(`mailto:${customer.email}?subject=یادآوری بدهی&body=${encodeURIComponent(msg)}`, '_blank');
    }
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold flex items-center gap-2"><Send size={18} className="text-green-400" /> ارسال پیام به {customer.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            {customer.whatsapp && (
              <button onClick={() => setMethod('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${method === 'whatsapp' ? 'bg-green-600/20 border-green-500 text-green-400' : 'glass border-white/10 text-slate-400'}`}>
                <MessageCircle size={18} /> واتساپ
              </button>
            )}
            {customer.email && (
              <button onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${method === 'email' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'glass border-white/10 text-slate-400'}`}>
                <Mail size={18} /> ایمیل
              </button>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">متن پیام</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={sent}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${sent ? 'bg-emerald-600 text-white' : 'btn-primary text-white'}`}>
              {sent ? '✓ ارسال شد!' : <><Send size={16} /> ارسال پیام</>}
            </button>
            <button onClick={onClose} className="px-5 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerHistoryModal({ customer, invoices, debts, onClose }: {
  customer: Customer; invoices: Invoice[]; debts: Debt[]; onClose: () => void;
}) {
  const [printSize, setPrintSize] = useState<PrintSize>('A4');
  const [printPickOpen, setPrintPickOpen] = useState(false);
  const custInvoices = invoices.filter(i => i.customer_id === customer.id);
  const custDebts = debts.filter(d => d.customer_id === customer.id);

  const handlePrint = () => {
    const sizeMap = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const win = window.open('', '_blank');
    if (!win) return;
    const fontSize = printSize === '58mm' ? '8px' : printSize === '80mm' ? '10px' : '12px';
    win.document.write(`
      <html dir="rtl"><head><title>پروفایل مشتری</title>
      <style>
        @page { size: ${sizeMap[printSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; color: #000; }
        h1 { font-size: calc(${fontSize} + 4px); border-bottom: 2px solid #333; padding-bottom: 3mm; }
        h2 { font-size: calc(${fontSize} + 2px); color: #333; margin-top: 5mm; }
        table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
        th { background: #f0f0f0; padding: 2mm; text-align: right; font-weight: bold; border: 1px solid #ddd; }
        td { padding: 2mm; border: 1px solid #ddd; text-align: right; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 3mm 0; }
        .info-item { background: #f9f9f9; padding: 2mm; border-radius: 2mm; }
        .label { color: #666; font-size: calc(${fontSize} - 1px); }
        .value { font-weight: bold; }
        .debt { color: #dc2626; }
        .paid { color: #16a34a; }
        .footer { margin-top: 8mm; border-top: 1px solid #ddd; padding-top: 3mm; text-align: center; color: #666; }
      </style></head><body>
      <h1>پروفایل مشتری</h1>
      <div class="info-grid">
        <div class="info-item"><div class="label">نام کامل</div><div class="value">${customer.name}</div></div>
        <div class="info-item"><div class="label">کد مشتری</div><div class="value">${customer.customer_code}</div></div>
        <div class="info-item"><div class="label">شماره تماس</div><div class="value">${customer.phone}</div></div>
        <div class="info-item"><div class="label">آدرس</div><div class="value">${customer.address || '-'}</div></div>
        <div class="info-item"><div class="label">واتساپ</div><div class="value">${customer.whatsapp || '-'}</div></div>
        <div class="info-item"><div class="label">ایمیل</div><div class="value">${customer.email || '-'}</div></div>
        <div class="info-item"><div class="label">کل خرید</div><div class="value">${customer.total_purchases.toLocaleString()} ؋</div></div>
        <div class="info-item"><div class="label">موجودی حساب</div>
          <div class="value ${customer.balance < 0 ? 'debt' : 'paid'}">${customer.balance < 0 ? Math.abs(customer.balance).toLocaleString() + ' ؋ بدهکار' : customer.balance > 0 ? customer.balance.toLocaleString() + ' ؋ بستانکار' : 'تسویه'}</div>
        </div>
      </div>
      <h2>سوابق فاکتورها (${custInvoices.length} فاکتور)</h2>
      <table>
        <tr><th>شماره فاکتور</th><th>تاریخ</th><th>مبلغ کل</th><th>پرداخت شده</th><th>مانده</th><th>وضعیت</th></tr>
        ${custInvoices.map(inv => `
          <tr>
            <td>${inv.invoice_number}</td>
            <td>${inv.invoice_date}</td>
            <td>${inv.total.toLocaleString()} ؋</td>
            <td>${inv.paid_amount.toLocaleString()} ؋</td>
            <td class="${inv.due_amount > 0 ? 'debt' : 'paid'}">${inv.due_amount.toLocaleString()} ؋</td>
            <td>${inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}</td>
          </tr>
        `).join('')}
      </table>
      ${custDebts.length > 0 ? `
        <h2>بدهی‌های فعال (${custDebts.length} مورد)</h2>
        <table>
          <tr><th>فاکتور</th><th>مبلغ اصلی</th><th>پرداخت شده</th><th>مانده</th><th>سررسید</th><th>وضعیت</th></tr>
          ${custDebts.map(d => `
            <tr>
              <td>${d.invoice_number}</td>
              <td>${d.amount.toLocaleString()} ؋</td>
              <td>${d.paid_amount.toLocaleString()} ؋</td>
              <td class="debt">${d.remaining_amount.toLocaleString()} ؋</td>
              <td>${d.due_date}</td>
              <td>${d.status === 'overdue' ? '⚠️ معوق' : d.status === 'partial' ? 'جزئی' : 'در انتظار'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      <div class="footer">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} | سیستم مدیریت فروشگاه</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
    setPrintPickOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-dark relative rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 glass-dark z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white font-bold text-lg">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-white font-semibold">{customer.name}</h2>
              <p className="text-slate-400 text-xs">{customer.customer_code} | {customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPrintPickOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 text-sm transition-all">
              <Printer size={14} /> چاپ
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'کل خرید', value: `${customer.total_purchases.toLocaleString()} ؋`, color: 'text-blue-400' },
              { label: 'موجودی', value: customer.balance < 0 ? `${Math.abs(customer.balance).toLocaleString()} ؋ بدهکار` : customer.balance > 0 ? `${customer.balance.toLocaleString()} ؋ بستانکار` : 'تسویه', color: customer.balance < 0 ? 'text-rose-400' : customer.balance > 0 ? 'text-emerald-400' : 'text-slate-400' },
              { label: 'تعداد فاکتور', value: custInvoices.length, color: 'text-purple-400' },
              { label: 'بدهی فعال', value: custDebts.filter(d => d.status !== 'paid').length, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact Info */}
          <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span className="text-slate-300">{customer.phone}</span></div>
            {customer.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /><span className="text-slate-300">{customer.address}</span></div>}
            {customer.whatsapp && <div className="flex items-center gap-2"><MessageCircle size={14} className="text-green-400" /><span className="text-green-300">{customer.whatsapp}</span></div>}
            {customer.email && <div className="flex items-center gap-2"><Mail size={14} className="text-blue-400" /><span className="text-blue-300">{customer.email}</span></div>}
          </div>

          {/* Invoices History */}
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
              <History size={16} className="text-indigo-400" /> سوابق فاکتورها ({custInvoices.length})
            </h3>
            {custInvoices.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">هیچ فاکتوری ثبت نشده</p>
            ) : (
              <div className="space-y-2">
                {custInvoices.map(inv => (
                  <div key={inv.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.payment_method === 'cash' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                        {inv.payment_method === 'cash' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-amber-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-slate-400 text-xs">{inv.invoice_date} | {inv.items?.length || 0} قلم</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{inv.total.toLocaleString()} ؋</p>
                      {inv.due_amount > 0 && <p className="text-rose-400 text-xs">مانده: {inv.due_amount.toLocaleString()} ؋</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Debts */}
          {custDebts.length > 0 && (
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-rose-400" /> بدهی‌های فعال ({custDebts.length})
              </h3>
              <div className="space-y-2">
                {custDebts.map(d => (
                  <div key={d.id} className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{d.invoice_number}</p>
                      <p className="text-slate-400 text-xs">سررسید: {d.due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-bold">{d.remaining_amount.toLocaleString()} ؋ مانده</p>
                      <p className="text-slate-500 text-xs">پرداخت شده: {d.paid_amount.toLocaleString()} ؋</p>
                    </div>
                  </div>
                ))}
              </div>
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
                    className={`py-2.5 rounded-xl text-xs font-bold ${printSize === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
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

export default function CustomersPage() {
  const { isDark, t } = useApp();
  const customers = useStore(s => s.customers);
  const invoices = useStore(s => s.invoices);
  const debts = useStore(s => s.debts);
  const currentUser = useStore(s => s.currentUser);
  const addCustomer = useStore(s => s.addCustomer);
  const updateCustomer = useStore(s => s.updateCustomer);
  const deleteCustomer = useStore(s => s.deleteCustomer);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [msgCustomer, setMsgCustomer] = useState<Customer | null>(null);
  const [deleteItem, setDeleteItem] = useState<Customer | null>(null);
  const [listPrintOpen, setListPrintOpen] = useState(false);
  const [listPrintSize, setListPrintSize] = useState<PrintSize>('A4');

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '', address: '',
    reminder_enabled: true, reminder_days_before: 3,
  });

  const { isListening, startListening, stopListening, supported } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const filtered = customers.filter(c => {
    const matchSearch = c.name.includes(search) || c.phone.includes(search) || c.customer_code.includes(search);
    const matchFilter = filter === 'all' || c.status === filter ||
      (filter === 'debtor' && c.balance < 0) ||
      (filter === 'creditor' && c.balance > 0) ||
      (filter === 'reminder' && c.reminder_enabled);
    return matchSearch && matchFilter;
  });

  const totalDebt = customers.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
  const totalCredit = customers.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', phone: '', whatsapp: '', email: '', address: '', reminder_enabled: true, reminder_days_before: 3 });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone, whatsapp: c.whatsapp || '', email: c.email || '', address: c.address, reminder_enabled: c.reminder_enabled, reminder_days_before: c.reminder_days_before });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = currentUser?.tenant_id ?? 1;
    if (editItem) {
      updateCustomer({
        ...editItem,
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        reminder_enabled: form.reminder_enabled,
        reminder_days_before: form.reminder_days_before,
      });
    } else {
      addCustomer({
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        balance: 0,
        total_purchases: 0,
        status: 'active',
        reminder_enabled: form.reminder_enabled,
        reminder_days_before: form.reminder_days_before,
        tenant_id: tenantId,
      });
    }
    setShowModal(false);
  };

  const doDelete = () => {
    if (deleteItem) {
      deleteCustomer(deleteItem.id);
      setDeleteItem(null);
    }
  };

  const handlePrintAll = () => {
    const sizeMap: Record<PrintSize, string> = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const fontSize = listPrintSize === '58mm' ? '8px' : listPrintSize === '80mm' ? '10px' : '12px';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>لیست مشتریان</title>
      <style>
        @page { size: ${sizeMap[listPrintSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 3mm; font-size: calc(${fontSize} + 4px); }
        table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
        th { background: #333; color: white; padding: 2mm; text-align: right; }
        td { padding: 2mm; border-bottom: 1px solid #eee; text-align: right; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .debt { color: #dc2626; font-weight: bold; }
        .credit { color: #16a34a; font-weight: bold; }
        .footer { margin-top: 5mm; text-align: center; font-size: calc(${fontSize} - 1px); color: #666; }
      </style></head><body>
      <h1>لیست مشتریان فروشگاه</h1>
      <p style="color:#666;font-size:calc(${fontSize}-1px)">تاریخ: ${new Date().toLocaleDateString('fa-IR')} | تعداد: ${filtered.length} مشتری</p>
      <table>
        <tr><th>#</th><th>کد</th><th>نام مشتری</th><th>شماره تماس</th><th>آدرس</th><th>بدهی / بستانکاری</th><th>کل خرید</th></tr>
        ${filtered.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${c.customer_code}</td>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.address || '-'}</td>
            <td class="${c.balance < 0 ? 'debt' : c.balance > 0 ? 'credit' : ''}">${c.balance < 0 ? Math.abs(c.balance).toLocaleString() + ' ؋ بدهکار' : c.balance > 0 ? c.balance.toLocaleString() + ' ؋ بستانکار' : 'تسویه'}</td>
            <td>${c.total_purchases.toLocaleString()} ؋</td>
          </tr>
        `).join('')}
      </table>
      <div class="footer">جمع کل بدهی: ${totalDebt.toLocaleString()} ؋ | جمع کل بستانکاری: ${totalCredit.toLocaleString()} ؋</div>
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
          <h1 className={`text-2xl font-bold ${textColor}`}>{t('manage_customers')}</h1>
          <p className={`${subText} text-sm mt-1`}>{customers.length} مشتری ثبت‌شده</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setListPrintOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-slate-300 hover:text-white text-sm transition-all">
            <Printer size={16} /> چاپ لیست
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            <Plus size={18} /> مشتری جدید
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'کل مشتریان', value: customers.length, color: textColor },
          { label: 'مشتریان فعال', value: customers.filter(c => c.status === 'active').length, color: 'text-emerald-400' },
          { label: 'کل بدهکاری', value: `${(totalDebt / 1000).toFixed(1)}K ؋`, color: 'text-rose-400' },
          { label: 'کل بستانکاری', value: `${(totalCredit / 1000).toFixed(1)}K ؋`, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className={`${cardBg} p-4 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`${subText} text-xs mt-1`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 flex items-center">
          <Search size={16} className="absolute right-3 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو (نام، موبایل، کد)..."
            className={`${inputClass} pr-10 ${supported ? 'pl-10' : ''}`} />
          {supported && (
            <button 
              onClick={isListening ? stopListening : startListening}
              className={`absolute left-2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
              title={isListening ? "توقف جستجوی صوتی" : "جستجوی صوتی (فارسی، پشتو، انگلیسی)"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all', 'همه'], ['active', 'فعال'], ['inactive', 'غیرفعال'], ['debtor', 'بدهکار'], ['creditor', 'بستانکار'], ['reminder', 'یادآوری']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table / کارت موبایل */}
      <div className={`${cardBg} overflow-hidden`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                {['کد', 'نام مشتری', 'موبایل', 'تماس', 'موجودی حساب', 'کل خرید', 'یادآوری', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className={`text-right ${subText} font-medium py-3 px-4 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filtered.map(c => (
                <tr key={c.id} className={isDark ? 'table-row-hover cursor-pointer' : 'hover:bg-slate-50 transition-colors cursor-pointer'}>
                  <td className={`py-3 px-4 ${subText} text-xs font-mono`}>{c.customer_code}</td>
                  <td className="py-3 px-4" onClick={() => setHistoryCustomer(c)}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-white text-xs font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`${textColor} font-medium hover:text-indigo-400 flex items-center gap-1`}>{c.name} <ChevronRight size={12} className="text-slate-500" /></p>
                        {c.address && <p className={`${subText} text-xs truncate max-w-28`}>{c.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'} font-mono text-xs`}>{c.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {c.whatsapp && <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30"><MessageCircle size={10} /> WA</span>}
                      {c.email && <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"><Mail size={10} /></span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold text-sm ${c.balance < 0 ? 'text-rose-400' : c.balance > 0 ? 'text-emerald-400' : subText}`}>
                      {c.balance < 0 ? `${Math.abs(c.balance).toLocaleString()} ؋ بدهکار` : c.balance > 0 ? `${c.balance.toLocaleString()} ؋ بستانکار` : 'تسویه'}
                    </span>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{c.total_purchases.toLocaleString()} ؋</td>
                  <td className="py-3 px-4">
                    {c.reminder_enabled
                      ? <span className="flex items-center gap-1 text-xs text-amber-400"><Bell size={12} /> {c.reminder_days_before} روز قبل</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-600"><BellOff size={12} /> غیرفعال</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {c.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => setHistoryCustomer(c)} title="سوابق" className="p-1.5 rounded-lg glass text-slate-400 hover:text-purple-400 transition-colors"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} title="ویرایش" className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                      {(c.whatsapp || c.email) && c.balance < 0 && (
                        <button onClick={() => setMsgCustomer(c)} title="ارسال پیام" className="p-1.5 rounded-lg glass text-slate-400 hover:text-green-400 transition-colors"><Send size={14} /></button>
                      )}
                      <button onClick={() => setDeleteItem(c)} title="حذف" className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`rounded-2xl p-4 border ${
                isDark ? 'bg-slate-800/70 border-white/10' : 'bg-slate-50/90 border-slate-200 shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => setHistoryCustomer(c)}
                className="w-full flex gap-3 text-right"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white text-base font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-[15px] ${textColor} flex items-center gap-1`}>
                    {c.name}
                    <ChevronRight size={14} className={subText} />
                  </p>
                  <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{c.phone}</p>
                  {c.address && <p className={`text-[11px] ${subText} truncate mt-1`}>{c.address}</p>}
                  <p className={`text-[10px] font-mono ${subText} mt-1`}>{c.customer_code}</p>
                </div>
              </button>
              <div className={`mt-3 pt-3 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex justify-between text-sm">
                  <span className={subText}>حساب</span>
                  <span
                    className={`font-bold tabular-nums ${
                      c.balance < 0 ? 'text-rose-500' : c.balance > 0 ? 'text-emerald-600' : subText
                    }`}
                  >
                    {c.balance < 0
                      ? `${Math.abs(c.balance).toLocaleString()} ؋ بدهکار`
                      : c.balance > 0
                        ? `${c.balance.toLocaleString()} ؋ بستانکار`
                        : 'تسویه'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={subText}>خرید کل</span>
                  <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {c.total_purchases.toLocaleString()} ؋
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {c.reminder_enabled ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <Bell size={12} /> {c.reminder_days_before} روز قبل
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[11px] ${subText}`}>
                      <BellOff size={12} /> یادآوری خاموش
                    </span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                    {c.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </span>
                  <div className="flex gap-1 mr-auto">
                    {c.whatsapp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-600">WA</span>
                    )}
                    {c.email && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">@</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(c)}
                  title="سوابق"
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  title="ویرایش"
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Edit2 size={16} />
                </button>
                {(c.whatsapp || c.email) && c.balance < 0 && (
                  <button
                    type="button"
                    onClick={() => setMsgCustomer(c)}
                    title="پیام"
                    className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-green-600`}
                  >
                    <Send size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteItem(c)}
                  title="حذف"
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
        size="lg"
        title={editItem ? 'ویرایش مشتری' : 'مشتری جدید'}
        footer={
          <div className="flex gap-3">
            <button type="submit" form="customer-add-edit-form" className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold text-white">
              {editItem ? 'ذخیره' : 'ثبت مشتری'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="customer-add-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">نام کامل <span className="text-rose-400">*</span></label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><Phone size={11} className="inline ml-1" />شماره موبایل <span className="text-rose-400">*</span></label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><MessageCircle size={11} className="inline ml-1 text-green-400" />واتساپ <span className="text-slate-500">(اختیاری)</span></label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} placeholder="مثال: 0791234567" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block"><Mail size={11} className="inline ml-1 text-blue-400" />ایمیل <span className="text-slate-500">(اختیاری)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block"><MapPin size={11} className="inline ml-1" />آدرس</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 text-sm font-medium flex items-center gap-2"><Bell size={14} /> یادآوری خودکار بدهی</label>
                  <button type="button" onClick={() => setForm({ ...form, reminder_enabled: !form.reminder_enabled })}
                    className={`w-10 h-5 rounded-full transition-all relative ${form.reminder_enabled ? 'bg-amber-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.reminder_enabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.reminder_enabled && (
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">چند روز قبل از سررسید یادآوری شود؟</label>
                    <input type="number" min="1" max="30" value={form.reminder_days_before}
                      onChange={e => setForm({ ...form, reminder_days_before: +e.target.value })}
                      className={inputClass} />
                  </div>
                )}
                {(form.whatsapp || form.email) && (
                  <p className="text-amber-400/70 text-xs">✓ یادآوری از طریق {form.whatsapp ? 'واتساپ' : ''}{form.whatsapp && form.email ? ' و ' : ''}{form.email ? 'ایمیل' : ''} ارسال خواهد شد</p>
                )}
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

      {/* Modals */}
      {historyCustomer && <CustomerHistoryModal customer={historyCustomer} invoices={invoices} debts={debts} onClose={() => setHistoryCustomer(null)} />}
      {msgCustomer && <SendMessageModal customer={msgCustomer} onClose={() => setMsgCustomer(null)} />}
      {deleteItem && <DeleteConfirmModal name={deleteItem.name} onConfirm={doDelete} onClose={() => setDeleteItem(null)} />}
    </div>
  );
}
