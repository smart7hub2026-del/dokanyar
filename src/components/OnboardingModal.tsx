import { X, LayoutDashboard, Package, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STORAGE_KEY = 'dokanyar_onboarding_v1_done';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ open, onClose }: Props) {
  const { isDark, t } = useApp();
  if (!open) return null;

  const card = isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';

  const steps = [
    { icon: LayoutDashboard, title: t('onboarding_step_dashboard'), body: t('onboarding_step_dashboard_body') },
    { icon: Package, title: t('onboarding_step_products'), body: t('onboarding_step_products_body') },
    { icon: FileText, title: t('onboarding_step_sales'), body: t('onboarding_step_sales_body') },
  ];

  const dismiss = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${card}`}>
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 left-3 p-2 rounded-xl opacity-70 hover:opacity-100 transition-opacity"
          aria-label="بستن"
        >
          <X size={20} />
        </button>
        <div className="p-6 sm:p-8 pt-12">
          <h2 className="text-xl font-black mb-1">{t('onboarding_title')}</h2>
          <p className="text-sm opacity-80 mb-6">{t('onboarding_subtitle')}</p>
          <ul className="space-y-4">
            {steps.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-500">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="text-xs opacity-75 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={dismiss}
            className="mt-8 w-full py-3.5 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            {t('onboarding_cta')}
          </button>
        </div>
      </div>
    </div>
  );
}
