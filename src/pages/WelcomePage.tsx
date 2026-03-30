import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, Check, Phone, Mail,
  Globe, ArrowRight, X, Eye, EyeOff,
  Smartphone, CheckCircle, Lock,
  AlertTriangle,
  CreditCard, Banknote, LogIn, Crown,
  Facebook, Shield, ArrowRightLeft, Wallet,
  Gem, Shirt, ShoppingCart, Pill, UtensilsCrossed, Refrigerator,
  Croissant, Car, BrickWall,
  LifeBuoy, KeyRound, Headphones,
  type LucideIcon,
} from 'lucide-react';
import creatorConfig from '../config/creator.json';
import { apiInitHesabPay, apiRegisterPayment, apiCheckShop, apiGetPublicMeta, type ShopRole } from '../services/api';
import { useApp } from '../context/AppContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import ShopGateModal from '../components/ShopGateModal';
import WelcomeDownloadPage from '../components/WelcomeDownloadPage';
import {
  ONBOARDING_BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  ACTIVE_BUSINESS_TYPE_IDS,
  DEMO_DATABASE_BUSINESS_TYPE_IDS,
  type OnboardingBusinessTypeId,
  type OnboardingLucideIconName,
} from '../data/onboardingBusinessTypes';

const ONBOARDING_LUCIDE: Record<OnboardingLucideIconName, LucideIcon> = {
  ShoppingCart,
  Pill,
  Smartphone,
  UtensilsCrossed,
  Gem,
  Shirt,
  Refrigerator,
  BrickWall,
  Car,
  Croissant,
};

interface WelcomePageProps {
  onLogin: (shopCode: string, shopPassword: string, role: string, rolePassword: string) => boolean | Promise<{ ok: boolean; message?: string; code?: string; twoFactorRequired?: boolean; pendingToken?: string }>;
  onGoogleLogin: (email: string, fullName: string) => Promise<{ ok: boolean; message?: string; code?: string }>;
  onDemoLogin: (payload: {
    mode?: 'register' | 'login';
    phone?: string;
    password?: string;
    name?: string;
    familyName?: string;
    email?: string;
    idToken?: string;
    businessType?: string;
  }) => Promise<
    | { ok: true }
    | {
        ok: true;
        registered: true;
        shopCode: string;
        shopPassword: string;
        adminFullName: string;
        adminRoleTitle: string;
        adminRolePassword: string;
        message?: string;
      }
    | { ok: false; message?: string; code?: string }
  >;
  onTwoFactorVerify: (pendingToken: string, totpCode: string) => Promise<{ ok: boolean; message?: string; code?: string }>;
}

type ViewType = 'landing' | 'download' | 'login' | 'register' | 'info' | 'payment' | 'payment-pending' | 'demo-limit' | 'demo-register';
type AuthScene = 'landing' | 'info' | 'creator' | 'login' | 'register' | 'payment-pending' | 'demo-limit';

const REMEMBER_SHOP_CODE_KEY = 'dokanyar_remember_shop_code';

const PAYMENT_INFO: Record<string, { image: string; description: string; steps: string[] }> = {
  bank_transfer: {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
    description: 'حواله بانکی امن‌ترین و رسمی‌ترین روش انتقال وجه در افغانستان است. از طریق شعب بانک‌های معتبر مانند بانک ملت، بانک کابل، آریانا بانک، یا صرافی‌های مجاز می‌توانید مبلغ را مستقیم به حساب دکان‌یار واریز کنید. این روش برای مبالغ بالا مطمئن‌ترین گزینه است.',
    steps: ['به نزدیک‌ترین شعبه بانک یا صرافی مجاز مراجعه کنید', 'شماره حساب دکان‌یار را به تلر ارائه دهید', 'مبلغ طرح انتخابی را واریز کنید', 'شماره رسید یا حواله را عکس بگیرید', 'شماره حواله و نام بانک را در فرم زیر وارد کنید'],
  },
  mpaisa: {
    image: 'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&w=1200&auto=format&fit=crop',
    description: 'M-Paisa نخستین و پرکاربردترین سرویس پرداخت موبایلی افغانستان است که توسط شرکت Roshan Telecom ارائه می‌شود. این سرویس به بیش از ۵ میلیون کاربر در سراسر کشور خدمات می‌دهد و بدون نیاز به حساب بانکی، تنها با یک خط Roshan قابل استفاده است. از طریق کد USSD *222# یا اپلیکیشن می‌توانید پرداخت کنید.',
    steps: ['کد *۲۲۲# را شماره‌گیری کنید یا اپ M-Paisa را باز کنید', 'گزینه «ارسال پول» یا Send Money را انتخاب کنید', 'شماره موبایل دکان‌یار (۰۷۹۵۰۷۴۱۷۵) را وارد کنید', 'مبلغ طرح را وارد و PIN خود را تأیید کنید', 'شماره مرجع (REF) تراکنش را در فرم وارد کنید'],
  },
  mhawala: {
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200&auto=format&fit=crop',
    description: 'M-Hawala سرویس حواله و انتقال موبایلی Etisalat Afghanistan (MTN) است که در بیشتر ولایات افغانستان در دسترس است. این سرویس با پوشش گسترده و کارمزد کم، یکی از محبوب‌ترین روش‌های انتقال وجه در مناطق دور از بانک است و هر مشترک Etisalat بدون ثبت‌نام جداگانه می‌تواند از آن استفاده کند.',
    steps: ['کد *888# را شماره‌گیری کنید یا اپ Etisalat را باز کنید', 'گزینه M-Hawala و سپس «ارسال پول» را انتخاب کنید', 'شماره دریافت‌کننده (۰۷۹۵۰۷۴۱۷۵) را وارد کنید', 'مبلغ را وارد کنید و با PIN تأیید کنید', 'کد رسید را در فرم زیر وارد نمایید'],
  },
  mymoney: {
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
    description: 'MyMoney کیف پول دیجیتال شرکت AWCC (Afghan Wireless Communication Company) است. AWCC با بیش از ۶ میلیون مشترک، دومین اپراتور بزرگ افغانستان است. سرویس MyMoney امکان خرید آنلاین، پرداخت قبوض، انتقال پول فوری و دریافت حقوق را فراهم می‌کند و در شهرهای بزرگ کابل، هرات و مزارشریف بسیار رایج است.',
    steps: ['اپ MyMoney را دانلود و وارد حساب خود شوید', 'از منوی اصلی گزینه «انتقال پول» را بزنید', 'شماره AWCC دکان‌یار را وارد کنید', 'مبلغ طرح را وارد و تأیید کنید', 'شماره مرجع تراکنش را یادداشت و در فرم وارد کنید'],
  },
  atoma_pay: {
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop',
    description: 'ATOMA Pay پلتفرم نوین پرداخت دیجیتال افغانستان است که با هدف ساده‌سازی معاملات تجاری آنلاین طراحی شده. این سرویس از کارت‌های بانکی، کیف پول‌های موبایلی و کیف پول داخلی ATOMA پشتیبانی می‌کند. مناسب برای کسب‌وکارهایی که به تجارت آنلاین روی آورده‌اند و دنبال راهکار پرداخت سریع و ایمن هستند.',
    steps: ['در سایت atoma.af ثبت‌نام یا وارد حساب خود شوید', 'کیف پول را به اندازه کافی شارژ کنید', 'گزینه «انتقال به تجار» را انتخاب کنید', 'شناسه دکان‌یار (DOKANYAR) را وارد کنید', 'کد تأیید پرداخت را در فرم زیر وارد نمایید'],
  },
  hesabpay: {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    description: 'HesabPay (hesab.com) پیشرفته‌ترین درگاه پرداخت دیجیتال افغانستان است که توسط شرکت Hesab ارائه می‌شود. این درگاه از تأیید خودکار پرداخت از طریق API و Webhook پشتیبانی می‌کند، یعنی پس از پرداخت، حساب شما بلافاصله و بدون انتظار برای تأیید دستی فعال می‌شود. مناسب برای کاربرانی که به پرداخت فوری و بدون دردسر اهمیت می‌دهند.',
    steps: ['روی دکمه «ثبت و پرداخت» در پایین فرم کلیک کنید', 'به درگاه امن HesabPay هدایت خواهید شد', 'روش پرداخت دلخواه خود را در HesabPay انتخاب کنید', 'پرداخت را تأیید کنید — حساب شما فوری فعال می‌شود'],
  },
  other_try: {
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop',
    description: 'اگر هیچ‌کدام از روش‌های فوق برای شما مناسب یا در دسترس نیست، تیم پشتیبانی SmartHub Digital Solutions آماده راهنمایی است. از طریق تلفن یا واتساپ با شماره ۰۷۹۵۰۷۴۱۷۵ تماس بگیرید تا سریع‌ترین و مناسب‌ترین روش پرداخت برای منطقه و شرایط شما معرفی شود. پاسخگوی ۲۴ ساعته هستیم.',
    steps: ['با شماره ۰۷۹۵۰۷۴۱۷۵ تماس بگیرید یا واتساپ کنید', 'نام طرح انتخابی و موقعیت جغرافیایی خود را بگویید', 'روش پرداخت مناسب برای شما معرفی می‌شود', 'راهنمایی کامل مرحله به مرحله دریافت کنید'],
  },
};

