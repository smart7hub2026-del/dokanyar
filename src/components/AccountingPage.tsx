import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Search, BarChart3, Wallet, ShoppingBag, ArrowUpRight, ArrowDownRight, Check, Printer, Mic, MicOff } from 'lucide-react';
import { useToast } from './Toast';
import { ConfirmModal } from './Modal';
import FormModal from './ui/FormModal';
import { useStore } from '../store/useStore';
import type { Expense } from '../store/useStore';
import { useApp } from '../context/AppContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

const expenseCategories = ['اجاره', 'خدمات', 'حقوق', 'حمل‌ونقل', 'تعمیرات', 'خرید لوازم', 'تبلیغات', 'ناهار و پذیرایی', 'سایر'];

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** رسید چاپی برای بردن نزد مدیر و دریافت نقد از صندوق */
function printExpenseVoucher(e: Expense, shop: { shop_name: string; shop_phone: string }) {
  const win = window.open('', '_blank');
  if (!win) return;
  const dash = e.description.indexOf(' - ');
  const primary = dash >= 0 ? e.description.slice(0, dash) : e.description;
  const notePart = dash >= 0 ? e.description.slice(dash + 3) : '';
  const when = new Date().toLocaleString('fa-IR');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>رسید مصرف</title>
  <style>
    body{font-family:Tahoma,sans-serif;padding:18px;max-width:420px;margin:0 auto;font-size:13px;color:#111;}
    h1{font-size:17px;border-bottom:2px solid #1e293b;padding-bottom:10px;margin:0 0 8px;}
    .muted{color:#64748b;font-size:12px;margin-bottom:16px;}
    .row{display:flex;justify-content:space-between;gap:12px;margin:10px 0;padding:8px 0;border-bottom:1px dashed #cbd5e1;}
    .amt{font-size:20px;font-weight:800;color:#0f172a;}
    .box{background:#f1f5f9;padding:12px;border-radius:10px;margin-top:8px;font-size:12px;line-height:1.6;}
    .sign{margin-top:48px;display:flex;justify-content:space-between;font-size:12px;color:#475569;}
    .foot{font-size:11px;color:#94a3b8;margin-top:20px;}
  </style></head><body>
  <h1>درخواست پرداخت هزینه (رسید داخلی)</h1>
  <p class="muted">${esc(shop.shop_name)}${shop.shop_phone ? ` — ${esc(shop.shop_phone)}` : ''}</p>
  <div class="row"><span>شماره ثبت</span><strong>#${e.id}</strong></div>
  <div class="row"><span>تاریخ هزینه</span><strong>${esc(e.date)}</strong></div>
  <div class="row"><span>دسته</span><strong>${esc(e.category)}</strong></div>
  <div class="row"><span>شرح</span><strong>${esc(primary)}</strong></div>
  ${notePart ? `<div class="box">${esc(notePart)}</div>` : ''}
  ${e.requested_by ? `<div class="row"><span>درخواست‌دهنده</span><strong>${esc(e.requested_by)}</strong></div>` : ''}
  <div class="row"><span>مبلغ قابل پرداخت از صندوق</span><span class="amt">${e.amount.toLocaleString()} ؋</span></div>
  <div class="row"><span>ثبت در سیستم</span><span>${esc(e.paid_by)}</span></div>
  <p class="foot">چاپ برای امضا و تأیید مدیر: پس از پرداخت نقد، در صندوق یا حسابداری ثبت شود.</p>
  <p class="foot">زمان چاپ: ${esc(when)}</p>
  <div class="sign"><span>________________<br/>امضای درخواست‌دهنده</span><span>________________<br/>تأیید و پرداخت مدیر / صندوقدار</span></div>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
}

export default function AccountingPage() {
  const { t } = useApp();
  const { success, error } = useToast();
  const [tab, setTab] = useState<'overview' | 'expenses' | 'cashbox' | 'returns'>('overview');
  
  const storeExpenses = useStore(s => s.expenses);
  const storeAddExpense = useStore(s => s.addExpense);
  const storeDeleteExpense = useStore(s => s.deleteExpense);
  
  const storeCashEntries = useStore(s => s.cashEntries);
  const storeAddCashEntry = useStore(s => s.addCashEntry);
  const returns = useStore(s => s.productReturns);
  const storeAddProductReturn = useStore(s => s.addProductReturn);
  const storeUpdateProductReturn = useStore(s => s.updateProductReturn);
  const storeDeleteProductReturn = useStore(s => s.deleteProductReturn);

  const expenses = storeExpenses;
  const cashBox = storeCashEntries;
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCash, setShowAddCash] = useState(false);
  const [showAddReturn, setShowAddReturn] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'expense' | 'cash' | 'return'>('expense');
  const [search, setSearch] = useState('');
  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  // Expense form
  const [expForm, setExpForm] = useState({
    title: '',
    amount: '',
    category: 'اجاره',
    date: new Date().toISOString().split('T')[0],
    note: '',
    requested_by: '',
  });
  // Cash form
  const [cashForm, setCashForm] = useState({ type: 'in' as 'in' | 'out', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  // Return form
  const [retForm, setRetForm] = useState({ invoice_number: '', customer_name: '', product_name: '', quantity: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });

  // Store Data
  const storeInvoices = useStore(s => s.invoices);
  const storeProducts = useStore(s => s.products);
  const shopSettings = useStore(s => s.shopSettings);
  const currentUser = useStore(s => s.currentUser);
  const addPendingApproval = useStore(s => s.addPendingApproval);
  const reportStaffActivityToAdmins = useStore(s => s.reportStaffActivityToAdmins);

  const isShopAdmin = currentUser?.role === 'admin';

  // Calculations
  const totalSales = storeInvoices.reduce((s, inv) => s + inv.total, 0);
  
  // Calculate total cost based on items sold and their purchase price
  const totalCost = storeInvoices.reduce((s, inv) => {
    return s + inv.items.reduce((itemSum, item) => {
      const product = storeProducts.find(p => p.id === item.product_id);
      const costPrice = product ? product.purchase_price : 0;
      return itemSum + (costPrice * item.quantity);
    }, 0);
  }, 0);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalSales - totalCost;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

  const cashIn = cashBox.filter(c => c.type === 'in').reduce((s, c) => s + c.amount, 0);
  const cashOut = cashBox.filter(c => c.type === 'out').reduce((s, c) => s + c.amount, 0);
  const cashBalance = cashIn - cashOut;

  const addExpense = () => {
    if (!expForm.title || !expForm.amount) { error('خطا', 'عنوان و مبلغ الزامی است'); return; }
    const payer = currentUser?.full_name?.trim() || 'سیستم';
    const desc = `${expForm.title}${expForm.note ? ` - ${expForm.note}` : ''}`;
    if (isShopAdmin) {
      storeAddExpense({
        amount: +expForm.amount,
        category: expForm.category,
        date: expForm.date,
        description: desc,
        paid_by: payer,
        requested_by: expForm.requested_by.trim() || undefined,
      });
      success('مصرف ثبت شد', `${expForm.title} — ${Number(expForm.amount).toLocaleString()} ؋`);
    } else {
      addPendingApproval({
        type: 'staff_expense',
        title: `مصارف: ${expForm.title}`,
        description: `${Number(expForm.amount).toLocaleString()} ؋ — ${expForm.category}`,
        data: {
          amount: +expForm.amount,
          category: expForm.category,
          date: expForm.date,
          description: desc,
          paid_by: payer,
          requested_by: expForm.requested_by.trim() || undefined,
        },
        submitted_by: payer,
        submitted_by_role: currentUser?.role || '',
      });
      reportStaffActivityToAdmins(
        'درخواست ثبت مصارف',
        `${payer}: ${expForm.title} — ${Number(expForm.amount).toLocaleString()} ؋`,
        currentUser?.id ?? 0,
        payer
      );
      success('ارسال شد', 'پس از تأیید مدیر در «تأیید فروش» در حسابداری ثبت می‌شود.');
    }
    setExpForm({
      title: '',
      amount: '',
      category: 'اجاره',
      date: new Date().toISOString().split('T')[0],
      note: '',
      requested_by: '',
    });
    setShowAddExpense(false);
  };

  const addCash = () => {
    if (!cashForm.amount || !cashForm.description) { error('خطا', 'مبلغ و توضیح الزامی است'); return; }
    if (isShopAdmin) {
      storeAddCashEntry({
        type: cashForm.type, amount: +cashForm.amount,
        description: cashForm.description, date: cashForm.date,
      });
      success('صندوق بروزرسانی شد');
    } else {
      addPendingApproval({
        type: 'staff_cash',
        title: cashForm.type === 'in' ? 'ورود به صندوق' : 'خروج از صندوق',
        description: `${Number(cashForm.amount).toLocaleString()} ؋ — ${cashForm.description}`,
        data: {
          type: cashForm.type,
          amount: +cashForm.amount,
          description: cashForm.description,
          date: cashForm.date,
          created_by: currentUser?.full_name,
        },
        submitted_by: currentUser?.full_name || 'کاربر',
        submitted_by_role: currentUser?.role || '',
      });
      reportStaffActivityToAdmins(
        'درخواست تراکنش صندوق',
        `${currentUser?.full_name}: ${cashForm.type === 'in' ? 'ورود' : 'خروج'} ${Number(cashForm.amount).toLocaleString()} ؋`,
        currentUser?.id ?? 0,
        currentUser?.full_name || 'کاربر'
      );
      success('ارسال شد', 'پس از تأیید مدیر اعمال می‌شود.');
    }
    setCashForm({ type: 'in', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddCash(false);
  };

  const addReturn = () => {
    if (!retForm.invoice_number || !retForm.product_name || !retForm.amount) { error('خطا', 'اطلاعات ناقص است'); return; }
    if (isShopAdmin) {
      storeAddProductReturn({
        invoice_number: retForm.invoice_number,
        customer_name: retForm.customer_name,
        product_name: retForm.product_name,
        quantity: +retForm.quantity || 1,
        amount: +retForm.amount,
        reason: retForm.reason,
        date: retForm.date,
        status: 'pending',
      });
      success('مرجوعی ثبت شد');
    } else {
      addPendingApproval({
        type: 'staff_return',
        title: `مرجوعی: ${retForm.product_name}`,
        description: `فاکتور ${retForm.invoice_number} — ${Number(retForm.amount).toLocaleString()} ؋`,
        data: {
          invoice_number: retForm.invoice_number,
          customer_name: retForm.customer_name,
          product_name: retForm.product_name,
          quantity: +retForm.quantity || 1,
          amount: +retForm.amount,
          reason: retForm.reason,
          date: retForm.date,
          status: 'pending' as const,
        },
        submitted_by: currentUser?.full_name || 'کاربر',
        submitted_by_role: currentUser?.role || '',
      });
      reportStaffActivityToAdmins(
        'درخواست ثبت مرجوعی',
        `${currentUser?.full_name}: ${retForm.product_name} — ${retForm.invoice_number}`,
        currentUser?.id ?? 0,
        currentUser?.full_name || 'کاربر'
      );
      success('ارسال شد', 'پس از تأیید مدیر در لیست مرجوعی ثبت می‌شود.');
    }
    setRetForm({ invoice_number: '', customer_name: '', product_name: '', quantity: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
    setShowAddReturn(false);
  };

  const doDelete = () => {
    if (deleteType === 'expense' && deleteId) storeDeleteExpense(deleteId);
    // cashBox delete is not exposed in store currently, but we can add it if needed
    // if (deleteType === 'cash') storeDeleteCashEntry(deleteId);
    if (deleteType === 'return' && deleteId) storeDeleteProductReturn(deleteId);
    success('حذف شد');
    setDeleteId(null);
  };

  const categoryColors: Record<string, string> = {
    'اجاره': 'text-rose-400 bg-rose-500/10',
    'خدمات': 'text-blue-400 bg-blue-500/10',
    'حقوق': 'text-amber-400 bg-amber-500/10',
    'حمل‌ونقل': 'text-purple-400 bg-purple-500/10',
    'تعمیرات': 'text-orange-400 bg-orange-500/10',
    'سایر': 'text-slate-400 bg-slate-500/10',
    'خرید لوازم': 'text-cyan-400 bg-cyan-500/10',
    'تبلیغات': 'text-pink-400 bg-pink-500/10',
    'ناهار و پذیرایی': 'text-lime-400 bg-lime-500/10',
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={24} className="text-indigo-400" /> {t('accounting')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('shop_management')}</p>
        </div>
        <div className="flex gap-2 glass rounded-xl p-1 flex-wrap">
          {[['overview', 'نمای کلی', BarChart3], ['expenses', 'مصارف', TrendingDown], ['cashbox', 'صندوق', Wallet], ['returns', 'مرجوعی', ShoppingBag]].map(([key, label, Icon]) => (
            <button key={key as string} onClick={() => setTab(key as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={13} />{label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'کل فروش', value: totalSales, color: 'text-emerald-400', icon: TrendingUp, bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'سود ناخالص', value: grossProfit, color: 'text-blue-400', icon: ArrowUpRight, bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'کل مصارف', value: totalExpenses, color: 'text-rose-400', icon: TrendingDown, bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: 'سود خالص', value: netProfit, color: netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: DollarSign, bg: netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20' },
            ].map(item => (
              <div key={item.label} className={`glass rounded-2xl p-5 border ${item.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <item.icon size={20} className={item.color} />
                  <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                </div>
                <p className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString()} ؋</p>
              </div>
            ))}
          </div>

          {/* Profit Analysis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">تحلیل سود</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>حاشیه سود خالص</span><span className="text-emerald-400 font-bold">{profitMargin}%</span></div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, +profitMargin))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>هزینه به فروش</span><span className="text-blue-400">{((totalExpenses / totalSales) * 100).toFixed(1)}%</span></div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(totalExpenses / totalSales) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">صندوق نقدی</h3>
              <div className="text-center">
                <p className={`text-3xl font-bold ${cashBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{cashBalance.toLocaleString()} ؋</p>
                <p className="text-slate-400 text-xs mt-1">موجودی فعلی</p>
                <div className="flex gap-2 mt-4">
                  <div className="flex-1 bg-emerald-500/10 rounded-xl p-2 text-center">
                    <p className="text-emerald-400 text-sm font-bold">{cashIn.toLocaleString()}</p>
                    <p className="text-slate-500 text-xs">دریافتی</p>
                  </div>
                  <div className="flex-1 bg-rose-500/10 rounded-xl p-2 text-center">
                    <p className="text-rose-400 text-sm font-bold">{cashOut.toLocaleString()}</p>
                    <p className="text-slate-500 text-xs">پرداختی</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">توزیع مصارف</h3>
              <div className="space-y-2">
                {Object.entries(
                  expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`${categoryColors[cat]?.split(' ')[0] || 'text-slate-400'}`}>{cat}</span>
                      <span className="text-slate-400">{amt.toLocaleString()} ؋</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(amt / totalExpenses) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">صورت سود و زیان</h3>
            <div className="space-y-2 text-sm max-w-md">
              {[
                { label: 'درآمد فروش', value: totalSales, type: 'income' },
                { label: 'هزینه کالا (COGS)', value: -totalCost, type: 'expense' },
                { label: 'سود ناخالص', value: grossProfit, type: 'profit', border: true },
                { label: 'مصارف عملیاتی', value: -totalExpenses, type: 'expense' },
                { label: 'سود خالص', value: netProfit, type: netProfit >= 0 ? 'profit' : 'loss', border: true, bold: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between items-center py-2 ${row.border ? 'border-t border-white/10 mt-1' : ''}`}>
                  <span className={row.bold ? 'text-white font-bold' : 'text-slate-300'}>{row.label}</span>
                  <span className={`font-medium ${row.type === 'income' ? 'text-emerald-400' : row.type === 'expense' ? 'text-rose-400' : row.type === 'profit' ? 'text-blue-400' : 'text-rose-500'} ${row.bold ? 'text-base font-bold' : ''}`}>
                    {row.value >= 0 ? '' : '−'} {Math.abs(row.value).toLocaleString()} ؋
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در مصارف..."
                className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-9 text-white text-sm focus:border-indigo-500 ${voiceOk ? 'pl-11' : ''}`} />
              {voiceOk && (
                <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
            <button onClick={() => setShowAddExpense(true)} className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> ثبت مصرف
            </button>
          </div>

          <FormModal
            open={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            title="ثبت مصرف جدید"
            size="md"
            footer={
              <div className="flex gap-3">
                <button type="button" onClick={addExpense} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white btn-primary">
                  <Check size={15} /> ثبت
                </button>
                <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass">
                  انصراف
                </button>
              </div>
            }
          >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-slate-400 text-xs block mb-1">عنوان مصرف *</label>
                      <input value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">مبلغ (؋) *</label>
                      <input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">دسته‌بندی</label>
                      <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500">
                        {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">تاریخ</label>
                      <input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">یادداشت</label>
                      <input value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-slate-400 text-xs block mb-1">درخواست‌دهنده (مثلاً نام شما برای رسید چاپی)</label>
                      <input
                        value={expForm.requested_by}
                        onChange={e => setExpForm({ ...expForm, requested_by: e.target.value })}
                        placeholder="مثلاً: احمد — فروشنده"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                      />
                      <p className="text-slate-500 text-[11px] mt-1">بعد از ثبت از ستون چاپ، رسید را بگیرید و نزد مدیر ببرید تا از صندوق پرداخت شود.</p>
                    </div>
                  </div>
          </FormModal>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10">
                    {['عنوان', 'دسته', 'مبلغ', 'تاریخ', 'ثبت‌کننده', 'درخواست‌دهنده', 'چاپ', 'عملیات'].map(h => (
                      <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.filter(e => e.description.includes(search) || e.category.includes(search)).map(exp => (
                    <tr key={exp.id} className="table-row-hover">
                      <td className="py-3 px-4">
                        <p className="text-white text-xs font-medium">{exp.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[exp.category] || 'text-slate-400 bg-slate-500/10'}`}>{exp.category}</span>
                      </td>
                      <td className="py-3 px-4 text-rose-400 font-bold text-xs">{exp.amount.toLocaleString()} ؋</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{exp.date}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{exp.paid_by}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs max-w-[120px] truncate" title={exp.requested_by || ''}>
                        {exp.requested_by || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          title="چاپ رسید درخواست پرداخت"
                          onClick={() => printExpenseVoucher(exp, { shop_name: shopSettings.shop_name, shop_phone: shopSettings.shop_phone })}
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-indigo-400 transition-colors"
                        >
                          <Printer size={13} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => { setDeleteId(exp.id); setDeleteType('expense'); }}
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expenses.length === 0 && (
                <div className="text-center py-12 text-slate-500"><TrendingDown size={32} className="mx-auto mb-2 opacity-30" /><p>مصرفی ثبت نشده</p></div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-slate-400 text-xs">جمع کل مصارف</span>
              <span className="text-rose-400 font-bold">{totalExpenses.toLocaleString()} ؋</span>
            </div>
          </div>
        </div>
      )}

      {/* Cash Box */}
      {tab === 'cashbox' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4 border border-emerald-500/20">
              <p className="text-slate-400 text-xs mb-1">کل دریافتی</p>
              <p className="text-emerald-400 font-bold text-xl">{cashIn.toLocaleString()} ؋</p>
            </div>
            <div className="glass rounded-2xl p-4 border border-rose-500/20">
              <p className="text-slate-400 text-xs mb-1">کل پرداختی</p>
              <p className="text-rose-400 font-bold text-xl">{cashOut.toLocaleString()} ؋</p>
            </div>
            <div className={`glass rounded-2xl p-4 border ${cashBalance >= 0 ? 'border-blue-500/20' : 'border-rose-500/20'}`}>
              <p className="text-slate-400 text-xs mb-1">موجودی صندوق</p>
              <p className={`font-bold text-xl ${cashBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{cashBalance.toLocaleString()} ؋</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowAddCash(true)} className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> ثبت تراکنش
            </button>
          </div>

          <FormModal
            open={showAddCash}
            onClose={() => setShowAddCash(false)}
            title="ثبت تراکنش صندوق"
            size="md"
            footer={
              <div className="flex gap-3">
                <button type="button" onClick={addCash} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white btn-primary">
                  <Check size={15} /> ثبت
                </button>
                <button type="button" onClick={() => setShowAddCash(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass">
                  انصراف
                </button>
              </div>
            }
          >
                  <div className="flex gap-2">
                    <button onClick={() => setCashForm({ ...cashForm, type: 'in' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${cashForm.type === 'in' ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400 glass'}`}>
                      ورود (+)
                    </button>
                    <button onClick={() => setCashForm({ ...cashForm, type: 'out' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${cashForm.type === 'out' ? 'bg-rose-600/30 border-rose-500 text-rose-300' : 'border-slate-700 text-slate-400 glass'}`}>
                      خروج (−)
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">مبلغ (؋) *</label>
                      <input type="number" value={cashForm.amount} onChange={e => setCashForm({ ...cashForm, amount: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">توضیح *</label>
                      <input value={cashForm.description} onChange={e => setCashForm({ ...cashForm, description: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">تاریخ</label>
                      <input type="date" value={cashForm.date} onChange={e => setCashForm({ ...cashForm, date: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                  </div>
          </FormModal>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10">
                    {['نوع', 'توضیح', 'مبلغ', 'تاریخ', 'ثبت‌کننده', 'عملیات'].map(h => (
                      <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cashBox.map(cb => (
                    <tr key={cb.id} className="table-row-hover">
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${cb.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {cb.type === 'in' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {cb.type === 'in' ? 'دریافت' : 'پرداخت'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white text-xs">{cb.description}</td>
                      <td className={`py-3 px-4 font-bold text-xs ${cb.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {cb.type === 'in' ? '+' : '−'}{cb.amount.toLocaleString()} ؋
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{cb.date}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{cb.created_by || 'سیستم'}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => { setDeleteId(cb.id); setDeleteType('cash'); }}
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Returns */}
      {tab === 'returns' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddReturn(true)} className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> ثبت مرجوعی
            </button>
          </div>

          <FormModal
            open={showAddReturn}
            onClose={() => setShowAddReturn(false)}
            title="ثبت مرجوعی"
            size="md"
            footer={
              <div className="flex gap-3">
                <button type="button" onClick={addReturn} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white btn-primary">
                  <Check size={15} /> ثبت
                </button>
                <button type="button" onClick={() => setShowAddReturn(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass">
                  انصراف
                </button>
              </div>
            }
          >
                  <div className="space-y-3">
                  {[
                    ['شماره فاکتور *', 'invoice_number', 'text'],
                    ['نام مشتری', 'customer_name', 'text'],
                    ['نام محصول *', 'product_name', 'text'],
                    ['تعداد', 'quantity', 'number'],
                    ['مبلغ مرجوعی (؋) *', 'amount', 'number'],
                    ['دلیل مرجوعی', 'reason', 'text'],
                  ].map(([label, field, type]) => (
                    <div key={field as string}>
                      <label className="text-slate-400 text-xs block mb-1">{label as string}</label>
                      <input type={type as string} value={(retForm as any)[field as string]}
                        onChange={e => setRetForm({ ...retForm, [field as string]: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
                    </div>
                  ))}
                  </div>
          </FormModal>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10">
                    {['فاکتور', 'مشتری', 'محصول', 'تعداد', 'مبلغ', 'دلیل', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                      <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {returns.map(ret => (
                    <tr key={ret.id} className="table-row-hover">
                      <td className="py-3 px-4 text-indigo-400 font-mono text-xs">{ret.invoice_number}</td>
                      <td className="py-3 px-4 text-white text-xs">{ret.customer_name}</td>
                      <td className="py-3 px-4 text-slate-300 text-xs">{ret.product_name}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{ret.quantity}</td>
                      <td className="py-3 px-4 text-rose-400 font-bold text-xs">{ret.amount.toLocaleString()} ؋</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{ret.reason}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{ret.date}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ret.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                          {ret.status === 'approved' ? 'تأیید شده' : 'در انتظار'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {ret.status === 'pending' && (
                            <button onClick={() => { storeUpdateProductReturn({ ...ret, status: 'approved' }); success('مرجوعی تأیید شد'); }}
                              className="p-1.5 rounded-lg glass text-slate-400 hover:text-emerald-400 transition-colors" title="تأیید">
                              <Check size={13} />
                            </button>
                          )}
                          <button onClick={() => { setDeleteId(ret.id); setDeleteType('return'); }}
                            className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {returns.length === 0 && (
                <div className="text-center py-12 text-slate-500"><ShoppingBag size={32} className="mx-auto mb-2 opacity-30" /><p>مرجوعی ثبت نشده</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={doDelete}
        title="حذف" message="آیا مطمئن هستید؟ این عملیات قابل بازگشت نیست." />
    </div>
  );
}
