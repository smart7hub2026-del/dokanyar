import { useMemo, useState } from 'react';
import { Users, Plus, Edit2, Trash2, DollarSign, Check, Search, Printer, Calendar, Mic, MicOff } from 'lucide-react';
import { useToast } from './Toast';
import { ConfirmModal } from './Modal';
import FormModal from './ui/FormModal';
import { useApp } from '../context/AppContext';
import { useStore, type StaffMember } from '../store/useStore';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface SalaryPayment {
  id: string;
  staff_id: number;
  staff_name: string;
  amount: number;
  for_month: string;
  payment_date: string;
  notes: string;
}

function paymentsFromStaff(staff: StaffMember[]): SalaryPayment[] {
  const rows: SalaryPayment[] = [];
  staff.forEach(s => {
    [...s.paid_months].sort().reverse().forEach(m => {
      rows.push({
        id: `${s.id}-${m}`,
        staff_id: s.id,
        staff_name: s.full_name,
        amount: s.salary,
        for_month: m,
        payment_date: `${m}-01`,
        notes: s.salary_payment_notes?.[m] || '',
      });
    });
  });
  return rows.sort((a, b) => b.for_month.localeCompare(a.for_month));
}

function printSalaryHistory(
  payments: SalaryPayment[],
  shopName: string,
  staffRows: { active: number; monthlyTotal: number }
) {
  const win = window.open('', '_blank');
  if (!win) return;
  const when = new Date().toLocaleString('fa-IR');
  const rows = payments
    .map(
      p => `<tr>
      <td>${p.staff_name}</td><td>${p.for_month}</td><td>${p.amount.toLocaleString()}</td>
      <td>${p.notes ? p.notes.replace(/</g, '&lt;') : '—'}</td>
    </tr>`
    )
    .join('');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>سابقه حقوق</title>
  <style>
    body{font-family:Tahoma,sans-serif;padding:16px;font-size:12px;}
    h1{font-size:15px;margin:0 0 4px;} .sub{color:#64748b;font-size:11px;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:6px;text-align:right;}
    th{background:#f1f5f9;font-size:11px;}
    .sum{margin-top:12px;font-size:12px;}
  </style></head><body>
  <h1>گزارش پرداخت حقوق — ${shopName.replace(/</g, '&lt;')}</h1>
  <p class="sub">چاپ ${when} — کارمندان فعال: ${staffRows.active} — جمع حقوق ماهانه: ${staffRows.monthlyTotal.toLocaleString()} ؋</p>
  <table><thead><tr><th>کارمند</th><th>ماه</th><th>مبلغ (؋)</th><th>یادداشت</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="sum"><strong>جمع پرداخت‌های فهرست:</strong> ${payments.reduce((s, p) => s + p.amount, 0).toLocaleString()} ؋</p>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
}

export default function StaffPage() {
  const { success, error } = useToast();
  const { isDark, t } = useApp();
  const shopSettings = useStore(s => s.shopSettings);
  const staff = useStore(s => s.staff);
  const addStaff = useStore(s => s.addStaff);
  const updateStaff = useStore(s => s.updateStaff);
  const deleteStaff = useStore(s => s.deleteStaff);
  const payStaffSalary = useStore(s => s.payStaffSalary);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const enriched = useMemo(
    () =>
      staff.map(s => ({
        ...s,
        hire_date: s.join_date,
        salary_paid: s.paid_months.reduce((sum, _m) => sum + s.salary, 0),
        salary_due: s.status === 'active' && !s.paid_months.includes(currentMonth) ? s.salary : 0,
      })),
    [staff, currentMonth]
  );

  const payments = useMemo(() => paymentsFromStaff(staff), [staff]);

  const [tab, setTab] = useState<'staff' | 'salaries'>('staff');
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<StaffMember | null>(null);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const [form, setForm] = useState({
    full_name: '',
    role: 'فروشنده',
    phone: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    attendance_note: '',
    notes: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [payAmount, setPayAmount] = useState('');
  const [payMonth, setPayMonth] = useState(currentMonth);
  const [payNote, setPayNote] = useState('');

  const handleAdd = () => {
    if (!form.full_name || !form.salary) {
      error('خطا', 'نام و حقوق الزامی است');
      return;
    }
    const sal = +form.salary;
    const noteTrim = form.notes.trim();
    const contractEnd = form.contract_end_date.trim();
    const attendTrim = form.attendance_note.trim();
    if (editStaff) {
      updateStaff({
        ...editStaff,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone,
        salary: sal,
        join_date: form.hire_date,
        status: form.status,
        notes: noteTrim || undefined,
        contract_end_date: contractEnd || undefined,
        attendance_note: attendTrim || undefined,
      });
      success('کارمند بروزرسانی شد');
    } else {
      addStaff({
        full_name: form.full_name,
        role: form.role,
        phone: form.phone,
        salary: sal,
        join_date: form.hire_date,
        status: 'active',
        notes: noteTrim || undefined,
        contract_end_date: contractEnd || undefined,
        attendance_note: attendTrim || undefined,
      });
      success('کارمند اضافه شد');
    }
    setShowAdd(false);
    setEditStaff(null);
    setForm({
      full_name: '',
      role: 'فروشنده',
      phone: '',
      salary: '',
      hire_date: new Date().toISOString().split('T')[0],
      contract_end_date: '',
      attendance_note: '',
      notes: '',
      status: 'active',
    });
  };

  const handlePayment = () => {
    if (!showPayment || !payAmount) {
      error('خطا', 'مبلغ الزامی است');
      return;
    }
    const amt = +payAmount;
    if (showPayment.paid_months.includes(payMonth)) {
      error('خطا', 'این ماه برای این کارمند قبلاً به‌عنوان «پرداخت‌شده» ثبت شده است');
      return;
    }
    if (amt < showPayment.salary) {
      error('خطا', 'در مدل فعلی فقط پرداخت کامل حقوق ماهانه ثبت می‌شود؛ مبلغ را برابر حقوق ماهانه قرار دهید');
      return;
    }
    payStaffSalary(showPayment.id, payMonth, { note: payNote.trim() || undefined });
    success('پرداخت حقوق ثبت شد', `${showPayment.full_name} — ${payMonth}`);
    setShowPayment(null);
    setPayAmount('');
    setPayNote('');
  };

  const totalSalaryDue = enriched.filter(s => s.status === 'active').reduce((sum, s) => sum + s.salary_due, 0);
  const totalSalaryPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const roles = ['مدیر', 'فروشنده', 'انباردار', 'حسابدار', 'نگهبان', 'سایر'];

  const openEdit = (s: StaffMember) => {
    setEditStaff(s);
    setForm({
      full_name: s.full_name,
      role: s.role,
      phone: s.phone,
      salary: String(s.salary),
      hire_date: s.join_date,
      contract_end_date: s.contract_end_date || '',
      attendance_note: s.attendance_note || '',
      notes: s.notes || '',
      status: s.status,
    });
    setShowAdd(true);
  };

  const payRow = showPayment ? enriched.find(x => x.id === showPayment.id) : undefined;
  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardMobile = isDark ? 'bg-slate-800/70 border-white/10' : 'bg-slate-50/90 border-slate-200 shadow-sm';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:border-indigo-500 outline-none';
  const kpiTitle = isDark ? 'text-slate-400' : 'text-slate-600';
  const activeCount = enriched.filter(s => s.status === 'active').length;
  const monthlyPayroll = enriched.filter(s => s.status === 'active').reduce((acc, st) => acc + st.salary, 0);

  const onPrintSalaries = () => {
    if (payments.length === 0) {
      error('چاپ', 'ابتدا حداقل یک پرداخت حقوق ثبت کنید.');
      return;
    }
    printSalaryHistory(payments, shopSettings.shop_name || 'فروشگاه', {
      active: activeCount,
      monthlyTotal: monthlyPayroll,
    });
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${textColor}`}>
            <Users size={24} className="text-indigo-400" /> {t('staff_payroll')}
          </h1>
          <p className={`${subText} text-sm mt-1 max-w-2xl leading-relaxed`}>
            ثبت کارمند، حقوق، پایان قرارداد، یادداشت حضور/شیفت، پرداخت به‌تفکیک ماه، و چاپ گزارش برای بایگانی یا حسابداری.
          </p>
        </div>
        <div className="flex gap-2 glass rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            کارمندان
          </button>
          <button
            type="button"
            onClick={() => setTab('salaries')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'salaries' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            سابقه حقوق
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'کارمندان فعال', value: activeCount, color: isDark ? 'text-white' : 'text-slate-900', unit: 'نفر' },
          {
            label: 'جمع حقوق ماهانه (فعال)',
            value: monthlyPayroll.toLocaleString(),
            color: 'text-blue-400',
            unit: '؋',
          },
          { label: 'جمع پرداخت‌های ثبت‌شده', value: totalSalaryPaid.toLocaleString(), color: 'text-emerald-400', unit: '؋' },
          {
            label: 'بدهی حقوق ماه جاری',
            value: totalSalaryDue.toLocaleString(),
            color: totalSalaryDue > 0 ? 'text-rose-400' : 'text-emerald-400',
            unit: '؋',
          },
        ].map(item => (
          <div key={item.label} className={`rounded-xl p-4 ${isDark ? 'glass' : 'bg-slate-50 border border-slate-200 shadow-sm'}`}>
            <p className={`${kpiTitle} text-xs mb-1`}>{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>
              {item.value} <span className={`text-sm font-normal ${kpiTitle}`}>{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="جستجوی کارمند..."
                className={`${inputClass} px-4 py-2.5 pr-9 ${voiceOk ? 'pl-11' : ''}`}
              />
              {voiceOk && (
                <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditStaff(null);
                setForm({
                  full_name: '',
                  role: 'فروشنده',
                  phone: '',
                  salary: '',
                  hire_date: new Date().toISOString().split('T')[0],
                  contract_end_date: '',
                  attendance_note: '',
                  notes: '',
                  status: 'active',
                });
                setShowAdd(true);
              }}
              className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <Plus size={15} /> کارمند جدید
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enriched.filter(s => s.full_name.includes(search) || s.role.includes(search)).length === 0 && (
              <div className={`col-span-full rounded-2xl border p-10 text-center ${isDark ? 'border-white/10 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                <Calendar className={`mx-auto mb-3 ${subText}`} size={36} />
                <p className={textColor}>کارمندی ثبت نشده یا نتیجه‌ای برای جستجو نیست.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditStaff(null);
                    setShowAdd(true);
                  }}
                  className="mt-4 btn-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium"
                >
                  اولین کارمند را اضافه کنید
                </button>
              </div>
            )}
            {enriched
              .filter(s => s.full_name.includes(search) || s.role.includes(search))
              .map(s => (
                <div
                  key={s.id}
                  className={`rounded-2xl p-5 border transition-all ${
                    isDark
                      ? `glass ${s.status === 'active' ? 'border-transparent hover:border-indigo-500/30' : 'border-rose-500/20 opacity-70'}`
                      : `${s.status === 'active' ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-200' : 'bg-rose-50/50 border-rose-200 opacity-90'}`
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className={`${textColor} font-semibold text-sm`}>{s.full_name}</p>
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{s.role}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs mb-3">
                    <div className={`flex justify-between ${subText}`}>
                      <span>موبایل:</span>
                      <span className={textColor}>{s.phone || '—'}</span>
                    </div>
                    <div className={`flex justify-between ${subText}`}>
                      <span>تاریخ استخدام:</span>
                      <span className={textColor}>{s.hire_date}</span>
                    </div>
                    {s.contract_end_date ? (
                      <div className={`flex justify-between ${subText}`}>
                        <span>پایان قرارداد:</span>
                        <span className={textColor}>{s.contract_end_date}</span>
                      </div>
                    ) : null}
                    {s.attendance_note ? (
                      <p className={`${subText} text-[11px] pt-1 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        حضور / شیفت: {s.attendance_note}
                      </p>
                    ) : null}
                    <div className="flex justify-between">
                      <span className={subText}>حقوق ماهانه:</span>
                      <span className={`${textColor} font-medium`}>{s.salary.toLocaleString()} ؋</span>
                    </div>
                    {s.salary_due > 0 && (
                      <div className="flex justify-between">
                        <span className={subText}>حقوق ماه جاری:</span>
                        <span className="text-rose-400 font-bold">{s.salary_due.toLocaleString()} ؋</span>
                      </div>
                    )}
                    {s.notes ? (
                      <p className={`${subText} text-[11px] pt-1 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{s.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {s.salary_due > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const raw = staff.find(x => x.id === s.id);
                          if (raw) {
                            setShowPayment(raw);
                            setPayAmount(String(raw.salary));
                            setPayMonth(currentMonth);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 btn-primary text-white rounded-xl text-xs"
                      >
                        <DollarSign size={12} /> پرداخت
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const raw = staff.find(x => x.id === s.id);
                        if (raw) openEdit(raw);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 glass text-slate-400 hover:text-blue-400 rounded-xl text-xs border border-white/10 transition-colors"
                    >
                      <Edit2 size={12} /> ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(s.id)}
                      className="py-2 px-3 glass text-slate-400 hover:text-rose-400 rounded-xl text-xs border border-white/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'salaries' && (
        <div className={`rounded-2xl overflow-hidden ${isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <p className={`text-sm ${subText}`}>تمام پرداخت‌های ثبت‌شده در سیستم؛ یادداشت هر پرداخت هنگام ثبت حقوق ذخیره می‌شود.</p>
            <button
              type="button"
              onClick={onPrintSalaries}
              className="btn-primary text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0"
            >
              <Printer size={14} /> چاپ گزارش
            </button>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  {['کارمند', 'مبلغ', 'برای ماه', 'تاریخ پرداخت', 'یادداشت'].map(h => (
                    <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map(p => (
                  <tr key={p.id} className="table-row-hover">
                    <td className={`py-3 px-4 text-xs font-medium ${textColor}`}>{p.staff_name}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold text-xs">{p.amount.toLocaleString()} ؋</td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{p.for_month}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{p.payment_date}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-3 space-y-3">
            {payments.map(p => (
              <div key={p.id} className={`rounded-2xl p-4 border ${cardMobile}`}>
                <p className={`font-bold text-[15px] ${textColor}`}>{p.staff_name}</p>
                <p className={`text-2xl font-black mt-2 tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {p.amount.toLocaleString()} <span className="text-sm font-semibold">؋</span>
                </p>
                <div className={`mt-3 space-y-1.5 text-sm ${subText}`}>
                  <div className="flex justify-between">
                    <span>ماه</span>
                    <span className={`font-mono ${textColor}`}>{p.for_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاریخ</span>
                    <span className="font-mono">{p.payment_date}</span>
                  </div>
                  {p.notes ? (
                    <p className={`text-[11px] pt-1 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{p.notes}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className={`px-4 py-3 border-t flex justify-between items-center flex-wrap gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <span className={`${subText} text-xs`}>جمع پرداخت‌ها (بر اساس ماه‌های ثبت‌شده)</span>
            <span className="text-emerald-400 font-bold text-sm tabular-nums">{totalSalaryPaid.toLocaleString()} ؋</span>
          </div>
        </div>
      )}

      <FormModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditStaff(null);
        }}
        title={editStaff ? 'ویرایش کارمند' : 'کارمند جدید'}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={handleAdd} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white btn-primary">
              <Check size={15} /> {editStaff ? 'بروزرسانی' : 'افزودن'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setEditStaff(null);
              }}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass"
            >
              انصراف
            </button>
          </div>
        }
      >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={`${subText} text-xs block mb-1`}>نام کامل *</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${subText} text-xs block mb-1`}>نقش</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className={inputClass}
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${subText} text-xs block mb-1`}>موبایل</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${subText} text-xs block mb-1`}>حقوق ماهانه (؋) *</label>
                  <input
                    type="number"
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${subText} text-xs block mb-1`}>تاریخ استخدام</label>
                  <input
                    type="date"
                    value={form.hire_date}
                    onChange={e => setForm({ ...form, hire_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                {editStaff ? (
                  <div className="col-span-2">
                    <label className={`${subText} text-xs block mb-1`}>وضعیت همکاری</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                      className={inputClass}
                    >
                      <option value="active">فعال</option>
                      <option value="inactive">غیرفعال</option>
                    </select>
                  </div>
                ) : null}
                <div>
                  <label className={`${subText} text-xs block mb-1`}>پایان قرارداد</label>
                  <input
                    type="date"
                    value={form.contract_end_date}
                    onChange={e => setForm({ ...form, contract_end_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`${subText} text-xs block mb-1`}>حضور و غیاب / شیفت</label>
                  <textarea
                    value={form.attendance_note}
                    onChange={e => setForm({ ...form, attendance_note: e.target.value })}
                    rows={2}
                    placeholder="مثلاً شیفت صبح، ۶ روز در هفته، دورکاری…"
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`${subText} text-xs block mb-1`}>یادداشت داخلی</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="تماس اضطراری، قرارداد پیوست، سایر…"
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
      </FormModal>

      <FormModal
        open={!!showPayment}
        onClose={() => setShowPayment(null)}
        title={showPayment ? `پرداخت حقوق — ${showPayment.full_name}` : 'پرداخت حقوق'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={handlePayment} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white btn-primary">
              <Check size={15} /> ثبت پرداخت
            </button>
            <button type="button" onClick={() => setShowPayment(null)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 glass">
              انصراف
            </button>
          </div>
        }
      >
            {showPayment ? (
            <div className="space-y-4">
              <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-slate-800/50' : 'bg-slate-100 border border-slate-200'}`}>
                <div className={`flex justify-between mb-1 ${subText}`}>
                  <span>حقوق ماهانه:</span>
                  <span className={textColor}>{showPayment.salary.toLocaleString()} ؋</span>
                </div>
                <div className="flex justify-between">
                  <span className={subText}>بدهی ماه جاری:</span>
                  <span className="text-rose-400 font-bold">{(payRow?.salary_due ?? showPayment.salary).toLocaleString()} ؋</span>
                </div>
              </div>
              <div>
                <label className={`${subText} text-xs block mb-1`}>مبلغ پرداخت (؋) — باید ≥ حقوق ماهانه</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className={inputClass}
                />
                <div className="flex gap-2 mt-1">
                  {showPayment.salary > 0 && (
                    <button type="button" onClick={() => setPayAmount(String(showPayment.salary))} className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                      {showPayment.salary.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={`${subText} text-xs block mb-1`}>برای ماه</label>
                <input
                  type="month"
                  value={payMonth}
                  onChange={e => setPayMonth(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${subText} text-xs block mb-1`}>یادداشت پرداخت (در سابقه حقوق ذخیره می‌شود)</label>
                <input
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="مثلاً: کارت به کارت / نقد از صندوق"
                  className={inputClass}
                />
              </div>
            </div>
            ) : null}
      </FormModal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId != null) deleteStaff(deleteId);
          success('کارمند حذف شد');
          setDeleteId(null);
        }}
        title="حذف کارمند"
        message="آیا مطمئنید؟ این عملیات قابل بازگشت نیست."
      />
    </div>
  );
}
