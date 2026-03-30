import { useState } from 'react';
import {
  ShoppingBag, Shield, Globe, ArrowLeft, CheckCircle, Star, Users,
  Printer, Bell, Sun, Moon, Lock, User, Eye, EyeOff,
  TrendingUp, Package, CreditCard, Zap, Database,
  Play, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface WelcomePageProps {
  onLogin: (shopCode: string, shopPassword: string, role: string, rolePassword: string) => boolean;
}

export default function WelcomePage({ onLogin }: WelcomePageProps) {
  const { setTheme, isDark } = useApp();
  const [step, setStep] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [shopCode, setShopCode] = useState('');
  const [shopPassword, setShopPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [rolePassword, setRolePassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showRolePwd, setShowRolePwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [regData, setRegData] = useState({
    shopName: '', ownerName: '', phone: '', email: '', plan: 'basic'
  });

  const bg = isDark
    ? 'bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950'
    : 'bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50';

  const cardBg = isDark ? 'glass' : 'bg-white shadow-xl border border-slate-200';
  const textMain = isDark ? 'text-white' : 'text-slate-800';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = isDark
    ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500';
  const divider = isDark ? 'border-slate-700' : 'border-slate-200';

  const features = [
    {
      icon: <TrendingUp size={24} />,
      title: 'مدیریت فروش',
      desc: 'ثبت فاکتور، پرداخت نسیه و گزارش‌گیری',
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-400',
      bg: isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
      stat: '۱۰۰٪ دقیق'
    },
    {
      icon: <Users size={24} />,
      title: 'مدیریت مشتریان',
      desc: 'سوابق خرید، بدهی‌ها و یادآوری خودکار',
      color: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-emerald-400',
      bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200',
      stat: 'بدون محدودیت'
    },
    {
      icon: <Package size={24} />,
      title: 'مدیریت انبار',
      desc: 'موجودی، بارکد، تاریخ انقضا و سریال',
      color: 'from-amber-500 to-amber-600',
      iconColor: 'text-amber-400',
      bg: isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200',
      stat: 'بارکد + اسکن'
    },
    {
      icon: <Printer size={24} />,
      title: 'چاپ فاکتور',
      desc: 'پشتیبانی از ۴ اندازه کاغذ مختلف',
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-400',
      bg: isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200',
      stat: 'A4 · A5 · 80mm · 58mm'
    },
    {
      icon: <Bell size={24} />,
      title: 'یادآوری هوشمند',
      desc: 'اعلان بدهی، تاریخ انقضا و یادداشت',
      color: 'from-rose-500 to-rose-600',
      iconColor: 'text-rose-400',
      bg: isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200',
      stat: 'واتساپ + ایمیل'
    },
    {
      icon: <Shield size={24} />,
      title: 'امنیت پیشرفته',
      desc: '۴ سطح دسترسی، کد امنیتی و 2FA',
      color: 'from-cyan-500 to-cyan-600',
      iconColor: 'text-cyan-400',
      bg: isDark ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200',
      stat: '2FA فعال'
    },
  ];

  const plans = [
    {
      id: 'basic', name: 'پایه', price: '۵۰۰ افغانی', period: 'ماهانه',
      color: 'border-slate-500', badge: '',
      features: ['۴ کاربر (مدیر + ۳ نقش)', 'حداکثر ۲۰۰۰ محصول', 'حداکثر ۲۵۰ مشتری', 'چاپ فاکتور', 'گزارش‌گیری پایه', 'پشتیبانی ایمیل']
    },
    {
      id: 'premium', name: 'پریمیوم', price: '۱۲۰۰ افغانی', period: 'ماهانه',
      color: 'border-indigo-500', badge: '⭐ محبوب‌ترین',
      features: ['کاربران نامحدود', 'محصولات نامحدود', 'مشتریان نامحدود', 'همه امکانات پایه', 'گزارش پیشرفته + Excel/PDF', 'پشتیبانی سریع ۲۴ ساعته', 'بکاپ خودکار روزانه', 'API + Webhook']
    },
  ];

  const paymentMethods = [
    { id: 'mobile_money', name: 'موبایل مانی', icon: '📱', desc: 'M-Paisa, AWCC, MTN Money' },
    { id: 'bank', name: 'بانک‌های افغانستان', icon: '🏦', desc: 'کابل بانک، آریانا بانک، آیبا' },
    { id: 'physical', name: 'پرداخت فیزیکی', icon: '🏪', desc: 'مراجعه حضوری به دفتر ما' },
  ];

  const terms = [
    'اطلاعات فروشگاه شما کاملاً محفوظ و ایزوله از سایر فروشگاه‌ها نگهداری می‌شود.',
    'هر فروشگاه دارای ۴ سطح دسترسی (مدیر، فروشنده، انباردار، حسابدار) می‌باشد.',
    'سوابق مشتریان و تراکنش‌ها هرگز به‌صورت خودکار حذف نمی‌شوند.',
    'برای ورود به سیستم به کد فروشگاه و رمز اختصاصی نیاز دارید.',
    'مدیریت کاربران تنها از طریق بخش تنظیمات امن قابل دسترس است.',
    'استفاده از سیستم به معنای پذیرش قوانین حریم خصوصی پلتفرم است.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    const ok = onLogin(shopCode, shopPassword, role, rolePassword);
    if (!ok) setError('کد فروشگاه، رمز فروشگاه یا رمز نقش اشتباه است');
    setLoading(false);
  };

  // ===================== WELCOME STEP =====================
  if (step === 'welcome') {
    return (
      <div className={`min-h-screen ${bg} relative overflow-hidden`} dir="rtl">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-indigo-600/8' : 'bg-indigo-200/50'}`} />
          <div className={`absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-purple-600/8' : 'bg-purple-200/40'}`} style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Theme Toggle */}
        <button onClick={() => setTheme(isDark ? 'light' : 'deep_blue')}
          className={`fixed top-4 left-4 p-2.5 rounded-xl border z-50 transition-all ${isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow'}`}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Hero */}
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-8">
          <div className="text-center mb-12 fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-2xl pulse-glow">
              <ShoppingBag size={48} className="text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`text-xs px-3 py-1 rounded-full border ${isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
                🟢 نسخه ۳.۰ — آماده برای استفاده
              </span>
            </div>
            <h1 className={`text-4xl sm:text-5xl font-bold mb-4 leading-tight ${textMain}`}>
              سیستم جامع<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-purple-400">مدیریت فروشگاه</span>
            </h1>
            <p className={`text-lg max-w-xl mx-auto leading-relaxed ${textSub}`}>
              پلتفرم حرفه‌ای برای مدیریت فروش، انبار، مشتریان و حسابداری فروشگاه شما
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
            {[
              { value: '۱۰۰۰+', label: 'فروشگاه فعال' },
              { value: '۹۹.۹٪', label: 'آپتایم' },
              { value: '۲۴/۷', label: 'پشتیبانی' },
            ].map(s => (
              <div key={s.label} className={`${cardBg} rounded-2xl p-4 text-center`}>
                <p className="text-2xl font-bold text-indigo-400">{s.value}</p>
                <p className={`text-xs mt-1 ${textSub}`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className={`${cardBg} rounded-3xl p-6 sm:p-8 mb-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Star size={20} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textMain}`}>امکانات سیستم</h2>
                <p className={`text-sm ${textSub}`}>همه چیز برای مدیریت حرفه‌ای فروشگاه شما</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div key={i} className={`rounded-2xl p-4 border transition-all hover:scale-[1.02] ${f.bg}`}>
                  <div className={`${f.iconColor} mb-3`}>{f.icon}</div>
                  <p className={`text-sm font-bold mb-1 ${textMain}`}>{f.title}</p>
                  <p className={`text-xs leading-relaxed mb-2 ${textSub}`}>{f.desc}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.iconColor} ${isDark ? 'bg-white/5' : 'bg-white/70'}`}>
                    {f.stat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div className={`${cardBg} rounded-3xl p-6 sm:p-8 mb-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textMain}`}>طرح‌های اشتراک</h2>
                <p className={`text-sm ${textSub}`}>انتخاب مناسب برای فروشگاه شما</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className={`rounded-2xl p-5 border-2 relative ${plan.color} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  {plan.badge && (
                    <span className="absolute -top-3 right-4 text-xs bg-indigo-500 text-white px-3 py-1 rounded-full">{plan.badge}</span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-bold ${textMain}`}>{plan.name}</h3>
                    <div className="text-right">
                      <p className="text-indigo-400 font-bold text-lg">{plan.price}</p>
                      <p className={`text-xs ${textSub}`}>{plan.period}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`flex items-center gap-2 text-xs ${textSub}`}>
                        <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div className={`${cardBg} rounded-3xl p-6 sm:p-8 mb-8`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textMain}`}>قوانین و شرایط استفاده</h2>
                <p className={`text-sm ${textSub}`}>لطفاً قبل از ادامه مطالعه کنید</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {terms.map((t, i) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-slate-800/40' : 'bg-slate-50 border border-slate-100'}`}>
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className={`text-xs leading-relaxed ${textSub}`}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <button onClick={() => setStep('login')}
              className="flex-1 btn-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl text-base">
              <Play size={20} />
              <span>ورود به سیستم</span>
              <ArrowLeft size={18} />
            </button>
            <button onClick={() => setStep('register')}
              className={`flex-1 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-2 text-base transition-all ${isDark ? 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}>
              <Database size={18} />
              درخواست حساب جدید
            </button>
          </div>

          <p className={`text-center text-xs mt-6 ${textSub}`}>
            CRM Platform © 2025 | پشتیبانی: ۰۷۹۵۰۷۴۱۷۵
          </p>
        </div>
      </div>
    );
  }

  // ===================== REGISTER STEP =====================
  if (step === 'register') {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4 relative overflow-hidden`} dir="rtl">
        <button onClick={() => setTheme(isDark ? 'light' : 'deep_blue')}
          className={`fixed top-4 left-4 p-2.5 rounded-xl border z-50 transition-all ${isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-600 shadow'}`}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-full max-w-lg fade-in">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(n => (
              <div key={n} className={`flex-1 h-1.5 rounded-full transition-all ${n <= registerStep ? 'bg-indigo-500' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div className={`${cardBg} rounded-3xl p-7`}>
            {registerStep === 1 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
                    <Database size={28} className="text-white" />
                  </div>
                  <h2 className={`text-xl font-bold ${textMain}`}>اطلاعات فروشگاه</h2>
                  <p className={`text-sm ${textSub}`}>مرحله ۱ از ۳</p>
                </div>
                {[
                  { label: 'نام فروشگاه *', key: 'shopName', placeholder: 'مثال: سوپرمارکت احمد' },
                  { label: 'نام صاحب فروشگاه *', key: 'ownerName', placeholder: 'نام کامل' },
                  { label: 'شماره موبایل *', key: 'phone', placeholder: '۰۷۰۰-۰۰۰-۰۰۰' },
                  { label: 'ایمیل (اختیاری)', key: 'email', placeholder: 'example@email.com' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>{field.label}</label>
                    <input type="text" placeholder={field.placeholder}
                      value={regData[field.key as keyof typeof regData]}
                      onChange={e => setRegData({ ...regData, [field.key]: e.target.value })}
                      className={`w-full border rounded-xl px-4 py-3 text-sm transition-all outline-none ${inputCls}`} />
                  </div>
                ))}
                <button onClick={() => setRegisterStep(2)} disabled={!regData.shopName || !regData.ownerName || !regData.phone}
                  className="w-full btn-primary text-white py-3.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  بعدی <ChevronRight size={18} />
                </button>
              </div>
            )}

            {registerStep === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3">
                    <Zap size={28} className="text-white" />
                  </div>
                  <h2 className={`text-xl font-bold ${textMain}`}>انتخاب طرح اشتراک</h2>
                  <p className={`text-sm ${textSub}`}>مرحله ۲ از ۳</p>
                </div>
                {plans.map(plan => (
                  <button key={plan.id} onClick={() => setRegData({ ...regData, plan: plan.id })}
                    className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${regData.plan === plan.id ? 'border-indigo-500 bg-indigo-500/10' : `border-2 ${isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-indigo-300'}`}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <p className={`font-bold ${textMain}`}>{plan.name}</p>
                        <p className={`text-xs ${textSub} mt-0.5`}>{plan.features[0]}، {plan.features[1]}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-indigo-400 font-bold">{plan.price}</p>
                        <p className={`text-xs ${textSub}`}>{plan.period}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setRegisterStep(1)} className={`flex-1 py-3 rounded-xl border text-sm ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    برگشت
                  </button>
                  <button onClick={() => setRegisterStep(3)} className="flex-2 btn-primary text-white py-3 rounded-xl font-semibold px-8 flex items-center gap-2">
                    بعدی <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {registerStep === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
                    <CreditCard size={28} className="text-white" />
                  </div>
                  <h2 className={`text-xl font-bold ${textMain}`}>روش پرداخت</h2>
                  <p className={`text-sm ${textSub}`}>مرحله ۳ از ۳</p>
                </div>

                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}`}>
                  <Zap size={14} />
                  مبلغ: {regData.plan === 'premium' ? '۱۲۰۰ افغانی' : '۵۰۰ افغانی'} / ماه — طرح {regData.plan === 'premium' ? 'پریمیوم' : 'پایه'}
                </div>

                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                      className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-3 ${paymentMethod === pm.id ? 'border-emerald-500 bg-emerald-500/10' : `${isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-emerald-300'}`}`}>
                      <span className="text-2xl">{pm.icon}</span>
                      <div>
                        <p className={`font-semibold text-sm ${textMain}`}>{pm.name}</p>
                        <p className={`text-xs ${textSub}`}>{pm.desc}</p>
                      </div>
                      {paymentMethod === pm.id && <CheckCircle size={16} className="text-emerald-400 mr-auto" />}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'physical' && (
                  <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    📍 آدرس: کابل، ناحیه اول، خیابان پشتونستان<br />
                    📞 تماس: ۰۷۹۵۰۷۴۱۷۵ — ساعت ۸ صبح تا ۵ عصر
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setRegisterStep(2)} className={`flex-1 py-3 rounded-xl border text-sm ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    برگشت
                  </button>
                  <button
                    onClick={() => {
                      if (paymentMethod) {
                        alert('درخواست شما ثبت شد! پس از تأیید پرداخت، کد فروشگاه و رمز به شماره موبایل شما ارسال می‌شود.');
                        setStep('welcome');
                        setRegisterStep(1);
                        setPaymentMethod('');
                        setRegData({ shopName: '', ownerName: '', phone: '', email: '', plan: 'basic' });
                      }
                    }}
                    disabled={!paymentMethod}
                    className="flex-2 btn-primary text-white py-3 rounded-xl font-semibold px-8 disabled:opacity-50 flex items-center gap-2">
                    <CheckCircle size={16} /> ارسال درخواست
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => { setStep('welcome'); setRegisterStep(1); }}
            className={`mt-4 w-full py-3 rounded-xl text-sm transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            ← بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  // ===================== LOGIN STEP =====================
  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4 relative overflow-hidden`} dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/3 left-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse ${isDark ? 'bg-indigo-600/8' : 'bg-indigo-200/40'}`} />
      </div>

      <button onClick={() => setTheme(isDark ? 'light' : 'deep_blue')}
        className={`fixed top-4 left-4 p-2.5 rounded-xl border z-50 transition-all ${isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-600 shadow'}`}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-3 shadow-xl pulse-glow">
            <Lock size={30} className="text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${textMain}`}>ورود به فروشگاه</h2>
          <p className={`text-sm mt-1 ${textSub}`}>کد فروشگاه و نقش کاربری خود را وارد کنید</p>
        </div>

        <div className={`${cardBg} rounded-3xl p-7 space-y-5`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shop Code */}
            <div>
              <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>کد فروشگاه *</label>
              <div className="relative">
                <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="مثال: SHOP001" value={shopCode}
                  onChange={e => setShopCode(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 pr-9 text-sm transition-all outline-none ${inputCls}`} required />
              </div>
            </div>

            {/* Shop Password */}
            <div>
              <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>رمز فروشگاه *</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPwd ? 'text' : 'password'} placeholder="رمز صادر شده توسط مدیر پلتفرم"
                  value={shopPassword} onChange={e => setShopPassword(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 pr-9 text-sm transition-all outline-none ${inputCls}`} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>نقش کاربری *</label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <select value={role} onChange={e => setRole(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 pr-9 text-sm transition-all appearance-none outline-none ${inputCls}`}>
                  <option value="admin">👑 مدیر</option>
                  <option value="seller">🛒 فروشنده</option>
                  <option value="stock_keeper">📦 انباردار</option>
                  <option value="accountant">💼 حسابدار</option>
                </select>
              </div>
            </div>

            {/* Role Password */}
            <div>
              <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>رمز نقش *</label>
              <div className="relative">
                <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showRolePwd ? 'text' : 'password'} placeholder="رمز اختصاصی نقش کاربری"
                  value={rolePassword} onChange={e => setRolePassword(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 pr-9 text-sm transition-all outline-none ${inputCls}`} required />
                <button type="button" onClick={() => setShowRolePwd(!showRolePwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showRolePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center flex items-center gap-2 justify-center">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Lock size={18} /> ورود به سیستم</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={`border-t pt-4 ${divider}`}>
            <p className={`text-xs text-center mb-3 ${textSub}`}>ورود سریع (نسخه نمایشی)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '👑 مدیر', shopCode: 'SHOP001', pwd: 'shop123', role: 'admin', rolePwd: '123' },
                { label: '🛒 فروشنده', shopCode: 'SHOP001', pwd: 'shop123', role: 'seller', rolePwd: '123' },
                { label: '📦 انباردار', shopCode: 'SHOP001', pwd: 'shop123', role: 'stock_keeper', rolePwd: '123' },
                { label: '💼 حسابدار', shopCode: 'SHOP001', pwd: 'shop123', role: 'accountant', rolePwd: '123' },
              ].map(btn => (
                <button key={btn.role}
                  onClick={() => { setShopCode(btn.shopCode); setShopPassword(btn.pwd); setRole(btn.role); setRolePassword(btn.rolePwd); }}
                  className={`p-2.5 rounded-xl text-xs text-right border transition-all ${isDark ? 'glass border-white/10 hover:border-indigo-500/30 text-slate-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-600'}`}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => setStep('welcome')}
            className={`flex-1 py-3 rounded-xl text-sm transition-all ${isDark ? 'text-slate-400 hover:text-white glass' : 'text-slate-500 hover:text-slate-700 bg-white border border-slate-200'}`}>
            ← بازگشت
          </button>
          <button onClick={() => setStep('register')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${isDark ? 'border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
            درخواست حساب جدید
          </button>
        </div>

        <p className={`text-center text-xs mt-4 ${textSub}`}>
          پشتیبانی: ۰۷۹۵۰۷۴۱۷۵ | CRM Platform © 2025
        </p>
      </div>
    </div>
  );
}

// Fix missing import
function AlertCircle({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
