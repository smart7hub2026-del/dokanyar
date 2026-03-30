import { useState, useMemo } from 'react';
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, MessageCircle, Phone, CreditCard, Filter, Mic, MicOff } from 'lucide-react';
import { Debt } from '../data/mockData';
import { useToast } from './Toast';
import Modal from './Modal';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

function effectiveDebtStatus(d: Debt): Debt['status'] {
  if (d.status === 'paid' || d.remaining_amount <= 0) return 'paid';
  const due = d.due_date ? new Date(d.due_date) : null;
  if (due) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < t) return 'overdue';
  }
  return d.status === 'partial' ? 'partial' : 'pending';
}

export default function DebtsPage() {
  const { t } = useApp();
  const { success, info } = useToast();
  const debts = useStore(s => s.debts);
  const payDebt = useStore(s => s.payDebt);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [payModal, setPayModal] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const debtsWithStatus = useMemo(
    () => debts.map(d => ({ ...d, eff: effectiveDebtStatus(d) })),
    [debts]
  );

  const filtered = debtsWithStatus.filter(d => {
    const matchSearch = d.customer_name.includes(search) || d.invoice_number.includes(search) || d.customer_phone.includes(search);
    const matchFilter = filter === 'all' || d.eff === filter;
    return matchSearch && matchFilter;
  });

  const totalDebt = debts.reduce((s, d) => s + d.remaining_amount, 0);
  const overdueDebt = debtsWithStatus.filter(d => d.eff === 'overdue').reduce((s, d) => s + d.remaining_amount, 0);
  const partialDebt = debtsWithStatus.filter(d => d.eff === 'partial').reduce((s, d) => s + d.remaining_amount, 0);

  const statusColor: Record<string, string> = {
    pending: 'badge-blue', partial: 'badge-yellow', paid: 'badge-green', overdue: 'badge-red',
  };
  const statusLabel: Record<string, string> = {
    pending: 'در انتظار', partial: 'جزئی', paid: 'تسویه', overdue: 'معوق',
  };

  const openPayModal = (debtId: number) => {
    const full = debts.find(x => x.id === debtId);
    if (full) setPayModal(full);
    setPayAmount('');
    setPayNote('');
  };

  const handlePayment = () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { info('مبلغ را وارد کنید'); return; }
    if (amount > payModal.remaining_amount) { info('مبلغ بیشتر از مانده است'); return; }

    payDebt(payModal.id, amount);
    success('پرداخت ثبت شد', `${amount.toLocaleString()} ؋ دریافت شد`);
    setPayModal(null);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('manage_debts')}</h1>
          <p className="text-slate-400 text-sm mt-1">{debts.filter(d => d.status !== 'paid').length} بدهی فعال</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'کل بدهی', value: `${(totalDebt/1000).toFixed(1)}K ؋`, color: 'text-white', icon: DollarSign, bg: 'bg-slate-500/10' },
          { label: 'معوق', value: `${(overdueDebt/1000).toFixed(1)}K ؋`, color: 'text-rose-400', icon: AlertTriangle, bg: 'bg-rose-500/10' },
          { label: 'جزئی', value: `${(partialDebt/1000).toFixed(1)}K ؋`, color: 'text-amber-400', icon: Clock, bg: 'bg-amber-500/10' },
          { label: 'تسویه‌ها', value: debts.filter(d => d.status === 'paid').length, color: 'text-emerald-400', icon: CheckCircle, bg: 'bg-emerald-500/10' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 text-xs">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو (نام مشتری، شماره فاکتور)..."
            className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 ${voiceOk ? 'pl-11' : ''}`} />
          {voiceOk && (
            <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          {[['all', 'همه'], ['pending', 'انتظار'], ['partial', 'جزئی'], ['overdue', 'معوق'], ['paid', 'تسویه']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table — دسکتاپ */}
      <div className="glass rounded-2xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 border-b border-white/10">
                {['فاکتور', 'مشتری', 'موبایل', 'مبلغ اصلی', 'پرداخت شده', 'مانده', 'سررسید', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(d => {
                const isOverdue = d.eff === 'overdue';
                const rowStatus = d.eff;
                return (
                  <tr key={d.id} className={`table-row-hover ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-3 px-4 text-indigo-400 font-mono text-xs font-bold">{d.invoice_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500/30 to-orange-500/30 flex items-center justify-center text-white text-xs font-bold">
                          {d.customer_name.charAt(0)}
                        </div>
                        <span className="text-white text-xs font-medium">{d.customer_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <a href={`tel:${d.customer_phone}`} className="flex items-center gap-1 text-slate-400 hover:text-blue-400 text-xs transition-colors">
                        <Phone size={12} /> {d.customer_phone}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium text-xs">{d.amount.toLocaleString()} ؋</td>
                    <td className="py-3 px-4 text-emerald-400 font-medium text-xs">{d.paid_amount.toLocaleString()} ؋</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold text-sm ${isOverdue ? 'text-rose-400' : d.status === 'partial' ? 'text-amber-400' : 'text-white'}`}>
                        {d.remaining_amount.toLocaleString()} ؋
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {isOverdue && '⚠️ '}{d.due_date}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[rowStatus]}`}>{statusLabel[rowStatus]}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {rowStatus !== 'paid' && (
                          <button onClick={() => openPayModal(d.id)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg btn-success text-white text-xs">
                            <CreditCard size={11} /> دریافت
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-lg glass text-slate-400 hover:text-green-400 transition-colors"
                          title="ارسال پیام"
                          onClick={() => info('ارسال پیام', `پیام به ${d.customer_name} ارسال می‌شود`)}
                        >
                          <MessageCircle size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">بدهی‌ای یافت نشد</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* کارت‌ها — موبایل */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl py-12 text-center text-slate-500">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">بدهی‌ای یافت نشد</p>
          </div>
        ) : (
          filtered.map(d => {
            const isOverdue = d.eff === 'overdue';
            const rowStatus = d.eff;
            return (
              <div
                key={d.id}
                className={`glass rounded-2xl p-4 space-y-3 border border-white/5 ${isOverdue ? 'bg-rose-500/5' : ''}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500/30 to-orange-500/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {d.customer_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold truncate">{d.customer_name}</p>
                      <p className="text-indigo-400 font-mono text-xs font-bold">{d.invoice_number}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full shrink-0 ${statusColor[rowStatus]}`}>
                    {statusLabel[rowStatus]}
                  </span>
                </div>
                <a href={`tel:${d.customer_phone}`} className="flex items-center gap-1 text-slate-400 text-xs">
                  <Phone size={12} /> {d.customer_phone}
                </a>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">مانده</span>
                    <p className={`font-black text-sm ${isOverdue ? 'text-rose-400' : 'text-white'}`}>
                      {d.remaining_amount.toLocaleString()} ؋
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">سررسید</span>
                    <p className={`text-xs ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {isOverdue && '⚠️ '}{d.due_date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {rowStatus !== 'paid' && (
                    <button
                      onClick={() => openPayModal(d.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl btn-success text-white text-xs font-bold"
                    >
                      <CreditCard size={12} /> دریافت
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-2.5 rounded-xl glass text-slate-400"
                    title="ارسال پیام"
                    onClick={() => info('ارسال پیام', `پیام به ${d.customer_name} ارسال می‌شود`)}
                  >
                    <MessageCircle size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        open={payModal !== null}
        onClose={() => setPayModal(null)}
        title="ثبت پرداخت"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={handlePayment} className="flex-1 btn-success text-white font-semibold py-2.5 rounded-xl text-sm">
              ثبت پرداخت
            </button>
            <button onClick={() => setPayModal(null)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">
              انصراف
            </button>
          </>
        }
      >
        {payModal && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">مشتری</span>
                <span className="text-white font-medium">{payModal.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">فاکتور</span>
                <span className="text-indigo-400 font-mono">{payModal.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">مبلغ کل</span>
                <span className="text-white">{payModal.amount.toLocaleString()} ؋</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">پرداخت شده</span>
                <span className="text-emerald-400">{payModal.paid_amount.toLocaleString()} ؋</span>
              </div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-2">
                <span className="text-slate-300">مانده</span>
                <span className="text-rose-400 text-lg">{payModal.remaining_amount.toLocaleString()} ؋</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block">مبلغ دریافتی (افغانی) *</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                max={payModal.remaining_amount}
                min="1"
                placeholder={`حداکثر ${payModal.remaining_amount.toLocaleString()} ؋`}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 text-lg font-bold"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              {[payModal.remaining_amount, Math.floor(payModal.remaining_amount / 2), Math.floor(payModal.remaining_amount / 4)].map((amt, i) => (
                <button key={i} onClick={() => setPayAmount(String(amt))}
                  className="flex-1 py-2 glass rounded-xl text-slate-300 text-xs hover:text-white hover:border-indigo-500 border border-transparent transition-all">
                  {i === 0 ? 'کامل' : i === 1 ? 'نصف' : 'ربع'}
                  <br /><span className="text-xs text-slate-500">{amt.toLocaleString()} ؋</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block">یادداشت (اختیاری)</label>
              <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="مثلاً: پرداخت نقدی"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
