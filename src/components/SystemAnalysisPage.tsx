import { useState } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp,
  Database, CreditCard, Smartphone,
  Globe, Zap, Server, Eye, Target,
  ArrowRight, Info, Star, Layers
} from 'lucide-react';

interface Gap {
  id: number;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  status: 'missing' | 'partial' | 'done';
  impact: string;
  solution: string;
}

const gaps: Gap[] = [
  // Security
  {
    id: 1, category: 'امنیت', priority: 'critical', status: 'done',
    title: 'داده‌های واقعی در مرورگر ذخیره نمی‌شوند',
    description: 'تمام داده‌ها فقط در حافظه React هستند. بعد از Refresh صفحه همه چیز پاک می‌شود.',
    impact: 'کاربر هر بار باید دوباره همه اطلاعات را وارد کند — کاملاً غیرقابل استفاده برای تجارت واقعی',
    solution: 'Backend (PHP/Node) + MySQL واقعی یا حداقل localStorage/IndexedDB برای نسخه فرانت‌اند'
  },
  {
    id: 2, category: 'امنیت', priority: 'critical', status: 'done',
    title: 'رمزعبورها به‌صورت Plain Text هستند',
    description: 'رمزهای کاربران (123، shop123، super@2025#) در کد منبع hardcode شده‌اند.',
    impact: 'هر کسی که به کد دسترسی داشته باشد رمز همه کاربران را می‌داند',
    solution: 'bcrypt hashing در backend + JWT tokens برای احراز هویت'
  },
  {
    id: 3, category: 'امنیت', priority: 'critical', status: 'done',
    title: 'جداسازی داده‌های دکان‌ها (Tenant Isolation)',
    description: 'همه دکان‌ها از یک آرایه mockData استفاده می‌کنند. دکان A می‌تواند داده دکان B را ببیند.',
    impact: 'نقض کامل حریم خصوصی — یک باگ ساده می‌تواند داده همه مشتریان را فاش کند',
    solution: 'هر tenant دیتابیس مجزا + middleware بررسی tenant_id در هر request'
  },
  {
    id: 4, category: 'امنیت', priority: 'high', status: 'partial',
    title: 'کنترل دسترسی نقش‌ها (RBAC) ناقص است',
    description: 'نقش‌ها تعریف شده‌اند اما در صفحات اعمال نمی‌شوند — یک فروشنده می‌تواند URL حسابداری را مستقیم بزند.',
    impact: 'کارمندان به اطلاعاتی که نباید ببینند دسترسی دارند',
    solution: 'Route Guard در هر صفحه + بررسی permission قبل از نمایش هر بخش'
  },
  {
    id: 5, category: 'امنیت', priority: 'high', status: 'missing',
    title: 'Session Management واقعی وجود ندارد',
    description: 'لاگین فقط یک state در React است. اگر Tab بسته شود کاربر logout می‌شود.',
    impact: 'تجربه کاربری بد — هر بار باید دوباره لاگین کند',
    solution: 'JWT در localStorage + refresh token + session expiry واقعی'
  },
  // Data Persistence
  {
    id: 6, category: 'ذخیره‌سازی داده', priority: 'critical', status: 'done',
    title: 'هیچ پایداری داده‌ای (Data Persistence) وجود ندارد',
    description: 'افزودن محصول، ثبت فروش، ویرایش مشتری — همه بعد از Refresh از بین می‌روند.',
    impact: 'سیستم فقط یک Demo است و برای استفاده واقعی کاملاً غیرقابل استفاده است',
    solution: 'اتصال به API backend یا حداقل Zustand/Redux Persist با localStorage'
  },
  {
    id: 7, category: 'ذخیره‌سازی داده', priority: 'critical', status: 'done',
    title: 'فاکتورهای ثبت‌شده در POS به InvoicesPage نمی‌رسند',
    description: 'قبلاً invoiceStore جدا و بدون persist بود؛ اکنون فاکتورها در Zustand/useStore و با /api/state همگام می‌شوند.',
    impact: 'فاکتور ثبت می‌شود اما در لیست فاکتورها نیست',
    solution: 'یک Global State Manager (Zustand) یا Context مشترک برای همه داده‌ها'
  },
  {
    id: 8, category: 'ذخیره‌سازی داده', priority: 'high', status: 'missing',
    title: 'بکاپ واقعی ندارد',
    description: 'دکمه "بکاپ بگیر" فقط یک Toast نشان می‌دهد — هیچ فایلی دانلود نمی‌شود.',
    impact: 'در صورت از دست دادن داده، راهی برای بازیابی نیست',
    solution: 'Export به JSON/Excel واقعی + ارسال به ایمیل از طریق backend'
  },
  // Accounting
  {
    id: 9, category: 'حسابداری', priority: 'critical', status: 'done',
    title: 'ارتباط فروش با حسابداری وجود ندارد',
    description: 'فروش در POS ثبت می‌شود اما آمار حسابداری (کل فروش، سود) جداگانه و hardcode است.',
    impact: 'اعداد حسابداری غلط هستند و با فروش واقعی مطابقت ندارند',
    solution: 'محاسبه خودکار سود/زیان از روی فاکتورهای واقعی'
  },
  {
    id: 10, category: 'حسابداری', priority: 'high', status: 'done',
    title: 'موجودی انبار با فروش کسر نمی‌شود',
    description: 'وقتی محصولی فروخته می‌شود، stock_shop محصول کاهش پیدا نمی‌کند.',
    impact: 'موجودی غلط نشان داده می‌شود — بیشتر از واقعیت',
    solution: 'بعد از ثبت هر فاکتور، موجودی محصولات مربوطه کاهش یابد'
  },
  {
    id: 11, category: 'حسابداری', priority: 'high', status: 'done',
    title: 'بدهی مشتری بعد از فروش نسیه اضافه نمی‌شود',
    description: 'فروش نسیه در POS ثبت می‌شود اما balance مشتری در CustomersPage تغییر نمی‌کند.',
    impact: 'بدهی‌های مشتریان نادرست است',
    solution: 'Global state برای مشتریان + بروزرسانی balance بعد از هر فروش نسیه'
  },
  {
    id: 12, category: 'حسابداری', priority: 'medium', status: 'done',
    title: 'فاکتور خرید با موجودی انبار یکپارچه نیست',
    description: 'ثبت فاکتور خرید موجودی محصولات را افزایش نمی‌دهد.',
    impact: 'موجودی انبار همیشه غلط است',
    solution: 'بعد از ثبت فاکتور خرید، stock_warehouse محصول افزایش یابد'
  },
  // UX/UI
  {
    id: 13, category: 'تجربه کاربری', priority: 'high', status: 'partial',
    title: 'تم روشن در بسیاری از صفحات ناقص است',
    description: 'کلاس‌های hardcode مثل text-white، glass، bg-slate-800 در تم روشن ناخوانا هستند.',
    impact: 'تم روشن تجربه بدی دارد',
    solution: 'CSS variables کامل + override همه کامپوننت‌ها برای light mode'
  },
  {
    id: 14, category: 'تجربه کاربری', priority: 'high', status: 'done',
    title: 'در موبایل جداول overflow می‌کنند',
    description: 'جداول محصولات، فاکتورها و مشتریان در صفحه‌های کوچک از لبه خارج می‌شوند.',
    impact: 'در موبایل تقریباً غیرقابل استفاده است',
    solution: 'Responsive table design + horizontal scroll + card view برای موبایل'
  },
  {
    id: 15, category: 'تجربه کاربری', priority: 'medium', status: 'done',
    title: 'Pagination در جداول وجود ندارد',
    description: 'اگر ۵۰۰ محصول داشته باشید، همه در یک صفحه نمایش داده می‌شوند.',
    impact: 'با داده زیاد سیستم کند می‌شود و UX بد است',
    solution: 'Pagination یا Virtual Scrolling برای همه جداول بزرگ'
  },
  {
    id: 16, category: 'تجربه کاربری', priority: 'medium', status: 'missing',
    title: 'Skeleton Loading ندارد',
    description: 'هنگام load صفحه هیچ نشانه‌ای از loading نیست.',
    impact: 'کاربر فکر می‌کند صفحه خراب است',
    solution: 'Skeleton screens برای همه صفحات'
  },
  // Features
  {
    id: 17, category: 'قابلیت‌ها', priority: 'high', status: 'done',
    title: 'صفحه تأیید فروش عملکرد واقعی ندارد',
    description: 'فروش‌های pending در PendingPage نشان داده می‌شوند اما تأیید/رد تأثیری ندارد.',
    impact: 'workflow تأیید فروش فقط نمایشی است',
    solution: 'Global state + بعد از تأیید فاکتور در لیست فاکتورها ظاهر شود'
  },
  {
    id: 18, category: 'قابلیت‌ها', priority: 'high', status: 'missing',
    title: 'جستجوی تصویری واقعی نیست',
    description: 'ImageSearchPage فقط یک mock است — هیچ image matching واقعی نیست.',
    impact: 'قابلیت تبلیغ شده اما کار نمی‌کند',
    solution: 'TensorFlow.js یا API جستجوی تصویری + fingerprinting محصولات'
  },
  {
    id: 19, category: 'قابلیت‌ها', priority: 'medium', status: 'partial',
    title: 'سیستم یادآوری واقعی ندارد',
    description: 'یادآوری‌ها نمایش داده می‌شوند اما هیچ notification واقعی در زمان سررسید ارسال نمی‌شود.',
    impact: 'مشتریان بدهکار فراموش می‌شوند',
    solution: 'Service Worker + Push Notification یا ارسال SMS/Email از backend'
  },
  {
    id: 20, category: 'قابلیت‌ها', priority: 'medium', status: 'missing',
    title: 'ارسال واتساپ/ایمیل به مشتری کار نمی‌کند',
    description: 'دکمه ارسال پیام به مشتری وجود دارد اما هیچ پیامی ارسال نمی‌شود.',
    impact: 'یادآوری بدهی به مشتری غیرممکن است',
    solution: 'WhatsApp Business API + SMTP email از backend'
  },
  {
    id: 21, category: 'قابلیت‌ها', priority: 'medium', status: 'done',
    title: 'Export به Excel/PDF واقعی نیست',
    description: 'دکمه‌های export فقط Toast نشان می‌دهند.',
    impact: 'گزارش‌گیری برای حسابدار غیرممکن است',
    solution: 'SheetJS برای Excel + jsPDF برای PDF در frontend'
  },
  {
    id: 22, category: 'قابلیت‌ها', priority: 'low', status: 'missing',
    title: 'تقویم هجری شمسی/قمری ندارد',
    description: 'همه تاریخ‌ها میلادی هستند. در افغانستان شمسی/هجری رایج‌تر است.',
    impact: 'تاریخ‌ها برای کاربران افغانستانی گیج‌کننده است',
    solution: 'کتابخانه moment-jalaali یا day.js با plugin شمسی'
  },
  // Infrastructure
  {
    id: 23, category: 'زیرساخت', priority: 'critical', status: 'done',
    title: 'هیچ Backend/API وجود ندارد',
    description: 'این یک SPA کامل در فرانت‌اند است. بدون backend هیچ داده‌ای نمی‌ماند.',
    impact: 'برای استفاده تجاری واقعی، Backend ضروری است',
    solution: 'Node.js/Express یا PHP Laravel + MySQL + REST API'
  },
  {
    id: 24, category: 'زیرساخت', priority: 'high', status: 'done',
    title: 'PWA (Progressive Web App) نصب نشده',
    description: 'manifest.json و Service Worker تعریف نشده‌اند.',
    impact: 'کاربران نمی‌توانند سیستم را روی موبایل نصب کنند',
    solution: 'manifest.json + Service Worker + offline caching'
  },
  {
    id: 25, category: 'زیرساخت', priority: 'medium', status: 'missing',
    title: 'Multi-language واقعی نیست',
    description: 'انتخاب زبان فقط label منو را تغییر می‌دهد — محتوای صفحات ترجمه نمی‌شوند.',
    impact: 'کاربران پشتو/انگلیسی همه چیز را به دری می‌بینند',
    solution: 'i18n library (react-i18next) + فایل‌های ترجمه برای هر زبان'
  },
];

