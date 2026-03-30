import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const maxW: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * مودال پورتال به body — مرکز‌چین بدون min-h صفحه کامل تا فاصلهٔ سفید پایین و جابه‌جایی layout ایجاد نشود.
 */
export default function FormModal({
  open,
  onClose,
  title,
  children,
  size = 'lg',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: Size;
  footer?: ReactNode;
}) {
  const { isDark } = useApp();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const panel =
    isDark
      ? 'border border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-black/50'
      : 'border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-900/10';

  const node = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="بستن پنجره"
        onClick={onClose}
      />
      <div
        className={`relative z-[1] my-auto flex w-full ${maxW[size]} max-h-[min(92dvh,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4 ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <div className="min-w-0 text-base font-semibold leading-snug">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg p-1.5 transition-colors ${
              isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">{children}</div>
        {footer != null && (
          <div
            className={`shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4 ${
              isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-200 bg-slate-50/90'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
