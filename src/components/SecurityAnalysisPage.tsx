import { useState } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Lock, Eye,
  Smartphone, Key,
  TrendingUp, Activity, Zap, DollarSign, BarChart2,
  BookOpen, ChevronRight, Info
} from 'lucide-react';

const sections = [
  { id: 'security', label: 'کمبودهای امنیتی', icon: Shield, color: 'rose' },
  { id: 'accounting', label: 'کمبودهای حسابداری', icon: DollarSign, color: 'amber' },
  { id: 'management', label: 'کمبودهای مدیریتی', icon: BarChart2, color: 'blue' },
  { id: 'admin-access', label: 'دسترسی مخفی ادمین', icon: Lock, color: 'purple' },
  { id: 'mobile', label: 'اپلیکیشن موبایل', icon: Smartphone, color: 'emerald' },
  { id: 'roadmap', label: 'نقشه راه', icon: TrendingUp, color: 'indigo' },
];

const securityGaps = [
  {
    priority: 'بحرانی', color: 'rose',
    title: 'عدم ایزولیشن واقعی Tenant',
    detail: 'در حال حاضر هیچ middleware ای در frontend برای جلوگیری از دسترسی cross-tenant وجود ندارد. در backend باید هر query با tenant_id فیلتر شود.',
    solution: 'همیشه در backend: SELECT * FROM products WHERE tenant_id = :tid AND id = :id',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بحرانی', color: 'rose',
    title: 'رمز عبور در کد (Hardcoded)',
    detail: 'رمزهای عبور admin123, seller123 در mockData hardcode شده‌اند. در محیط production باید bcrypt hash باشند.',
    solution: 'password_hash() در PHP، bcrypt در Node.js، هرگز plain text ذخیره نشود',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بحرانی', color: 'rose',
    title: 'عدم HTTPS اجباری',
    detail: 'تمام ارتباطات باید رمزنگاری شوند. بدون HTTPS، داده‌های مشتریان و رمزهای عبور در معرض خطر هستند.',
    solution: 'SSL Certificate نصب کنید، HTTP را به HTTPS redirect کنید، HSTS فعال کنید',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم Rate Limiting',
    detail: 'هیچ محدودیتی برای تعداد درخواست‌ها وجود ندارد. حملات Brute Force آسان است.',
    solution: 'حداکثر ۵ تلاش ناموفق لاگین → قفل ۱۵ دقیقه‌ای. حداکثر ۶۰ request/دقیقه برای API',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم JWT / Session امن',
    detail: 'سیستم احراز هویت فعلی فاقد JWT token، refresh token، و session invalidation است.',
    solution: 'JWT با expiry کوتاه (15 دقیقه) + refresh token (7 روز) + blacklist برای logout',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم اعتبارسنجی ورودی‌ها (Input Validation)',
    detail: 'SQL Injection, XSS, و CSRF attacks ممکن است. ورودی‌های کاربر قبل از ذخیره در DB پاکسازی نمی‌شوند.',
    solution: 'Prepared Statements برای SQL، htmlspecialchars برای XSS، CSRF token در فرم‌ها',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم لاگ امنیتی متمرکز',
    detail: 'تلاش‌های ناموفق لاگین، دسترسی‌های غیرمجاز، و تغییرات حساس در یک جا ثبت نمی‌شوند.',
    solution: 'جدول security_logs با IP، User Agent، Action، Result برای هر رویداد امنیتی',
    status: 'جزئی پیاده‌سازی شده'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم رمزنگاری داده‌های حساس',
    detail: 'شماره تلفن، ایمیل، و اطلاعات مالی مشتریان در دیتابیس plain text هستند.',
    solution: 'AES-256 encryption برای فیلدهای حساس، key management جدا از دیتابیس',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'پایین', color: 'emerald',
    title: 'Content Security Policy (CSP)',
    detail: 'هیچ CSP header تعریف نشده که جلوی XSS attacks را بگیرد.',
    solution: 'Content-Security-Policy header در nginx/apache config',
    status: 'نیاز به اقدام'
  },
];