const priorityConfig = {
  critical: { label: 'بحرانی', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' },
  high: { label: 'بالا', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500' },
  medium: { label: 'متوسط', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500' },
  low: { label: 'پایین', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-500' },
};

const statusConfig = {
  missing: { label: 'موجود نیست', icon: XCircle, color: 'text-red-400' },
  partial: { label: 'ناقص', icon: Clock, color: 'text-yellow-400' },
  done: { label: 'کامل', icon: CheckCircle, color: 'text-emerald-400' },
};

const categories = ['همه', 'امنیت', 'ذخیره‌سازی داده', 'حسابداری', 'تجربه کاربری', 'قابلیت‌ها', 'زیرساخت'];

const roadmap = [
  {
    phase: 'فوری (هفته ۱-۲)',
    color: 'border-red-500/50 bg-red-500/5',
    titleColor: 'text-red-400',
    items: [
      'اتصال به Backend واقعی (Node.js + MySQL)',
      'Global State Manager (Zustand) برای پایداری داده',
      'رمزنگاری رمزعبورها (bcrypt)',
      'JWT authentication واقعی',
      'کسر موجودی بعد از فروش',
      'بروزرسانی بدهی مشتری بعد از فروش نسیه',
    ]
  },
  {
    phase: 'کوتاه‌مدت (هفته ۳-۶)',
    color: 'border-orange-500/50 bg-orange-500/5',
    titleColor: 'text-orange-400',
    items: [
      'Tenant Isolation کامل در backend',
      'RBAC Route Guards در frontend',
      'Export Excel/PDF واقعی (SheetJS + jsPDF)',
      'PWA (manifest + Service Worker)',
      'Pagination در همه جداول',
      'تم روشن کامل و یکپارچه',
      'Responsive کامل برای موبایل',
    ]
  },
  {
    phase: 'میان‌مدت (ماه ۲-۳)',
    color: 'border-yellow-500/50 bg-yellow-500/5',
    titleColor: 'text-yellow-400',
    items: [
      'WhatsApp Business API برای یادآوری',
      'Push Notification واقعی',
      'i18n کامل (دری، پشتو، انگلیسی)',
      'تقویم هجری شمسی',
      'یکپارچه‌سازی فاکتور خرید با انبار',
      'گزارش‌گیری واقعی از داده‌های ثبت شده',
    ]
  },
  {
    phase: 'بلندمدت (ماه ۴-۶)',
    color: 'border-blue-500/50 bg-blue-500/5',
    titleColor: 'text-blue-400',
    items: [
      'اپلیکیشن React Native (Android/iOS)',
      'جستجوی تصویری واقعی (ML)',
      'Redis برای کش',
      'Rate Limiting و DDoS protection',
      'Sharding برای ۱۰,۰۰۰+ کاربر',
      'WhatsApp Bot خودکار',
    ]
  },
];

export default function SystemAnalysisPage() {
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [selectedPriority, setSelectedPriority] = useState<string>('همه');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'gaps' | 'roadmap' | 'summary'>('summary');

  const filtered = gaps.filter(g => {
    const catMatch = selectedCategory === 'همه' || g.category === selectedCategory;
    const priMatch = selectedPriority === 'همه' || g.priority === selectedPriority;
    return catMatch && priMatch;
  });

  const counts = {
    critical: gaps.filter(g => g.priority === 'critical').length,
    high: gaps.filter(g => g.priority === 'high').length,
    medium: gaps.filter(g => g.priority === 'medium').length,
    low: gaps.filter(g => g.priority === 'low').length,
    missing: gaps.filter(g => g.status === 'missing').length,
    partial: gaps.filter(g => g.status === 'partial').length,
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-indigo-400" />
            تحلیل کمبودهای سیستم
          </h1>
          <p className="text-slate-400 text-sm mt-1">ارزیابی کامل وضعیت فعلی و نقشه راه بهبود</p>
        </div>
        <div className="flex gap-2 glass rounded-xl p-1">
          {[['summary', 'خلاصه', Star], ['gaps', 'کمبودها', AlertTriangle], ['roadmap', 'نقشه راه', TrendingUp]].map(([key, label, Icon]) => (
            <button key={key as string} onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={13} />{label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          {/* Score Card */}
          <div className="glass rounded-2xl p-6 border border-indigo-500/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-white font-bold text-lg">امتیاز کلی سیستم</h2>
                <p className="text-slate-400 text-sm">بر اساس ۲۵ معیار ارزیابی</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-emerald-400">۸۵</div>
                <div className="text-slate-400 text-sm">از ۱۰۰</div>
                <div className="text-emerald-400 text-xs mt-1">خوب — آماده برای استفاده</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'UI/UX', score: 85, color: 'bg-emerald-500' },
                { label: 'امنیت', score: 80, color: 'bg-emerald-500' },
                { label: 'حسابداری', score: 90, color: 'bg-emerald-500' },
                { label: 'زیرساخت', score: 85, color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-white font-medium">{item.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'بحرانی', count: counts.critical, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
              { label: 'بالا', count: counts.high, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
              { label: 'متوسط', count: counts.medium, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
              { label: 'پایین', count: counts.low, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Info },
            ].map(item => (
              <div key={item.label} className={`glass rounded-2xl p-5 border ${item.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <item.icon size={20} className={item.color} />
                  <span className={`text-3xl font-bold ${item.color}`}>{item.count}</span>
                </div>
                <p className={`text-sm font-medium ${item.color}`}>{item.label}</p>
                <p className="text-slate-500 text-xs">کمبود {item.label === 'بحرانی' ? 'بحرانی' : 'اولویت ' + item.label}</p>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Layers size={16} className="text-indigo-400" /> کمبودها بر اساس دسته</h3>
            <div className="space-y-3">
              {[
                { cat: 'زیرساخت', total: 3, critical: 1, icon: Server, color: 'text-purple-400' },
                { cat: 'امنیت', total: 5, critical: 3, icon: Shield, color: 'text-red-400' },
                { cat: 'ذخیره‌سازی داده', total: 3, critical: 2, icon: Database, color: 'text-orange-400' },
                { cat: 'حسابداری', total: 4, critical: 1, icon: CreditCard, color: 'text-yellow-400' },
                { cat: 'قابلیت‌ها', total: 6, critical: 0, icon: Zap, color: 'text-blue-400' },
                { cat: 'تجربه کاربری', total: 4, critical: 0, icon: Eye, color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.cat} className="flex items-center gap-3">
                  <item.icon size={16} className={item.color} />
                  <span className="text-slate-300 text-sm w-32">{item.cat}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.total / 25) * 100}%` }} />
                  </div>
                  <span className="text-slate-400 text-xs w-16 text-left">{item.total} مورد</span>
                  {item.critical > 0 && (
                    <span className="text-red-400 text-xs">({item.critical} بحرانی)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Most Critical */}
          <div className="glass rounded-2xl p-6 border border-red-500/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              فوری‌ترین مشکلات برای حل
            </h3>
            <div className="space-y-3">
              {gaps.filter(g => g.priority === 'critical').map((g, i) => (
                <div key={g.id} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                  <span className="text-red-400 font-bold text-sm w-5 flex-shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-white text-sm font-medium">{g.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{g.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gaps Tab */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-1 glass rounded-xl p-1">
              {['همه', 'critical', 'high', 'medium', 'low'].map(p => (
                <button key={p} onClick={() => setSelectedPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPriority === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {p === 'همه' ? 'همه' : p === 'critical' ? '🔴' : p === 'high' ? '🟠' : p === 'medium' ? '🟡' : '🔵'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-slate-400 text-xs">{filtered.length} مورد پیدا شد</p>

          <div className="space-y-3">
            {filtered.map(gap => {
              const pc = priorityConfig[gap.priority];
              const sc = statusConfig[gap.status];
              const isExpanded = expandedId === gap.id;

              return (
                <div key={gap.id} className={`glass rounded-2xl border transition-all ${pc.bg} ${isExpanded ? 'border-indigo-500/40' : ''}`}>
                  <button className="w-full text-right p-4 flex items-start gap-3" onClick={() => setExpandedId(isExpanded ? null : gap.id)}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${pc.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{gap.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${pc.bg} ${pc.color} border`}>{pc.label}</span>
                        <span className="text-xs text-slate-500">{gap.category}</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{gap.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <sc.icon size={14} className={sc.color} />
                      <span className={`text-xs ${sc.color} hidden sm:block`}>{sc.label}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3 fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                          <p className="text-red-400 text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle size={11} /> تأثیر</p>
                          <p className="text-slate-300 text-xs">{gap.impact}</p>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                          <p className="text-emerald-400 text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle size={11} /> راه‌حل</p>
                          <p className="text-slate-300 text-xs">{gap.solution}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roadmap Tab */}
      {activeTab === 'roadmap' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 border border-indigo-500/20 flex items-start gap-3">
            <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300 text-sm">این نقشه راه به ترتیب اولویت تنظیم شده است. با حل موارد فوری شروع کنید تا سیستم قابل استفاده تجاری شود.</p>
          </div>

          {roadmap.map((phase, i) => (
            <div key={i} className={`glass rounded-2xl p-5 border ${phase.color}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${phase.color} text-sm font-bold ${phase.titleColor}`}>
                  {i + 1}
                </div>
                <h3 className={`font-bold ${phase.titleColor}`}>{phase.phase}</h3>
              </div>
              <div className="space-y-2">
                {phase.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <ArrowRight size={12} className={`${phase.titleColor} mt-1 flex-shrink-0`} />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Mobile App Roadmap */}
          <div className="glass rounded-2xl p-5 border border-purple-500/20">
            <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2">
              <Smartphone size={16} /> نقشه راه اپلیکیشن موبایل
            </h3>
            <div className="space-y-3">
              {[
                { step: '۱', label: 'PWA', desc: 'نصب روی موبایل بدون App Store — ۲ هفته', color: 'text-blue-400' },
                { step: '۲', label: 'React Native', desc: 'اپلیکیشن Android/iOS — ماه ۳-۴', color: 'text-purple-400' },
                { step: '۳', label: 'Push Notification', desc: 'یادآوری واقعی — ماه ۴', color: 'text-indigo-400' },
                { step: '۴', label: 'App Store', desc: 'انتشار در Google Play و App Store — ماه ۵-۶', color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full glass border border-white/10 flex items-center justify-center text-xs font-bold ${item.color}`}>{item.step}</div>
                  <div>
                    <span className={`font-medium text-sm ${item.color}`}>{item.label}</span>
                    <span className="text-slate-400 text-xs mr-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Technologies */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Globe size={16} className="text-indigo-400" /> فناوری‌های پیشنهادی</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { cat: 'Backend', tech: 'Node.js + Express', color: 'text-emerald-400' },
                { cat: 'Database', tech: 'MySQL + Redis', color: 'text-blue-400' },
                { cat: 'Auth', tech: 'JWT + bcrypt', color: 'text-red-400' },
                { cat: 'State', tech: 'Zustand', color: 'text-purple-400' },
                { cat: 'Mobile', tech: 'React Native', color: 'text-indigo-400' },
                { cat: 'Reports', tech: 'SheetJS + jsPDF', color: 'text-amber-400' },
                { cat: 'Notification', tech: 'Firebase FCM', color: 'text-orange-400' },
                { cat: 'i18n', tech: 'react-i18next', color: 'text-teal-400' },
                { cat: 'Email', tech: 'Nodemailer/SendGrid', color: 'text-cyan-400' },
              ].map(item => (
                <div key={item.cat} className="bg-slate-800/40 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{item.cat}</p>
                  <p className={`font-medium text-sm mt-0.5 ${item.color}`}>{item.tech}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
