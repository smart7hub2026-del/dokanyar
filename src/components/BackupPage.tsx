import { useState, useEffect, useRef } from 'react';
import {
  Database, Download, Upload, CheckCircle, AlertCircle, Clock,
  RefreshCw, FileJson, FileText, ShieldCheck, Info, Trash2,
  Package, Users, Receipt, Wallet, Terminal,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const API = import.meta.env.VITE_API_BASE_URL || '';

interface HistoryEntry { id: number; action: string; timestamp: string; by: string }

export default function BackupPage() {
  const authToken = useStore(s => s.authToken);
  const currentUser = useStore(s => s.currentUser);
  const storeState = useStore(s => s);
  const tok = authToken || undefined;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'db'>('json');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [restorePreview, setRestorePreview] = useState<Record<string, unknown> | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [restoreShopPassword, setRestoreShopPassword] = useState('');
  const [superSkipRestorePw, setSuperSkipRestorePw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API}/api/settings/backup/history`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.logs || []);
      }
    } catch {}
    setLoadingHistory(false);
  };

  useEffect(() => { void fetchHistory(); }, []);

  useEffect(() => {
    if (!isSuperAdmin && exportFormat === 'db') setExportFormat('json');
  }, [isSuperAdmin, exportFormat]);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'db') {
        const res = await fetch(`${API}/api/settings/backup/export-db`, { credentials: 'include', headers });
        if (!res.ok) {
          let errText = 'خطا در صادرکردن';
          try {
            const j = (await res.json()) as { message?: string };
            if (j?.message) errText = j.message;
          } catch {
            /* not json */
          }
          throw new Error(errText);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = res.headers.get('Content-Disposition');
        let filename = '';
        if (cd) {
          const quoted = /filename="([^"]+)"/i.exec(cd);
          const loose = /filename=([^;\s]+)/i.exec(cd);
          filename = (quoted?.[1] || loose?.[1] || '').trim();
        }
        if (!filename) {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          filename = `dokanyar_platform_${stamp}.db`;
        }
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('ok', 'فایل پایگاه داده SQLite دانلود شد');
        void fetchHistory();
      } else {
        const res = await fetch(`${API}/api/settings/backup/export`, { credentials: 'include', headers });
        if (!res.ok) throw new Error((await res.json())?.message || 'خطا در صادرکردن');
        const payload = await res.json();

        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

        let content = '';
        let mime = '';
        let ext = '';

        if (exportFormat === 'json') {
          content = JSON.stringify(payload, null, 2);
          mime = 'application/json';
          ext = 'json';
        } else {
          const d = payload.data || {};
          const rows: string[] = ['بخش,شناسه,عنوان,مقدار'];
          (d.products || []).forEach((p: Record<string, unknown>) =>
            rows.push(`محصولات,${p.id},"${p.name}",${p.price}`));
          (d.customers || []).forEach((c: Record<string, unknown>) =>
            rows.push(`مشتریان,${c.id},"${c.name}",${c.phone}`));
          (d.invoices || []).forEach((i: Record<string, unknown>) =>
            rows.push(`فاکتورها,${i.id},"${i.customer_name}",${i.total}`));
          content = rows.join('\n');
          mime = 'text/csv;charset=utf-8';
          ext = 'csv';
        }

        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dokanyar_backup_${payload.shopCode || 'shop'}_${stamp}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        showMsg('ok', `بکاپ ${exportFormat.toUpperCase()} دانلود شد`);
        void fetchHistory();
      }
    } catch (e) {
      showMsg('err', (e as Error).message);
    }
    setIsExporting(false);
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.data) throw new Error('فایل بکاپ نامعتبر است (فیلد data پیدا نشد)');
      setRestorePreview(parsed);
      setRestoreShopPassword('');
      setSuperSkipRestorePw(false);
      setShowConfirmRestore(true);
    } catch (ex) {
      showMsg('err', (ex as Error).message || 'فایل نامعتبر');
    }
    e.target.value = '';
  };

  const confirmRestore = async () => {
    if (!restorePreview) return;
    if (!(isSuperAdmin && superSkipRestorePw) && !restoreShopPassword.trim()) {
      showMsg('err', 'برای بازیابی، رمز ورود به دکان (رمز فروشگاه) را وارد کنید.');
      return;
    }
    setIsRestoring(true);
    setShowConfirmRestore(false);
    try {
      const body: Record<string, unknown> = { data: restorePreview.data };
      if (
        restorePreview.format === 'dokanyar-shop-backup-v2' &&
        typeof restorePreview.checksum === 'string'
      ) {
        body.meta = {
          checksum: restorePreview.checksum,
          format: restorePreview.format,
          exportedAt: restorePreview.exportedAt,
        };
      }
      if (isSuperAdmin && superSkipRestorePw) {
        body.skipShopPasswordVerify = true;
      } else {
        body.shopPassword = restoreShopPassword.trim();
      }
      const res = await fetch(`${API}/api/settings/backup/restore`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'خطا در بازیابی');
      showMsg('ok', 'داده‌ها با موفقیت بازیابی شدند. صفحه را رفرش کنید.');
      void fetchHistory();
    } catch (e) {
      showMsg('err', (e as Error).message);
    }
    setIsRestoring(false);
    setRestorePreview(null);
    setRestoreShopPassword('');
    setSuperSkipRestorePw(false);
  };

  // ── Quick stats ───────────────────────────────────────────────────────────
  const stats = [
    { label: 'محصولات', value: storeState.products?.length ?? 0, Icon: Package },
    { label: 'مشتریان', value: storeState.customers?.length ?? 0, Icon: Users },
    { label: 'فاکتورها', value: storeState.invoices?.length ?? 0, Icon: Receipt },
    { label: 'بدهی‌ها', value: storeState.debts?.length ?? 0, Icon: Wallet },
  ] as const;

  return (
    <div className="space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database size={24} className="text-indigo-400" /> مدیریت بکاپ</h1>
          <p className="text-slate-400 text-sm mt-1">صادرکردن، وارد کردن و بازیابی داده‌های فروشگاه</p>
        </div>
        <button onClick={() => void fetchHistory()} disabled={loadingHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-medium hover:border-indigo-500/50 transition-all disabled:opacity-50">
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> بارگذاری مجدد
        </button>
      </div>

      {/* Alert */}
      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold ${msg.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          {msg.type === 'ok' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* Data size stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <s.Icon size={28} className="text-indigo-400 shrink-0" />
            <div>
              <p className="text-xl font-black">{s.value.toLocaleString()}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2"><Download size={18} className="text-indigo-400" /> صادر کردن بکاپ</h3>
          <p className="text-slate-400 text-sm">
            خروجی JSON نسخهٔ ۲ شامل <span className="text-indigo-300 font-bold">SHA-256 checksum</span> است تا در بازیابی، دستکاری فایل مشخص شود.
          </p>

          {/* Format selector */}
          <div className={`grid gap-3 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {(['json', 'csv'] as const).map(f => (
              <button key={f} type="button" onClick={() => setExportFormat(f)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm ${exportFormat === f ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300' : 'border-slate-600/40 text-slate-400 hover:border-slate-500'}`}>
                {f === 'json' ? <FileJson size={18} /> : <FileText size={18} />}
                {f === 'json' ? 'JSON (کامل)' : 'CSV (جدول)'}
              </button>
            ))}
            {isSuperAdmin && (
              <button type="button" onClick={() => setExportFormat('db')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm ${exportFormat === 'db' ? 'border-violet-500 bg-violet-500/15 text-violet-300' : 'border-slate-600/40 text-slate-400 hover:border-slate-500'}`}>
                <Database size={18} />
                SQLite (.db)
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2 text-xs text-indigo-300">
            <Info size={14} className="mt-0.5 shrink-0" />
            {exportFormat === 'json'
              ? 'فایل JSON شامل تمام داده‌های فروشگاه است و برای بازیابی کامل مناسب است.'
              : exportFormat === 'csv'
                ? 'فایل CSV شامل محصولات، مشتریان و فاکتورها است — قابل باز کردن در Excel.'
                : 'فایل SQLite کل پایگاه پلتفرم است (تمام فروشگاه‌ها و کاربران). بسیار حساس است؛ فقط مدیر پلتفرم (سوپرادمین) و آرشیو امن.'}
          </div>

          <button onClick={() => void handleExport()} disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 btn-primary text-white py-3 rounded-xl font-bold text-sm disabled:opacity-60 transition-all">
            {isExporting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> در حال آماده‌سازی...</>
              : <><Download size={16} /> دانلود بکاپ {exportFormat === 'db' ? 'SQLite' : exportFormat.toUpperCase()}</>}
          </button>
        </div>

        {/* Restore */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2"><Upload size={18} className="text-amber-400" /> بازیابی از بکاپ</h3>
          <p className="text-slate-400 text-sm">
            فقط JSON کامل (همان دکمهٔ JSON). هنگام تأیید بازیابی، <span className="text-amber-200 font-bold">رمز فروشگاه</span> (همان رمز ورود به دکان) الزامی است — ابرادمین می‌تواند با گزینٔ پشتیبانی از آن صرف‌نظر کند.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-600/50 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-indigo-500/5 group">
            <Upload size={28} className="mx-auto mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            <p className="font-bold text-sm">فایل JSON بکاپ را اینجا بکشید یا کلیک کنید</p>
            <p className="text-slate-400 text-xs mt-1">فقط فایل‌های .json پشتیبانی می‌شوند</p>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            بازیابی، داده‌های فعلی فروشگاه را جایگزین می‌کند. قبل از ادامه مطمئن شوید که یک بکاپ جدید دارید.
          </div>
        </div>
      </div>

      {/* Python backup on server */}
      {isSuperAdmin && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Terminal size={18} className="text-slate-400" /> بکاپ با پایتون روی سرور
          </h3>
          <p className="text-slate-400 text-sm">
            اسکریپت زیر را از این آدرس ذخیره کنید و روی ماشینی که سرور Node اجرا می‌کند، با همان{' '}
            <code className="text-indigo-300 text-xs bg-white/5 px-1 rounded">DATABASE_URL</code> اجرا کنید؛ یک کپی در پوشه{' '}
            <code className="text-indigo-300 text-xs bg-white/5 px-1 rounded">backups/</code> می‌سازد.
          </p>
          <a
            href={`${import.meta.env.BASE_URL}scripts/backup_platform_db.py`.replace(/\/{2,}/g, '/').replace(':/', '://')}
            download="backup_platform_db.py"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200"
          >
            <Download size={14} /> دانلود اسکریپت backup_platform_db.py
          </a>
          <pre className="text-[11px] leading-5 p-3 rounded-xl bg-black/40 border border-white/10 text-slate-300 overflow-x-auto" dir="ltr">
{`cd /path/to/project
set DATABASE_URL=file:./server/prisma/dev.db
python public/scripts/backup_platform_db.py`}
          </pre>
        </div>
      )}

      {/* Backup History */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-5">
          <Clock size={18} className="text-slate-400" /> تاریخچه بکاپ‌ها
          {loadingHistory && <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mr-2" />}
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Database size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">هنوز هیچ بکاپی ثبت نشده</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(h => {
              const isExport = h.action === 'backup_export';
              const isDbExport = h.action === 'backup_export_db';
              const iconWrap = isDbExport
                ? 'bg-violet-500/15 text-violet-400'
                : isExport
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'bg-amber-500/15 text-amber-400';
              const title = isDbExport
                ? 'دانلود فایل پایگاه داده'
                : isExport
                  ? 'صادرکردن بکاپ'
                  : 'بازیابی از بکاپ';
              return (
              <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:bg-white/3 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
                  {isDbExport ? <Database size={16} /> : isExport ? <Download size={16} /> : <Upload size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-slate-400 text-xs truncate">توسط {h.by}</p>
                </div>
                <p className="text-slate-500 text-xs shrink-0">{new Date(h.timestamp).toLocaleString('fa-IR')}</p>
                {(isExport || isDbExport) && (
                  <span className="badge-green text-[10px] px-2 py-0.5 rounded-full shrink-0">موفق</span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security info */}
      <div className="glass rounded-2xl p-5 flex items-start gap-4">
        <ShieldCheck size={22} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm mb-1">امنیت بکاپ</p>
          <p className="text-slate-400 text-xs leading-6">
            بکاپ‌های JSON شامل تمام داده‌های فروشگاه هستند. فایل‌های بکاپ را در مکان امن نگهداری کنید و با دیگران به اشتراک نگذارید. توصیه می‌شود هر هفته یک بار بکاپ دستی بگیرید.
          </p>
        </div>
      </div>

      {/* Restore Confirm Modal */}
      {showConfirmRestore && restorePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-amber-400" />
            </div>
            <h3 className="text-center font-black text-lg">تأیید بازیابی</h3>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <p><span className="text-slate-400">کد فروشگاه:</span> <span className="font-bold">{String(restorePreview.shopCode || '—')}</span></p>
              <p><span className="text-slate-400">تاریخ بکاپ:</span> <span className="font-bold">{restorePreview.exportedAt ? new Date(String(restorePreview.exportedAt)).toLocaleString('fa-IR') : '—'}</span></p>
              {restorePreview.format === 'dokanyar-shop-backup-v2' && typeof restorePreview.checksum === 'string' ? (
                <p className="break-all" dir="ltr"><span className="text-slate-400">checksum:</span> <span className="font-mono text-[10px] text-emerald-300">{String(restorePreview.checksum).slice(0, 24)}…</span></p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold block">رمز فروشگاه (الزامی)</label>
              <input
                type="password"
                value={restoreShopPassword}
                onChange={(e) => setRestoreShopPassword(e.target.value)}
                placeholder="همان رمزی که با کد دکان وارد می‌کنید"
                dir="ltr"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-white text-sm"
              />
              {isSuperAdmin && (
                <label className="flex items-center gap-2 text-xs text-amber-200/90 cursor-pointer">
                  <input type="checkbox" checked={superSkipRestorePw} onChange={(e) => setSuperSkipRestorePw(e.target.checked)} className="rounded" />
                  رد کردن رمز فروشگاه (فقط ابرادمین — پشتیبانی اضطراری)
                </label>
              )}
            </div>
            <p className="text-amber-300 text-xs text-center">داده‌های فعلی پاک شده و با این بکاپ جایگزین می‌شوند. این عمل قابل بازگشت نیست!</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowConfirmRestore(false); setRestorePreview(null); setRestoreShopPassword(''); setSuperSkipRestorePw(false); }}
                className="flex-1 px-4 py-2.5 rounded-xl glass text-sm font-bold">انصراف</button>
              <button onClick={() => void confirmRestore()} disabled={isRestoring}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-60 transition-all">
                {isRestoring ? 'در حال بازیابی...' : 'تأیید و بازیابی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