const accountingGaps = [
  {
    priority: 'بحرانی', color: 'rose',
    title: 'عدم سیستم حسابداری دوطرفه (Double-Entry)',
    detail: 'سیستم فعلی فقط فروش ساده دارد. هیچ دفتر کل (General Ledger)، سند حسابداری، یا تراز آزمایشی وجود ندارد.',
    solution: 'اضافه کردن: سند حسابداری، دفتر کل، تراز آزمایشی، ترازنامه، سود و زیان',
    status: 'جزئی پیاده‌سازی شده'
  },
  {
    priority: 'بحرانی', color: 'rose',
    title: 'مدیریت هزینه‌ها (Expenses)',
    detail: 'هزینه‌های جاری دکان (اجاره، حقوق، برق، آب) در هیچ جا ثبت نمی‌شوند.',
    solution: 'بخش مدیریت هزینه با دسته‌بندی: اجاره، حقوق، خرید جنس، هزینه‌های عمومی',
    status: 'پیاده‌سازی شده'
  },
  {
    priority: 'بحرانی', color: 'rose',
    title: 'محاسبه سود واقعی',
    detail: 'داشبورد فقط فروش نشان می‌دهد. سود خالص = فروش - قیمت خرید - هزینه‌ها محاسبه نمی‌شود.',
    solution: 'سود ناخالص + کسر هزینه‌های عملیاتی = سود خالص واقعی',
    status: 'پیاده‌سازی شده'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'مدیریت صندوق نقدی (Cash Register)',
    detail: 'موجودی صندوق اول و آخر روز، کسری/اضافی صندوق مدیریت نمی‌شود.',
    solution: 'صندوق روز با: باز کردن صندوق + دریافتی + پرداختی + بستن صندوق',
    status: 'پیاده‌سازی شده'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم مدیریت مرجوعی (Returns)',
    detail: 'اگر مشتری جنس برگرداند یا تامین‌کننده کالای معیوب تحویل دهد، هیچ فرآیندی وجود ندارد.',
    solution: 'فاکتور برگشت از فروش + برگشت به تامین‌کننده + کاهش موجودی/افزایش',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم حسابداری تامین‌کنندگان کامل',
    detail: 'خریدهای اعتباری از تامین‌کنندگان، پرداخت‌ها، و مانده حساب به‌درستی ردیابی نمی‌شوند.',
    solution: 'حساب پرداختنی (Accounts Payable): فاکتور خرید + پرداخت + مانده بدهی به تامین‌کننده',
    status: 'جزئی پیاده‌سازی شده'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم مدیریت اسناد مالی (Vouchers)',
    detail: 'دریافت نقدی، پرداخت نقدی، انتقال بین حساب‌ها بدون سند مالی ثبت می‌شوند.',
    solution: 'سند دریافت، سند پرداخت، سند انتقال با شماره سریال خودکار',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم گزارش سود/زیان دوره‌ای',
    detail: 'گزارش P&L (Profit & Loss) ماهانه، فصلی، سالانه وجود ندارد.',
    solution: 'گزارش Income Statement با مقایسه دوره‌های مختلف',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'پایین', color: 'emerald',
    title: 'عدم مدیریت مالیات',
    detail: 'محاسبه و گزارش مالیات بر اساس قوانین افغانستان وجود ندارد.',
    solution: 'نرخ مالیات قابل تنظیم + گزارش مالیاتی فصلی',
    status: 'نیاز به اقدام'
  },
];

