import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Eye, Check, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { SupportTicket } from '../services/api';
import {
  apiGetMasterSupport,
  apiGetSupportTickets,
  apiPostSupportMessage,
  apiPutMasterSupport,
} from '../services/api';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('fa-IR');
  } catch {
    return iso;
  }
}

export default function SupportPage() {
  const { t } = useApp();
  const { success, error } = useToast();
  const token = useStore((s) => s.authToken);
  const currentUser = useStore((s) => s.currentUser);
  const isSuper = currentUser?.role === 'super_admin';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMsg, setViewMsg] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const [showSendForm, setShowSendForm] = useState(false);
  const [sendForm, setSendForm] = useState({ subject: '', message: '', priority: 'normal' });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuper) {
        const res = await apiGetMasterSupport(token || undefined);
        setTickets(res.tickets || []);
      } else {
        const res = await apiGetSupportTickets(token || undefined);
        setTickets(res.tickets || []);
      }
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [isSuper, token, error, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = tickets.filter((m) => filter === 'all' || m.status === filter);

  const openView = async (msg: SupportTicket) => {
    setViewMsg(msg);
    if (isSuper && msg.status === 'pending') {
      try {
        const res = await apiPutMasterSupport(msg.id, { status: 'read' }, token || undefined);
        setTickets((prev) => prev.map((x) => (x.id === msg.id ? res.ticket : x)));
        setViewMsg(res.ticket);
      } catch {
        /* keep local view */
      }
    }
  };

  const sendReply = async (id: number) => {
    if (!replyText.trim() || !isSuper) return;
    setReplying(true);
    try {
      const res = await apiPutMasterSupport(id, { reply: replyText, status: 'replied' }, token || undefined);
      setTickets((prev) => prev.map((x) => (x.id === id ? res.ticket : x)));
      if (viewMsg?.id === id) setViewMsg(res.ticket);
      setReplyText('');
      success(t('success'), t('support_reply_sent'));
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
    } finally {
      setReplying(false);
    }
  };

  const handleSendShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.subject.trim() || !sendForm.message.trim()) return;
    setSending(true);
    try {
      await apiPostSupportMessage(
        { subject: sendForm.subject, message: sendForm.message, priority: sendForm.priority },
        token || undefined
      );
      success(t('success'), t('support_ticket_sent'));
      setSendForm({ subject: '', message: '', priority: 'normal' });
      setShowSendForm(false);
      await load();
    } catch (err) {
      error(t('error'), err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const priorityColor = (p: string) =>
    p === 'urgent' ? 'badge-red' : p === 'important' ? 'badge-yellow' : 'badge-blue';
  const priorityLabel = (p: string) =>
    p === 'urgent' ? t('support_priority_urgent') : p === 'important' ? t('support_priority_important') : t('support_priority_normal');
  const statusColor = (s: string) =>
    s === 'replied' ? 'badge-green' : s === 'read' ? 'badge-blue' : 'badge-yellow';
  const statusLabel = (s: string) =>
    s === 'replied'
      ? t('support_status_replied')
      : s === 'read'
        ? t('support_status_read')
        : t('support_status_pending');

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="animate-spin" size={22} />
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={24} /> {t('support')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSuper ? t('page_support_subtitle_master') : t('page_support_subtitle_shop')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="glass flex items-center gap-2 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:text-white"
          >
            <RefreshCw size={16} /> {t('refresh')}
          </button>
          {!isSuper && (
            <button
              type="button"
              onClick={() => setShowSendForm(true)}
              className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              <Send size={16} /> {t('support_send_ticket')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('support_stat_total'), value: tickets.length, color: 'text-white' },
          { label: t('support_stat_pending'), value: tickets.filter((m) => m.status === 'pending').length, color: 'text-amber-400' },
          { label: t('support_stat_read'), value: tickets.filter((m) => m.status === 'read').length, color: 'text-blue-400' },
          { label: t('support_stat_replied'), value: tickets.filter((m) => m.status === 'replied').length, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ['all', t('all')],
          ['pending', t('support_status_pending')],
          ['read', t('support_status_read')],
          ['replied', t('support_status_replied')],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              filter === v ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <MessageSquare size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{t('support_no_tickets')}</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`glass rounded-2xl p-5 border transition-all ${
                msg.priority === 'urgent'
                  ? 'border-rose-500/30'
                  : msg.priority === 'important'
                    ? 'border-amber-500/30'
                    : 'border-white/5'
              } ${msg.status === 'pending' ? 'ring-1 ring-indigo-500/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {msg.priority === 'urgent' && <AlertTriangle size={14} className="text-rose-400" />}
                    <span className="text-white font-medium text-sm">{msg.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(msg.priority)}`}>
                      {priorityLabel(msg.priority)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(msg.status)}`}>{statusLabel(msg.status)}</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-1">
                    {msg.shop_name || msg.shop_code} — {msg.sender_name}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {msg.message.length > 100 ? `${msg.message.slice(0, 100)}...` : msg.message}
                  </p>
                  {msg.reply ? (
                    <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <p className="text-emerald-400 text-xs font-medium mb-1">✓ {t('support_reply_label')}</p>
                      <p className="text-slate-300 text-sm">{msg.reply}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-slate-600 text-xs whitespace-nowrap">{formatWhen(msg.created_at)}</p>
                  <button
                    type="button"
                    onClick={() => void openView(msg)}
                    className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"
                    title={t('details')}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {viewMsg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold">{viewMsg.subject}</h2>
              <button type="button" onClick={() => setViewMsg(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  [t('shop_name'), viewMsg.shop_name || viewMsg.shop_code],
                  [t('support_sender'), viewMsg.sender_name],
                  [t('date'), formatWhen(viewMsg.created_at)],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <span className="text-slate-400 text-xs block">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-2">{t('support_message_body')}</p>
                <p className="text-white text-sm">{viewMsg.message}</p>
              </div>
              {viewMsg.reply ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-emerald-400 text-xs font-medium mb-2 flex items-center gap-1">
                    <Check size={12} /> {t('support_reply_label')}
                  </p>
                  <p className="text-white text-sm">{viewMsg.reply}</p>
                </div>
              ) : null}
              {isSuper && viewMsg.status !== 'replied' && (
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">{t('support_your_reply')}</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder={t('support_reply_placeholder')}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 resize-none"
                  />
                  <button
                    type="button"
                    disabled={replying}
                    onClick={() => void sendReply(viewMsg.id)}
                    className="mt-2 w-full btn-primary text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {replying ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    {t('send_message')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSendForm && !isSuper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold">{t('support_send_ticket')}</h2>
              <button type="button" onClick={() => setShowSendForm(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSendShop(e)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-slate-400 text-xs mb-1 block">{t('support_subject')} *</label>
                  <input
                    value={sendForm.subject}
                    onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-slate-400 text-xs mb-1 block">{t('support_priority')}</label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                  >
                    <option value="normal">{t('support_priority_normal')}</option>
                    <option value="important">{t('support_priority_important')}</option>
                    <option value="urgent">{t('support_priority_urgent')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t('support_message_body')} *</label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 resize-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {t('submit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendForm(false)}
                  className="px-5 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
