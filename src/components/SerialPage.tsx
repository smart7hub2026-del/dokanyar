import { useState, useMemo } from 'react';
import { Plus, Search, Hash, ShoppingBag, CheckCircle, Trash2, Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

export default function SerialPage() {
  const serials = useStore(s => s.serialNumbers);
  const products = useStore(s => s.products);
  const addSerial = useStore(s => s.addSerial);
  const deleteSerial = useStore(s => s.deleteSerial);

  const serialProducts = useMemo(() => {
    const withFlag = products.filter(p => p.has_serial);
    return withFlag.length > 0 ? withFlag : products;
  }, [products]);

  const [search, setSearch] = useState('');
  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const defaultPid = serialProducts[0]?.id ?? 0;
  const [form, setForm] = useState({ product_id: defaultPid, serial_number: '', warranty_months: 12 });

  const filtered = serials.filter(s => {
    const matchSearch =
      s.serial_number.toLowerCase().includes(search.toLowerCase()) || s.product_name.includes(search);
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === form.product_id);
    addSerial({
      product_id: form.product_id,
      product_name: prod?.name || '',
      serial_number: form.serial_number.trim(),
      warranty_months: form.warranty_months,
      status: 'available',
    });
    setShowModal(false);
    setForm({ product_id: form.product_id, serial_number: '', warranty_months: 12 });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">مدیریت سریال‌نامبر</h1>
          <p className="text-slate-400 text-sm mt-1">همگام با state فروشگاه (Zustand + سرور)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(f => ({ ...f, product_id: serialProducts[0]?.id ?? f.product_id }));
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
        >
          <Plus size={18} /> سریال جدید
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'کل سریال‌ها', value: serials.length, icon: Hash, color: 'from-indigo-500 to-indigo-600' },
          { label: 'موجود', value: serials.filter(s => s.status === 'available').length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
          { label: 'فروخته‌شده', value: serials.filter(s => s.status === 'sold').length, icon: ShoppingBag, color: 'from-amber-500 to-amber-600' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5`}>
            <s.icon size={22} className="text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-white/70 text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو (سریال، نام محصول)..."
            className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:border-indigo-500 text-sm ${voiceOk ? 'pl-11' : ''}`}
          />
          {voiceOk && (
            <button type="button" onClick={isListening ? stopListening : startListening} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`} title="جستجوی صوتی">
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[
            ['all', 'همه'],
            ['available', 'موجود'],
            ['sold', 'فروخته‌شده'],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 border-b border-white/10">
                {['سریال‌نامبر', 'محصول', 'گارانتی', 'وضعیت', 'فاکتور فروش', 'عملیات'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="py-3 px-4">
                    <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg text-xs">{s.serial_number}</span>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{s.product_name}</td>
                  <td className="py-3 px-4 text-slate-400">{s.warranty_months} ماه</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'available' ? 'badge-green' : 'badge-yellow'}`}>
                      {s.status === 'available' ? 'موجود' : 'فروخته‌شده'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {s.sold_invoice_id ? `INV-${String(s.sold_invoice_id).padStart(3, '0')}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {s.status === 'available' && (
                      <button
                        type="button"
                        onClick={() => deleteSerial(s.id)}
                        className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="ثبت سریال‌نامبر"
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="submit"
              form="serial-add-form"
              disabled={serialProducts.length === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white btn-primary disabled:opacity-50"
            >
              ثبت سریال
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="serial-add-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">محصول *</label>
                <select
                  value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: +e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  required
                >
                  {serialProducts.length === 0 ? (
                    <option value={0}>ابتدا محصول اضافه کنید</option>
                  ) : (
                    serialProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">سریال‌نامبر *</label>
                <input
                  value={form.serial_number}
                  onChange={e => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="مثال: SN-001-XXXX"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">مدت گارانتی (ماه)</label>
                <input
                  type="number"
                  min={0}
                  value={form.warranty_months}
                  onChange={e => setForm({ ...form, warranty_months: +e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                />
              </div>
            </form>
      </FormModal>
    </div>
  );
}
