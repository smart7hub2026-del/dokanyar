import { useState, useMemo } from 'react';
import { Plus, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';

export default function ExpiryPage() {
  const expiries = useStore(s => s.expiryRecords);
  const products = useStore(s => s.products);
  const addExpiry = useStore(s => s.addExpiry);
  const deleteExpiry = useStore(s => s.deleteExpiry);

  const expiryProducts = useMemo(() => {
    const withFlag = products.filter(p => p.has_expiry);
    return withFlag.length > 0 ? withFlag : products;
  }, [products]);

  const [showModal, setShowModal] = useState(false);
  const defaultPid = expiryProducts[0]?.id ?? 0;
  const [form, setForm] = useState({ product_id: defaultPid, batch_number: '', expiry_date: '', quantity: 1 });

  const today = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const getStatus = (dateStr: string) => {
    const d = new Date(dateStr);
    if (d < today) return 'expired';
    if (d <= soon) return 'soon';
    return 'ok';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === form.product_id);
    addExpiry({
      product_id: form.product_id,
      product_name: prod?.name || '',
      batch_number: form.batch_number,
      expiry_date: form.expiry_date,
      quantity: form.quantity,
    });
    setShowModal(false);
    setForm({ product_id: form.product_id, batch_number: '', expiry_date: '', quantity: 1 });
  };

  const expired = expiries.filter(e => getStatus(e.expiry_date) === 'expired');
  const expiringSoon = expiries.filter(e => getStatus(e.expiry_date) === 'soon');
  const good = expiries.filter(e => getStatus(e.expiry_date) === 'ok');

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">مدیریت تاریخ انقضا</h1>
          <p className="text-slate-400 text-sm mt-1">همگام با state فروشگاه (Zustand + سرور)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(f => ({ ...f, product_id: expiryProducts[0]?.id ?? f.product_id }));
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
        >
          <Plus size={18} /> ثبت دسته جدید
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5">
          <AlertTriangle size={24} className="text-white/80 mb-2" />
          <p className="text-3xl font-bold text-white">{expired.length}</p>
          <p className="text-rose-200 text-sm mt-1">منقضی‌شده</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5">
          <Clock size={24} className="text-white/80 mb-2" />
          <p className="text-3xl font-bold text-white">{expiringSoon.length}</p>
          <p className="text-amber-200 text-sm mt-1">به‌زودی منقضی (۳۰ روز)</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5">
          <CheckCircle size={24} className="text-white/80 mb-2" />
          <p className="text-3xl font-bold text-white">{good.length}</p>
          <p className="text-emerald-200 text-sm mt-1">سالم</p>
        </div>
      </div>

      {expired.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-rose-300 font-semibold">⚠️ هشدار: {expired.length} دسته محصول منقضی شده!</p>
            <p className="text-rose-400/70 text-sm mt-1">این محصولات باید فوری از فروشگاه جمع‌آوری شوند.</p>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-semibold">لیست دسته‌بندی‌های محصولات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 border-b border-white/10">
                {['محصول', 'شماره دسته', 'تاریخ انقضا', 'مقدار', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expiries.map(ex => {
                const status = getStatus(ex.expiry_date);
                const daysLeft = Math.ceil((new Date(ex.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr
                    key={ex.id}
                    className={`table-row-hover ${status === 'expired' ? 'bg-rose-500/5' : status === 'soon' ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="py-3 px-4 text-white font-medium">{ex.product_name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{ex.batch_number || '—'}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p
                          className={`font-medium ${status === 'expired' ? 'text-rose-400' : status === 'soon' ? 'text-amber-400' : 'text-white'}`}
                        >
                          {ex.expiry_date}
                        </p>
                        <p className="text-xs text-slate-500">
                          {status === 'expired' ? `${Math.abs(daysLeft)} روز پیش منقضی شد` : `${daysLeft} روز مانده`}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ex.quantity}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          status === 'expired' ? 'badge-red' : status === 'soon' ? 'badge-yellow' : 'badge-green'
                        }`}
                      >
                        {status === 'expired' ? 'منقضی' : status === 'soon' ? 'به‌زودی' : 'سالم'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => deleteExpiry(ex.id)}
                        className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="ثبت دسته جدید"
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="submit"
              form="expiry-batch-form"
              disabled={expiryProducts.length === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white btn-primary disabled:opacity-50"
            >
              ثبت دسته
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="expiry-batch-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">محصول *</label>
                <select
                  value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: +e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  required
                >
                  {expiryProducts.length === 0 ? (
                    <option value={0}>ابتدا محصول اضافه کنید</option>
                  ) : (
                    expiryProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">شماره دسته (Batch)</label>
                  <input
                    value={form.batch_number}
                    onChange={e => setForm({ ...form, batch_number: e.target.value })}
                    placeholder="مثال: B001"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">مقدار</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: +e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">تاریخ انقضا *</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  required
                />
              </div>
            </form>
      </FormModal>
    </div>
  );
}