const managementGaps = [
  {
    priority: 'بحرانی', color: 'rose',
    title: 'کنترل موجودی دقیق (Inventory Control)',
    detail: 'هیچ سیستمی برای تعدیل موجودی، انتقال بین انبار و دکان، و دلیل کاهش موجودی وجود ندارد.',
    solution: 'جدول stock_movements: هر تغییر موجودی با دلیل (فروش/خرید/تعدیل/انتقال) ثبت شود',
    status: 'پیاده‌سازی شده'
  },
  {
    priority: 'بحرانی', color: 'rose',
    title: 'سیستم فاکتور خرید (Purchase Orders)',
    detail: 'خرید از تامین‌کنندگان بدون فاکتور خرید انجام می‌شود. موجودی انبار به‌صورت دستی تغییر می‌کند.',
    solution: 'فاکتور خرید → دریافت کالا → افزایش موجودی خودکار → ثبت بدهی به تامین‌کننده',
    status: 'پیاده‌سازی شده'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم مدیریت پرسنل و حقوق',
    detail: 'حقوق کارکنان، اضافه‌کاری، پاداش، و کسورات مدیریت نمی‌شوند.',
    solution: 'بخش پرسنل: ثبت حقوق پایه + محاسبه حقوق ماهانه + فیش حقوقی',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم مدیریت شراکت/سهام',
    detail: 'اگر دکان چند شریک داشته باشد، سهم هر شریک از سود محاسبه نمی‌شود.',
    solution: 'بخش شرکا: تعریف درصد سهام + محاسبه سود هر شریک به‌صورت دوره‌ای',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'بالا', color: 'orange',
    title: 'عدم KPI و داشبورد مدیریتی پیشرفته',
    detail: 'نرخ تبدیل، میانگین ارزش فاکتور، بهترین محصولات، بدترین مشتریان وجود ندارد.',
    solution: 'KPI Dashboard: نرخ رشد، top 10 محصول، top 10 مشتری، تحلیل سبد خرید',
    status: 'جزئی پیاده‌سازی شده'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم سیستم پیش‌بینی (Forecasting)',
    detail: 'بر اساس تاریخچه فروش، سیستم نمی‌تواند نیاز آینده به موجودی را پیش‌بینی کند.',
    solution: 'الگوریتم ساده: میانگین فروش ۳ ماه گذشته × ضریب رشد = پیش‌بینی ماه آینده',
    status: 'نیاز به اقدام'
  },
  {
    priority: 'متوسط', color: 'yellow',
    title: 'عدم تعریف سطح دسترسی دقیق (RBAC)',
    detail: 'فروشنده می‌تواند قیمت‌ها را ببیند و تغییر دهد. انباردار به گزارش مالی دسترسی دارد.',
    solution: 'Role-Based Access Control: هر عملیات برای هر نقش جداگانه تعریف شود',
    status: 'جزئی پیاده‌سازی شده'
  },
  {
    priority: 'پایین', color: 'emerald',
    title: 'عدم ارزیابی عملکرد فروشندگان',
    detail: 'فروش هر فروشنده، تعداد فاکتور، و مقایسه بین فروشندگان قابل مشاهده نیست.',
    solution: 'گزارش per-seller: فروش روزانه/ماهانه هر فروشنده + رتبه‌بندی',
    status: 'نیاز به اقدام'
  },
];

const adminAccessPoints = [
  {
    title: 'URL مخفی ادمین پنل',
    detail: 'به جای /admin از URL تصادفی مثل /x7k9m2p استفاده کنید که فقط شما می‌دانید.',
    code: '// nginx config\nlocation /x7k9m2p {\n    allow YOUR_IP;\n    deny all;\n    proxy_pass http://localhost:3000/admin;\n}',
    status: 'پیشنهاد'
  },
  {
    title: 'محدودیت IP برای ادمین',
    detail: 'ادمین پنل فقط از IP خاص شما قابل دسترس باشد.',
    code: '// .htaccess یا nginx\nOrder deny,allow\nDeny from all\nAllow from YOUR_STATIC_IP',
    status: 'مهم'
  },
  {
    title: 'احراز هویت دو مرحله‌ای (2FA) واقعی',
    detail: 'Google Authenticator یا SMS OTP برای ورود ابرادمین اجباری باشد.',
    code: '// TOTP با Google Authenticator\n$totp = new TOTP($secret);\n$isValid = $totp->verify($userCode);',
    status: 'بحرانی'
  },
  {
    title: 'ساخت دکان توسط ادمین',
    detail: 'هیچ کاربری نمی‌تواند خودش دکان بسازد. فقط ابرادمین می‌تواند tenant جدید بسازد.',
    code: '// پروسه:\n1. ابرادمین وارد پنل مخفی می‌شود\n2. دکان جدید با کد یکتا می‌سازد\n3. کد دسترسی اولیه به مالک SMS می‌شود\n4. مالک با کد اولیه وارد شده و رمز را تغییر می‌دهد',
    status: 'مهم'
  },
  {
    title: 'Audit Log برای ادمین',
    detail: 'هر عملیات ابرادمین (ساخت دکان، تغییر اشتراک، تعلیق) با IP و زمان ثبت شود.',
    code: 'INSERT INTO super_admin_logs\n(admin_id, action, target, ip, timestamp)\nVALUES (?, ?, ?, ?, NOW())',
    status: 'مهم'
  },
];

