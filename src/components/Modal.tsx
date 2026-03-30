import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl', footer }: ModalProps) {
  const { isDark } = useApp();
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className={`relative z-[1] my-auto glass-dark border border-white/10 rounded-2xl w-full ${maxWidth} max-h-[min(92dvh,calc(100dvh-2rem))] flex flex-col overflow-hidden shadow-2xl`}
        style={{ animation: 'fadeIn 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>

        {footer && (
          <div className={`px-6 py-4 border-t flex-shrink-0 flex gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  /** دو دکمه سبز (تأیید) و قرمز (رد) کنار هم، + انصراف خاکستری */
  pairedApproveReject?: boolean;
  onReject?: () => void;
  rejectText?: string;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأیید',
  danger = true,
  pairedApproveReject = false,
  onReject,
  rejectText = 'رد',
}: ConfirmModalProps) {
  const { isDark } = useApp();
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{message}</p>
      {pairedApproveReject && onReject ? (
        <div className="mt-6 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="btn-success flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={1.75} /> {confirmText}
            </button>
            <button
              type="button"
              onClick={() => {
                onReject();
                onClose();
              }}
              className="btn-danger flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <XCircle size={18} strokeWidth={1.75} /> {rejectText}
            </button>
          </div>
          <button type="button" onClick={onClose} className="btn-muted w-full py-2.5 rounded-xl text-sm">
            انصراف
          </button>
        </div>
      ) : (
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {danger ? <XCircle size={17} strokeWidth={1.75} /> : <Check size={17} strokeWidth={1.75} />}
            {confirmText}
          </button>
          <button type="button" onClick={onClose} className="flex-1 btn-muted py-2.5 rounded-xl text-sm">
            انصراف
          </button>
        </div>
      )}
    </Modal>
  );
}
