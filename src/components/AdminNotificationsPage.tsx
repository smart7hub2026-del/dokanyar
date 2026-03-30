import { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, Trash2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import FormModal from './ui/FormModal';
import { useStore } from '../store/useStore';
import { apiGetBroadcasts, apiSendBroadcast, apiDeleteBroadcast, type Broadcast } from '../services/api';

export default function AdminNotificationsPage() {
  const authToken = useStore(s => s.authToken) || undefined;
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState({
    title: '', message: '', target_type: 'all' as 'all' | 'selected',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGetBroadcasts(authToken);
      setBroadcasts(res.broadcasts || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showMsg('err', 'عنوان و پیام الزامی است');
      return;
    }
    setSending(true);
    try {
      const res = await apiSendBroadcast({
        title: form.title,
        message: form.message,
        target_type: form.target_type,
      }, authToken);
      showMsg('ok', `اعلان ارسال شد — به ${res.delivered} فروشگاه`);
      setForm({ title: '', message: '', target_type: 'all' });
      setShowModal(false);
      void load();
    } catch (e) {
      showMsg('err', (e as Error).message || 'خطا در ارسال');
    } finally { setSending(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا مطمئن هستید؟')) return;
    try {
      await apiDeleteBroadcast(id, authToken);
      setBroadcasts(prev => prev.filter(b => b.id !== id));
    } catch {}
  };

  return (
    <div className="space-y-6 fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone size={24} className="text-indigo-400" /> اعلان‌های همگانی
          </h1>
          <p className="text-slate-400 text-sm mt-1">ارسال پیام به فروشگاه‌ها (در بخش اعلان‌های هر فروشگاه ظاهر می‌شود)</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 btn-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold">
          <Plus size={18} /> اعلان جدید
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold ${msg.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          {msg.type === 'ok' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-black">{broadcasts.length}</p>
          <p className="text-slate-400 text-xs">کل اعلان‌ها</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-black">{broadcasts.filter(b => b.target_type === 'all').length}</p>
          <p className="text-slate-400 text-xs">همگانی</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-black">{broadcasts.filter(b => b.target_type === 'selected').length}</p>
          <p className="text-slate-400 text-xs">انتخابی</p>
        </div>
      </div>

      {/* Broadcasts list */}
      <div className="glass rounded-2xl p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            در حال بارگذاری...
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">هنوز هیچ اعلانی ارسال نشده</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map(b => (
              <div key={b.id} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <Megaphone size={18} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm">{b.title}</p>
                    <span className="badge-blue text-[10px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                      <Users size={10} /> {b.target_type === 'all' ? 'همگانی' : 'انتخابی'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-5 line-clamp-2">{b.message}</p>
                  <p className="text-slate-500 text-[10px] mt-1">{new Date(b.created_at).toLocaleString('fa-IR')} — {b.created_by}</p>
                </div>
                <button onClick={() => void handleDelete(b.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="ارسال اعلان جدید"
        size="md"
        footer={
          <button type="submit" form="admin-broadcast-form" disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white btn-primary disabled:opacity-60">
            {sending
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> در حال ارسال...</>
              : <><Send size={16} /> ارسال اعلان</>}
          </button>
        }
      >
            <form id="admin-broadcast-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">عنوان</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: بروزرسانی جدید سیستم"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">متن پیام</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="متن اعلان..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-2">مخاطب</label>
                <div className="flex gap-3">
                  {(['all', 'selected'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, target_type: t })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.target_type === t ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {t === 'all' ? 'همه فروشگاه‌ها' : 'انتخابی'}
                    </button>
                  ))}
                </div>
              </div>
            </form>
      </FormModal>
    </div>
  );
}
