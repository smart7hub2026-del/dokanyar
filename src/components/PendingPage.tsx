import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle, XCircle, Eye, X, Clock, Package, ClipboardList, Send, User, ArrowDownToLine, Wallet, Receipt,
} from 'lucide-react';
import { Invoice } from '../data/mockData';
import { useStore, type PurchaseListTaskData } from '../store/useStore';
import { useToast } from './Toast';

export default function PendingPage() {
  const invoices = useStore(s => s.invoices);
  const approveItem = useStore(s => s.approveItem);
  const rejectItem = useStore(s => s.rejectItem);
  const pendingApprovals = useStore(s => s.pendingApprovals);
  const updatePendingApproval = useStore(s => s.updatePendingApproval);
  const reportStaffActivityToAdmins = useStore(s => s.reportStaffActivityToAdmins);
  const currentUser = useStore(s => s.currentUser);
  const { success, error, warning } = useToast();

  const isShopAdmin = currentUser?.role === 'admin';

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!viewInvoice) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewInvoice]);

  const pending = invoices.filter(i => i.approval_status === 'pending');
  const approved = invoices.filter(i => i.approval_status === 'approved');
  const rejected = invoices.filter(i => i.approval_status === 'rejected');

  const purchaseListTasks = pendingApprovals.filter(
    p => p.type === 'purchase_list' && p.status === 'pending'
  );

  const visiblePurchaseTasks = useMemo(
    () =>
      purchaseListTasks.filter(t => {
        const d = t.data as unknown as PurchaseListTaskData;
        return currentUser?.role === 'admin' || currentUser?.id === d.assignee_user_id;
      }),
    [purchaseListTasks, currentUser?.id, currentUser?.role]
  );

  const handleApprove = (invoiceId: number) => {
    if (!isShopAdmin) return;
    const pendingItem = pendingApprovals.find(p => p.type === 'sale' && (p.data as { invoice_id?: number }).invoice_id === invoiceId);
    if (pendingItem) {
      approveItem(pendingItem.id, currentUser?.full_name || 'Admin');
    }
  };

  const handleReject = (invoiceId: number) => {
    if (!isShopAdmin) return;
    const pendingItem = pendingApprovals.find(p => p.type === 'sale' && (p.data as { invoice_id?: number }).invoice_id === invoiceId);
    if (pendingItem) {
      rejectItem(pendingItem.id, currentUser?.full_name || 'Admin');
    }
  };

  const handleApprovePurchaseList = (taskId: number) => {
    if (!isShopAdmin) return;
    approveItem(taskId, currentUser?.full_name || 'مدیر');
    success('تأیید شد', 'لیست خرید تأیید نهایی شد.');
  };

  const handleRejectPurchaseList = (taskId: number) => {
    if (!isShopAdmin) return;
    rejectItem(taskId, currentUser?.full_name || 'مدیر');
    warning('رد شد', 'لیست خرید رد شد؛ در صورت نیاز دوباره ارسال کنید.');
  };

  const handleApproveMisc = (taskId: number) => {
    if (!isShopAdmin) return;
    approveItem(taskId, currentUser?.full_name || 'مدیر');
    success('تأیید شد', 'در حسابداری / موجودی اعمال شد.');
  };

  const handleRejectMisc = (taskId: number) => {
    if (!isShopAdmin) return;
    rejectItem(taskId, currentUser?.full_name || 'مدیر');
    warning('رد شد', 'درخواست رد شد.');
  };

  const setPickedLine = (taskId: number, lineIndex: number, checked: boolean) => {
    updatePendingApproval(taskId, p => {
      const d = { ...(p.data as unknown as PurchaseListTaskData) };
      const next = [...d.picked];
      next[lineIndex] = checked;
      return { ...p, data: { ...d, picked: next } as Record<string, unknown> };
    });
  };

  const handleSavePurchaseProgress = (taskId: number) => {
    const task = useStore.getState().pendingApprovals.find(p => p.id === taskId);
    if (!task || task.type !== 'purchase_list') return;
    const d = task.data as unknown as PurchaseListTaskData;
    const done = d.picked.filter(Boolean).length;
    reportStaffActivityToAdmins(
      'پیشرفت لیست خرید',
      `فاکتور ${d.invoice_number}: ${done} از ${d.line_labels.length} قلم علامت خورده است.`,
      currentUser?.id ?? 0,
      currentUser?.full_name || 'کاربر'
    );
    success('ثبت شد', 'پیشرفت برای مدیر گزارش شد.');
  };

  const handleSubmitPurchaseToAdmin = (taskId: number) => {
    const task = useStore.getState().pendingApprovals.find(p => p.id === taskId);
    if (!task || task.type !== 'purchase_list') return;
    const d = task.data as unknown as PurchaseListTaskData;
    if (!d.picked.every(Boolean)) {
      error('ناقص', 'همه اقلام را تیک بزنید تا بتوانید برای مدیر بفرستید.');
      return;
    }
    updatePendingApproval(taskId, p => {
      const data = { ...(p.data as unknown as PurchaseListTaskData), phase: 'awaiting_admin' as const };
      return { ...p, data: data as Record<string, unknown> };
    });
    reportStaffActivityToAdmins(
      'لیست خرید آماده تأیید مدیر',
      `${currentUser?.full_name} همه اقلام فاکتور خرید ${d.invoice_number} را جمع کرد و درخواست تأیید داد.`,
      currentUser?.id ?? 0,
      currentUser?.full_name || 'کاربر'
    );
    success('ارسال شد', 'مدیر از همین صفحه یا اعلان‌ها می‌تواند یک‌کلیک تأیید کند.');
  };

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">تأیید فروش و لیست خرید</h1>
        <p className="text-slate-400 text-sm mt-1">
          تأیید نهایی فقط با مدیر دکان؛ فروشنده و انباردار و حسابدار نمی‌توانند فاکتور یا انتقال خود را تأیید کنند.
        </p>
      </div>

      {/* درخواست‌های انبار / حسابداری */}
      {pendingApprovals.filter(
        p =>
          p.status === 'pending' &&
          ['warehouse_transfer', 'staff_expense', 'staff_cash', 'staff_return'].includes(p.type)
      ).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Package size={18} className="text-cyan-400" />
            انتقال انبار و ثبت‌های حسابداری (منتظر مدیر)
          </h2>
          <div className="space-y-3">
            {pendingApprovals
              .filter(
                p =>
                  p.status === 'pending' &&
                  ['warehouse_transfer', 'staff_expense', 'staff_cash', 'staff_return'].includes(p.type)
              )
              .map(task => (
                <div
                  key={task.id}
                  className="glass rounded-2xl p-5 border border-cyan-500/25 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-bold">{task.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{task.description}</p>
                      <p className="text-slate-500 text-[11px] mt-1">
                        درخواست‌دهنده: {task.submitted_by} ({task.submitted_by_role})
                      </p>
                    </div>
                    {task.type === 'warehouse_transfer' && (
                      <ArrowDownToLine size={22} className="text-cyan-400 shrink-0" />
                    )}
                    {task.type === 'staff_expense' && <Receipt size={22} className="text-amber-400 shrink-0" />}
                    {task.type === 'staff_cash' && <Wallet size={22} className="text-emerald-400 shrink-0" />}
                    {task.type === 'staff_return' && <Package size={22} className="text-violet-400 shrink-0" />}
                  </div>
                  {isShopAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveMisc(task.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                      >
                        <CheckCircle size={14} /> تأیید و اعمال
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectMisc(task.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold"
                      >
                        <XCircle size={14} /> رد
                      </button>
                    </div>
                  ) : (
                    <p className="text-amber-200/90 text-xs">فقط مدیر دکان می‌تواند این درخواست را تأیید یا رد کند.</p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* لیست خرید مشترک */}
      {visiblePurchaseTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <ClipboardList size={18} className="text-violet-400" />
            لیست خرید (فاکتور خرید)
          </h2>
          <div className="space-y-3">
            {visiblePurchaseTasks.map(task => {
              const d = task.data as unknown as PurchaseListTaskData;
              const isAssignee = currentUser?.id === d.assignee_user_id;

              return (
                <div
                  key={task.id}
                  className="glass rounded-2xl p-5 border border-violet-500/25 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-violet-300 font-mono text-sm font-black">{d.invoice_number}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">
                          {d.phase === 'collecting' ? 'در حال برداشت' : 'منتظر تأیید مدیر'}
                        </span>
                      </div>
                      <p className="text-white font-medium mt-1">{d.supplier_name}</p>
                      <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <User size={12} /> گیرنده: {d.assignee_name} — از طرف: {task.submitted_by}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                    {d.line_labels.map((label, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-2 ${
                          isAssignee && d.phase === 'collecting' ? 'cursor-pointer hover:bg-white/5' : ''
                        }`}
                      >
                        <span className="text-slate-200 flex-1">
                          {label}{' '}
                          <span className="text-slate-500 text-xs">× {d.line_qty[idx]}</span>
                        </span>
                        {isAssignee && d.phase === 'collecting' ? (
                          <input
                            type="checkbox"
                            checked={d.picked[idx] || false}
                            onChange={e => setPickedLine(task.id, idx, e.target.checked)}
                            className="rounded border-slate-500 w-4 h-4 text-violet-600"
                          />
                        ) : (
                          <span className={d.picked[idx] ? 'text-emerald-400 text-xs font-bold' : 'text-slate-500 text-xs'}>
                            {d.picked[idx] ? '✓ جمع شد' : '—'}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  {isAssignee && d.phase === 'collecting' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSavePurchaseProgress(task.id)}
                        className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-xs font-bold hover:bg-white/5"
                      >
                        ثبت پیشرفت (گزارش به مدیر)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitPurchaseToAdmin(task.id)}
                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 flex items-center gap-1"
                      >
                        <Send size={14} /> همه جمع شد — ارسال برای تأیید مدیر
                      </button>
                    </div>
                  )}

                  {isAssignee && d.phase === 'awaiting_admin' && (
                    <p className="text-amber-200/90 text-xs font-medium">
                      در انتظار تأیید نهایی مدیر است؛ نیازی به اقدام دیگر نیست.
                    </p>
                  )}

                  {currentUser?.role === 'admin' && d.phase === 'awaiting_admin' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprovePurchaseList(task.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                      >
                        <CheckCircle size={14} /> تأیید نهایی لیست
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectPurchaseList(task.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold"
                      >
                        <XCircle size={14} /> رد
                      </button>
                    </div>
                  )}

                  {currentUser?.role === 'admin' && d.phase === 'collecting' && (
                    <p className="text-slate-500 text-xs">
                      همکار در حال جمع‌آوری است؛ پس از ارسال برای شما، دکمهٔ تأیید ظاهر می‌شود.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats فروش */}
      <section>
        <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
          <Package size={18} className="text-amber-400" />
          فاکتور فروش
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'در انتظار', value: pending.length, color: 'from-amber-500 to-amber-600', icon: Clock },
            { label: 'تأییدشده', value: approved.length, color: 'from-emerald-500 to-emerald-600', icon: CheckCircle },
            { label: 'ردشده', value: rejected.length, color: 'from-rose-500 to-rose-600', icon: XCircle },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5`}>
              <s.icon size={22} className="text-white/70 mb-2" />
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-white/70 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {pending.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3 opacity-50" />
          <p className="text-slate-400">هیچ فاکتور فروشی در انتظار تأیید نیست</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            فاکتورهای فروش در انتظار تأیید
          </h2>
          {pending.map(inv => (
            <div key={inv.id} className="glass rounded-2xl p-5 border border-amber-500/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400 font-mono text-sm">{inv.invoice_number}</span>
                    <span className="badge-yellow text-xs px-2 py-0.5 rounded-full">در انتظار</span>
                  </div>
                  <p className="text-white font-medium">{inv.customer_name}</p>
                  <p className="text-slate-400 text-xs">{inv.customer_phone} | فروشنده: {inv.seller_name}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">{inv.total.toLocaleString()} ؋</p>
                  <p className="text-slate-400 text-xs">{inv.invoice_date}</p>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-xl p-3 mb-3">
                <p className="text-slate-400 text-xs mb-2">آیتم‌های فاکتور ({inv.items.length} قلم):</p>
                <div className="space-y-1">
                  {inv.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.product_name}</span>
                      <span className="text-slate-400">{item.quantity} × {item.unit_price.toLocaleString()} = <span className="text-white">{item.total_price.toLocaleString()} ؋</span></span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-xs">
                  {inv.discount > 0 && <span className="text-amber-400">تخفیف: {inv.discount.toLocaleString()} ؋</span>}
                  <span className="text-slate-400 mr-auto">جمع: <span className="text-white font-bold">{inv.total.toLocaleString()} ؋</span></span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${inv.payment_method === 'cash' ? 'badge-green' : 'badge-yellow'}`}>
                    {inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}
                  </span>
                  {inv.due_amount > 0 && (
                    <span className="text-xs text-rose-400">بدهی: {inv.due_amount.toLocaleString()} ؋</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setViewInvoice(inv)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 text-xs transition-colors">
                    <Eye size={14} /> جزئیات
                  </button>
                  {isShopAdmin ? (
                    <>
                      <button onClick={() => handleReject(inv.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-600/30 hover:bg-rose-600/30 text-xs transition-colors">
                        <XCircle size={14} /> رد کردن
                      </button>
                      <button onClick={() => handleApprove(inv.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold transition-colors">
                        <CheckCircle size={14} /> تأیید
                      </button>
                    </>
                  ) : (
                    <span className="text-amber-200/90 text-xs self-center">منتظر تأیید مدیر</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(approved.length > 0 || rejected.length > 0) && (
        <div>
          <h2 className="text-white font-semibold mb-3">تاریخچه بررسی فروش</h2>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10">
                    {['فاکتور','مشتری','مبلغ','وضعیت','تاریخ'].map(h => (
                      <th key={h} className="text-right text-slate-400 font-medium py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...approved, ...rejected].map(inv => (
                    <tr key={inv.id} className="table-row-hover">
                      <td className="py-3 px-4 text-indigo-400 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-white">{inv.customer_name}</td>
                      <td className="py-3 px-4 text-white font-bold">{inv.total.toLocaleString()} ؋</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${inv.approval_status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                          {inv.approval_status === 'approved' ? 'تأییدشده' : 'ردشده'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{inv.invoice_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewInvoice &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4 sm:py-6"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="fixed inset-0 cursor-default bg-black/60 backdrop-blur-sm"
              aria-label="بستن"
              onClick={() => setViewInvoice(null)}
            />
            <div
              className="relative z-[1] my-auto glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] flex flex-col overflow-hidden border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
            <div className="flex shrink-0 items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold">فاکتور {viewInvoice.invoice_number}</h2>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['مشتری', viewInvoice.customer_name],
                  ['موبایل', viewInvoice.customer_phone],
                  ['فروشنده', viewInvoice.seller_name],
                  ['تاریخ', viewInvoice.invoice_date],
                  ['روش پرداخت', viewInvoice.payment_method === 'cash' ? 'نقدی' : 'نسیه'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400 block text-xs">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-white text-sm font-medium mb-2">آیتم‌ها</h3>
                <div className="space-y-2">
                  {viewInvoice.items.map(item => (
                    <div key={item.id} className="flex justify-between bg-slate-800/40 rounded-xl p-3 text-sm">
                      <span className="text-white">{item.product_name}</span>
                      <div className="text-left">
                        <span className="text-slate-400">{item.quantity} × {item.unit_price.toLocaleString()}</span>
                        <span className="text-emerald-400 font-bold mr-2">{item.total_price.toLocaleString()} ؋</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">جمع:</span><span className="text-white">{viewInvoice.subtotal.toLocaleString()} ؋</span></div>
                {viewInvoice.discount > 0 && <div className="flex justify-between"><span className="text-slate-400">تخفیف:</span><span className="text-amber-400">-{viewInvoice.discount.toLocaleString()} ؋</span></div>}
                <div className="flex justify-between font-bold"><span className="text-slate-300">مجموع:</span><span className="text-white text-lg">{viewInvoice.total.toLocaleString()} ؋</span></div>
                <div className="flex justify-between"><span className="text-slate-400">پرداخت‌شده:</span><span className="text-emerald-400">{viewInvoice.paid_amount.toLocaleString()} ؋</span></div>
                {viewInvoice.due_amount > 0 && <div className="flex justify-between"><span className="text-slate-400">بدهی:</span><span className="text-rose-400 font-bold">{viewInvoice.due_amount.toLocaleString()} ؋</span></div>}
              </div>
            </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
