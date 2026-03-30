import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Database, Trash2 } from 'lucide-react';
import type { OfflineQueue } from '../data/mockData';
import { useApp } from '../context/AppContext';

export default function OfflinePage() {
  const { isOnline } = useApp();
  const [queue, setQueue] = useState<OfflineQueue[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const syncedCount = queue.filter(q => q.status === 'synced').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  const startSync = () => {
    if (!isOnline) return;
    setSyncing(true);
    setSyncProgress(0);
    const pending = queue.filter(q => q.status === 'pending');
    let done = 0;
    const interval = setInterval(() => {
      done++;
      setSyncProgress(Math.round((done / Math.max(pending.length, 1)) * 100));
      if (done >= pending.length) {
        clearInterval(interval);
        setQueue(queue.map(q => q.status === 'pending' ? { ...q, status: 'synced' as const } : q));
        setSyncing(false);
        setSyncProgress(0);
      }
    }, 600);
  };

  const removeItem = (id: string) => {
    setQueue(queue.filter(q => q.id !== id));
  };

  const retryFailed = () => {
    setQueue(queue.map(q => q.status === 'failed' ? { ...q, status: 'pending' as const } : q));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'failed': return <XCircle size={14} className="text-rose-400" />;
      default: return <Clock size={14} className="text-amber-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return 'badge-green';
      case 'failed': return 'badge-red';
      default: return 'badge-yellow';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'synced': return 'همگام شد';
      case 'failed': return 'ناموفق';
      default: return 'در انتظار';
    }
  };

  const getOperationLabel = (op: string) => {
    switch (op) {
      case 'insert': return 'ثبت جدید';
      case 'update': return 'بروزرسانی';
      case 'delete': return 'حذف';
      default: return op;
    }
  };

  const getOperationColor = (op: string) => {
    switch (op) {
      case 'insert': return 'badge-green';
      case 'update': return 'badge-blue';
      case 'delete': return 'badge-red';
      default: return 'badge-yellow';
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">مدیریت حالت آفلاین</h1>
        <p className="text-slate-400 text-sm mt-1">همگام‌سازی داده‌های ذخیره‌شده در حالت آفلاین</p>
      </div>

      {/* Connection Status */}
      <div className={`rounded-2xl p-5 border flex items-center gap-4 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
          {isOnline ? <Wifi size={24} className="text-emerald-400" /> : <WifiOff size={24} className="text-rose-400" />}
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isOnline ? '✅ متصل به اینترنت' : '❌ بدون اتصال به اینترنت'}
          </p>
          <p className="text-slate-400 text-sm mt-0.5">
            {isOnline
              ? 'تمام عملیات بلادرنگ اجرا می‌شوند. می‌توانید صف را همگام کنید.'
              : 'عملیات جدید در صف ذخیره می‌شوند و پس از اتصال همگام می‌شوند.'}
          </p>
        </div>
        {isOnline && pendingCount > 0 && (
          <button
            onClick={startSync}
            disabled={syncing}
            className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'همگام‌سازی...' : 'همگام‌سازی'}
          </button>
        )}
      </div>

      {/* Sync Progress */}
      {syncing && (
        <div className="glass rounded-2xl p-5 fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium text-sm">در حال همگام‌سازی...</span>
            <span className="text-indigo-400 font-bold">{syncProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-2">{pendingCount} عملیات در انتظار همگام‌سازی</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'در انتظار', value: pendingCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'همگام شده', value: syncedCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'ناموفق', value: failedCount, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Offline Queue */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-indigo-400" />
            <h2 className="text-white font-semibold">صف عملیات آفلاین</h2>
          </div>
          <div className="flex gap-2">
            {failedCount > 0 && (
              <button onClick={retryFailed} className="flex items-center gap-1.5 text-xs glass px-3 py-1.5 rounded-lg text-amber-400 hover:text-amber-300 border border-amber-500/20">
                <RefreshCw size={12} /> تلاش مجدد ناموفق‌ها
              </button>
            )}
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={48} className="text-emerald-500/50 mb-3" />
            <p className="text-slate-400">صف خالی است</p>
            <p className="text-slate-600 text-sm mt-1">تمام عملیات همگام شده‌اند</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  {['شناسه', 'نوع عملیات', 'جدول', 'داده', 'وضعیت', 'تاریخ', 'عملیات'].map(h => (
                    <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {queue.map(item => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{item.id}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${getOperationColor(item.operation_type)}`}>
                        {getOperationLabel(item.operation_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">{item.table_name}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate font-mono">{item.data}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(item.status)}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{item.created_at}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm mb-2">نکات مهم حالت آفلاین</p>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>• Service Worker در این نسخه فعال نیست؛ صف زیر فقط نمونه/دستی است.</li>
              <li>• دادهٔ اصلی فروشگاه با Zustand و PUT /api/state همگام می‌شود وقتی آنلاین هستید.</li>
              <li>• برای آفلاین واقعی باید SW و استراتژی کش اضافه شود.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