const mobileGaps = [
  {
    platform: 'Android (React Native)',
    priority: 'بالا',
    features: [
      'اسکن بارکد با دوربین (expo-barcode-scanner)',
      'پوش نوتیفیکیشن (Firebase FCM)',
      'حالت آفلاین کامل (SQLite محلی)',
      'رابط کاربری ساده و سریع',
      'همگام‌سازی خودکار',
    ],
    challenges: [
      'نصب روی Play Store نیاز به Google Developer Account دارد',
      'UX باید برای صفحه کوچک بازطراحی شود',
      'مدیریت conflictها در حالت آفلاین',
    ]
  },
  {
    platform: 'iOS (React Native)',
    priority: 'متوسط',
    features: [
      'همان امکانات Android',
      'Face ID / Touch ID برای لاگین',
      'Apple Pay integration (آینده)',
      'Widget برای آمار سریع',
    ],
    challenges: [
      'Apple Developer Account: ۹۹ دالر سالانه',
      'App Store Review: ۱-۳ هفته',
      'محدودیت‌های سختگیرانه Apple برای دسترسی به دوربین',
    ]
  },
  {
    platform: 'PWA (Progressive Web App)',
    priority: 'فوری',
    features: [
      'نصب روی موبایل بدون App Store',
      'اسکن بارکد با WebRTC',
      'Push Notification از طریق مرورگر',
      'حالت آفلاین با Service Worker',
      'هزینه توسعه کمتر',
    ],
    challenges: [
      'iOS Safari محدودیت‌هایی برای PWA دارد',
      'دسترسی محدودتر به hardware موبایل',
    ]
  },
];

const roadmapItems = [
  { phase: 'هفته ۱-۲', title: 'امنیت پایه', items: ['HTTPS اجباری', 'bcrypt برای رمزها', 'Rate Limiting', 'Input Validation'], color: 'rose' },
  { phase: 'هفته ۳-۴', title: 'ادمین پنل مخفی', items: ['URL مخفی', 'محدودیت IP', '2FA واقعی', 'Tenant creation flow'], color: 'purple' },
  { phase: 'ماه ۲', title: 'حسابداری پایه', items: ['فاکتور خرید', 'مدیریت هزینه‌ها', 'صندوق روزانه', 'سود/زیان'], color: 'amber' },
  { phase: 'ماه ۳', title: 'مدیریت پیشرفته', items: ['RBAC کامل', 'کنترل موجودی دقیق', 'مرجوعی‌ها', 'گزارش‌های مدیریتی'], color: 'blue' },
  { phase: 'ماه ۴', title: 'PWA موبایل', items: ['نصب روی موبایل', 'اسکن بارکد', 'Push Notification', 'آفلاین کامل'], color: 'emerald' },
  { phase: 'ماه ۵-۶', title: 'اپ Native', items: ['React Native', 'Play Store', 'App Store', 'Face ID'], color: 'indigo' },
];

const priorityColors: Record<string, string> = {
  'بحرانی': 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  'بالا': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  'متوسط': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  'پایین': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
};

