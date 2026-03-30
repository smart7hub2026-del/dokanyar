import { useState } from 'react';
import { Download, Smartphone, Monitor, Apple } from 'lucide-react';
import { DOWNLOAD_URLS } from '../config/downloads';

type Variant = 'login' | 'default';

type Props = {
  variant?: Variant;
  className?: string;
  /** باز کردن صفحهٔ کامل دانلود (iOS / ویندوز / راهنما) */
  onOpenDownloadPage?: () => void;
};

/**
 * کارت دانلود اپ — برای صفحهٔ ورود (برجسته) یا سایر بخش‌ها
 */
export default function AppDownloadCard({ variant = 'default', className = '', onOpenDownloadPage }: Props) {
  const [hint, setHint] = useState('');

  const openFullDownload = () => {
    if (onOpenDownloadPage) {
      onOpenDownloadPage();
      return;
    }
    setHint('برای راهنمای iOS و ویندوز از صفحهٔ اصلی، «دانلود» را بزنید.');
    window.setTimeout(() => setHint(''), 5000);
  };

  const isLogin = variant === 'login';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md ${
        isLogin
          ? 'border-indigo-400/35 bg-gradient-to-br from-indigo-950/90 via-slate-900/85 to-violet-950/80 shadow-xl shadow-indigo-900/20 p-4 sm:p-5'
          : 'border-white/15 bg-white/[0.06] p-4'
      } ${className}`}
    >
      {isLogin && (
        <div
          className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl"
          aria-hidden
        />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isLogin ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/30' : 'bg-white/10 text-white'
          }`}
        >
          <Smartphone size={22} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className={`font-black ${isLogin ? 'text-base text-white' : 'text-sm text-white'}`}>دانلود اپ دکان‌یار</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            نسخهٔ اندروید (APK) را نصب کنید و همان کد فروشگاه و رمز نقش را مثل وب وارد کنید.
          </p>
        </div>
      </div>

      {hint ? (
        <p className="relative mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-[11px] font-bold text-amber-100">
          {hint}
        </p>
      ) : null}

      <div className="relative mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <a
          href={DOWNLOAD_URLS.apk}
          download="dokanyar.apk"
          className={`group flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-black transition-all ${
            isLogin
              ? 'border-emerald-500/40 bg-emerald-600/25 text-emerald-50 hover:bg-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/30'
              : 'border-indigo-500/40 bg-indigo-600/30 text-white hover:bg-indigo-600/50'
          }`}
        >
          <Download size={15} className="opacity-90 group-hover:translate-y-0.5 transition-transform" />
          Android APK
        </a>
        <button
          type="button"
          onClick={openFullDownload}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-xs font-black text-slate-200 hover:bg-white/10"
        >
          <Apple size={15} /> iOS
        </button>
        <button
          type="button"
          onClick={openFullDownload}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-xs font-black text-slate-200 hover:bg-white/10"
        >
          <Monitor size={15} /> Windows
        </button>
      </div>
      <p className="relative mt-2 text-center text-[10px] text-slate-500">
        فایل APK در <code className="rounded bg-black/30 px-1 text-slate-400">public/downloads/dokanyar.apk</code>
      </p>
    </div>
  );
}
