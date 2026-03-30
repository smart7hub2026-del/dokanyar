import { useState, useMemo } from 'react';
import { Shield, Smartphone, Key, Eye, EyeOff, CheckCircle, AlertTriangle, QrCode, Copy, Check, ClipboardList } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiTwoFactorSetup, apiTwoFactorEnable, apiTwoFactorDisable } from '../services/api';
import { SECURITY_GAPS_CATALOG, countGapsByLevel } from '../data/securityGapsCatalog';

interface SecurityPageProps {
  twoFactorEnabled?: boolean;
}

export default function SecurityPage({ twoFactorEnabled = false }: SecurityPageProps) {
  const authToken = useStore((s) => s.authToken);
  const currentUser = useStore((s) => s.currentUser);

  const [is2FAEnabled, setIs2FAEnabled] = useState(twoFactorEnabled || Boolean(currentUser?.two_factor_enabled));
  const [setupStep, setSetupStep] = useState<'idle' | 'loading' | 'qr' | 'verify' | 'disabling'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startSetup = async () => {
    setSetupStep('loading');
    setVerifyError('');
    try {
      const res = await apiTwoFactorSetup(authToken || undefined);
      setQrDataUrl(res.qrCode);
      setTotpSecret(res.secret);
      setSetupStep('qr');
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'خطا در راه‌اندازی');
      setSetupStep('idle');
    }
  };

  const confirmEnable = async () => {
    if (verifyCode.length < 6) { setVerifyError('کد ۶ رقمی الزامی است'); return; }
    setVerifyError('');
    setIsVerifying(true);
    try {
      await apiTwoFactorEnable(verifyCode, authToken || undefined);
      setIs2FAEnabled(true);
      setSetupStep('idle');
      setVerifyCode('');
      setQrDataUrl('');
      setTotpSecret('');
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'کد نادرست است');
    } finally {
      setIsVerifying(false);
    }
  };

  const confirmDisable = async () => {
    if (verifyCode.length < 6) { setVerifyError('کد ۶ رقمی الزامی است'); return; }
    setVerifyError('');
    setIsVerifying(true);
    try {
      await apiTwoFactorDisable(verifyCode, authToken || undefined);
      setIs2FAEnabled(false);
      setSetupStep('idle');
      setVerifyCode('');
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'کد نادرست است');
    } finally {
      setIsVerifying(false);
    }
  };

  const securityGaps = useMemo(() => {
    const list: { text: string; level: 'high' | 'medium' | 'info' }[] = [];
    if (!is2FAEnabled) {
      list.push({
        level: 'high',
        text: 'احراز هویت دو مرحله‌ای (2FA) برای حساب شما فعال نیست؛ در صورت لو رفتن رمز، ورود آسان‌تر می‌شود.',
      });
    }
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      if (!isLocal && window.location.protocol !== 'https:') {
        list.push({
          level: 'medium',
          text: 'صفحه روی HTTPS بارگذاری نشده است؛ برای استفادهٔ جدی روی اینترنت، گواهی SSL روی سرور توصیه می‌شود.',
        });
      }
    }
    list.push({
      level: 'info',
      text: 'رمز عبور حداقل ۸ کاراکتر و ترکیبی از حروف و اعداد؛ رمز فروشگاه و رمز نقش‌ها را جدا نگه دارید.',
    });
    list.push({
      level: 'info',
      text: 'خروجی پشتیبان (تنظیمات → پشتیبان) را دوره‌ای بگیرید؛ دادهٔ محلی مرورگر با پاک‌سازی کش از بین می‌رود.',
    });
    return list;
  }, [is2FAEnabled]);

  const catalogCounts = useMemo(() => countGapsByLevel(SECURITY_GAPS_CATALOG), []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new !== pwForm.confirm) { setPwError('رمزها یکسان نیستند'); return; }
    if (pwForm.new.length < 4) { setPwError('رمز جدید باید حداقل ۴ کاراکتر باشد'); return; }
    setPwError('');
    setPwLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'خطا در تغییر رمز');
      setPwSuccess(true);
      setPwForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'خطا در تغییر رمز');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">امنیت پیشرفته</h1>
        <p className="text-slate-400 text-sm mt-1">مدیریت امنیت حساب کاربری</p>
      </div>

      {/* 2FA Section */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
              <Smartphone size={22} className={is2FAEnabled ? 'text-emerald-400' : 'text-slate-500'} />
            </div>
            <div>
              <h2 className="text-white font-semibold">احراز هویت دو مرحله‌ای (2FA)</h2>
              <p className="text-slate-400 text-sm">لایه امنیتی اضافه با Google Authenticator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {is2FAEnabled && (
              <span className="text-xs px-2 py-1 rounded-full badge-green flex items-center gap-1">
                <CheckCircle size={10} /> فعال
              </span>
            )}
            {!is2FAEnabled && setupStep === 'idle' && (
              <button
                onClick={startSetup}
                className="btn-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                فعال‌سازی
              </button>
            )}
            {is2FAEnabled && setupStep === 'idle' && (
              <button
                onClick={() => { setSetupStep('disabling'); setVerifyCode(''); setVerifyError(''); }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
              >
                غیرفعال کردن
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {setupStep === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* QR Code step */}
        {setupStep === 'qr' && (
          <div className="bg-slate-800/50 rounded-xl p-5 space-y-4 border border-indigo-500/20 fade-in">
            <div className="flex items-start gap-3">
              <QrCode size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 text-sm">اپ Google Authenticator را باز کرده، گزینه «+» را بزنید و کد QR را اسکن کنید.</p>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <img src={qrDataUrl} alt="QR Code for 2FA" className="w-44 h-44" />
                </div>
                <p className="text-slate-400 text-xs">یا کلید زیر را دستی وارد کنید:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-700 px-3 py-1.5 rounded-lg text-indigo-300 font-mono text-sm tracking-widest select-all">
                    {totpSecret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 rounded-lg glass text-slate-400 hover:text-indigo-300 transition-colors"
                    title="کپی"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-400 text-xs mb-1 block">کد ۶ رقمی از اپلیکیشن را وارد کنید</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={verifyCode}
                  onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(''); }}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 font-mono text-center tracking-widest"
                />
                <button
                  onClick={confirmEnable}
                  disabled={verifyCode.length < 6 || isVerifying}
                  className="btn-primary text-white px-5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isVerifying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تأیید'}
                </button>
              </div>
              {verifyError && <p className="text-rose-400 text-xs mt-1">{verifyError}</p>}
            </div>

            <button
              onClick={() => { setSetupStep('idle'); setVerifyCode(''); setQrDataUrl(''); setTotpSecret(''); setVerifyError(''); }}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              انصراف
            </button>
          </div>
        )}

        {/* Disable step — confirm with current TOTP code */}
        {setupStep === 'disabling' && (
          <div className="bg-rose-900/20 rounded-xl p-5 space-y-4 border border-rose-500/20 fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 text-sm">برای غیرفعال کردن 2FA، کد ۶ رقمی Google Authenticator را وارد کنید.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={verifyCode}
                onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(''); }}
                placeholder="000000"
                maxLength={6}
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 font-mono text-center tracking-widest"
              />
              <button
                onClick={confirmDisable}
                disabled={verifyCode.length < 6 || isVerifying}
                className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-rose-500/30 transition-all"
              >
                {isVerifying ? <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" /> : 'غیرفعال'}
              </button>
            </div>
            {verifyError && <p className="text-rose-400 text-xs mt-1">{verifyError}</p>}
            <button
              onClick={() => { setSetupStep('idle'); setVerifyCode(''); setVerifyError(''); }}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              انصراف
            </button>
          </div>
        )}

        {is2FAEnabled && setupStep === 'idle' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium text-sm">احراز هویت دو مرحله‌ای فعال است</span>
            </div>
            <p className="text-slate-400 text-xs">هنگام ورود، علاوه بر رمز عبور، کد Google Authenticator نیز الزامی است.</p>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Key size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">تغییر رمز عبور</h2>
            <p className="text-slate-400 text-sm">رمز عبور قوی انتخاب کنید</p>
          </div>
        </div>

        {pwSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 fade-in">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm">رمز عبور با موفقیت تغییر کرد</span>
          </div>
        )}
        {pwError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400" />
            <span className="text-rose-400 text-sm">{pwError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { key: 'current' as const, label: 'رمز عبور فعلی' },
            { key: 'new' as const, label: 'رمز عبور جدید' },
            { key: 'confirm' as const, label: 'تکرار رمز عبور جدید' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <div className="relative max-w-sm">
                <input
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={(e) => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwError(''); }}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {key === 'confirm' && pwForm.confirm && pwForm.new !== pwForm.confirm && (
                <p className="text-rose-400 text-xs mt-1">رمزها یکسان نیستند</p>
              )}
            </div>
          ))}
          <div className="pt-1">
            <div className="text-xs text-slate-500 space-y-1 mb-3">
              <p>• حداقل ۸ کاراکتر</p>
              <p>• ترکیب حروف بزرگ، کوچک، عدد و علائم</p>
            </div>
            <button
              type="submit"
              disabled={!pwForm.current || !pwForm.new || pwForm.new !== pwForm.confirm || pwLoading}
              className="btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {pwLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تغییر رمز عبور'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4 border border-amber-500/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            چک‌لیست شخصی شما (همین حساب)
          </h2>
          <span className="text-amber-200 text-sm font-black bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            {securityGaps.filter((g) => g.level === 'high').length} مورد مهم · {securityGaps.length} نکته
          </span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          موارد زیر بر اساس وضعیت فعلی شما (۲FA، HTTPS، …) به‌صورت پویا محاسبه می‌شود.
        </p>
        <ul className="space-y-2 text-sm">
          {securityGaps.map((g, i) => (
            <li
              key={i}
              className={`rounded-xl px-3 py-2 border ${
                g.level === 'high'
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-100'
                  : g.level === 'medium'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-100'
                    : 'bg-slate-800/40 border-white/10 text-slate-300'
              }`}
            >
              {g.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass rounded-2xl p-6 space-y-5 border border-slate-600/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2 text-lg">
              <ClipboardList size={20} className="text-violet-400 shrink-0" />
              فهرست جامع کمبودها و محدودیت‌ها
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-3xl">
              این بخش شفاف‌سازی است: همهٔ جنبه‌هایی که در معماری فعلی (وب‌اپ + API) معمولاً کامل نیستند یا به تنظیمات سرور و فرآیند شما وابسته‌اند.
              هدف فریب یا ترساندن نیست؛ هدف این است بدانید کجا باید سخت‌گیری کنید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-200 border border-rose-500/25">
              بحرانی: {catalogCounts.high}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/25">
              مهم: {catalogCounts.medium}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-white/10">
              آگاهی: {catalogCounts.info}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-200 border border-violet-500/30">
              جمع: {catalogCounts.total}
            </span>
          </div>
        </div>

        <div className="max-h-[min(70vh,720px)] overflow-y-auto pr-1 space-y-4 scroll-smooth">
          {SECURITY_GAPS_CATALOG.map((cat) => (
            <div
              key={cat.title}
              className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-3"
            >
              <div>
                <h3 className="text-white font-bold text-sm">{cat.title}</h3>
                {cat.description ? (
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{cat.description}</p>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm">
                {cat.items.map((item, idx) => (
                  <li
                    key={`${cat.title}-${idx}`}
                    className={`rounded-lg px-3 py-2 border leading-relaxed ${
                      item.level === 'high'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-100'
                        : item.level === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/15 text-amber-100'
                          : 'bg-slate-800/30 border-white/5 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-70 me-2">
                      {item.level === 'high' ? '[بحرانی]' : item.level === 'medium' ? '[مهم]' : '[آگاهی]'}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3 border border-slate-600/40">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Shield size={18} className="text-sky-400" />
          داده، اشتراک و «یک سال استفاده»
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          این برنامه <strong className="text-white">فیک یا نمایشی نیست</strong>؛ دادهٔ فروشگاه در پایگاه سرور / همگام‌سازی ذخیره می‌شود.
          <strong className="text-white"> هیچ تایمر خودکاری برای حذف محصولات بعد از یک سال وجود ندارد</strong>؛ کالاها تا وقتی شما حذف یا سرور پاک نشود باقی می‌مانند.
        </p>
        <p className="text-slate-400 text-xs leading-relaxed">
          برای حساب <strong className="text-slate-200">آزمایشی (دیمو)</strong>، سرور ممکن است پایان دورهٔ آزمایش (<code className="text-indigo-300">trial_ends_at</code>) را
          اعمال کند و ورود را محدود کند — این ربطی به حذف خودکار اقلام انبار ندارد.
          اشتراک پولی ممکن است فیلدهایی مثل <code className="text-indigo-300">subscription_end</code> داشته باشد؛ باز هم حذف خودکار کالا پیش‌فرض نیست.
        </p>
      </div>
    </div>
  );
}

