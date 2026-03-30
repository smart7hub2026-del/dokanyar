import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LegalPageBg from '../components/LegalPageBg';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-vazir relative overflow-hidden text-slate-100" dir="rtl">
      <LegalPageBg />
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-indigo-200 hover:text-white mb-8 transition-colors w-fit"
          >
            <ChevronRight size={18} /> بازگشت
          </button>
          <div className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-6 sm:p-10 shadow-2xl shadow-black/40 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-8 tracking-tight">{title}</h1>
            <div className="space-y-5 text-sm leading-8 text-slate-200/95 text-justify">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="حریم خصوصی">
      <p>
        ما اطلاعاتی که هنگام ثبت‌نام، ورود و استفاده از سامانه ثبت می‌کنید (مانند نام، تماس، داده‌های
        فروشگاه و تراکنش‌ها) را صرفاً برای ارائه خدمت، پشتیبانی و بهبود امنیت نگه می‌داریم.
      </p>
      <p>
        داده‌های عملیاتی فروشگاه شما در زیرساخت میزبانی شما یا سروری که برایتان مستقر شده ذخیره می‌شود؛
        از این داده‌ها برای اهداف تبلیغاتی شخص ثالث فروخته نمی‌شود مگر با رضایت صریح شما یا الزام قانونی.
      </p>
      <p>
        رمزها به‌صورت هش نگهداری می‌شوند. توصیه می‌شود رمزهای قوی و منحصربه‌فرد برای هر نقش کاربری
        تعیین کنید و نشست خود را روی دستگاه‌های اشتراکی فعال نگذارید.
      </p>
      <p className="text-xs text-slate-500 pt-4 border-t border-white/10">
        این متن الگوی اولیه است؛ قبل از انتشار عمومی، با مشاور حقوقی خود بازبینی و تکمیل کنید.
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="شرایط استفاده">
      <p>
        با استفاده از این سامانه می‌پذیرید که از آن مطابق قوانین محل فعالیت کسب‌وکار و مقررات مالیاتی
        مربوطه استفاده کنید و مسئولیت صحت داده‌های واردشده (قیمت، موجودی، فاکتور) بر عهده شماست.
      </p>
      <p>
        اشتراک یا دسترسی آزمایشی ممکن است محدودیت زمانی یا حجمی داشته باشد. تمدید یا ارتقاء از طریق
        مسیرهای اعلام‌شده در پنل یا پشتیبانی انجام می‌شود.
      </p>
      <p>
        در صورت تعلیق حساب به‌دلیل عدم پرداخت یا نقض قوانین، دسترسی تا رفع وضعیت محدود می‌شود؛ داده‌ها
        طبق سیاست نگهداری پشتیبان حذف نمی‌شوند مگر طبق قرارداد جداگانه.
      </p>
      <p className="text-xs text-slate-500 pt-4 border-t border-white/10">
        این متن الگوی اولیه است؛ قبل از انتشار عمومی، با مشاور حقوقی خود بازبینی و تکمیل کنید.
      </p>
    </LegalShell>
  );
}