export default function SecurityAnalysisPage() {
  const [activeSection, setActiveSection] = useState('security');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const renderSecurity = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'مشکلات بحرانی', count: 3, color: 'rose', icon: XCircle },
          { label: 'اولویت بالا', count: 3, color: 'orange', icon: AlertTriangle },
          { label: 'اولویت متوسط', count: 2, color: 'yellow', icon: Eye },
          { label: 'اولویت پایین', count: 1, color: 'emerald', icon: CheckCircle },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className={`glass rounded-xl p-4 border border-${color}-500/20`}>
            <Icon size={20} className={`text-${color}-400 mb-2`} />
            <p className={`text-2xl font-bold text-${color}-400`}>{count}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
      {securityGaps.map((gap, i) => (
        <div key={i} className="glass rounded-xl overflow-hidden">
          <button className="w-full text-right px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
            onClick={() => setExpandedItem(expandedItem === i ? null : i)}>
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${priorityColors[gap.priority]}`}>{gap.priority}</span>
            <span className="text-white font-medium flex-1">{gap.title}</span>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedItem === i ? 'rotate-90' : ''}`} />
          </button>
          {expandedItem === i && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Info size={12} /> مشکل:</p>
                <p className="text-slate-300 text-sm">{gap.detail}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                <p className="text-emerald-400 text-xs mb-1">✅ راه‌حل:</p>
                <p className="text-emerald-300 text-sm font-mono text-xs">{gap.solution}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${gap.status === 'نیاز به اقدام' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                وضعیت: {gap.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderAccounting = () => (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4 border border-amber-500/20 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium">سیستم فعلی فقط یک POS ساده است</p>
            <p className="text-slate-400 text-sm mt-1">برای یک فروشگاه واقعی به سیستم حسابداری کامل نیاز دارید. بدون آن، سود واقعی خود را نمی‌دانید.</p>
          </div>
        </div>
      </div>
      {accountingGaps.map((gap, i) => (
        <div key={i} className="glass rounded-xl overflow-hidden">
          <button className="w-full text-right px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
            onClick={() => setExpandedItem(expandedItem === 100 + i ? null : 100 + i)}>
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${priorityColors[gap.priority]}`}>{gap.priority}</span>
            <span className="text-white font-medium flex-1">{gap.title}</span>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedItem === 100 + i ? 'rotate-90' : ''}`} />
          </button>
          {expandedItem === 100 + i && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">مشکل:</p>
                <p className="text-slate-300 text-sm">{gap.detail}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                <p className="text-emerald-400 text-xs mb-1">✅ راه‌حل:</p>
                <p className="text-emerald-300 text-sm">{gap.solution}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-4">
      {managementGaps.map((gap, i) => (
        <div key={i} className="glass rounded-xl overflow-hidden">
          <button className="w-full text-right px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
            onClick={() => setExpandedItem(expandedItem === 200 + i ? null : 200 + i)}>
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${priorityColors[gap.priority]}`}>{gap.priority}</span>
            <span className="text-white font-medium flex-1">{gap.title}</span>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedItem === 200 + i ? 'rotate-90' : ''}`} />
          </button>
          {expandedItem === 200 + i && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">مشکل:</p>
                <p className="text-slate-300 text-sm">{gap.detail}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                <p className="text-emerald-400 text-xs mb-1">✅ راه‌حل:</p>
                <p className="text-emerald-300 text-sm">{gap.solution}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg inline-block ${gap.status === 'نیاز به اقدام' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                وضعیت: {gap.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderAdminAccess = () => (
    <div className="space-y-5">
      <div className="glass rounded-xl p-5 border border-purple-500/30">
        <h3 className="text-purple-300 font-bold text-lg mb-3 flex items-center gap-2">
          <Lock size={20} /> معماری پیشنهادی دسترسی ادمین
        </h3>
        <div className="space-y-3">
          {[
            { step: '۱', title: 'URL مخفی', desc: 'آدرس ادمین پنل فقط برای شما شناخته‌شده است — مثلاً: yourdomain.com/x7k9m-admin-2025', color: 'purple' },
            { step: '۲', title: 'محدودیت IP', desc: 'فقط از IP استاتیک شما (خانه یا دفتر) قابل دسترس است. هر IP دیگری 404 می‌گیرد.', color: 'blue' },
            { step: '۳', title: 'رمز عبور قوی + 2FA', desc: 'رمز ۲۰+ کاراکتری + Google Authenticator OTP که هر ۳۰ ثانیه تغییر می‌کند.', color: 'indigo' },
            { step: '۴', title: 'ساخت دکان توسط ابرادمین', desc: 'هیچ صفحه ثبت‌نام عمومی وجود ندارد. ابرادمین دکان می‌سازد، کد اولیه به مالک SMS می‌شود.', color: 'violet' },
            { step: '۵', title: 'Session ۲ ساعته', desc: 'بعد از ۲ ساعت غیرفعالی، session خودکار expire می‌شود. هر بار 2FA لازم است.', color: 'rose' },
          ].map(item => (
            <div key={item.step} className={`flex items-start gap-4 p-3 bg-${item.color}-500/10 rounded-xl border border-${item.color}-500/20`}>
              <div className={`w-8 h-8 rounded-full bg-${item.color}-500/20 flex items-center justify-center text-${item.color}-400 font-bold text-sm flex-shrink-0`}>{item.step}</div>
              <div>
                <p className={`text-${item.color}-300 font-medium text-sm`}>{item.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Key size={16} /> پروسه ساخت دکان جدید</h3>
        <div className="space-y-2">
          {[
            'ابرادمین وارد پنل مخفی می‌شود (IP + URL + Password + 2FA)',
            'ابرادمین اطلاعات دکان را وارد می‌کند (نام، صنف، مالک، اشتراک)',
            'سیستم دیتابیس جدید می‌سازد + کاربر admin را برای آن دکان ایجاد می‌کند',
            'کد دسترسی اولیه (OTP 6 رقمی) به شماره مالک SMS می‌شود',
            'مالک با کد اولیه + شماره دکان وارد می‌شود',
            'مالک مجبور است رمز عبور را فوری تغییر دهد',
            'دکان آماده استفاده است',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
              <p className="text-slate-300 text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {adminAccessPoints.map((point, i) => (
        <div key={i} className="glass rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-white font-medium">{point.title}</h3>
            <span className={`text-xs px-2 py-1 rounded-lg ${point.status === 'بحرانی' ? 'bg-rose-500/20 text-rose-400' : point.status === 'مهم' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{point.status}</span>
          </div>
          <p className="text-slate-400 text-sm mb-3">{point.detail}</p>
          <pre className="bg-slate-900 rounded-xl p-3 text-emerald-400 text-xs overflow-x-auto font-mono">{point.code}</pre>
        </div>
      ))}
    </div>
  );

  const renderMobile = () => (
    <div className="space-y-5">
      <div className="glass rounded-xl p-4 border border-emerald-500/20 mb-2">
        <p className="text-emerald-300 font-medium flex items-center gap-2"><Zap size={16} /> پیشنهاد: اول PWA بسازید، سپس اپ Native</p>
        <p className="text-slate-400 text-sm mt-1">PWA سریع‌تر، ارزان‌تر و بدون نیاز به App Store است. بعد از گرفتن بازخورد، اپ Native بسازید.</p>
      </div>
      {mobileGaps.map((mobile, i) => (
        <div key={i} className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Smartphone size={18} className="text-emerald-400" /> {mobile.platform}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-lg ${mobile.priority === 'فوری' ? 'bg-rose-500/20 text-rose-400' : mobile.priority === 'بالا' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{mobile.priority}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-emerald-400 text-xs mb-2 font-medium">✅ امکانات:</p>
              <ul className="space-y-1.5">
                {mobile.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-slate-300 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-rose-400 text-xs mb-2 font-medium">⚠️ چالش‌ها:</p>
              <ul className="space-y-1.5">
                {mobile.challenges.map((c, j) => (
                  <li key={j} className="flex items-center gap-2 text-slate-300 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div className="glass rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">تکنولوژی‌های پیشنهادی</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'React Native', use: 'فریم‌ورک اصلی', color: 'blue' },
            { name: 'Expo', use: 'ابزار توسعه', color: 'purple' },
            { name: 'SQLite', use: 'دیتابیس محلی', color: 'amber' },
            { name: 'Firebase FCM', use: 'Push Notification', color: 'orange' },
            { name: 'ZXing / ML Kit', use: 'اسکن بارکد', color: 'emerald' },
            { name: 'Redux Toolkit', use: 'مدیریت state', color: 'indigo' },
          ].map(tech => (
            <div key={tech.name} className={`bg-${tech.color}-500/10 border border-${tech.color}-500/20 rounded-xl p-3`}>
              <p className={`text-${tech.color}-300 font-medium text-sm`}>{tech.name}</p>
              <p className="text-slate-500 text-xs mt-1">{tech.use}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRoadmap = () => (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5 border border-indigo-500/20 mb-4">
        <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2"><Activity size={18} />خلاصه اولویت‌بندی</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'بحرانی (فوری)', items: ['HTTPS + رمزنگاری', 'پنل ادمین مخفی', 'حسابداری پایه'], color: 'rose' },
            { title: 'مهم (ماه ۱-۳)', items: ['RBAC کامل', 'فاکتور خرید', 'صندوق روزانه', 'مرجوعی‌ها'], color: 'amber' },
            { title: 'آینده (ماه ۳+)', items: ['PWA موبایل', 'اپ Native', 'پیش‌بینی موجودی', 'هوش مصنوعی'], color: 'emerald' },
          ].map(group => (
            <div key={group.title} className={`bg-${group.color}-500/10 border border-${group.color}-500/20 rounded-xl p-3`}>
              <p className={`text-${group.color}-400 font-medium text-sm mb-2`}>{group.title}</p>
              {group.items.map(item => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full bg-${group.color}-400`} />
                  <span className="text-slate-300 text-xs">{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {roadmapItems.map((item, i) => (
          <div key={i} className="glass rounded-xl p-5 flex items-start gap-4">
            <div className={`bg-${item.color}-500/20 border border-${item.color}-500/30 rounded-xl px-3 py-2 text-${item.color}-400 text-xs font-bold text-center min-w-[72px] flex-shrink-0`}>
              {item.phase}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">{item.title}</h3>
              <div className="flex flex-wrap gap-2">
                {item.items.map(it => (
                  <span key={it} className={`text-xs px-2.5 py-1 rounded-lg bg-${item.color}-500/10 text-${item.color}-300 border border-${item.color}-500/20`}>{it}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-5 border border-indigo-500/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BookOpen size={16} /> منابع یادگیری</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'OWASP Top 10', desc: 'مهم‌ترین آسیب‌پذیری‌های وب', url: 'owasp.org', color: 'rose' },
            { title: 'React Native Docs', desc: 'مستندات رسمی توسعه موبایل', url: 'reactnative.dev', color: 'blue' },
            { title: 'Laravel/PHP Security', desc: 'امنیت بک‌اند', url: 'laravel.com/docs/security', color: 'orange' },
            { title: 'Google Authenticator', desc: 'پیاده‌سازی 2FA', url: 'github.com/PHPGangsta/GoogleAuthenticator', color: 'emerald' },
          ].map(res => (
            <div key={res.title} className={`bg-${res.color}-500/10 border border-${res.color}-500/20 rounded-xl p-3`}>
              <p className={`text-${res.color}-300 font-medium text-sm`}>{res.title}</p>
              <p className="text-slate-400 text-xs mt-0.5">{res.desc}</p>
              <p className="text-slate-600 text-xs mt-1 font-mono">{res.url}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'security': return renderSecurity();
      case 'accounting': return renderAccounting();
      case 'management': return renderManagement();
      case 'admin-access': return renderAdminAccess();
      case 'mobile': return renderMobile();
      case 'roadmap': return renderRoadmap();
      default: return renderSecurity();
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={24} className="text-rose-400" /> تحلیل کمبودها و پیشنهادات
        </h1>
        <p className="text-slate-400 text-sm mt-1">بررسی جامع کمبودهای امنیتی، حسابداری، مدیریتی و نقشه راه توسعه</p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <button key={sec.id} onClick={() => { setActiveSection(sec.id); setExpandedItem(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                activeSection === sec.id
                  ? `bg-${sec.color}-500/20 border-${sec.color}-500/40 text-${sec.color}-300`
                  : 'glass border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}>
              <Icon size={16} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="fade-in">
        {renderContent()}
      </div>
    </div>
  );
}
