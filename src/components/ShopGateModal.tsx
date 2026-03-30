import { Sparkles, PenLine, ShieldAlert, CreditCard, X } from 'lucide-react';

export type ShopGateVariant = 'trial_info' | 'suspended';

export interface ShopGateModalProps {
  open: boolean;
  variant: ShopGateVariant;
  /** برای نسخهٔ آزمایشی: روزهای تقریبی باقی‌مانده (۰ = کمتر از یک روز) */
  trialDaysRemaining?: number | null;
  message?: string;
  onClose?: () => void;
  onGoPayment?: () => void;
  onLogout?: () => void;
}

export default function ShopGateModal({
  open,
  variant,
  trialDaysRemaining = null,
  message,
  onClose,
  onGoPayment,
  onLogout,
}: ShopGateModalProps) {
  if (!open) return null;

  const trialLine =
    trialDaysRemaining === null || trialDaysRemaining === undefined
      ? 'دورهٔ آزمایشی شما فعال است.'
      : trialDaysRemaining === 0
        ? 'کمتر از یک روز از دورهٔ آزمایشی شما باقی مانده است.'
        : trialDaysRemaining === 1
          ? 'یک روز از دورهٔ آزمایشی شما باقی مانده است.'
          : `${trialDaysRemaining} روز از دورهٔ آزمایشی شما باقی مانده است.`;

  const bodyText =
    variant === 'suspended'
      ? message ||
        'حساب فروشگاه شما توسط مدیر سامانه معلق شده است. برای ادامه، نسبت به پرداخت یا تمدید اشتراک اقدام کنید.'
      : trialLine;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm border-0 cursor-default"
        aria-label="بستن"
        onClick={variant === 'trial_info' ? onClose : undefined}
      />
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-900 shadow-2xl shadow-indigo-900/40 p-6 text-center"
        role="dialog"
        aria-modal="true"
      >
        {variant === 'trial_info' && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        )}

        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/30 to-emerald-500/20 ring-2 ring-white/10">
          {variant === 'trial_info' ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <PenLine className="absolute text-indigo-300/90" size={44} strokeWidth={1.25} />
              <Sparkles className="absolute -bottom-1 -left-1 text-amber-300/80" size={22} strokeWidth={1.5} />
            </div>
          ) : (
            <ShieldAlert className="text-amber-300/95" size={48} strokeWidth={1.35} />
          )}
        </div>

        <h2 className="text-lg font-black text-white mb-2">
          {variant === 'trial_info' ? 'وضعیت آزمایشی' : 'حساب معلق'}
        </h2>
        <p className="text-sm font-medium text-slate-300 leading-relaxed mb-6">{bodyText}</p>

        <div className="flex flex-col gap-2">
          {variant === 'suspended' && onGoPayment && (
            <button
              type="button"
              onClick={onGoPayment}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <CreditCard size={18} />
              راهنمای پرداخت و تمدید اشتراک
            </button>
          )}
          {variant === 'trial_info' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors"
            >
              متوجه شدم
            </button>
          )}
          {variant === 'suspended' && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              خروج از حساب
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
