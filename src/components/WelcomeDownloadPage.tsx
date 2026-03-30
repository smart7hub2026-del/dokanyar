import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Apple, ChevronRight } from 'lucide-react';
import { DOWNLOAD_URLS } from '../config/downloads';

type Props = {
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
};

/**
 * صفحهٔ «دانلود» — فقط سه گزینه با آیکن (اندروید / iOS / ویندوز)
 */
export default function WelcomeDownloadPage({ onBack, onLogin, onRegister }: Props) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  const iosHref = origin ? `${origin}/` : '/';

  return (
    <div className="min-h-screen font-vazir relative flex flex-col overflow-hidden" dir="rtl">
      <header className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/15"
              aria-label="بازگشت"
            >
              <ChevronRight size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-black text-white">دانلود</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              ورود
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="px-4 py-2 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30"
            >
              ثبت‌نام
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-20">
          <a
            href={DOWNLOAD_URLS.apk}
            download="dokanyar.apk"
            className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-8 sm:p-10 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="دانلود اپ اندروید"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 shadow-lg ring-1 ring-white/20">
              <Smartphone size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-200/90">اندروید · APK</span>
          </a>

          <a
            href={iosHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-8 sm:p-10 transition-all hover:border-slate-400/40 hover:bg-white/[0.09] hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="باز کردن در مرورگر برای نصب وب‌اپ آیفون"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-900 shadow-lg ring-1 ring-white/15">
              <Apple size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200">آیفون · آیپد</span>
          </a>

          <a
            href={DOWNLOAD_URLS.windowsSetup}
            download="Dokanyar-Setup.exe"
            className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-8 sm:p-10 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="دانلود نسخه ویندوز"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-950 shadow-lg ring-1 ring-white/20">
              <Monitor size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-200/90">ویندوز · PC</span>
          </a>
        </div>
      </main>
    </div>
  );
}