/** قالب اولیهٔ داده پس از تأیید پرداخت — در متای درخواست ذخیره می‌شود */
const AppLogo: React.FC<{ size?: number; light?: boolean }> = ({ size = 48, light = false }) => {
  return (
    <div className="relative inline-flex items-center justify-center group" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500`}></div>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-xl">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Modern Shop/Store Icon for Business Management */}
        <rect x="20" y="35" width="60" height="45" rx="8" fill={light ? "white" : "url(#logoGrad)"} />
        <path d="M20 35 L50 15 L80 35" stroke={light ? "white" : "url(#logoGrad)"} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="55" width="16" height="25" rx="2" fill={light ? "#4f46e5" : "white"} />
        <circle cx="50" cy="40" r="5" fill={light ? "#4f46e5" : "white"} />
      </svg>
    </div>
  );
};

const SCENE_IMAGE: Record<AuthScene, string> = {
  landing: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop',
  info: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1887&auto=format&fit=crop',
  creator: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1887&auto=format&fit=crop',
  login: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1887&auto=format&fit=crop',
  register: 'https://images.unsplash.com/photo-1553729784-e91953dec042?q=80&w=1887&auto=format&fit=crop',
  'payment-pending': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1887&auto=format&fit=crop',
  'demo-limit': 'https://images.unsplash.com/photo-1556741533-f6acd647d2fb?q=80&w=1887&auto=format&fit=crop',
};

const AnimatedBg: React.FC<{ full?: boolean; scene?: AuthScene }> = ({ full = false, scene = 'login' }) => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    {/* Video Background (Opacity 0.08 max) */}
    <div className="absolute inset-0 z-10 opacity-[0.08] mix-blend-overlay overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover grayscale brightness-150"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-accountant-calculating-data-on-laptop-23315-large.mp4" type="video/mp4" />
      </video>
    </div>

    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 animate-fade-in" />
    <div 
      className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyYTM0NTciIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=')] bg-repeat animate-pan-slow animation-delay-500 opacity-0 animate-fade-in-late"
      style={{ backgroundSize: '40px 40px' }}
    />
    <div
      className="absolute inset-0 bg-cover bg-center opacity-[0.12] mix-blend-soft-light"
      style={{ backgroundImage: `url(${SCENE_IMAGE[scene]})` }}
    />
    {full && (
      <>
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-soft-light opacity-0 animate-fade-in-slow animation-delay-1000"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop)' }}
        />
      </>
    )}
    <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/30 rounded-full blur-3xl opacity-0 animate-glow animation-delay-3000" />
    <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/20 rounded-full blur-3xl opacity-0 animate-glow animation-delay-3500" />
  </div>
);

const WelcomePage: React.FC<WelcomePageProps> = ({ onLogin, onGoogleLogin, onDemoLogin, onTwoFactorVerify }) => {
  const { t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [suspendedGate, setSuspendedGate] = useState<{ open: boolean; message?: string }>({ open: false });
  const [view, setView] = useState<ViewType | 'creator'>('landing');
  const [registerStep, setRegisterStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('renew') === '1') {
      setView('register');
      setRegisterStep(1);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [trialQuickSignup, setTrialQuickSignup] = useState(true);
  useEffect(() => {
    let alive = true;
    void apiGetPublicMeta().then((m) => {
      if (alive) setTrialQuickSignup(Boolean(m.trial_quick_signup_enabled));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (view === 'demo-register' && !trialQuickSignup) {
      setView('register');
      setRegisterStep(1);
      setDemoError('');
    }
  }, [view, trialQuickSignup]);

  // Demo register / login (موبایل + رمز، بدون کد پیامک)
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [demoPassword2, setDemoPassword2] = useState('');
  const [demoName, setDemoName] = useState('');
  const [demoFamily, setDemoFamily] = useState('');
  const [demoOptionalEmail, setDemoOptionalEmail] = useState('');
  const [showDemoPwd, setShowDemoPwd] = useState(false);
  const [demoRegisterCredentials, setDemoRegisterCredentials] = useState<null | {
    shopCode: string;
    shopPassword: string;
    adminFullName: string;
    adminRoleTitle: string;
    adminRolePassword: string;
  }>(null);
  const [demoRegPhase, setDemoRegPhase] = useState<'form' | 'business'>('form');
  const [demoBusinessType, setDemoBusinessType] = useState<OnboardingBusinessTypeId>(DEFAULT_BUSINESS_TYPE);

  const validateDemoFormFields = () => {
    const phone = demoPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      setDemoError('شماره موبایل را درست وارد کنید (حداقل ۹ رقم)');
      return false;
    }
    if (demoPassword.length < 6) {
      setDemoError('رمز عبور حداقل ۶ کاراکتر باشد');
      return false;
    }
    if (!demoName.trim() || !demoFamily.trim()) {
      setDemoError('نام و نام خانوادگی الزامی است');
      return false;
    }
    if (demoPassword !== demoPassword2) {
      setDemoError('تکرار رمز با رمز اول یکسان نیست');
      return false;
    }
    return true;
  };

  const goDemoBusinessStep = () => {
    setDemoError('');
    if (!validateDemoFormFields()) return;
    setDemoRegPhase('business');
  };

  const handleDemoRegisterApi = async () => {
    setDemoError('');
    if (!DEMO_DATABASE_BUSINESS_TYPE_IDS.has(demoBusinessType)) {
      setDemoError('ثبت‌نام آزمایشی با دیتابیس فقط برای سوپرمارکت فعال است؛ سایر صنوف را از طرح‌های پولی انتخاب کنید.');
      return;
    }
    if (!validateDemoFormFields()) {
      setDemoRegPhase('form');
      return;
    }
    const phone = demoPhone.replace(/\D/g, '');
    setIsDemoLoading(true);
    try {
      const payload = {
        mode: 'register' as const,
        phone,
        password: demoPassword,
        name: demoName.trim(),
        familyName: demoFamily.trim(),
        businessType: demoBusinessType,
        ...(demoOptionalEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoOptionalEmail.trim())
          ? { email: demoOptionalEmail.trim().toLowerCase() }
          : {}),
      };
      const res = await onDemoLogin(payload);
      if (res.ok && 'registered' in res && res.registered) {
        setDemoRegisterCredentials({
          shopCode: res.shopCode,
          shopPassword: res.shopPassword,
          adminFullName: res.adminFullName,
          adminRoleTitle: res.adminRoleTitle,
          adminRolePassword: res.adminRolePassword,
        });
        setDemoRegPhase('form');
        return;
      }
      if (!res.ok) {
        if (res.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: res.message });
        } else {
          setDemoError(res.message || 'خطا در ثبت‌نام');
        }
      }
    } catch (e: unknown) {
      setDemoError(e instanceof Error ? e.message : 'خطا در ارتباط با سرور');
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Login state
  const [selectedRole, setSelectedRole] = useState('admin');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Two-step login state
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [shopCodeInput, setShopCodeInput] = useState('');
  const [shopPassInput, setShopPassInput] = useState('');
  const [rolePassInput, setRolePassInput] = useState('');
  const [shopRolesResult, setShopRolesResult] = useState<ShopRole[]>([]);
  const [shopNameResult, setShopNameResult] = useState('');
  const [isCheckingShop, setIsCheckingShop] = useState(false);
  const [checkShopError, setCheckShopError] = useState('');
  const [showRolePassInput, setShowRolePassInput] = useState(false);
  const [rememberShopCode, setRememberShopCode] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    if (view !== 'login') return;
    try {
      const c = localStorage.getItem(REMEMBER_SHOP_CODE_KEY);
      if (c) {
        setShopCodeInput((prev) => (prev.trim() ? prev : c));
        setRememberShopCode(true);
      }
    } catch {
      /* ignore */
    }
  }, [view]);

  const handleCheckShop = async () => {
    if (!shopCodeInput.trim() || !shopPassInput.trim()) {
      setCheckShopError('کد فروشگاه و رمز عبور الزامی است');
      return;
    }
    setCheckShopError('');
    setIsCheckingShop(true);
    try {
      const res = await apiCheckShop(shopCodeInput.trim(), shopPassInput.trim());
      setShopNameResult(res.shopName);
      setShopRolesResult(res.roles);

      const normalizedCode = shopCodeInput.trim().toUpperCase();
      try {
        if (rememberShopCode) localStorage.setItem(REMEMBER_SHOP_CODE_KEY, normalizedCode);
        else localStorage.removeItem(REMEMBER_SHOP_CODE_KEY);
      } catch {
        /* ignore */
      }
      if (normalizedCode === 'SUPERADMIN' && res.roles.length === 1) {
        // SUPERADMIN has a single role — auto-login using the shop password
        const autoRole = res.roles[0].role;
        setSelectedRole(autoRole);
        setIsLoggingIn(true);
        try {
          const result = await onLogin(normalizedCode, shopPassInput.trim(), autoRole, shopPassInput.trim());
          if (typeof result === 'boolean') {
            if (!result) setLoginError('رمز عبور نادرست است');
          } else if (result && !result.ok) {
            if (result.twoFactorRequired && result.pendingToken) {
              setTwoFactorRequired(true);
              setPendingToken2fa(result.pendingToken);
              setTotpCode('');
              setTotpError('');
              setLoginStep(2);
            } else if (result.code === 'SHOP_SUSPENDED') {
              setSuspendedGate({ open: true, message: result.message });
            } else {
              setLoginError(result.message || 'خطا در ورود');
            }
          }
        } catch {
          setLoginError('خطا در ارتباط با سرور');
        } finally {
          setIsLoggingIn(false);
        }
        return;
      }

      if (res.roles.length === 0) {
        setCheckShopError(
          'هیچ کاربر فعالی برای این فروشگاه ثبت نشده. مدیر دکان از تنظیمات → کاربران فروشگاه، نقش‌ها را فعال کند و برای هر نقش رمز تعیین کند.',
        );
        return;
      }

      // سایر فروشگاه‌ها — مرحلهٔ انتخاب نقش (فقط همان کاربران فعال سرور)
      const firstOk = res.roles.find(r => r.status !== 'inactive') ?? res.roles[0];
      setSelectedRole(firstOk.role);
      setLoginStep(2);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code === 'SHOP_SUSPENDED') {
        setSuspendedGate({ open: true, message: e.message });
      } else {
        setCheckShopError(e?.message || 'کد فروشگاه یا رمز عبور نادرست است');
      }
    } finally {
      setIsCheckingShop(false);
    }
  };

  const handleRoleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const result = await onLogin(shopCodeInput.trim(), shopPassInput.trim(), selectedRole, rolePassInput);
      if (typeof result === 'boolean') {
        if (!result) setLoginError('رمز نقش اشتباه است');
      } else if (result && !result.ok) {
        if (result.twoFactorRequired && result.pendingToken) {
          setTwoFactorRequired(true);
          setPendingToken2fa(result.pendingToken);
          setTotpCode('');
          setTotpError('');
        } else if (result.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: result.message });
        } else {
          setLoginError(result.message || 'خطا در ورود');
        }
      }
    } catch {
      setLoginError('خطا در ارتباط با سرور');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2FA challenge state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [pendingToken2fa, setPendingToken2fa] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [isTotpLoading, setIsTotpLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleMode, setGoogleMode] = useState<'login' | 'register'>('login');
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Register state (پرداخت — چندمرحله‌ای)
  interface RegisterData {
    plan: string;
    payMethod: string;
    shopName: string;
    ownerFirstName: string;
    ownerFamily: string;
    phone: string;
    email: string;
    password: string;
    password2: string;
    businessType: OnboardingBusinessTypeId;
  }

  const [regData, setRegData] = useState<RegisterData>({
    plan: 'basic_monthly',
    payMethod: 'bank_transfer',
    shopName: '',
    ownerFirstName: '',
    ownerFamily: '',
    phone: '',
    email: '',
    password: '',
    password2: '',
    businessType: DEFAULT_BUSINESS_TYPE,
  });
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paymentValues, setPaymentValues] = useState<Record<string, string>>({});
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [createdPayment, setCreatedPayment] = useState<{ id: number; status: string; checkoutUrl?: string | null } | null>(null);

  const cardBg = 'bg-black/30 backdrop-blur-lg border border-white/10 shadow-2xl';
  const textPrimary = 'text-white';
  const textSecondary = 'text-slate-300';
  const inputCls = 'bg-white/5 border-2 border-white/10 text-white placeholder-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all';
  const primaryBtn = 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all';
  const secondaryBtn = 'bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all shadow-sm';


  const handleTotpVerify = async () => {
    if (!totpCode.trim()) { setTotpError('کد Google Authenticator را وارد کنید'); return; }
    setTotpError('');
    setIsTotpLoading(true);
    try {
      const res = await onTwoFactorVerify(pendingToken2fa, totpCode.trim());
      if (!res.ok) {
        if (res.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: res.message });
        } else {
          setTotpError(res.message || 'کد نادرست است');
        }
      }
    } catch {
      setTotpError('خطا در تأیید کد');
    } finally {
      setIsTotpLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleError('');
    if (!googleName.trim() || !googleEmail.trim()) {
      setGoogleError('نام و ایمیل الزامی است');
      return;
    }
    setGoogleLoading(true);
    const res = await onGoogleLogin(googleEmail.trim(), googleName.trim());
    if (!res.ok) {
      if (res.code === 'SHOP_SUSPENDED') {
        setSuspendedGate({ open: true, message: res.message });
      } else {
        setGoogleError(res.message || 'خطا در ورود با گوگل');
      }
      setGoogleLoading(false);
      return;
    }
    setShowGoogleModal(false);
    setGoogleName('');
    setGoogleEmail('');
    setGoogleLoading(false);
  };

  const handleSubmitPayment = async () => {
    setPaymentError('');
    const fullOwner = `${regData.ownerFirstName} ${regData.ownerFamily}`.trim();
    if (!regData.shopName.trim() || !fullOwner || !regData.phone.trim()) {
      setRegisterStep(2);
      setPaymentError('مشخصات فروشگاه ناقص است؛ مراحل قبل را تکمیل کنید.');
      return;
    }
    if (regData.password.length < 6 || regData.password !== regData.password2) {
      setRegisterStep(2);
      setPaymentError('رمز عبور و تکرار آن را در مرحلهٔ مشخصات بررسی کنید.');
      return;
    }
    if (!ACTIVE_BUSINESS_TYPE_IDS.has(regData.businessType)) {
      setRegisterStep(3);
      setPaymentError('نوع کسب‌وکار فعال انتخاب نشده است.');
      return;
    }
    const databasePreset = `af_erp_empty_${regData.businessType}`;
    setIsSubmittingPayment(true);
    try {
      const method = paymentMethods.find((m) => m.id === regData.payMethod) || paymentMethods[0];
      const meta: Record<string, string> = {
        shop_name: regData.shopName.trim(),
        owner_phone: regData.phone.replace(/\D/g, ''),
        business_type: regData.businessType,
        database_preset: databasePreset,
        desired_admin_password: regData.password,
      };
      method.fields.forEach((f) => {
        const val = String(paymentValues[f.name] || '').trim();
        if (val) meta[f.name] = val;
      });
      if (method.id === 'other_try') {
        meta.message = 'manual_contact_requested';
      }
      const res = await apiRegisterPayment({
        ownerName: fullOwner,
        email: regData.email.trim() || undefined,
        plan: regData.plan,
        payMethod: regData.payMethod,
        paymentMeta: meta,
      });

      let checkoutUrl = res.payment.gateway_checkout_url || null;
      if (res.payment.pay_method === 'hesabpay') {
        try {
          const init = await apiInitHesabPay(res.payment.id);
          checkoutUrl = init.checkoutUrl;
        } catch {}
      }
      setCreatedPayment({ id: res.payment.id, status: res.payment.pay_status, checkoutUrl });
      setView('payment-pending');
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'خطا در ثبت پرداخت');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const googleModal = showGoogleModal ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" dir="rtl">
      <div className={`w-full max-w-md rounded-2xl border ${cardBg} p-6 shadow-2xl relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-lg font-bold ${textPrimary}`}>{googleMode === 'register' ? 'ثبت نام با گوگل' : 'ورود با گوگل'}</h3>
              <p className={`text-xs mt-1 ${textSecondary}`}>اطلاعات گوگل را وارد کنید</p>
            </div>
            <button onClick={() => setShowGoogleModal(false)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`text-sm font-semibold block mb-1.5 ${textSecondary}`}>نام کامل</label>
              <input
                value={googleName}
                onChange={e => setGoogleName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${inputCls}`}
                placeholder="مثال: محمد احمدی"
              />
            </div>
            <div>
              <label className={`text-sm font-semibold block mb-1.5 ${textSecondary}`}>ایمیل گوگل</label>
              <input
                value={googleEmail}
                onChange={e => setGoogleEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${inputCls}`}
                placeholder="example@gmail.com"
                dir="ltr"
              />
            </div>
            {googleError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {googleError}
              </div>
            )}
            <button
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${primaryBtn}`}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  ادامه
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const plans = [
    {
      id: 'free', name: 'آزمایشی رایگان', nameEn: 'Free trial',
      price: '$0', period: '۳ روز',
      color: 'slate', badge: '۳ روز',
      features: [
        'ثبت‌نام با موبایل + رمز (بدون کد پیامک)',
        '۳ روز دسترسی کامل به امکانات',
        'ورود مجدد با همان شماره و رمز',
        'داده‌های شما ذخیره می‌شود (مثل حساب رسمی)',
        'پس از اتمام: تمدید از طریق اشتراک یا پشتیبانی',
      ]
    },
    {
      id: 'basic_monthly', name: 'ماهانه پایه', nameEn: 'Basic Monthly',
      price: '$14.9', period: 'ماهانه',
      color: 'blue', badge: 'اقتصادی',
      features: [
        '۴ کاربر (مدیر + ۳ نقش مجزا)',
        'حداکثر ۲۰۰۰ محصول در انبار',
        'حداکثر ۲۵۰ مشتری وفادار',
        'پشتیبانی استاندارد تیکتی',
        'چاپ فاکتور (۴ سایز استاندارد)',
        'بکاپ‌گیری خودکار هفتگی',
      ]
    },
    {
      id: 'basic_annual', name: 'سالانه پایه', nameEn: 'Basic Annual',
      price: '$99', period: 'سالانه',
      color: 'indigo', badge: 'به صرفه ترین',
      features: [
        'تمام امکانات طرح پایه ماهانه',
        'صرفه‌جویی ۳۰٪ در هزینه سالانه',
        'پشتیبانی اولویت‌دار تلفنی',
        'حداکثر ۵۰۰۰ محصول در انبار',
        'بکاپ‌گیری خودکار روزانه',
        'امنیت SSL و رمزنگاری داده‌ها',
      ]
    },
    {
      id: 'premium_annual', name: 'سالانه پرمیوم', nameEn: 'Premium Annual',
      price: '$179', period: 'سالانه',
      color: 'emerald', badge: 'پیشنهادی دکان یار',
      features: [
        'کاربران نامحدود (بدون محدودیت)',
        'محصولات نامحدود (بدون محدودیت)',
        'مشتریان نامحدود (بدون محدودیت)',
        'پشتیبانی ۲۴/۷ اختصاصی VIP',
        'گزارش‌گیری پیشرفته + نمودارهای تحلیلی',
        'سیستم حسابداری کامل و حرفه‌ای',
        'API اختصاصی برای اتصال به سایت',
        'احراز هویت دوعاملی (2FA)',
      ]
    },
  ];

  interface PaymentMethodField {
    name: string;
    label: string;
    placeholder: string;
    type: string;
  }

  interface PaymentMethod {
    id: string;
    icon: React.ReactNode;
    name: string;
    company: string;
    color: string;
    number: string;
    fields: PaymentMethodField[];
    hint?: string;
  }

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'bank_transfer',
      icon: <Banknote className="text-emerald-500" />,
      name: 'حواله بانکی',
      company: 'بانک‌ها و صرافی‌های معتبر افغانستان',
      color: 'bg-emerald-500/10',
      number: 'AC-0098-4452-879',
      fields: [
        { name: 'transfer_number', label: 'شماره حواله', placeholder: 'مثال: TR-123456', type: 'text' },
        { name: 'bank_name', label: 'نام بانک یا صرافی', placeholder: 'مثال: بانک ملی، صرافی برادران...', type: 'text' }
      ]
    },
    {
      id: 'mpaisa',
      icon: <Smartphone className="text-blue-500" />,
      name: 'M-Paisa',
      company: 'Roshan Telecom — موبایل پیسه',
      color: 'bg-blue-500/10',
      number: '0700-740-740',
      fields: [
        { name: 'mpaisa_number', label: 'شماره موبایل فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mpaisa_ref', label: 'کد مرجع تراکنش', placeholder: 'REF-123456', type: 'text' }
      ],
      hint: 'قدیمی‌ترین و گسترده‌ترین سرویس پرداخت موبایلی در افغانستان'
    },
    {
      id: 'mhawala',
      icon: <ArrowRightLeft className="text-sky-500" />,
      name: 'M-Hawala',
      company: 'Etisalat Afghanistan — حواله موبایلی',
      color: 'bg-sky-500/10',
      number: '0790-074-175',
      fields: [
        { name: 'mhawala_number', label: 'شماره موبایل فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mhawala_ref', label: 'کد رسید تراکنش', placeholder: 'ET-654321', type: 'text' }
      ],
      hint: 'پرکاربردترین سرویس حواله موبایلی نزد مردم افغانستان'
    },
    {
      id: 'mymoney',
      icon: <Wallet className="text-indigo-500" />,
      name: 'MyMoney',
      company: 'AWCC (Afghan Wireless) — کیف پول دیجیتال',
      color: 'bg-indigo-500/10',
      number: '0700-507-4175',
      fields: [
        { name: 'mymoney_number', label: 'شماره AWCC فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mymoney_ref', label: 'شماره مرجع پرداخت', placeholder: 'AW-776655', type: 'text' }
      ],
      hint: 'مناسب برای کاربران شبکه Afghan Wireless در شهرهای بزرگ'
    },
    {
      id: 'atoma_pay',
      icon: <CreditCard className="text-cyan-500" />,
      name: 'ATOMA Pay',
      company: 'ATOMA Digital Payments — پرداخت آنلاین',
      color: 'bg-cyan-500/10',
      number: 'ATOMA-DOKANYAR',
      fields: [
        { name: 'atoma_wallet', label: 'شماره کاربری یا موبایل', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'atoma_ref', label: 'کد تأیید پرداخت', placeholder: 'AT-998877', type: 'text' }
      ],
      hint: 'پلتفرم نوظهور پرداخت دیجیتال برای معاملات آنلاین داخل افغانستان'
    },
    {
      id: 'hesabpay',
      icon: <Globe className="text-teal-500" />,
      name: 'HesabPay',
      company: 'hesab.com — درگاه تأیید خودکار',
      color: 'bg-teal-500/10',
      number: 'HESABPAY-GATEWAY',
      fields: [
        { name: 'hesabpay_tx', label: 'شناسه تراکنش HesabPay', placeholder: 'HP-XXXXXX', type: 'text' }
      ],
      hint: 'تنها درگاه با تأیید خودکار از طریق API و Webhook'
    },
    {
      id: 'other_try',
      icon: <Phone className="text-violet-500" />,
      name: 'پشتیبانی مستقیم',
      company: 'SmartHub Digital Solutions — ۰۷۹۵۰۷۴۱۷۵',
      color: 'bg-violet-500/10',
      number: '0795074175',
      fields: [],
      hint: 'از طریق تلفن یا واتساپ با تیم ما روش مناسب شما را پیدا می‌کنیم'
    }
  ];

  const selectedPayment = paymentMethods.find(p => p.id === regData.payMethod);
  const visiblePlans = trialQuickSignup ? plans : plans.filter((p) => p.id !== 'free');
  const selectedPlan = visiblePlans.find(p => p.id === regData.plan) || visiblePlans[0] || plans[1];

  const suspendedGateModal = (
    <ShopGateModal
      open={suspendedGate.open}
      variant="suspended"
      message={suspendedGate.message}
      onGoPayment={() => { setSuspendedGate({ open: false }); navigate('/?renew=1'); }}
    />
  );

  // DEMO: ثبت‌نام / ورود با موبایل + رمز (بدون SMS/OTP)
  if (view === 'demo-register') {
    return (
      <>
        {suspendedGateModal}
      <div className="min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        <AnimatedBg scene="demo-limit" />
        <div
          className={`relative z-10 w-full mx-auto ${
            demoRegisterCredentials || demoRegPhase === 'business' ? 'max-w-6xl' : 'max-w-md'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setView('register');
              setRegisterStep(1);
              setDemoError('');
              setDemoRegisterCredentials(null);
              setDemoRegPhase('form');
            }}
            className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-xl shadow-sm border border-white/10 mr-0"
          >
            <ChevronRight size={18} /><span>بازگشت به طرح‌ها</span>
          </button>

          <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600/80 to-blue-600/80 px-6 py-5 text-right relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&w=800&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="relative z-10">
                <div className="text-3xl mb-2">🚀</div>
                <h2 className="text-xl font-black text-white">ثبت‌نام آزمایشی رایگان — ۳ روز</h2>
                <p className="text-indigo-100 text-xs mt-2 opacity-90 leading-relaxed">
                  {demoRegPhase === 'business'
                    ? 'همهٔ صنوف قابل انتخاب‌اند؛ حساب آزمایشی با دیتابیس خالی فقط برای سوپرمارکت ساخته می‌شود.'
                    : 'ابتدا مشخصات را وارد کنید؛ در مرحله بعد صنف را بزنید — دمو ۳ روزه فقط با سوپرمارکت.'}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4 text-right">
              {demoRegisterCredentials ? (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                    <p className="text-emerald-200 text-sm font-black mb-4">ثبت‌نام موفق — موارد زیر را یادداشت کنید</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-xs font-bold">کد فروشگاه</p>
                        <p className="text-white font-mono font-black text-lg tracking-wider text-left mt-1" dir="ltr">{demoRegisterCredentials.shopCode}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">رمز عبور فروشگاه</p>
                        <p className="text-white font-mono font-black text-base break-all text-left mt-1" dir="ltr">{demoRegisterCredentials.shopPassword}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">نام مدیر</p>
                        <p className="text-white font-bold text-base mt-1">{demoRegisterCredentials.adminFullName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">رمز نقش مدیر (در ورود زیر «مدیر دکان»)</p>
                        <p className="text-amber-200 font-mono font-black text-base break-all text-left mt-1" dir="ltr">{demoRegisterCredentials.adminRolePassword}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    نقش‌های فروشنده، انباردار و حسابدار به‌صورت پیش‌فرض در ورود نمایش داده نمی‌شوند تا مدیر از تنظیمات → کاربران فروشگاه آن‌ها را فعال و رمز تعیین کند.
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    در صفحهٔ «ورود»: کد و رمز فروشگاه؛ نقش مدیر دکان و رمز نقش مدیر را وارد کنید.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShopCodeInput(demoRegisterCredentials.shopCode);
                      setShopPassInput(demoRegisterCredentials.shopPassword);
                      setDemoRegisterCredentials(null);
                      setDemoError('');
                      setDemoRegPhase('form');
                      setView('login');
                      setLoginStep(1);
                    }}
                    className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  >
                    رفتن به ورود <LogIn size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDemoRegisterCredentials(null);
                      setDemoRegPhase('form');
                    }}
                    className="w-full text-slate-400 hover:text-white text-sm text-center"
                  >
                    بازگشت به فرم ثبت‌نام
                  </button>
                </div>
              ) : demoRegPhase === 'business' ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-white text-lg font-black mb-0.5">نوع کسب‌وکار</h3>
                    <p className="text-slate-500 text-[11px]">همه فعال برای نمایش؛ دمو با دیتابیس فقط روی «سوپرمارکت».</p>
                  </div>
                  {demoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-2 flex-row-reverse text-right">
                      <AlertTriangle size={16} className="shrink-0" /> <span>{demoError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {ONBOARDING_BUSINESS_TYPES.map((bt) => {
                      const IconComp = ONBOARDING_LUCIDE[bt.lucideIcon];
                      const sel = demoBusinessType === bt.id;
                      const demoDb = DEMO_DATABASE_BUSINESS_TYPE_IDS.has(bt.id);
                      return (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => {
                            setDemoError('');
                            setDemoBusinessType(bt.id);
                          }}
                          className={`group relative overflow-hidden rounded-2xl border p-3 sm:p-3.5 text-right transition-all duration-300 ${
                            sel
                              ? 'border-indigo-400/80 bg-gradient-to-br from-indigo-600/30 via-slate-900/55 to-violet-900/45 shadow-lg shadow-indigo-900/25 ring-1 ring-indigo-400/35 hover:-translate-y-0.5'
                              : 'border-white/10 bg-white/[0.05] hover:border-indigo-400/40 hover:bg-white/[0.08] hover:-translate-y-0.5 hover:shadow-md'
                          }`}
                        >
                          {sel ? (
                            <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md">
                              ✓
                            </span>
                          ) : null}
                          {!demoDb ? (
                            <span className="absolute top-1.5 left-1.5 rounded-md bg-amber-950/90 px-1.5 py-0.5 text-[7px] font-black text-amber-200/90 ring-1 ring-amber-500/30">
                              طرح کامل
                            </span>
                          ) : (
                            <span className="absolute top-1.5 left-1.5 rounded-md bg-emerald-950/90 px-1.5 py-0.5 text-[7px] font-black text-emerald-200/90 ring-1 ring-emerald-500/30">
                              دمو ۳ روز
                            </span>
                          )}
                          <div
                            className={`mb-2 inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br ${bt.accent} shadow-md ring-1 ring-white/10`}
                          >
                            <IconComp size={22} className="text-white drop-shadow-md" strokeWidth={1.75} />
                          </div>
                          <p className="text-white font-bold text-xs sm:text-sm leading-snug tracking-tight pr-0.5">{bt.titleFa}</p>
                          <p className="text-slate-500 text-[9px] sm:text-[10px] font-mono mt-0.5 truncate" dir="ltr">
                            {bt.titleEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setDemoRegPhase('form'); setDemoError(''); }}
                      className="flex-1 py-3 rounded-xl border border-white/20 text-slate-200 font-bold hover:bg-white/5"
                    >
                      بازگشت به فرم
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDemoRegisterApi()}
                      disabled={isDemoLoading}
                      className="flex-1 py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 shadow-lg"
                    >
                      {isDemoLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>ایجاد حساب و دریافت کدها <Check size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {demoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-2 flex-row-reverse text-right">
                      <AlertTriangle size={16} className="shrink-0" /> <span>{demoError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">نام</label>
                      <input value={demoName} onChange={e => setDemoName(e.target.value)} placeholder="نام"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-right" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">نام خانوادگی</label>
                      <input value={demoFamily} onChange={e => setDemoFamily(e.target.value)} placeholder="نام خانوادگی"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-right" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">ایمیل (اختیاری)</label>
                    <input type="email" value={demoOptionalEmail} onChange={e => setDemoOptionalEmail(e.target.value)} placeholder="example@gmail.com" dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">شماره موبایل</label>
                    <input value={demoPhone} onChange={e => setDemoPhone(e.target.value)} placeholder="مثلاً 079xxxxxxx" dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 font-bold text-left"
                      inputMode="tel" autoComplete="tel" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">رمز عبور (حداقل ۶ کاراکتر) — همان «رمز نقش مدیر» در ورود</label>
                    <div className="relative">
                      <input type={showDemoPwd ? 'text' : 'password'} value={demoPassword} onChange={e => setDemoPassword(e.target.value)}
                        className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" dir="ltr" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowDemoPwd(!showDemoPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showDemoPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">تکرار رمز</label>
                    <input type={showDemoPwd ? 'text' : 'password'} value={demoPassword2} onChange={e => setDemoPassword2(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" dir="ltr" autoComplete="new-password" />
                  </div>

                  <button
                    type="button"
                    onClick={goDemoBusinessStep}
                    className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  >
                    ادامه — انتخاب نوع کسب‌وکار <ChevronLeft size={18} />
                  </button>

                  <p className="text-slate-500 text-[10px] leading-relaxed text-right">
                    ۳ روز آزمایشی؛ پس از دریافت کدها از «ورود» وارد شوید. فقط مدیر دکان در ورود دیده می‌شود تا نقش‌های دیگر را خودتان فعال کنید.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        {googleModal}
      </div>
      </>
    );
  }

  // DEMO LIMIT PAGE
  if (view === 'demo-limit') {
    return (
      <div className={`min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden`} dir="rtl">
        <AnimatedBg scene="demo-limit" />
        <div className="relative z-10 w-full max-w-md">
          <div className={`p-8 rounded-3xl ${cardBg} text-center`}>
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/10">
              <Lock size={40} className="text-blue-400" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${textPrimary}`}>نیاز به اشتراک</h2>
            <p className={`text-sm mb-6 ${textSecondary} leading-7`}>
              برای استفادهٔ پایدار از این بخش، طرح اشتراک یا فعال‌سازی حساب کامل لازم است.<br />
              تیم پشتیبانی می‌تواند در انتخاب طرح راهنمایی کند.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setRegisterStep(1); setView('register'); }}
                className={`w-full py-4 rounded-xl text-lg flex items-center justify-center gap-2 ${primaryBtn}`}
              >
                <Crown size={20} />
                مشاهده طرح‌های اشتراک
              </button>
              <button
                onClick={() => { setGoogleMode('login'); setShowGoogleModal(true); }}
                className="w-full py-3 rounded-xl text-sm font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                ورود با Google
              </button>
              <button
                onClick={() => setView('landing')}
                className={`w-full py-3 rounded-xl text-sm font-bold ${secondaryBtn}`}
              >
                بازگشت به صفحه اصلی
              </button>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className={`text-xs ${textSecondary} mb-3 font-black uppercase tracking-widest`}>طرح‌های اشتراک:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-indigo-500/20 bg-black/20 shadow-sm">
                  <p className="text-indigo-400 font-black">پایه</p>
                  <p className="text-white text-xl font-black mt-1">$99</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">سالانه</p>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/20 bg-black/20 shadow-sm">
                  <p className="text-blue-400 font-black">پریمیوم</p>
                  <p className="text-white text-xl font-black mt-1">$179</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">سالانه</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAYMENT PENDING PAGE
  if (view === 'payment-pending') {
    return (
      <div className={`min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden`} dir="rtl">
        <AnimatedBg scene="payment-pending" />
        <div className="relative z-10 w-full max-w-lg">
          <div className={`p-8 sm:p-12 rounded-[2.5rem] ${cardBg} text-center relative overflow-hidden`}>
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-3xl bg-blue-500/20 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/10 animate-bounce">
                <Banknote size={48} className="text-blue-400" />
              </div>
              
              <h2 className={`text-3xl font-black mb-4 ${textPrimary} tracking-tight`}>در انتظار تأیید پرداخت</h2>
              
              <div className="p-4 rounded-2xl mb-8 text-sm bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold leading-relaxed flex items-center gap-3">
                <Mail size={20} className="shrink-0" />
                ایمیل تأیید ثبت‌نام برای شما ارسال شد. لطفاً صندوق ورودی (Inbox) خود را بررسی کنید.
              </div>
              
              <p className={`text-base mb-10 ${textSecondary} leading-loose`}>
                درخواست شما با موفقیت ثبت شد. <br />
                پس از واریز وجه، لطفاً رسید را از طریق راه‌های زیر برای ما ارسال کنید تا حساب شما در کمترین زمان ممکن توسط تیم <span className="text-indigo-400 font-black">دکان یار</span> فعال شود.
              </p>

              <div className="p-6 rounded-3xl mb-8 text-right bg-black/20 border border-white/10 shadow-inner">
                <p className="text-white font-black text-sm mb-6 flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-400" /> جزئیات پرداخت انتخابی
                </p>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>روش پرداخت:</span>
                    <div className="flex items-center gap-2">
                      {selectedPayment?.icon}
                      <span className={`${textPrimary} font-black`}>{selectedPayment?.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>شماره حساب / موبایل:</span>
                    <span className="text-indigo-400 font-black text-lg tracking-wider bg-black/20 px-3 py-1 rounded-xl border border-white/10">{selectedPayment?.number}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>به نام:</span>
                    <span className={`${textPrimary} font-black`}>پلتفرم دکان یار</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className={textSecondary}>مبلغ نهایی:</span>
                    <div className="text-left">
                      <span className="text-white font-black text-2xl">{selectedPlan.price}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedPlan.period}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-2">
                  <Mail size={24} className="text-blue-400" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ارسال به ایمیل</p>
                  <p className="text-xs font-black text-blue-100">dokanyar2026@gmail.com</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-2">
                  <Smartphone size={24} className="text-emerald-400" />
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ارسال به واتساپ</p>
                  <p className="text-xs font-black text-emerald-100" dir="ltr">0795074175</p>
                </div>
              </div>

              {createdPayment && (
                <div className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-right">
                  <p className="text-indigo-200 text-sm font-bold">شناسه درخواست پرداخت: #{createdPayment.id}</p>
                  <p className="text-indigo-300 text-xs mt-1">وضعیت: {createdPayment.status}</p>
                  {createdPayment.checkoutUrl && (
                    <a
                      href={createdPayment.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-3 text-xs font-bold text-blue-300 hover:text-blue-200 underline"
                    >
                      رفتن به درگاه HesabPay (Sandbox)
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setView('login')}
                  className={`w-full py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-3 ${primaryBtn}`}
                >
                  <LogIn size={22} /> ورود به پنل مدیریت
                </button>
                <button
                  onClick={() => setView('landing')}
                  className={`w-full py-4 rounded-2xl text-sm font-bold ${secondaryBtn}`}
                >
                  بازگشت به صفحه اصلی
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LANDING PAGE
  if (view === 'landing') {
    return (
      <>
        {suspendedGateModal}
      <div className={`min-h-screen font-vazir selection:bg-indigo-100 selection:text-indigo-900 relative flex flex-col overflow-hidden`} dir="rtl">
        <AnimatedBg full scene="landing" />

        <header className="relative z-50 w-full">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 md:py-8">
            {/* موبایل: لوگو + نام دکان‌یار گوشه راست؛ ورود / درباره در وسط؛ ثبت‌نام */}
            <div className="flex md:hidden flex-col gap-4 pt-1">
              <div className="flex items-center justify-end gap-2 pr-0.5">
                <span className="text-[13px] font-black text-white tracking-tight">{t('app_name')}</span>
                <AppLogo size={32} light />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-white flex-wrap">
                  <button type="button" onClick={() => setView('info')} className="p-0 m-0 bg-transparent border-0 shadow-none hover:text-white/90 active:scale-[0.98] transition-all">
                    {t('about_us')}
                  </button>
                  <span className="text-white/25 select-none" aria-hidden>|</span>
                  <button type="button" onClick={() => setView('download')} className="p-0 m-0 bg-transparent border-0 shadow-none hover:text-emerald-300 active:scale-[0.98] transition-all">
                    دانلود
                  </button>
                  <span className="text-white/25 select-none" aria-hidden>|</span>
                  <button type="button" onClick={() => setView('login')} className="p-0 m-0 bg-transparent border-0 shadow-none hover:text-white/90 active:scale-[0.98] transition-all">
                    {t('login')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setRegisterStep(1); setView('register'); }}
                  className="text-xs font-black text-white px-5 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 transition-opacity shadow-lg shadow-indigo-900/40"
                >
                  {t('register')}
                </button>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-4 group cursor-pointer">
                <AppLogo size={56} light />
                <div className="flex flex-col">
                  <h1 className="text-3xl font-black text-white tracking-tighter">{t('app_name')}</h1>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <nav className="flex items-center gap-6">
                  <button type="button" onClick={() => setView('info')} className="text-sm font-bold text-white hover:text-white/80 transition-all hover:scale-105">
                    {t('about_us')}
                  </button>
                  <button type="button" onClick={() => setView('download')} className="text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-all hover:scale-105">
                    دانلود
                  </button>
                  <button type="button" onClick={() => setView('login')} className="text-sm font-bold text-white hover:text-white/80 transition-all hover:scale-105">
                    {t('login')}
                  </button>
                </nav>
                <button
                  type="button"
                  onClick={() => { setRegisterStep(1); setView('register'); }}
                  className="group relative px-8 py-3.5 rounded-full text-base font-black text-white overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 animate-gradient-x" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity" />
                  <span className="relative flex items-center gap-1.5">
                    {t('register')} <ArrowRight size={16} className="group-hover:translate-x-[-4px] transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 pt-10 pb-20">
          <div className="max-w-5xl">
            {/* Trust badge removed as per request */}

            <h2 className="text-6xl sm:text-8xl font-black text-white mb-10 tracking-tight leading-[1.1] animate-fade-in-up animation-delay-200">
              {t('app_name')}
            </h2>

            <p className="text-xl sm:text-2xl text-slate-200/90 max-w-3xl mx-auto mb-14 leading-relaxed font-medium animate-fade-in-up animation-delay-400">
              {t('welcome_hero_body')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up animation-delay-600">
              {/* Buttons removed as per request */}
            </div>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <Link to="/privacy" className="hover:text-white font-bold transition-colors">{t('legal_privacy')}</Link>
              <span className="text-white/20" aria-hidden>|</span>
              <Link to="/terms" className="hover:text-white font-bold transition-colors">{t('legal_terms')}</Link>
            </div>
          </div>
          
          {/* Bottom Features Bar removed as per request */}
        </main>

        {googleModal}
      </div>
      </>
    );
  }

  // INFO PAGE
  if (view === 'info') {
    return (
      <div className="min-h-screen font-vazir relative overflow-hidden" dir="rtl">
        <AnimatedBg scene="info" />

        {/* Full-width hero image */}
        <div className="absolute top-0 inset-x-0 h-72 sm:h-80 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1887&auto=format&fit=crop)'}} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900" />
        </div>

        {/* Header */}
        <header className="relative z-10">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('landing')} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20">
                <ChevronRight size={20} />
              </button>
              <AppLogo size={36} light />
              <span className="font-extrabold text-xl text-white">{t('welcome_about_title')}</span>
            </div>
            <button onClick={() => setView('login')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
              {t('welcome_login_panel')}
            </button>
          </div>
        </header>

        {/* Hero text over image */}
        <div className="relative z-10 text-center pt-6 pb-32 px-4">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4">{t('app_name')}</h1>
          <p className="text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
            {t('welcome_info_subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 pb-16 -mt-20">
          {/* Intro card */}
          <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-lg border border-white/10 mb-8 text-slate-200 leading-loose text-justify">
            <p className="text-lg font-bold text-white mb-4">
              {t('welcome_info_intro')}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t('welcome_info_detail')}
            </p>
          </div>

          {/* Continuous feature text */}
          <div className="p-8 rounded-3xl bg-black/30 backdrop-blur-sm border border-white/10 mb-8 leading-loose text-slate-200 text-sm space-y-4 text-justify">
            <p>
              <strong className="text-white">مدیریت فروش:</strong> ثبت فاکتور، پرداخت نسیه، مدیریت تخفیف و گزارش‌گیری جامع. تمامی تراکنش‌های ثبت‌شده پیش از نهایی‌شدن، وارد بخش تأیید فروش می‌شوند تا مدیر آن‌ها را بررسی کرده و در صورت صحت تأیید نماید. در صورت وجود مغایرت، امکان رد یا ویرایش تراکنش‌ها فراهم است.
            </p>
            <p>
              <strong className="text-white">مدیریت مشتریان:</strong> سوابق خرید، بدهی‌ها، یادآوری خودکار و سیستم کارت وفاداری. ابزارهای هوشمند یادآوری به شما کمک می‌کند تا اعلان‌های مربوط به بدهی‌ها را در زمان مناسب دریافت کنید و پیگیری موثری داشته باشید.
            </p>
            <p>
              <strong className="text-white">مدیریت انبار:</strong> کنترل کامل موجودی، پشتیبانی از بارکد، ردیابی تاریخ انقضا و سریال کالاها. اطلاعات انبار به صورت لحظه‌ای به‌روزرسانی می‌شود و هشدارهای موجودی پایین به طور خودکار ارسال می‌گردد.
            </p>
            <p>
              <strong className="text-white">سیستم چاپ فاکتور:</strong> پشتیبانی از ۴ اندازه استاندارد کاغذ (58mm، 80mm، A5 و A4). امکان تنظیم هدر و فوتر فاکتور شامل نام فروشگاه، آدرس، تلفن و پیام تشکر. تنظیمات ذخیره می‌شوند تا در استفاده‌های بعدی نیازی به تنظیم مجدد نباشد.
            </p>
            <p>
              <strong className="text-white">امنیت و سطوح دسترسی:</strong> سیستم دارای ۴ سطح دسترسی مجزا است — مدیر (دسترسی کامل)، حسابدار (اطلاعات مالی)، انباردار (کنترل کالا)، و فروشنده (ثبت فاکتور). هر نقش با رمز جداگانه محافظت می‌شود و دسترسی به اطلاعات حساس محدود می‌گردد.
            </p>
            <p>
              <strong className="text-white">گزارش‌های جامع:</strong> نمودارهای فروش، تحلیل سود و زیان، وضعیت بدهی‌ها و گزارش موجودی انبار به صورت بصری و قابل صادرکردن. خدمات این مجموعه شامل طراحی سیستم‌های مدیریتی، توسعه وب‌سایت، اپلیکیشن موبایل و زیرساخت داده نیز می‌باشد.
            </p>
          </div>

          {/* Footer CTA */}
          <div className="p-8 rounded-3xl bg-black/30 backdrop-blur-sm border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-slate-300 text-sm leading-7">
                با احترام،{' '}
                <button type="button" onClick={() => setView('creator')} className="text-white font-black hover:text-indigo-200 transition-colors p-0 m-0 bg-transparent border-0 shadow-none underline-offset-4 hover:underline">
                  {creatorConfig.name}
                </button>
                {' '}— توسعه‌دهنده دکان‌یار
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setView('register')} className="px-6 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
                شروع کنید
              </button>
              <button onClick={() => setView('login')} className="px-6 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                ورود
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CREATOR PAGE — پروفایل ساده، بدون باکس‌های تزئینی دور نام
  if (view === 'creator') {
    return (
      <div className="min-h-screen font-vazir relative overflow-hidden" dir="rtl">
        <AnimatedBg scene="creator" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <div className="px-4 sm:px-8 pt-5 pb-3">
            <button
              type="button"
              onClick={() => setView('info')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-bold transition-colors p-0 bg-transparent border-0"
            >
              <ChevronRight size={16} /> بازگشت به درباره ما
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-xl">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden ring-2 ring-white/25 shadow-xl bg-slate-900">
                  <img
                    src="/creator-mohibullah.png"
                    alt={creatorConfig.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mb-1">{creatorConfig.name}</h1>
                <p className="text-indigo-300/90 text-xs sm:text-sm font-semibold">{creatorConfig.title}</p>
              </div>

              <div className="space-y-4 text-slate-300 text-sm sm:text-[15px] leading-8">
                <p>
                  توسعه‌دهنده نرم‌افزار و بنیان‌گذار SmartHub Digital Solutions؛ تمرکز بر ساده‌سازی سیستم‌های مدیریت کسب‌وکار برای دکان‌های واقعی.
                </p>
                <p>
                  <span className="text-white font-semibold">دکان‌یار</span> برای پوشش همان نیازها ساخته شده: فروش، انبار، بدهی و گزارش، بدون پیچیدگی اضافه.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm">
                  مسیر پیش رو: یکپارچگی بیشتر با پرداخت‌های محلی، گزارش‌های هوشمندتر و تجربهٔ موبایل قوی‌تر.
                </p>
              </div>

              <div className="mt-10 pt-6">
                <p className="text-slate-500 text-[10px] text-center mb-4 font-bold tracking-widest">تماس</p>
                <div className="flex justify-center gap-6">
                  <a
                    href="tel:+93795074175"
                    title="تلفن"
                    className="text-slate-400 hover:text-emerald-400 transition-colors p-2"
                  >
                    <Phone size={22} />
                  </a>
                  <a
                    href="https://wa.me/93795074175"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="text-slate-400 hover:text-green-400 transition-colors p-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.facebook.com/smarthubdigitalsolutions"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                    className="text-slate-400 hover:text-blue-400 transition-colors p-2"
                  >
                    <Facebook size={22} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DOWNLOAD PAGE (اندروید / iOS / ویندوز — جدا از لندینگ)
  if (view === 'download') {
    return (
      <>
        {suspendedGateModal}
        <div className="relative min-h-screen font-vazir" dir="rtl">
          <AnimatedBg full scene="landing" />
          <div className="relative z-10">
            <WelcomeDownloadPage
              onBack={() => setView('landing')}
              onLogin={() => {
                setView('login');
                setLoginStep(1);
              }}
              onRegister={() => {
                setRegisterStep(1);
                setView('register');
              }}
            />
          </div>
        </div>
        {googleModal}
      </>
    );
  }

  // LOGIN PAGE
  if (view === 'login') {
    const roleLabels: Record<string, string> = {
      admin: 'مدیر دکان', seller: 'فروشنده', stock_keeper: 'انباردار', accountant: 'حسابدار',
      super_admin: 'سوپرادمین',
    };
    const roleIcons: Record<string, string> = {
      admin: '🏪', seller: '🛒', stock_keeper: '📦', accountant: '💼', super_admin: '👑',
    };
    const supportWaDigits = String(creatorConfig.social?.phone || '0795074175').replace(/\D/g, '');
    const supportWhatsAppUrl = `https://wa.me/${supportWaDigits || '93795074175'}`;
    return (
      <>
        {suspendedGateModal}
      <div className="min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        <AnimatedBg scene="login" />
        {/* موبایل: برند گوشه روی صفحه (راست) */}
        <div className="md:hidden absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          <span className="text-[11px] font-black text-white/95 tracking-tight drop-shadow-md">{t('app_name')}</span>
          <AppLogo size={34} light />
        </div>
        <div className="relative z-10 w-full max-w-md mt-8 md:mt-0 space-y-4">
          <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl shadow-black/20">
            <div className="p-8 sm:p-10">
              <div className="text-center mb-6 sm:mb-8">
                <div className="hidden md:inline-flex mb-3 sm:mb-4 transform scale-[0.82] sm:scale-100 origin-center">
                  <AppLogo size={56} light />
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white">ورود به دکان یار</h2>
                {/* Step indicator */}
                {!twoFactorRequired && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${loginStep === 1 ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {loginStep === 1 ? '1' : '✓'}
                    </div>
                    <div className={`h-0.5 w-8 rounded-full transition-all ${loginStep === 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${loginStep === 2 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-400'}`}>2</div>
                  </div>
                )}
              </div>

              {/* ── 2FA challenge ─────────────────────────── */}
              {twoFactorRequired && (
                <div className="space-y-5 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Shield size={32} className="text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">تأیید هویت دو مرحله‌ای</h3>
                  <p className="text-sm text-slate-300">اپ Google Authenticator را باز کرده و کد ۶ رقمی مربوط به Dokanyar را وارد کنید.</p>
                  {totpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {totpError}
                    </div>
                  )}
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white text-3xl font-black tracking-[0.5em] text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                    dir="ltr" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleTotpVerify()} />
                  <button type="button" onClick={handleTotpVerify}
                    disabled={isTotpLoading || totpCode.length !== 6}
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isTotpLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Shield size={20} /> تأیید کد</>}
                  </button>
                  <button type="button" onClick={() => { setTwoFactorRequired(false); setTotpCode(''); setTotpError(''); }}
                    className="text-slate-400 hover:text-white text-sm transition-colors">
                    بازگشت به ورود
                  </button>
                </div>
              )}

              {/* ── Step 1: Shop code + password ─────────── */}
              {!twoFactorRequired && loginStep === 1 && (
                <div className="space-y-5">
                  <p className="text-slate-300 text-sm text-center">کد فروشگاه و رمز عبور را وارد کنید</p>
                  {checkShopError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {checkShopError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">کد فروشگاه</label>
                    <input
                      value={shopCodeInput}
                      onChange={e => { setShopCodeInput(e.target.value); setCheckShopError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleCheckShop()}
                      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                      placeholder="مثال: SHOP001" dir="ltr" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">رمز عبور فروشگاه</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={shopPassInput}
                        onChange={e => { setShopPassInput(e.target.value); setCheckShopError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCheckShop()}
                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                        dir="ltr" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer justify-center text-slate-300 text-sm select-none">
                    <input
                      type="checkbox"
                      checked={rememberShopCode}
                      onChange={(e) => setRememberShopCode(e.target.checked)}
                      className="rounded border-white/25 bg-white/10 text-indigo-600 focus:ring-indigo-500/40 w-4 h-4"
                    />
                    مرا به خاطر بسپار (فقط کد فروشگاه؛ رمز را هر بار وارد کنید)
                  </label>
                  <div className="flex items-center justify-center gap-5 text-xs flex-wrap">
                    <button type="button" onClick={() => setShowForgotModal(true)} className="text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1.5 transition-colors">
                      <KeyRound size={15} /> فراموشی رمز
                    </button>
                    <a href={supportWhatsAppUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1.5 transition-colors">
                      <Headphones size={15} /> پشتیبانی
                    </a>
                  </div>
                  <button type="button" onClick={handleCheckShop} disabled={isCheckingShop}
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isCheckingShop
                      ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>ادامه <ChevronLeft size={22} /></>}
                  </button>
                  <button type="button" onClick={() => setView('landing')} className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors">
                    بازگشت
                  </button>
                </div>
              )}

              {/* ── Step 2: Role selection + role password ─── */}
              {!twoFactorRequired && loginStep === 2 && (
                <div className="space-y-5">
                  <div className="text-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-indigo-300 text-xs font-bold mb-1">فروشگاه تأیید شد</p>
                    <p className="text-white font-black text-lg">{shopNameResult}</p>
                  </div>
                  <p className="text-slate-300 text-sm text-center font-bold">نقش خود را انتخاب کنید</p>
                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {loginError}
                    </div>
                  )}

                  {/* Role buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {shopRolesResult.length === 0 ? (
                      <div className="col-span-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm text-center font-bold">
                        کاربری برای ورود تعریف نشده. از تنظیمات → کاربران فروشگاه، حداقل یک نقش را فعال کنید.
                      </div>
                    ) : shopRolesResult.map((r) => {
                      const inactive = r.status === 'inactive';
                      return (
                        <button key={r.role} type="button"
                          disabled={inactive}
                          onClick={() => { if (!inactive) setSelectedRole(r.role); }}
                          className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                            inactive
                              ? 'border-white/5 bg-white/[0.03] text-slate-500 cursor-not-allowed opacity-70'
                              : selectedRole === r.role
                                ? 'border-indigo-500 bg-indigo-500/20 text-white scale-[1.02] shadow-lg shadow-indigo-500/20'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
                          }`}>
                          <div className="text-2xl mb-1">{roleIcons[r.role] || '👤'}</div>
                          <p className="font-bold text-xs">{roleLabels[r.role] || r.full_name}</p>
                          {inactive && (
                            <p className="text-[10px] text-rose-300 mt-1.5 font-bold">غیرفعال — مدیر از «کاربران» فعال کند</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Role password */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">رمز عبور نقش</label>
                    <div className="relative">
                      <input
                        type={showRolePassInput ? 'text' : 'password'}
                        value={rolePassInput}
                        onChange={e => { setRolePassInput(e.target.value); setLoginError(''); }}
                        onKeyDown={e => e.key === 'Enter' && !isLoggingIn && handleRoleLogin()}
                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                        dir="ltr" placeholder="••••••" autoFocus />
                      <button type="button" onClick={() => setShowRolePassInput(!showRolePassInput)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showRolePassInput ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button type="button" onClick={handleRoleLogin}
                    disabled={
                      isLoggingIn ||
                      !rolePassInput.trim() ||
                      (shopRolesResult.some(r => r.role === selectedRole && r.status === 'inactive'))
                    }
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isLoggingIn
                      ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>ورود به پنل <LogIn size={22} /></>}
                  </button>

                  <button type="button" onClick={() => { setLoginStep(1); setLoginError(''); setRolePassInput(''); }}
                    className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors">
                    تغییر فروشگاه
                  </button>
                </div>
              )}
            </div>
          </div>
          {googleModal}
        </div>
      </div>
      {showForgotModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-white font-black mb-3">
              <KeyRound className="text-amber-400 shrink-0" size={22} />
              بازیابی رمز عبور
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              رمز فروشگاه و رمز هر نقش جدا هستند. اگر رمز را فراموش کرده‌اید، مدیر همان فروشگاه یا تیم پشتیبانی دکان‌یار می‌تواند از پنل ادمین یا تنظیمات کاربران، رمز را بازنشانی کند.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={supportWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 text-sm font-black hover:bg-emerald-600/50 transition-colors"
              >
                <LifeBuoy size={18} /> تماس با پشتیبانی (واتساپ)
              </a>
              <button type="button" onClick={() => setShowForgotModal(false)} className="py-2.5 text-slate-400 text-sm hover:text-white transition-colors">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // REGISTER PAGE
  if (view === 'register') {
    const stepLabels = ['انتخاب طرح', 'مشخصات فروشگاه', 'نوع کسب‌وکار', 'روش پرداخت'];

    return (
      <div className={`min-h-screen font-vazir selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden`} dir="rtl">
        <AnimatedBg scene="register" />
        <header className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setView('landing')} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 shrink-0">
                <ChevronRight size={20} />
              </button>
              <span className={`font-extrabold text-xl text-white truncate`}>درخواست حساب جدید</span>
            </div>
            <button
              type="button"
              onClick={() => setView('download')}
              className="shrink-0 text-sm font-bold text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-xl px-3 py-2 bg-emerald-500/10"
            >
              دانلود اپ
            </button>
          </div>
        </header>

        <div className={`relative z-10 mx-auto px-4 py-10 transition-all duration-500 ${registerStep === 1 ? 'max-w-6xl' : 'max-w-5xl'}`}>
          {/* Progress */}
          <div className="mb-10 px-2 max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-1 sm:gap-2 relative">
              <div className="absolute top-4 sm:top-5 left-4 right-4 sm:left-8 sm:right-8 h-1 bg-white/10 rounded-full -z-10" />
              <div
                className="absolute top-4 sm:top-5 right-4 sm:right-8 h-1 bg-indigo-500 rounded-full -z-10 transition-all duration-500"
                style={{ width: `${((registerStep - 1) / 3) * 100}%`, maxWidth: 'calc(100% - 2rem)' }}
              />
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] sm:text-sm font-bold transition-all duration-300 shadow-sm ${
                      registerStep >= s ? 'bg-indigo-600 text-white ring-2 sm:ring-4 ring-indigo-900/50' : 'bg-black/20 text-slate-300 border border-white/10'
                    }`}
                  >
                    {registerStep > s ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : s}
                  </div>
                  <span
                    className={`text-[9px] sm:text-xs font-bold mt-2 text-center leading-tight px-0.5 transition-colors ${registerStep >= s ? 'text-white' : 'text-slate-500'}`}
                  >
                    {stepLabels[s - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 sm:p-10 rounded-3xl bg-black/30 backdrop-blur-lg border border-white/10`}>
            {/* Step 1 - Pricing */}
            {registerStep === 1 && (
              <div className="animate-fadeIn text-center">
                <h3 className={`text-3xl font-black mb-3 text-white`}>طرح‌های اشتراک</h3>
                <p className={`text-sm mb-10 text-slate-300`}>انتخاب طرح مناسب برای نیاز شما</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {visiblePlans.map(plan => {
                    const isSelected = regData.plan === plan.id;
                    const isPremium = plan.id === 'premium_annual';
                    
                    return (
                      <div key={plan.id} 
                        className={`flex flex-col p-6 rounded-3xl border-2 text-center transition-all duration-300 relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/20 scale-105 z-10'
                            : 'border-white/10 bg-black/40 hover:border-indigo-500/50 hover:bg-white/5'
                        }`}>
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden z-10 pointer-events-none">
                            <div className="absolute transform rotate-45 bg-indigo-500 text-white text-[10px] font-bold py-1 right-[-45px] top-[15px] w-[120px] text-center shadow-lg">انتخاب شده</div>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <div className="h-6 mb-3">
                            {plan.badge && <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase ${isPremium ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 text-slate-200'}`}>{plan.badge}</span>}
                          </div>
                          <h4 className={`font-black text-xl mb-1 ${isSelected ? 'text-white' : 'text-slate-100'}`}>{plan.name}</h4>
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>{plan.nameEn}</span>
                        </div>
                        
                        <div className="mb-6 flex items-baseline justify-center gap-1">
                          <span className={`font-black text-4xl ${isSelected ? 'text-indigo-400' : 'text-emerald-400'}`}>{plan.price}</span>
                          <span className={`text-sm font-bold ${isSelected ? 'text-indigo-500' : 'text-slate-500'}`}>/ {plan.period}</span>
                        </div>
                        
                        <div className="flex flex-col gap-3 mb-8 flex-1 text-right">
                          {plan.features.map((f, i) => (
                            <span key={i} className={`text-xs font-bold flex items-start gap-2 ${isSelected ? 'text-indigo-100' : 'text-slate-300'}`}>
                              <Check size={14} className={`shrink-0 mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-emerald-500'}`} /> {f}
                            </span>
                          ))}
                        </div>
                        
                        <button 
                          onClick={() => {
                            setRegData({ ...regData, plan: plan.id });
                            if (plan.id === 'free') {
                              setDemoError('');
                              setDemoRegisterCredentials(null);
                              setDemoRegPhase('form');
                              setDemoBusinessType(DEFAULT_BUSINESS_TYPE);
                              setView('demo-register');
                            } else {
                              setRegisterStep(2);
                            }
                          }}
                          className={`w-full py-3.5 rounded-xl text-sm font-black transition-all mt-auto ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500' 
                              : isPremium
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'bg-white/10 text-white hover:bg-indigo-600 hover:text-white border border-white/10 hover:border-indigo-500'
                          }`}
                        >
                          {plan.id === 'free' ? `🚀 ${t('demo_free')}` : `انتخاب ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — مشخصات فروشگاه (مشابه ثبت‌نام آزمایشی) */}
            {registerStep === 2 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => setRegisterStep(1)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                  <h3 className="text-2xl font-extrabold text-white">مشخصات فروشگاه و مدیر</h3>
                </div>
                <p className="text-sm mb-6 text-slate-300 leading-relaxed">
                  نام فروشگاه، موبایل، رمز مدیر و در صورت تمایل ایمیل را وارد کنید؛ سپس نوع کسب‌وکار و پایگاه داده را انتخاب می‌کنید و به پرداخت می‌روید.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">نام فروشگاه *</label>
                    <input
                      value={regData.shopName}
                      onChange={(e) => setRegData({ ...regData, shopName: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all ${formErrors.shopName ? 'border-rose-500/50' : ''}`}
                      placeholder="مثال: سوپرمارکت رحیمی"
                    />
                    {formErrors.shopName && <p className="text-xs text-rose-400 mt-1.5">{formErrors.shopName}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold block mb-2 text-slate-200">نام *</label>
                      <input
                        value={regData.ownerFirstName}
                        onChange={(e) => setRegData({ ...regData, ownerFirstName: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 transition-all ${formErrors.ownerFirstName ? 'border-rose-500/50' : ''}`}
                        placeholder="نام"
                      />
                      {formErrors.ownerFirstName && <p className="text-xs text-rose-400 mt-1.5">{formErrors.ownerFirstName}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-2 text-slate-200">نام خانوادگی *</label>
                      <input
                        value={regData.ownerFamily}
                        onChange={(e) => setRegData({ ...regData, ownerFamily: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 transition-all ${formErrors.ownerFamily ? 'border-rose-500/50' : ''}`}
                        placeholder="نام خانوادگی"
                      />
                      {formErrors.ownerFamily && <p className="text-xs text-rose-400 mt-1.5">{formErrors.ownerFamily}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">شماره موبایل *</label>
                    <input
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 text-left font-mono transition-all ${formErrors.phone ? 'border-rose-500/50' : ''}`}
                      placeholder="079xxxxxxx"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {formErrors.phone && <p className="text-xs text-rose-400 mt-1.5">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">ایمیل (اختیاری)</label>
                    <input
                      type="email"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 text-left transition-all ${formErrors.email ? 'border-rose-500/50' : ''}`}
                      placeholder="example@gmail.com"
                      dir="ltr"
                    />
                    {formErrors.email && <p className="text-xs text-rose-400 mt-1.5">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">رمز مدیر / ورود (حداقل ۶ کاراکتر) *</label>
                    <div className="relative">
                      <input
                        type={showRegisterPwd ? 'text' : 'password'}
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        className={`w-full px-4 py-3.5 pl-12 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 text-left transition-all ${formErrors.password ? 'border-rose-500/50' : ''}`}
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPwd(!showRegisterPwd)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showRegisterPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.password && <p className="text-xs text-rose-400 mt-1.5">{formErrors.password}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">تکرار رمز *</label>
                    <input
                      type={showRegisterPwd ? 'text' : 'password'}
                      value={regData.password2}
                      onChange={(e) => setRegData({ ...regData, password2: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 text-left transition-all ${formErrors.password2 ? 'border-rose-500/50' : ''}`}
                      dir="ltr"
                      autoComplete="new-password"
                    />
                    {formErrors.password2 && <p className="text-xs text-rose-400 mt-1.5">{formErrors.password2}</p>}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setRegisterStep(1)} className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20">
                    <ChevronRight size={20} /> بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const errors: Record<string, string> = {};
                      if (!regData.shopName.trim()) errors.shopName = 'نام فروشگاه الزامی است';
                      if (!regData.ownerFirstName.trim()) errors.ownerFirstName = 'نام الزامی است';
                      if (!regData.ownerFamily.trim()) errors.ownerFamily = 'نام خانوادگی الزامی است';
                      const phoneDigits = regData.phone.replace(/\D/g, '');
                      if (phoneDigits.length < 9) errors.phone = 'شماره موبایل معتبر وارد کنید';
                      if (regData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email.trim())) errors.email = 'فرمت ایمیل نادرست است';
                      if (regData.password.length < 6) errors.password = 'رمز حداقل ۶ کاراکتر';
                      if (regData.password !== regData.password2) errors.password2 = 'تکرار رمز با رمز اول یکسان نیست';
                      if (Object.keys(errors).length > 0) {
                        setFormErrors(errors);
                        return;
                      }
                      setFormErrors({});
                      setRegisterStep(3);
                    }}
                    className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    ادامه <ChevronLeft size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — نوع کسب‌وکار */}
            {registerStep === 3 && (
              <div className="animate-fadeIn space-y-5">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setRegisterStep(2)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl font-black text-white">نوع کسب‌وکار</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                      نوع کسب‌وکار را انتخاب کنید؛ سپس روش پرداخت را مشخص می‌کنید. پس از تأیید پرداخت، کد فروشگاه و رمزها برای شما صادر می‌شود.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {ONBOARDING_BUSINESS_TYPES.map((bt) => {
                    const IconComp = ONBOARDING_LUCIDE[bt.lucideIcon];
                    const sel = regData.businessType === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => {
                          setRegData({ ...regData, businessType: bt.id });
                        }}
                        className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition-all duration-300 ${
                          sel
                            ? 'border-indigo-400/80 bg-gradient-to-br from-indigo-600/30 via-slate-900/55 to-violet-900/45 shadow-lg ring-1 ring-indigo-400/35'
                            : 'border-white/10 bg-white/[0.05] hover:border-indigo-400/40 hover:bg-white/[0.08]'
                        }`}
                      >
                        {sel ? (
                          <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md">✓</span>
                        ) : null}
                        <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${bt.accent} shadow-md ring-1 ring-white/10`}>
                          <IconComp size={20} className="text-white drop-shadow-md" strokeWidth={1.75} />
                        </div>
                        <p className="text-white font-bold text-xs leading-snug">{bt.titleFa}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setRegisterStep(2)} className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20 text-sm flex items-center justify-center gap-2">
                    <ChevronRight size={18} /> بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ACTIVE_BUSINESS_TYPE_IDS.has(regData.businessType)) return;
                      setRegisterStep(4);
                    }}
                    className="flex-1 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 text-sm flex items-center justify-center gap-2"
                  >
                    ادامه <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 — پرداخت */}
            {registerStep === 4 && (() => {
              const methodColors: Record<string, { accent: string; glow: string }> = {
                bank_transfer: { accent: '#10b981', glow: 'rgba(16,185,129,0.25)' },
                mpaisa: { accent: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
                mhawala: { accent: '#60a5fa', glow: 'rgba(96,165,250,0.25)' },
                mymoney: { accent: '#818cf8', glow: 'rgba(129,140,248,0.25)' },
                atoma_pay: { accent: '#22d3ee', glow: 'rgba(34,211,238,0.25)' },
                hesabpay: { accent: '#2dd4bf', glow: 'rgba(45,212,191,0.25)' },
                other_try: { accent: '#a78bfa', glow: 'rgba(167,139,250,0.25)' },
              };
              const mc = methodColors[regData.payMethod] || methodColors.bank_transfer;
              const info = PAYMENT_INFO[regData.payMethod];
              return (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setRegisterStep(3)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors shrink-0 mt-1">
                        <ChevronRight size={20} />
                      </button>
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">تسویه و فعال‌سازی</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
                          طرح <span className="text-indigo-300 font-bold">{selectedPlan.name}</span> —{' '}
                          <span className="text-white font-black">{selectedPlan.price}</span>
                          <span className="text-slate-500"> / {selectedPlan.period}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          فروشگاه: <span className="text-slate-300 font-medium">{regData.shopName || '—'}</span>
                        </p>
                      </div>
                    </div>
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
                      style={{ boxShadow: `0 0 40px ${mc.glow}` }}
                    >
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">مبلغ قابل پرداخت</p>
                      <p className="text-2xl font-black text-white tabular-nums" dir="ltr">
                        {selectedPlan.price}
                      </p>
                    </div>
                  </div>

                  {paymentError ? (
                    <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm font-bold">{paymentError}</div>
                  ) : null}

                  <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    <div className="lg:col-span-4 space-y-2 order-2 lg:order-1">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1 mb-1">روش پرداخت</p>
                      <div className="space-y-2 max-h-[min(520px,70vh)] overflow-y-auto custom-scrollbar pr-1">
                        {paymentMethods.map((method) => {
                          const isSel = regData.payMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setRegData({ ...regData, payMethod: method.id })}
                              className={`w-full text-right rounded-2xl border p-4 flex items-center gap-3 transition-all duration-200 ${
                                isSel
                                  ? 'border-indigo-400/80 bg-indigo-500/[0.12] ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/40'
                                  : 'border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 [&>svg]:w-5 [&>svg]:h-5">
                                {method.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-white text-sm leading-tight">{method.name}</p>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{method.company}</p>
                              </div>
                              {isSel ? <Check className="text-indigo-400 shrink-0" size={20} strokeWidth={2.5} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:col-span-8 order-1 lg:order-2">
                      <div
                        className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                        style={{
                          background: 'linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(15,23,42,0.85) 45%, rgba(2,6,23,0.95) 100%)',
                          boxShadow: `0 25px 80px -20px ${mc.glow}`,
                        }}
                      >
                        <div className="p-6 sm:p-8 border-b border-white/10">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10"
                              style={{ backgroundColor: `${mc.accent}18`, color: mc.accent }}
                            >
                              <span className="[&>svg]:w-6 [&>svg]:h-6">{selectedPayment?.icon}</span>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-white">{selectedPayment?.name}</h4>
                              <p className="text-xs text-slate-400">{selectedPayment?.company}</p>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-black/50 border border-white/10 p-4 sm:p-5 mb-5">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">مقصد / شناسه واریز</p>
                            <p className="font-mono text-lg sm:text-xl text-white font-black tracking-wide break-all text-left" dir="ltr">
                              {selectedPayment?.id === 'other_try' ? '0795074175' : selectedPayment?.number}
                            </p>
                          </div>
                          {info ? (
                            <div className="space-y-4">
                              <p className="text-sm text-slate-300 leading-7 text-justify">{info.description}</p>
                              <div>
                                <p className="text-xs font-black text-slate-400 mb-2">مراحل پرداخت</p>
                                <ol className="space-y-2">
                                  {info.steps.map((st, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                                      <span
                                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                                        style={{ backgroundColor: `${mc.accent}22`, color: mc.accent }}
                                      >
                                        {i + 1}
                                      </span>
                                      <span className="pt-0.5">{st}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          ) : null}
                          {selectedPayment?.hint ? (
                            <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-white/10 leading-relaxed">{selectedPayment.hint}</p>
                          ) : null}
                        </div>
                        <div className="p-6 sm:p-8 bg-black/30">
                          {selectedPayment?.id === 'other_try' ? (
                            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5">
                              <p className="text-sm font-black text-violet-200 mb-3">تماس با پشتیبانی</p>
                              <div className="space-y-2 text-sm text-slate-200">
                                <div className="flex items-center gap-2">
                                  <Phone size={16} className="text-violet-400 shrink-0" />
                                  <span dir="ltr" className="font-black">
                                    0795074175
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Facebook size={16} className="text-blue-400 shrink-0" />
                                  <span className="font-bold">Smarthub digital solutions</span>
                                </div>
                              </div>
                            </div>
                          ) : selectedPayment && selectedPayment.fields.length > 0 ? (
                            <div className="space-y-4">
                              <p className="text-sm font-bold text-slate-300">جزئیات تراکنش شما</p>
                              {selectedPayment.fields.map((field) => (
                                <div key={field.name}>
                                  <label className="text-xs font-bold text-slate-400 block mb-1.5">{field.label}</label>
                                  <input
                                    type={field.type}
                                    value={paymentValues[field.name] || ''}
                                    onChange={(e) => setPaymentValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">پس از واریز، در صورت نیاز با پشتیبانی هماهنگ کنید.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(3)}
                      className="sm:flex-initial py-3.5 px-6 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20 text-sm flex items-center justify-center gap-2"
                    >
                      <ChevronRight size={18} /> بازگشت
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmitPayment()}
                      disabled={isSubmittingPayment}
                      className="flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-xl shadow-indigo-900/40 transition-all disabled:opacity-60 text-sm sm:text-base border border-white/10"
                    >
                      {isSubmittingPayment ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={18} strokeWidth={2.5} /> ثبت درخواست و ادامهٔ پرداخت
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {googleModal}
      </div>
    );
  }

  return null;
};

export default WelcomePage;
