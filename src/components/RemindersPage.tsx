import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Bell, X, CheckCircle, Clock, AlertTriangle, MessageCircle, Mail, Trash2, Edit2, StickyNote, Users, Calendar } from 'lucide-react';
import type { PersonalReminder } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';

type Tab = 'debt' | 'personal';

export default function RemindersPage() {
  const { isDark } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('debt');
  const debts = useStore(s => s.debts);
  const customers = useStore(s => s.customers);
  const personalReminders = useStore(s => s.reminders);
  const addReminder = useStore(s => s.addReminder);
  const updateReminder = useStore(s => s.updateReminder);
  const deleteReminder = useStore(s => s.deleteReminder);
  const toggleReminderDone = useStore(s => s.toggleReminderDone);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [editPersonal, setEditPersonal] = useState<PersonalReminder | null>(null);
  const [deletePersonal, setDeletePersonal] = useState<PersonalReminder | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<number[]>([]);

  const [form, setForm] = useState({
    title: '', note: '', reminder_date: '', reminder_time: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
  });

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  // Check for due personal reminders
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    personalReminders.forEach(r => {
      if (!r.is_done && r.reminder_date <= today && !notifiedIds.includes(r.id)) {
        setNotifiedIds(prev => [...prev, r.id]);
      }
    });
  }, [personalReminders, notifiedIds]);

  const overdueDebts = debts.filter(
    d => d.status === 'overdue' || d.status === 'pending' || Number(d.remaining_amount || 0) > 0
  );
  const today = new Date().toISOString().split('T')[0];
  const dueTodayPersonal = personalReminders.filter(r => !r.is_done && r.reminder_date <= today);

  const openAddPersonal = () => {
    setEditPersonal(null);
    setForm({ title: '', note: '', reminder_date: '', reminder_time: '', priority: 'normal' });
    setShowPersonalModal(true);
  };

  const openEditPersonal = (r: PersonalReminder) => {
    setEditPersonal(r);
    setForm({ title: r.title, note: r.note, reminder_date: r.reminder_date, reminder_time: r.reminder_time || '', priority: r.priority });
    setShowPersonalModal(true);
  };

  const handleSubmitPersonal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPersonal) {
      updateReminder({ ...editPersonal, ...form });
    } else {
      addReminder({
        title: form.title,
        note: form.note,
        reminder_date: form.reminder_date,
        reminder_time: form.reminder_time,
        priority: form.priority,
        is_done: false,
      });
    }
    setShowPersonalModal(false);
  };

  const toggleDone = (id: number) => {
    toggleReminderDone(id);
  };

  const doDeletePersonal = () => {
    if (deletePersonal) {
      deleteReminder(deletePersonal.id);
      setDeletePersonal(null);
    }
  };

  const handleSendWhatsApp = (customer_name: string, phone: string, amount: number) => {
    const msg = encodeURIComponent(`مشتری گرامی ${customer_name}، ${amount.toLocaleString()} افغانی بدهی معوق دارید. لطفاً برای تسویه حساب اقدام فرمایید.`);
    window.open(`https://wa.me/${phone.replace(/^0/, '93')}?text=${msg}`, '_blank');
  };

  const priorityConfig = {
    high: { label: 'بالا', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    normal: { label: 'معمولی', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    low: { label: 'پایین', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>یادآوری‌ها</h1>
          <p className={`${subText} text-sm mt-1`}>مدیریت یادآوری بدهی‌ها و یادداشت‌های شخصی</p>
        </div>
        {activeTab === 'personal' && (
          <button onClick={openAddPersonal} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            <Plus size={18} /> یادداشت جدید
          </button>
        )}
      </div>

      {/* Due Today Alert */}
      {dueTodayPersonal.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <Bell size={20} className="text-amber-400 animate-pulse" />
          <div>
            <p className="text-amber-300 font-semibold">{dueTodayPersonal.length} یادداشت امروز سررسید شده!</p>
            <p className="text-amber-400/70 text-xs mt-0.5">{dueTodayPersonal.map(r => r.title).join('، ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('debt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'debt' ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <Users size={16} /> یادآوری بدهی مشتریان
          {overdueDebts.length > 0 && <span className="bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{overdueDebts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <StickyNote size={16} /> یادداشت‌های شخصی
          {dueTodayPersonal.length > 0 && <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{dueTodayPersonal.length}</span>}
        </button>
      </div>

      {/* DEBT REMINDERS TAB */}
      {activeTab === 'debt' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'بدهی‌های باز', value: debts.filter(d => Number(d.remaining_amount || 0) > 0).length, color: textColor },
              { label: 'نیاز به پیگیری', value: overdueDebts.length, color: 'text-amber-400' },
              { label: 'مشتریان', value: customers.length, color: 'text-emerald-400' },
              { label: 'جمع مانده بدهی', value: `${debts.reduce((s, d) => s + Number(d.remaining_amount || 0), 0).toLocaleString()} ؋`, color: 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className={`${cardBg} p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`${subText} text-xs mt-1`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Overdue Debts - Quick Remind */}
          <div className={`${cardBg} p-4`}>
            <h3 className={`${textColor} font-semibold flex items-center gap-2 mb-4`}>
              <AlertTriangle size={16} className="text-rose-400" /> بدهی‌های معوق — ارسال یادآوری سریع
            </h3>
            <div className="space-y-3">
              {overdueDebts.map(d => {
                const customer = customers.find(c => c.id === d.customer_id);
                return (
                  <div key={d.id} className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm">
                        {d.customer_name.charAt(0)}
                      </div>
                      <div>
                        <p className={`${textColor} font-medium`}>{d.customer_name}</p>
                        <p className={`${subText} text-xs`}>{d.customer_phone || '—'} | سررسید: {d.due_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-rose-400 font-bold">{d.remaining_amount.toLocaleString()} ؋</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>
                          {d.status === 'overdue' ? 'معوق' : 'در انتظار'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {customer?.whatsapp && (
                          <button onClick={() => handleSendWhatsApp(d.customer_name, customer.whatsapp!, d.remaining_amount)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/40 text-xs transition-all">
                            <MessageCircle size={13} /> واتساپ
                          </button>
                        )}
                        {customer?.email && (
                          <button onClick={() => {
                            const msg = `مشتری گرامی ${d.customer_name}، ${d.remaining_amount.toLocaleString()} افغانی بدهی معوق دارید.`;
                            window.open(`mailto:${customer.email}?subject=یادآوری بدهی&body=${encodeURIComponent(msg)}`, '_blank');
                          }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/40 text-xs transition-all">
                            <Mail size={13} /> ایمیل
                          </button>
                        )}
                        {!customer?.whatsapp && !customer?.email && (
                          <span className={`text-xs ${subText}`}>تماس مستقیم: {d.customer_phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {overdueDebts.length === 0 && (
                <p className={`${subText} text-center text-sm py-4`}>هیچ بدهی معوقی وجود ندارد</p>
              )}
            </div>
          </div>

          <div className={`${cardBg} p-4`}>
            <h3 className={`${textColor} font-semibold flex items-center gap-2 mb-2`}>
              <Clock size={16} className="text-blue-400" /> تاریخچه ارسال خودکار
            </h3>
            <p className={`${subText} text-sm`}>
              لاگ پیامک/واتساپ در state فروشگاه ذخیره نمی‌شود؛ از دکمه‌های بالا برای تماس دستی استفاده کنید. دادهٔ بدهی و مشتری از همین فروشگاه است.
            </p>
          </div>
        </div>
      )}

      {/* PERSONAL NOTES TAB */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'کل یادداشت‌ها', value: personalReminders.length, color: textColor },
              { label: 'باقیمانده', value: personalReminders.filter(r => !r.is_done).length, color: 'text-amber-400' },
              { label: 'انجام شده', value: personalReminders.filter(r => r.is_done).length, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className={`${cardBg} p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`${subText} text-xs mt-1`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Due Today */}
          {dueTodayPersonal.length > 0 && (
            <div>
              <h3 className="text-amber-400 font-semibold flex items-center gap-2 mb-3">
                <Bell size={16} className="animate-bounce" /> امروز یادآوری دارید!
              </h3>
              <div className="space-y-2">
                {dueTodayPersonal.map(r => (
                  <div key={r.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-amber-400" />
                      <div>
                        <p className={`${textColor} font-bold`}>{r.title}</p>
                        <p className={`${subText} text-xs`}>{r.note}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleDone(r.id)} className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-xs flex items-center gap-1">
                      <CheckCircle size={13} /> انجام شد
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Personal Reminders */}
          <div className="space-y-3">
            {personalReminders.sort((a, b) => {
              if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
              return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
            }).map(r => {
              const pc = priorityConfig[r.priority];
              const isOverdue = !r.is_done && r.reminder_date < today;
              return (
                <div key={r.id} className={`${cardBg} p-4 flex items-start gap-4 ${r.is_done ? 'opacity-60' : ''}`}>
                  <button onClick={() => toggleDone(r.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${r.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}>
                    {r.is_done && <CheckCircle size={14} className="text-white" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`${textColor} font-semibold ${r.is_done ? 'line-through' : ''}`}>{r.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${pc.color}`}>{pc.label}</span>
                      {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">معوق</span>}
                    </div>
                    {r.note && <p className={`${subText} text-xs mt-1`}>{r.note}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-rose-400' : subText}`}>
                        <Calendar size={11} /> {r.reminder_date}
                        {r.reminder_time && ` ${r.reminder_time}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditPersonal(r)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => setDeletePersonal(r)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PERSONAL REMINDER MODAL */}
      {showPersonalModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4 sm:py-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              type="button"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="بستن"
              onClick={() => setShowPersonalModal(false)}
            />
          <div className="relative z-[1] my-auto glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] flex flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <StickyNote size={18} className="text-amber-400" />
                {editPersonal ? 'ویرایش یادداشت' : 'یادداشت جدید'}
              </h2>
              <button onClick={() => setShowPersonalModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitPersonal} className="p-5 space-y-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">عنوان <span className="text-rose-400">*</span></label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} required placeholder="مثال: پرداخت اجاره دکان" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">یادداشت</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={3}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                  placeholder="جزئیات بیشتر..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">تاریخ یادآوری <span className="text-rose-400">*</span></label>
                  <input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })}
                    className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">ساعت (اختیاری)</label>
                  <input type="time" value={form.reminder_time} onChange={e => setForm({ ...form, reminder_time: e.target.value })}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-2 block">اولویت</label>
                <div className="flex gap-2">
                  {([['low', 'پایین'], ['normal', 'معمولی'], ['high', 'بالا']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setForm({ ...form, priority: v })}
                      className={`flex-1 py-2 rounded-xl text-sm transition-all border ${form.priority === v
                        ? v === 'high' ? 'bg-rose-600/20 border-rose-500 text-rose-400' : v === 'normal' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-slate-600/20 border-slate-500 text-slate-300'
                        : 'glass border-white/10 text-slate-500'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm">
                  {editPersonal ? 'ذخیره' : 'ثبت یادداشت'}
                </button>
                <button type="button" onClick={() => setShowPersonalModal(false)} className="px-5 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">انصراف</button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRM */}
      {deletePersonal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-rose-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">آیا مطمئن هستید؟</h3>
            <p className="text-slate-400 text-sm mb-6">یادداشت <span className="text-white">"{deletePersonal.title}"</span> حذف شود؟</p>
            <div className="flex gap-3">
              <button onClick={doDeletePersonal} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl">حذف</button>
              <button onClick={() => setDeletePersonal(null)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
