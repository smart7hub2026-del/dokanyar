import { useState } from 'react';
import { Bell, BellRing, Package, CreditCard, AlertTriangle, Clock, MessageSquare, CheckCheck, Volume2, VolumeX, Trash2, Info } from 'lucide-react';
import { Notification } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { isNotificationVisibleToUser } from '../utils/notificationVisibility';

export default function NotificationsPage() {
  const { isDark } = useApp();
  const notificationsAll = useStore(s => s.notifications);
  const currentUser = useStore(s => s.currentUser);
  const notifications = notificationsAll.filter((n) => isNotificationVisibleToUser(n, currentUser));
  const markAllReadStore = useStore(s => s.markAllRead);
  const markReadStore = useStore(s => s.markRead);
  const clearNotificationStore = useStore(s => s.clearNotification);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<'bell_soft' | 'bell_bright'>('bell_soft');
  const [notifyDebt, setNotifyDebt] = useState(true);
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [notifyStock, setNotifyStock] = useState(true);
  const [notifyPending, setNotifyPending] = useState(true);
  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const typeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'debt': return <CreditCard size={16} className="text-rose-400" />;
      case 'stock': return <Package size={16} className="text-amber-400" />;
      case 'expiry': return <AlertTriangle size={16} className="text-orange-400" />;
      case 'pending': return <Clock size={16} className="text-blue-400" />;
      case 'message': return <MessageSquare size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-slate-400" />;
    }
  };

  const typeLabel = (type: Notification['type']) => {
    const labels: Record<string, string> = { debt: 'بدهی', stock: 'موجودی', expiry: 'انقضا', pending: 'تأیید', message: 'پیام', note: 'یادداشت' };
    return labels[type] || type;
  };

  const typeBg = (type: Notification['type']) => {
    const bgs: Record<string, string> = {
      debt: 'border-rose-500/20',
      stock: 'border-amber-500/20',
      expiry: 'border-orange-500/20',
      pending: 'border-blue-500/20',
      message: 'border-purple-500/20',
      note: 'border-slate-500/20',
    };
    return bgs[type] || 'border-slate-500/20';
  };

  const typeIconBg = (type: Notification['type']) => {
    const bgs: Record<string, string> = {
      debt: 'bg-rose-500/10',
      stock: 'bg-amber-500/10',
      expiry: 'bg-orange-500/10',
      pending: 'bg-blue-500/10',
      message: 'bg-purple-500/10',
      note: 'bg-slate-500/10',
    };
    return bgs[type] || 'bg-slate-500/10';
  };

  const markAllRead = () => markAllReadStore();
  const markRead = (id: number) => markReadStore(id);
  const deleteNotif = (id: number) => clearNotificationStore(id);
  const clearAll = () => notifications.forEach(n => clearNotificationStore(n.id));
  const playPreview = (type: 'bell_soft' | 'bell_bright') => {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const pattern = type === 'bell_soft'
      ? [{ f: 740, t: 0, d: 0.18 }, { f: 880, t: 0.16, d: 0.2 }]
      : [{ f: 1040, t: 0, d: 0.12 }, { f: 1320, t: 0.1, d: 0.14 }, { f: 1560, t: 0.2, d: 0.2 }];
    pattern.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.t);
      osc.stop(ctx.currentTime + n.t + n.d + 0.03);
    });
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const filtered = filterType === 'all' ? notifications : notifications.filter(n => n.type === filterType);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
            <Bell size={24} className="text-indigo-400" />
            اعلان‌ها و هشدارها
            {unread > 0 && <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full">{unread} جدید</span>}
          </h1>
          <p className={`${subText} text-sm mt-1`}>مدیریت اعلان‌های سیستم و تنظیمات صدا</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className={`flex items-center gap-2 ${cardBg} ${textColor} hover:text-indigo-400 px-3 py-2 rounded-xl text-sm border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <CheckCheck size={15} /> خواندن همه
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl text-sm glass border border-rose-500/20">
              <Trash2 size={15} /> پاک کردن همه
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'همه', count: notifications.length },
          { id: 'debt', label: 'بدهی', count: notifications.filter(n => n.type === 'debt').length },
          { id: 'stock', label: 'موجودی', count: notifications.filter(n => n.type === 'stock').length },
          { id: 'expiry', label: 'انقضا', count: notifications.filter(n => n.type === 'expiry').length },
          { id: 'pending', label: 'تأیید', count: notifications.filter(n => n.type === 'pending').length },
          { id: 'message', label: 'پیام', count: notifications.filter(n => n.type === 'message').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${filterType === tab.id ? 'bg-indigo-600 text-white' : `${isDark ? 'glass text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}`}
          >
            {tab.label}
            {tab.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-500/20 text-slate-400'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Notifications List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className={`${cardBg} p-12 text-center`}>
              <Bell size={48} className={`${isDark ? 'text-slate-600' : 'text-slate-300'} mx-auto mb-4`} />
              <p className={subText}>هیچ اعلانی وجود ندارد</p>
            </div>
          ) : (
            filtered.map(n => (
              <div
                key={n.id}
                className={`${isDark ? 'glass' : 'bg-white shadow-sm'} rounded-2xl p-4 border transition-all ${typeBg(n.type)} ${!n.is_read ? 'ring-1 ring-indigo-500/30' : isDark ? 'opacity-70' : 'opacity-80'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${typeIconBg(n.type)} flex-shrink-0`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`${textColor} font-medium text-sm`}>{n.title}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                      <span className={`text-xs ${subText} mr-auto`}>{n.created_at}</span>
                    </div>
                    <p className={`${subText} text-sm`}>{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'badge-blue' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>{typeLabel(n.type)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} title="خوانده‌شده"
                        className={`p-1.5 rounded-lg ${isDark ? 'glass text-slate-400 hover:text-emerald-400' : 'bg-slate-50 border border-slate-200 text-slate-400 hover:text-emerald-500'} transition-colors`}>
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} title="حذف"
                      className={`p-1.5 rounded-lg ${isDark ? 'glass text-slate-400 hover:text-rose-400' : 'bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500'} transition-colors`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Stats */}
          <div className={`${cardBg} p-4 space-y-3`}>
            <h3 className={`${textColor} font-semibold flex items-center gap-2`}><Info size={16} className="text-indigo-400" /> آمار اعلان‌ها</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'کل', value: notifications.length, color: textColor },
                { label: 'خوانده نشده', value: unread, color: 'text-rose-400' },
                { label: 'بدهی', value: notifications.filter(n => n.type === 'debt').length, color: 'text-rose-400' },
                { label: 'موجودی', value: notifications.filter(n => n.type === 'stock').length, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className={`${isDark ? 'bg-slate-800/50' : 'bg-slate-50 border border-slate-100'} rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className={`${subText} text-xs mt-1`}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sound Settings */}
          <div className={`${cardBg} p-5 space-y-4`}>
            <h3 className={`${textColor} font-semibold flex items-center gap-2`}>
              {soundEnabled ? <Volume2 size={18} className="text-indigo-400" /> : <VolumeX size={18} className={subText} />}
              تنظیمات صدا
            </h3>
            <div className="flex items-center justify-between">
              <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-sm`}>صدای اعلان</span>
              <button type="button" onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-indigo-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${soundEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            {soundEnabled && (
              <div>
                <label className={`${subText} text-xs mb-2 block`}>نوع صدا</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bell_soft' as const, title: 'زنگ نرم', sub: 'ملایم و کوتاه', icon: Bell },
                    { id: 'bell_bright' as const, title: 'زنگ روشن', sub: 'شفاف و بلندتر', icon: BellRing }
                  ].map((s) => (
                    <button key={s.id}
                      onClick={() => { setSoundType(s.id); playPreview(s.id); }}
                      className={`p-2 rounded-lg border transition-all text-right ${soundType === s.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : `${isDark ? 'glass text-slate-400 hover:text-white border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300'}`}`}>
                      <div className="flex items-center gap-2 justify-between">
                        <s.icon size={16} className={soundType === s.id ? 'text-indigo-300' : 'text-slate-400'} />
                        <div>
                          <p className="text-xs font-medium">{s.title}</p>
                          <p className="text-[10px] opacity-75">{s.sub}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div className={`${cardBg} p-5 space-y-3`}>
            <h3 className={`${textColor} font-semibold`}>انواع اعلان‌ها</h3>
            {[
              { label: 'بدهی‌های معوق', state: notifyDebt, setState: setNotifyDebt, color: 'bg-rose-500', icon: CreditCard },
              { label: 'تاریخ انقضا', state: notifyExpiry, setState: setNotifyExpiry, color: 'bg-orange-500', icon: AlertTriangle },
              { label: 'کم‌موجودی', state: notifyStock, setState: setNotifyStock, color: 'bg-amber-500', icon: Package },
              { label: 'فروش در انتظار', state: notifyPending, setState: setNotifyPending, color: 'bg-blue-500', icon: Clock },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${item.color}/20 flex items-center justify-center`}>
                    <item.icon size={12} className="text-white" />
                  </div>
                  <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-sm`}>{item.label}</span>
                </div>
                <button type="button" onClick={() => item.setState(!item.state)}
                  className={`w-10 h-5 rounded-full transition-all relative ${item.state ? 'bg-indigo-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${item.state ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Silent Hours */}
          <div className={`${cardBg} p-5 space-y-3`}>
            <h3 className={`${textColor} font-semibold`}>ساعات سکوت</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`${subText} text-xs mb-1 block`}>از ساعت</label>
                <input type="time" defaultValue="22:00"
                  className={inputClass} />
              </div>
              <div>
                <label className={`${subText} text-xs mb-1 block`}>تا ساعت</label>
                <input type="time" defaultValue="07:00"
                  className={inputClass} />
              </div>
            </div>
            <button className="w-full btn-primary text-white py-2.5 rounded-xl text-sm font-medium">ذخیره تنظیمات</button>
          </div>
        </div>
      </div>
    </div>
  );
}
