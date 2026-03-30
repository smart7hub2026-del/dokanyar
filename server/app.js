import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { generateSecret as totpGenerateSecret, generateURI as totpGenerateURI, generateSync as totpGenerateSync, verifySync as totpVerifySync } from 'otplib';

const totpAuth = {
  generateSecret: () => totpGenerateSecret(),
  keyuri: (label, issuer, secret) => totpGenerateURI({ issuer, label, secret, type: 'totp' }),
  verify: ({ token, secret }) => {
    const result = totpVerifySync({ token, secret, type: 'totp' });
    return result && result.valid === true;
  },
  generate: (secret) => totpGenerateSync({ secret, type: 'totp' }),
};
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import fsp from 'fs/promises';
import crypto from 'crypto';
import { loadDatabase, saveDatabase } from './storage.js';
import { copyPlatformDatabase, resolvePlatformSqlitePath } from './backupPlatformDb.js';

// ─── Email utility ──────────────────────────────────────────────────────────
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const createMailTransport = () => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transport = createMailTransport();
  if (!transport) return false;
  try {
    await transport.sendMail({ from: `"دکان‌یار" <${GMAIL_USER}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error('[Email] Send error:', err.message);
    return false;
  }
};

const COOKIE_NAME = 'dokanyar_auth';
const makeCookieOpts = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  maxAge: maxAgeMs,
});

/** جایگزینی قطعی نشست — قبل از Set-Cookie کوکی قبلی پاک می‌شود تا دو JWT موازی (ادمین/فروشگاه) نماند */
const setSessionCookie = (res, token, maxAgeMs) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.cookie(COOKIE_NAME, token, makeCookieOpts(maxAgeMs));
};

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : '');
const TOKEN_EXPIRES_IN = '2h';
const DEMO_TOKEN_EXPIRES_IN = '7d';
const DEMO_TRIAL_MS = 3 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

/** در production پیش‌فرض خاموش؛ با ALLOW_TRIAL_QUICK_SIGNUP=true فعال شود */
const trialQuickSignupEnabled = () => {
  const v = process.env.ALLOW_TRIAL_QUICK_SIGNUP;
  if (v === 'false' || v === '0') return false;
  if (v === 'true' || v === '1') return true;
  return !IS_PROD;
};

const normalizeDemoPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length < 9 || d.length > 15) return null;
  return d;
};

const findDemoAccountByPhone = (db, phone) => {
  for (const shop of db.shops) {
    if (!shop.is_demo) continue;
    for (const u of shop.users || []) {
      const up = u.phone ? String(u.phone).replace(/\D/g, '') : '';
      const un =
        u.username && !String(u.username).includes('@')
          ? String(u.username).replace(/\D/g, '')
          : '';
      if (up === phone || un === phone) return { shop, user: u };
    }
  }
  return null;
};

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in environment variables.');
}

const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const authAttemptStore = new Map();
const lockoutStore = new Map();
const reqRateStore = new Map();

// ── In-memory OTP store { email → { code, expiresAt, attempts } } ──────────
const otpStore = new Map();

const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS || 5);
const AUTH_LOCK_MINUTES = Number(process.env.AUTH_LOCK_MINUTES || 15);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQ = Number(process.env.RATE_LIMIT_MAX_REQ || 120);

const nextId = (arr = []) => (arr.length > 0 ? Math.max(...arr.map((x) => Number(x.id) || 0)) + 1 : 1);
const generateCode = (prefix, length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${out}`;
};

/** ادغام state دکان: فقط کلیدهای ارسال‌شده عوض می‌شوند؛ بقیه حفظ (چندفروشگاهی / درخواست ناقص) */
function mergeShopStatePayload(existing, incoming) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  if (!incoming || typeof incoming !== 'object') return base;
  for (const key of Object.keys(incoming)) {
    const v = incoming[key];
    if (v !== undefined) base[key] = v;
  }
  return base;
}

/** ده صنف اولویت‌دار افغانستان — کد پایدار برای tenant / shopSettings.business_type */
const AF_TENANT_BUSINESS_CODES = [
  'supermarket',
  'pharmacy',
  'mobile_accessories',
  'restaurant',
  'gold_jewelry',
  'clothing',
  'home_appliances',
  'hardware_building',
  'auto_parts',
  'bakery',
];
const AF_TENANT_BUSINESS_SET = new Set(AF_TENANT_BUSINESS_CODES);

function normalizeTenantBusinessType(raw) {
  const s = String(raw || '').trim();
  if (AF_TENANT_BUSINESS_SET.has(s)) return s;
  if (s === 'bookstore') return 'bookstore';
  const legacy = {
    general: 'supermarket',
    blank: 'supermarket',
    supermarket: 'supermarket',
    gold: 'gold_jewelry',
    mobile: 'mobile_accessories',
    appliances: 'home_appliances',
    hardware: 'hardware_building',
    building_materials: 'hardware_building',
    books: 'bookstore',
  };
  if (legacy[s]) return legacy[s];
  return 'supermarket';
}

const normalizeDemoBusinessType = normalizeTenantBusinessType;

/** state اولیهٔ دکان آزمایشی — شامل نوع کسب‌وکار در shopSettings */
function initialDemoShopState(fullName, phone, businessType) {
  return {
    shopSettings: {
      shop_name: fullName,
      seller_name: fullName,
      shop_address: '',
      shop_phone: phone,
      logo_url: '',
      paper_size: '80mm',
      footer_text: '',
      show_shop_name: true,
      show_address: true,
      show_phone: true,
      show_seller: true,
      show_barcode: true,
      security_code: '',
      print_copies: 1,
      invoice_copy_mode: 'single',
      show_product_image_on_sales: true,
      print_invoice_with_product_images: false,
      business_type: businessType,
    },
  };
}

const SHOP_STATE_ARRAY_KEYS = [
  'products',
  'categories',
  'customers',
  'invoices',
  'purchaseInvoices',
  'debts',
  'suppliers',
  'staff',
  'expenses',
  'cashEntries',
  'productReturns',
  'reminders',
  'notifications',
  'pendingApprovals',
  'procurementManualLines',
  'users',
  'expiryRecords',
  'serialNumbers',
  'books',
];


/** دادهٔ عملیاتی خالی؛ ساختار آماده برای هر tenant با tenant_id و بدون نمونهٔ فروش */
function applyDemoBusinessSeed(state, businessType, tenantId) {
  const tid = Number(tenantId) || 1;
  if (!state.shopSettings || typeof state.shopSettings !== 'object') {
    state.shopSettings = {};
  }
  state.shopSettings.business_type = businessType;
  state.shopSettings.tenant_id = tid;
  for (const key of SHOP_STATE_ARRAY_KEYS) {
    state[key] = [];
  }
  state.currencyRates = { AFN: 1, USD: 70, EUR: 76, IRT: 0.017 };
}


const ensureShopState = (db, shopCode) => {
  if (!db.stateByShop[shopCode]) {
    db.stateByShop[shopCode] = {};
  }
  const state = db.stateByShop[shopCode];
  for (const key of SHOP_STATE_ARRAY_KEYS) {
    state[key] = Array.isArray(state[key]) ? state[key] : [];
  }
  if (!state.currencyRates || typeof state.currencyRates !== 'object') {
    state.currencyRates = { USD: 75, EUR: 82, IRT: 0.02 };
  }
  return state;
};

const ensureSystemStructures = (db) => {
  if (!db.shopConfigs || typeof db.shopConfigs !== 'object') db.shopConfigs = {};
  if (!Array.isArray(db.settingsLogs)) db.settingsLogs = [];
};

const PLAN_PRICES_AFN = {
  basic_monthly: 100,
  basic_annual: 1000,
  premium_monthly: 300,
  premium_annual: 3000,
};

const ensurePaymentStructures = (db) => {
  if (!Array.isArray(db.paymentRequests)) db.paymentRequests = [];
  if (!Array.isArray(db.paymentEvents)) db.paymentEvents = [];
};

const appendPaymentEvent = (db, paymentId, event, payload = {}) => {
  ensurePaymentStructures(db);
  db.paymentEvents.unshift({
    id: nextId(db.paymentEvents),
    payment_id: paymentId,
    event,
    payload,
    created_at: new Date().toISOString(),
  });
  if (db.paymentEvents.length > 2000) {
    db.paymentEvents = db.paymentEvents.slice(0, 2000);
  }
};

/** پس از تأیید پرداخت ثبت‌نام بدون دکان — ایجاد فروشگاه و بازگرداندن رمزهای یک‌بار مصرف */
async function provisionShopFromPaymentRequest(db, payment) {
  const ownerName = String(payment.owner_name || '').trim() || 'مدیر فروشگاه';
  const email = String(payment.email || '').trim().toLowerCase();
  const meta = payment.payment_meta && typeof payment.payment_meta === 'object' ? payment.payment_meta : {};
  const phone = String(meta.phone || meta.ownerPhone || '').trim();

  let shopCode;
  let attempts = 0;
  do {
    shopCode = generateCode('PY', 5);
    attempts += 1;
  } while (db.shops.some((s) => s.code === shopCode) && attempts < 100);
  if (attempts >= 100) {
    throw new Error('تولید کد فروشگاه یکتا ناموفق بود');
  }

  const plainShopPassword = generateCode('SP', 10);
  const plainAdminRolePassword = generateCode('AP', 10);
  const tenantId = nextId(db.shops.map((s) => ({ id: s.tenantId })));
  const flatU = db.shops.flatMap((s) => s.users || []);
  let nid = nextId(flatU);
  const adminId = nid++;
  const sellerId = nid++;
  const stockId = nid++;
  const accId = nid++;
  const inactiveRolePwHash = await bcrypt.hash(generateCode('RP', 14), 10);

  const adminUsername =
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : `admin-${shopCode.toLowerCase()}`;

  const planKey = String(payment.plan || 'basic_monthly');
  const subscriptionPlan = planKey.startsWith('premium') ? 'premium' : 'basic';
  const days = planKey.includes('annual') ? 365 : 30;
  const subEnd = new Date(Date.now() + days * 24 * 3600_000).toISOString().slice(0, 10);

  const displayShopName = String(meta.shop_name || ownerName).trim() || ownerName;
  const businessType = normalizeTenantBusinessType(meta.business_type);

  const shop = {
    code: shopCode,
    name: displayShopName,
    tenantId,
    is_demo: false,
    phone: phone || '',
    passwordHash: await bcrypt.hash(plainShopPassword, 10),
    owner_email: email || undefined,
    subscription_plan: subscriptionPlan,
    subscription_status: 'active',
    subscription_start: new Date().toISOString().slice(0, 10),
    subscription_end: subEnd,
    status: 'active',
    registered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    business_type_code: businessType,
    business_metadata: {},
    admin_credential_record: {
      shop_password_plain: plainShopPassword,
      admin_role_password_plain: plainAdminRolePassword,
      recorded_at: new Date().toISOString(),
    },
    users: [
      {
        id: adminId,
        username: adminUsername,
        email: email || '',
        phone,
        full_name: ownerName,
        role: 'admin',
        passwordHash: await bcrypt.hash(plainAdminRolePassword, 10),
        status: 'active',
      },
      {
        id: sellerId,
        username: `${shopCode}-SELLER`,
        full_name: 'فروشنده',
        role: 'seller',
        passwordHash: inactiveRolePwHash,
        status: 'inactive',
      },
      {
        id: stockId,
        username: `${shopCode}-STOCK`,
        full_name: 'انباردار',
        role: 'stock_keeper',
        passwordHash: inactiveRolePwHash,
        status: 'inactive',
      },
      {
        id: accId,
        username: `${shopCode}-ACC`,
        full_name: 'حسابدار',
        role: 'accountant',
        passwordHash: inactiveRolePwHash,
        status: 'inactive',
      },
    ],
  };

  db.shops.push(shop);
  db.stateByShop = db.stateByShop || {};
  db.stateByShop[shopCode] = initialDemoShopState(displayShopName, phone, businessType);
  ensureShopState(db, shopCode);
  applyDemoBusinessSeed(db.stateByShop[shopCode], businessType, tenantId);

  return {
    shopCode,
    shopPassword: plainShopPassword,
    adminRolePassword: plainAdminRolePassword,
    shop,
  };
}

const ensureShopConfig = (db, shopCode) => {
  ensureSystemStructures(db);
  if (!db.shopConfigs[shopCode]) {
    db.shopConfigs[shopCode] = {
      notifications_enabled: true,
      notification_sound: 'bell_soft',
      session_timeout_minutes: 120,
      require_approval_for_sales: true,
      manager_can_manage_users: true,
    };
  }
  return db.shopConfigs[shopCode];
};

const appendSettingsLog = (db, shopCode, actor, action, details = '') => {
  ensureSystemStructures(db);
  db.settingsLogs.unshift({
    id: nextId(db.settingsLogs),
    shop_code: shopCode,
    actor_id: actor.sub,
    actor_name: actor.fullName || 'system',
    actor_role: actor.role,
    action,
    details,
    created_at: new Date().toISOString(),
  });
  if (db.settingsLogs.length > 500) {
    db.settingsLogs = db.settingsLogs.slice(0, 500);
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const normalizeShopCode = (value) => String(value || '').trim().toUpperCase();

/** دکان‌های واقعی اول، آخر SUPERADMIN — ورود با ایمیل/گوگل نباید اگر ایمیل در چند دکان تکرار شد، به‌اشتباه اولین ردیف (پلتفرم) را بگیرد */
const shopsOrderedForEmailLookup = (db) => {
  const list = Array.isArray(db.shops) ? db.shops : [];
  const regular = list.filter((s) => s && String(s.code).toUpperCase() !== 'SUPERADMIN');
  const platform = list.filter((s) => s && String(s.code).toUpperCase() === 'SUPERADMIN');
  return [...regular, ...platform];
};

const requestRateLimiter = (req, res, next) => {
  const key = `${getClientIp(req)}:${req.path}`;
  const now = Date.now();
  const item = reqRateStore.get(key);
  if (!item || item.expiresAt < now) {
    reqRateStore.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (item.count >= RATE_LIMIT_MAX_REQ) {
    return res.status(429).json({ message: 'تعداد درخواست بیش از حد مجاز است. کمی بعد تلاش کنید.' });
  }
  item.count += 1;
  reqRateStore.set(key, item);
  return next();
};

const authLockoutGuard = (req, res, next) => {
  const key = `${normalizeShopCode(req.body?.shopCode)}:${getClientIp(req)}`;
  const lock = lockoutStore.get(key);
  if (lock && lock.until > Date.now()) {
    const mins = Math.ceil((lock.until - Date.now()) / 60000);
    return res.status(429).json({ message: `حساب موقتاً قفل است. ${mins} دقیقه دیگر تلاش کنید.` });
  }
  return next();
};

const recordAuthFailure = (shopCode, req) => {
  const key = `${normalizeShopCode(shopCode)}:${getClientIp(req)}`;
  const now = Date.now();
  const item = authAttemptStore.get(key) || { count: 0, lastAt: now };
  item.count += 1;
  item.lastAt = now;
  authAttemptStore.set(key, item);
  if (item.count >= AUTH_MAX_ATTEMPTS) {
    lockoutStore.set(key, { until: now + AUTH_LOCK_MINUTES * 60_000 });
    authAttemptStore.delete(key);
  }
};

const clearAuthFailures = (shopCode, req) => {
  const key = `${normalizeShopCode(shopCode)}:${getClientIp(req)}`;
  authAttemptStore.delete(key);
  lockoutStore.delete(key);
};

const ensureLoginAuditLog = (db) => {
  if (!Array.isArray(db.loginAuditLog)) db.loginAuditLog = [];
};

const appendLoginAudit = async (db, row) => {
  ensureLoginAuditLog(db);
  const entry = {
    id: nextId(db.loginAuditLog),
    created_at: new Date().toISOString(),
    ...row,
  };
  db.loginAuditLog.unshift(entry);
  if (db.loginAuditLog.length > 3000) {
    db.loginAuditLog = db.loginAuditLog.slice(0, 3000);
  }
  await saveDatabase(db);
};

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", 'https://oauth2.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'", 'https://accounts.google.com'],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // In development: allow any origin (Vite proxy on different IPs, mobile, etc.)
    if (!IS_PROD) return callback(null, true);
    // In production: enforce whitelist
    if (ALLOWED_ORIGINS.length === 0) return callback(new Error('CORS origin denied'));
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'dokanyar-api',
    uptime_s: Math.round(process.uptime()),
    env: IS_PROD ? 'production' : 'development',
  });
});

app.get('/api/meta/public', (_req, res) => {
  res.json({
    trial_quick_signup_enabled: trialQuickSignupEnabled(),
    app: 'dokanyar',
  });
});

app.use(requestRateLimiter);
app.use((req, res, next) => {
  if (IS_PROD && req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(426).json({ message: 'HTTPS required' });
  }
  return next();
});

const buildPublicUser = (shop, user) => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  role: user.role,
  status: user.status,
  tenant_id: shop.tenantId,
  shop_code: shop.code,
  two_factor_enabled: Boolean(user.two_factor_enabled),
  last_login: new Date().toISOString(),
  preferred_language: user.preferred_language,
  preferred_currency: user.preferred_currency,
  is_demo: Boolean(user.is_demo || shop.is_demo),
});

const sanitizeShopUser = (u) => ({
  id: u.id,
  username: u.username,
  full_name: u.full_name,
  role: u.role,
  status: u.status,
  email: u.email,
  preferred_language: u.preferred_language,
  preferred_currency: u.preferred_currency,
});

const buildShopMeta = (shop) => {
  if (!shop) {
    return {
      is_demo: false,
      trial_ends_at: null,
      trial_days_remaining: null,
      trial_expired: false,
      shop_status: null,
      shop_suspended: false,
    };
  }
  const trialEndsAt = shop.trial_ends_at || null;
  let trialDaysRemaining = null;
  let trialExpired = false;
  if (trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    trialExpired = ms < 0;
  }
  const st = shop.status || 'active';
  const shopSuspended = st === 'suspended' || st === 'inactive';
  return {
    is_demo: Boolean(shop.is_demo),
    trial_ends_at: trialEndsAt,
    trial_days_remaining: trialDaysRemaining,
    trial_expired: trialExpired,
    shop_status: st,
    shop_suspended: shopSuspended,
  };
};

const resolveCrossShopTarget = (req, db, preferredCode) => {
  if (req.auth.role === 'super_admin') {
    return String(preferredCode || req.auth.shopCode).toUpperCase();
  }
  return normalizeShopCode(req.auth.shopCode);
};

/** فقط حساب پلتفرم (SUPERADMIN) — مدیران دکانٔ عادی و دیمو به APIهای مادر دسترسی ندارند */
const assertMasterApi = async (req, res) => {
  if (req.auth.role === 'super_admin') return true;
  res.status(403).json({ message: 'فقط ابرادمین اجازه دسترسی دارد' });
  return false;
};

const authMiddleware = async (req, res, next) => {
  // Bearer اول: اگر کوکی قدیمی (مثلاً نشست ابرادمین) جا مانده باشد ولی کلاینت توکن جدید
  // را در حافظه دارد، نباید کوکی قدیمی نشست فعال را ببرد — این همان «قاطی شدن» پنل‌ها بود.
  let token = '';
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    token = req.cookies?.[COOKIE_NAME] || '';
  }
  if (!token) {
    return res.status(401).json({ message: 'توکن موجود نیست' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.scope === 'totp-pending') {
      return res.status(401).json({ message: 'احراز هویت دو مرحله‌ای ناقص است' });
    }
    req.auth = payload;

    if (payload.role !== 'super_admin' && payload.shopCode) {
      const db = await loadDatabase();
      const shop = db.shops.find((s) => s.code === payload.shopCode);
      const path = req.path || '';
      const authOnly = path === '/api/auth/me' || path === '/api/auth/logout';

      if (
        shop &&
        (shop.status === 'suspended' || shop.status === 'inactive') &&
        !authOnly
      ) {
        return res.status(403).json({
          message:
            'دکان شما توسط مدیر سامانه معلق شده است. برای فعال‌سازی مجدد نسبت به پرداخت اشتراک اقدام کنید یا با پشتیبانی تماس بگیرید.',
          code: 'SHOP_SUSPENDED',
          status: shop.status,
        });
      }

      if (shop?.is_demo && shop.trial_ends_at) {
        const end = new Date(shop.trial_ends_at).getTime();
        if (!Number.isNaN(end) && Date.now() > end && !authOnly) {
          return res.status(403).json({
            message:
              'دورهٔ آزمایشی ۳ روزه به پایان رسیده است. برای ادامهٔ کار لطفاً اشتراک تهیه کنید یا با پشتیبانی تماس بگیرید.',
            code: 'TRIAL_EXPIRED',
          });
        }
      }
    }

    return next();
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(401).json({ message: 'توکن معتبر نیست یا منقضی شده' });
  }
};

const handleLogin = async (req, res) => {
  const { shopCode, shopPassword, role, rolePassword } = req.body ?? {};
  if (!shopCode || !shopPassword || !rolePassword) {
    return res.status(400).json({ message: 'ورودی‌ها ناقص است' });
  }
  if (!['admin', 'seller', 'stock_keeper', 'accountant', 'super_admin'].includes(String(role))) {
    return res.status(400).json({ message: 'نقش انتخابی نامعتبر است' });
  }

  const db = await loadDatabase();
  const normalizedCode = String(shopCode).trim().toUpperCase();
  const shop = db.shops.find((s) => s.code === normalizedCode);
  if (!shop) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'کد فروشگاه یا رمز عبور نادرست است' });
  }

  const shopOk = await bcrypt.compare(String(shopPassword), shop.passwordHash);
  if (!shopOk) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'کد فروشگاه یا رمز عبور نادرست است' });
  }

  // Block login for shops pending approval
  if (shop.status === 'pending_approval') {
    return res.status(403).json({
      message: 'حساب شما در انتظار تأیید ادمین است. پس از تأیید می‌توانید وارد شوید.',
      status: 'pending_approval',
    });
  }

  // Block rejected shops
  if (shop.status === 'rejected') {
    return res.status(403).json({
      message: 'ثبت‌نام شما رد شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
      status: 'rejected',
    });
  }

  if (shop.status === 'suspended' || shop.status === 'inactive') {
    return res.status(403).json({
      message:
        'حساب فروشگاه شما معلق است. برای فعال‌سازی مجدد لطفاً نسبت به پرداخت یا تمدید اشتراک اقدام کنید.',
      code: 'SHOP_SUSPENDED',
      status: shop.status,
    });
  }

  const normalizedRole = normalizedCode === 'SUPERADMIN' ? 'super_admin' : String(role);
  const user = shop.users.find((u) => u.role === normalizedRole && u.status === 'active');
  if (!user) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'نقش کاربر معتبر نیست' });
  }

  const roleOk = await bcrypt.compare(String(rolePassword), user.passwordHash);
  if (!roleOk) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'رمز نقش نادرست است' });
  }
  clearAuthFailures(normalizedCode, req);

  // If 2FA is enabled, issue a short-lived pending token instead of full session
  if (user.two_factor_enabled && user.totp_secret) {
    const pendingToken = jwt.sign(
      { sub: user.id, shopCode: shop.code, scope: 'totp-pending' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.json({ twoFactorRequired: true, pendingToken });
  }

  const publicUser = buildPublicUser(shop, user);
  const shopConfig = ensureShopConfig(db, shop.code);
  const sessionMs = Number(shopConfig.session_timeout_minutes || 120) * 60_000;
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      shopCode: shop.code,
      tenantId: shop.tenantId,
      fullName: user.full_name,
      isDemo: Boolean(shop.is_demo),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  setSessionCookie(res, token, sessionMs);
  await appendLoginAudit(db, {
    shop_code: shop.code,
    user_id: user.id,
    role: user.role,
    ip: getClientIp(req),
    ok: true,
    method: 'password',
  });
  return res.json({
    token,
    user: publicUser,
    shop: { code: shop.code, name: shop.name, tenant_id: shop.tenantId },
    sessionTimeoutMinutes: Number(shopConfig.session_timeout_minutes || 120),
    shop_meta: buildShopMeta(shop),
  });
};

const verifyGoogleIdToken = async (idToken) => {
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const data = await resp.json();
  if (!resp.ok || data.error_description || !data.email) {
    throw new Error('توکن گوگل نامعتبر است');
  }
  const allowedGoogleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (allowedGoogleClientId && data.aud !== allowedGoogleClientId) {
    throw new Error('توکن گوگل مربوط به این اپلیکیشن نیست');
  }
  return { email: data.email, name: data.name || data.given_name || data.email };
};

const handleGoogleAuth = async (req, res) => {
  const { email, fullName, idToken } = req.body ?? {};

  let normalizedEmail;
  let normalizedName;

  if (idToken) {
    try {
      const info = await verifyGoogleIdToken(String(idToken));
      normalizedEmail = info.email.toLowerCase();
      normalizedName = info.name;
    } catch (e) {
      return res.status(401).json({ message: e.message || 'توکن گوگل نامعتبر است' });
    }
  } else {
    if (!email || !fullName) {
      return res.status(400).json({ message: 'نام و ایمیل الزامی است' });
    }
    normalizedEmail = String(email).trim().toLowerCase();
    normalizedName = String(fullName).trim();
  }

  const db = await loadDatabase();
  if (!db.stateByShop || typeof db.stateByShop !== 'object') {
    db.stateByShop = {};
  }
  let targetShop = null;
  let targetUser = null;

  for (const shop of shopsOrderedForEmailLookup(db)) {
    const u = shop.users.find((user) => user.username === normalizedEmail || user.email === normalizedEmail);
    if (u) {
      targetShop = shop;
      targetUser = u;
      break;
    }
  }

  if (!targetShop || !targetUser) {
    const shopCode = generateCode('GGL');
    const shopPassword = generateCode('P', 10);
    const rolePassword = generateCode('R', 10);
    const tenantId = nextId(db.shops.map((shop) => ({ id: shop.tenantId })));
    const userId = nextId(db.shops.flatMap((shop) => shop.users || []));
    const shop = {
      code: shopCode,
      name: normalizedName,
      tenantId,
      passwordHash: await bcrypt.hash(String(shopPassword), 10),
      users: [
        {
          id: userId,
          username: normalizedEmail,
          email: normalizedEmail,
          full_name: normalizedName,
          role: 'admin',
          passwordHash: await bcrypt.hash(String(rolePassword), 10),
          status: 'active',
        },
      ],
    };
    db.shops.push(shop);
    db.stateByShop[shopCode] = db.stateByShop[shopCode] || {};
    await saveDatabase(db);
    targetShop = shop;
    targetUser = shop.users[0];
  } else {
    if (targetShop.status === 'pending_approval') {
      return res.status(403).json({
        message: 'حساب شما در انتظار تأیید ادمین است.',
        status: 'pending_approval',
      });
    }
    if (targetShop.status === 'rejected') {
      return res.status(403).json({ message: 'ثبت‌نام شما رد شده است.', status: 'rejected' });
    }
    if (targetShop.status === 'suspended' || targetShop.status === 'inactive') {
      return res.status(403).json({
        message:
          'حساب فروشگاه شما معلق است. برای فعال‌سازی، پرداخت یا تمدید اشتراک را انجام دهید.',
        code: 'SHOP_SUSPENDED',
        status: targetShop.status,
      });
    }
  }

  const publicUser = buildPublicUser(targetShop, targetUser);
  const shopConfig = ensureShopConfig(db, targetShop.code);
  const sessionMs = Number(shopConfig.session_timeout_minutes || 120) * 60_000;
  const token = jwt.sign(
    {
      sub: targetUser.id,
      role: targetUser.role,
      shopCode: targetShop.code,
      tenantId: targetShop.tenantId,
      fullName: targetUser.full_name,
      isDemo: Boolean(targetShop.is_demo),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  setSessionCookie(res, token, sessionMs);
  await appendLoginAudit(db, {
    shop_code: targetShop.code,
    user_id: targetUser.id,
    role: targetUser.role,
    ip: getClientIp(req),
    ok: true,
    method: 'google',
  });
  return res.json({
    token,
    user: publicUser,
    shop: { code: targetShop.code, name: targetShop.name, tenant_id: targetShop.tenantId },
    sessionTimeoutMinutes: Number(shopConfig.session_timeout_minutes || 120),
    shop_meta: buildShopMeta(targetShop),
  });
};

const handleDemoLogin = async (req, res) => {
  if (!trialQuickSignupEnabled()) {
    return res.status(403).json({
      message:
        'ثبت‌نام یا ورود آزمایشی فوری روی این سرور غیرفعال است. لطفاً از فرم ثبت‌نام رسمی یا تماس با پشتیبانی استفاده کنید.',
      code: 'TRIAL_SIGNUP_DISABLED',
    });
  }

  const { name, familyName, phone, email, idToken, password, mode } = req.body ?? {};
  const loginMode = String(mode || '').toLowerCase();

  // ── Legacy: OAuth-only demo (no password) — kept for backward compatibility ──
  if (idToken && !password && !loginMode) {
    let resolvedEmail = email;
    let resolvedName = name ? `${String(name).trim()} ${String(familyName || '').trim()}`.trim() : null;
    try {
      const info = await verifyGoogleIdToken(String(idToken));
      resolvedEmail = info.email;
      resolvedName = resolvedName || info.name;
    } catch (e) {
      return res.status(401).json({ message: e.message || 'توکن گوگل نامعتبر است' });
    }
    if (!resolvedName) {
      return res.status(400).json({ message: 'نام الزامی است' });
    }
    const identifier = (resolvedEmail || phone || '').trim().toLowerCase();
    if (!identifier) {
      return res.status(400).json({ message: 'ایمیل یا شماره تماس الزامی است' });
    }
    const fullName = resolvedName;
    const db = await loadDatabase();
    let targetShop = null;
    let targetUser = null;
    for (const shop of db.shops) {
      if (!shop.is_demo) continue;
      const u = shop.users.find(
        (user) =>
          String(user.username || '').toLowerCase() === identifier ||
          String(user.email || '').toLowerCase() === identifier ||
          String(user.phone || '').replace(/\D/g, '') === identifier.replace(/\D/g, '')
      );
      if (u) {
        targetShop = shop;
        targetUser = u;
        break;
      }
    }
    if (!targetShop) {
      const shopCode = generateCode('DM');
      const tenantId = nextId(db.shops.map((s) => ({ id: s.tenantId })));
      const userId = nextId(db.shops.flatMap((s) => s.users || []));
      const trialEnds = new Date(Date.now() + DEMO_TRIAL_MS).toISOString();
      const shop = {
        code: shopCode,
        name: fullName,
        tenantId,
        is_demo: true,
        trial_ends_at: trialEnds,
        registered_at: new Date().toISOString(),
        status: 'active',
        passwordHash: await bcrypt.hash(generateCode('DP', 12), 10),
        users: [
          {
            id: userId,
            username: identifier,
            email: identifier.includes('@') ? identifier : undefined,
            phone: !identifier.includes('@') ? identifier.replace(/\D/g, '') : undefined,
            full_name: fullName,
            role: 'admin',
            passwordHash: await bcrypt.hash(generateCode('RP', 12), 10),
            status: 'active',
            is_demo: true,
          },
        ],
      };
      db.shops.push(shop);
      db.stateByShop = db.stateByShop || {};
      db.stateByShop[shopCode] = {};
      await saveDatabase(db);
      targetShop = shop;
      targetUser = shop.users[0];
      if (resolvedEmail) {
        void sendEmail({
          to: resolvedEmail,
          subject: 'به دکان‌یار خوش آمدید! 🎉',
          html: `<div dir="rtl" style="font-family:sans-serif;padding:20px;max-width:600px">
          <h2 style="color:#4f46e5">خوش آمدید!</h2>
          <p>حساب آزمایشی شما ایجاد شد. کد فروشگاه: <b>${shopCode}</b></p>
          <p>دسترسی آزمایشی: <b>۳ روز</b></p>
        </div>`,
        });
      }
    }
    if (targetShop.status === 'suspended' || targetShop.status === 'inactive') {
      return res.status(403).json({
        message:
          'حساب آزمایشی شما معلق شده است. برای ادامه با پشتیبانی تماس بگیرید یا اشتراک تهیه کنید.',
        code: 'SHOP_SUSPENDED',
        status: targetShop.status,
      });
    }
    if (targetShop.trial_ends_at && new Date(targetShop.trial_ends_at).getTime() < Date.now()) {
      return res.status(403).json({
        message:
          'دورهٔ آزمایشی به پایان رسیده. برای فعال‌سازی با پشتیبانی تماس بگیرید یا اشتراک تهیه کنید.',
        code: 'TRIAL_EXPIRED',
      });
    }
    const publicUser = buildPublicUser(targetShop, targetUser);
    const token = jwt.sign(
      {
        sub: targetUser.id,
        role: targetUser.role,
        shopCode: targetShop.code,
        tenantId: targetShop.tenantId,
        fullName: targetUser.full_name,
        isDemo: true,
      },
      JWT_SECRET,
      { expiresIn: DEMO_TOKEN_EXPIRES_IN }
    );
    const demoMs = 7 * 24 * 60 * 60 * 1000;
    setSessionCookie(res, token, demoMs);
    const trialEndsAt = targetShop.trial_ends_at || null;
    let trialDaysRemaining = null;
    if (trialEndsAt) {
      const ms = new Date(trialEndsAt).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    }
    await appendLoginAudit(db, {
      shop_code: targetShop.code,
      user_id: targetUser.id,
      role: targetUser.role,
      ip: getClientIp(req),
      ok: true,
      method: 'trial_quick_oauth',
    });
    return res.json({
      token,
      user: { ...publicUser, is_demo: true },
      shop: { code: targetShop.code, name: targetShop.name, tenant_id: targetShop.tenantId, is_demo: true },
      sessionTimeoutMinutes: 60 * 24 * 7,
      trialEndsAt,
      trialDaysRemaining,
      shop_meta: buildShopMeta(targetShop),
    });
  }

  // ── Phone + password (register / login) — no OTP ──
  if (!['register', 'login'].includes(loginMode)) {
    return res.status(400).json({ message: 'برای ثبت‌نام یا ورود دیمو، mode را register یا login ارسال کنید.' });
  }

  const normalizedPhone = normalizeDemoPhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'شماره موبایل معتبر وارد کنید (حداقل ۹ رقم)' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
  }

  const db = await loadDatabase();

  if (loginMode === 'register') {
    const fullName =
      [name, familyName]
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .join(' ') || '';
    if (fullName.length < 2) {
      return res.status(400).json({ message: 'نام و نام خانوادگی را کامل وارد کنید' });
    }
    if (findDemoAccountByPhone(db, normalizedPhone)) {
      return res.status(409).json({ message: 'این شماره قبلاً ثبت شده؛ از «ورود به دیمو» استفاده کنید.' });
    }
    const shopCode = generateCode('DM');
    const plainShopPassword = generateCode('SP', 10);
    const tenantId = nextId(db.shops.map((s) => ({ id: s.tenantId })));
    const flatU = db.shops.flatMap((s) => s.users || []);
    let nid = nextId(flatU);
    const adminId = nid++;
    const sellerId = nid++;
    const stockId = nid++;
    const accId = nid++;
    const trialEnds = new Date(Date.now() + DEMO_TRIAL_MS).toISOString();
    const inactiveRolePwHash = await bcrypt.hash(generateCode('RP', 14), 10);
    const businessType = normalizeDemoBusinessType(req.body?.businessType);
    if (businessType !== 'supermarket') {
      return res.status(400).json({
        message:
          'ثبت‌نام آزمایشی با دیتابیس فعلاً فقط برای سوپرمارکت فعال است. برای سایر صنوف از طرح‌های پولی و تأیید ادمین استفاده کنید.',
      });
    }
    const shop = {
      code: shopCode,
      name: fullName,
      tenantId,
      is_demo: true,
      trial_ends_at: trialEnds,
      registered_at: new Date().toISOString(),
      status: 'active',
      passwordHash: await bcrypt.hash(plainShopPassword, 10),
      phone: normalizedPhone,
      business_type_code: businessType,
      business_metadata: {},
      admin_credential_record: {
        shop_password_plain: plainShopPassword,
        admin_role_password_plain: String(password),
        recorded_at: new Date().toISOString(),
      },
      users: [
        {
          id: adminId,
          username: normalizedPhone,
          phone: normalizedPhone,
          full_name: fullName,
          role: 'admin',
          passwordHash: await bcrypt.hash(String(password), 10),
          status: 'active',
          is_demo: true,
        },
        {
          id: sellerId,
          username: `${shopCode}-SELLER`,
          full_name: 'فروشنده',
          role: 'seller',
          passwordHash: inactiveRolePwHash,
          status: 'inactive',
          is_demo: true,
        },
        {
          id: stockId,
          username: `${shopCode}-STOCK`,
          full_name: 'انباردار',
          role: 'stock_keeper',
          passwordHash: inactiveRolePwHash,
          status: 'inactive',
          is_demo: true,
        },
        {
          id: accId,
          username: `${shopCode}-ACC`,
          full_name: 'حسابدار',
          role: 'accountant',
          passwordHash: inactiveRolePwHash,
          status: 'inactive',
          is_demo: true,
        },
      ],
    };
    db.shops.push(shop);
    db.stateByShop = db.stateByShop || {};
    db.stateByShop[shopCode] = initialDemoShopState(fullName, normalizedPhone, businessType);
    ensureShopState(db, shopCode);
    applyDemoBusinessSeed(db.stateByShop[shopCode], businessType, shop.tenantId);
    await saveDatabase(db);
    await appendLoginAudit(db, {
      shop_code: shop.code,
      user_id: adminId,
      role: 'admin',
      ip: getClientIp(req),
      ok: true,
      method: 'trial_register',
    });

    const regEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
      ? String(email).trim().toLowerCase()
      : '';
    if (regEmail) {
      const esc = (s) =>
        String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      void sendEmail({
        to: regEmail,
        subject: 'حساب آزمایشی دکان‌یار',
        html: `<div dir="rtl" style="font-family:sans-serif;padding:20px;max-width:600px">
          <p>سلام <b>${esc(fullName)}</b>،</p>
          <p>ثبت‌نام آزمایشی انجام شد.</p>
          <p><b>نوع کسب‌وکار انتخاب‌شده:</b> ${esc(businessType)}</p>
          <p><b>کد فروشگاه:</b> ${shopCode}</p>
          <p><b>رمز فروشگاه:</b> ${plainShopPassword}</p>
          <p><b>نام مدیر:</b> ${esc(fullName)}</p>
          <p><b>نقش در صفحهٔ ورود:</b> مدیر دکان</p>
          <p><b>رمز نقش مدیر:</b> ${esc(password)}</p>
          <p>از «ورود» کد و رمز فروشگاه را بزنید؛ نقش «مدیر دکان» را انتخاب کرده و در فیلد رمز نقش، همان «رمز نقش مدیر» بالا را وارد کنید.</p>
          <p>دسترسی آزمایشی پنل مادر + دکان: <b>۳ روز</b>. نقش‌های فروشنده/انباردار/حسابدار تا فعال‌سازی در بخش کاربران توسط مدیر، غیرفعال هستند.</p>
        </div>`,
      });
    }

    const msLeft = new Date(trialEnds).getTime() - Date.now();
    const trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    const plainAdminRolePassword = String(password);
    return res.status(201).json({
      registered: true,
      shopCode: shop.code,
      shopPassword: plainShopPassword,
      shopName: shop.name,
      adminFullName: fullName,
      adminRoleTitle: 'مدیر دکان',
      adminRolePassword: plainAdminRolePassword,
      trialEndsAt: trialEnds,
      trialDaysRemaining,
      shop_meta: buildShopMeta(shop),
      message:
        'ثبت‌نام موفق بود. کد و رمز فروشگاه، نام مدیر و رمز نقش مدیر را یادداشت کنید؛ سپس از صفحهٔ ورود وارد شوید.',
    });
  }

  const found = findDemoAccountByPhone(db, normalizedPhone);
  if (!found) {
    return res.status(401).json({ message: 'شماره موبایل یا رمز عبور نادرست است' });
  }
  const { shop: targetShop, user: targetUser } = found;
  const pwOk = await bcrypt.compare(String(password), targetUser.passwordHash);
  if (!pwOk) {
    return res.status(401).json({ message: 'شماره موبایل یا رمز عبور نادرست است' });
  }
  if (targetShop.trial_ends_at && new Date(targetShop.trial_ends_at).getTime() < Date.now()) {
    return res.status(403).json({
      message:
        'دورهٔ آزمایشی ۳ روزه به پایان رسیده. برای ادامه اشتراک تهیه کنید یا با پشتیبانی تماس بگیرید.',
      code: 'TRIAL_EXPIRED',
    });
  }
  if (targetShop.status === 'pending_approval') {
    return res.status(403).json({ message: 'حساب در انتظار تأیید است.', status: 'pending_approval' });
  }
  if (targetShop.status === 'rejected') {
    return res.status(403).json({ message: 'ثبت‌نام رد شده است.', status: 'rejected' });
  }
  if (targetShop.status === 'suspended' || targetShop.status === 'inactive') {
    return res.status(403).json({
      message:
        'حساب فروشگاه شما معلق است. برای فعال‌سازی، پرداخت یا تمدید اشتراک را انجام دهید.',
      code: 'SHOP_SUSPENDED',
      status: targetShop.status,
    });
  }

  const publicUser = buildPublicUser(targetShop, targetUser);
  const token = jwt.sign(
    {
      sub: targetUser.id,
      role: targetUser.role,
      shopCode: targetShop.code,
      tenantId: targetShop.tenantId,
      fullName: targetUser.full_name,
      isDemo: true,
    },
    JWT_SECRET,
    { expiresIn: DEMO_TOKEN_EXPIRES_IN }
  );
  const demoMs = 7 * 24 * 60 * 60 * 1000;
  setSessionCookie(res, token, demoMs);
  const trialEndsAt = targetShop.trial_ends_at || null;
  let trialDaysRemaining = null;
  if (trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }
  await appendLoginAudit(db, {
    shop_code: targetShop.code,
    user_id: targetUser.id,
    role: targetUser.role,
    ip: getClientIp(req),
    ok: true,
    method: 'trial_quick_phone',
  });
  return res.json({
    token,
    user: { ...publicUser, is_demo: true },
    shop: { code: targetShop.code, name: targetShop.name, tenant_id: targetShop.tenantId, is_demo: true },
    sessionTimeoutMinutes: 60 * 24 * 7,
    trialEndsAt,
    trialDaysRemaining,
    shop_meta: buildShopMeta(targetShop),
  });
};

app.get('/', (_req, res) => {
  res.json({ message: 'SmartHub API is running' });
});

app.post('/api/auth/login', authLockoutGuard, handleLogin);
app.post('/api/login', authLockoutGuard, handleLogin);

// ─── Step-1 login: verify shop credentials, return available roles ──────────
app.post('/api/auth/check-shop', authLockoutGuard, async (req, res) => {
  const { shopCode, shopPassword } = req.body ?? {};
  if (!shopCode || !shopPassword) {
    return res.status(400).json({ message: 'کد فروشگاه و رمز عبور الزامی است' });
  }
  const db = await loadDatabase();
  const normalizedCode = String(shopCode).trim().toUpperCase();
  const shop = db.shops.find((s) => s.code === normalizedCode);
  if (!shop) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'کد فروشگاه یا رمز عبور نادرست است' });
  }
  const shopOk = await bcrypt.compare(String(shopPassword), shop.passwordHash);
  if (!shopOk) {
    recordAuthFailure(normalizedCode, req);
    return res.status(401).json({ message: 'کد فروشگاه یا رمز عبور نادرست است' });
  }
  if (shop.status === 'pending_approval') {
    return res.status(403).json({ message: 'حساب شما در انتظار تأیید ادمین است.', status: 'pending_approval' });
  }
  if (shop.status === 'rejected') {
    return res.status(403).json({ message: 'ثبت‌نام شما رد شده است.', status: 'rejected' });
  }
  if (shop.status === 'suspended' || shop.status === 'inactive') {
    return res.status(403).json({
      message:
        'حساب فروشگاه شما معلق است. برای فعال‌سازی، پرداخت یا تمدید اشتراک را انجام دهید.',
      code: 'SHOP_SUSPENDED',
      status: shop.status,
    });
  }
  clearAuthFailures(normalizedCode, req);
  /** فقط کاربران فعال واقعی — بدون چهار کارت پیش‌فرض؛ نقش‌ها از همان «کاربران فروشگاه» */
  const rolesPayload = (shop.users || [])
    .filter((u) => u.status === 'active')
    .map((u) => ({ role: u.role, full_name: u.full_name, status: 'active' }));
  return res.json({ ok: true, shopName: shop.name, roles: rolesPayload, is_demo_shop: Boolean(shop.is_demo) });
});
app.post('/api/auth/google', handleGoogleAuth);
app.post('/api/auth/demo-login', handleDemoLogin);

// ─── OTP: Send 6-digit code to email ─────────────────────────────────────────
app.post('/api/auth/otp/send', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ message: 'آدرس ایمیل معتبر نیست' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  // Rate-limit: max 3 sends per 10 minutes per email
  const existing = otpStore.get(normalizedEmail);
  if (existing && Date.now() < existing.expiresAt - 7 * 60_000) {
    return res.status(429).json({ message: 'کد قبلاً ارسال شده. لطفاً ۳ دقیقه صبر کنید.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60_000; // 10 minutes
  otpStore.set(normalizedEmail, { code, expiresAt, attempts: 0 });

  const OTP_FROM = process.env.OTP_GMAIL_USER || process.env.GMAIL_USER || '';
  const OTP_PASS = process.env.OTP_GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '';

  if (OTP_FROM && OTP_PASS) {
    try {
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: OTP_FROM, pass: OTP_PASS },
      });
      await transport.sendMail({
        from: `"دکان‌یار" <${OTP_FROM}>`,
        to: normalizedEmail,
        subject: 'کد تأیید ثبت‌نام دکان‌یار',
        html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;">
          <h2 style="color:#818cf8;margin-top:0;">کد تأیید دکان‌یار</h2>
          <p>کد ۶ رقمی تأیید ثبت‌نام شما:</p>
          <div style="background:#1e293b;border:2px solid #4f46e5;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:40px;font-weight:900;letter-spacing:0.3em;color:#a5b4fc;">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:14px;">این کد ۱۰ دقیقه اعتبار دارد. اگر این درخواست از شما نیست، آن را نادیده بگیرید.</p>
        </div>`,
      });
    } catch (e) {
      console.error('[OTP] Email send error:', e.message);
      // In dev, still return the code in response so testing is possible
      if (!IS_PROD) {
        return res.json({ ok: true, message: 'کد ارسال شد (حالت توسعه)', devCode: code });
      }
      return res.status(500).json({ message: 'خطا در ارسال ایمیل. لطفاً دوباره تلاش کنید.' });
    }
  } else {
    // No email configured — dev mode fallback
    if (IS_PROD) {
      return res.status(500).json({ message: 'سرویس ایمیل پیکربندی نشده' });
    }
    return res.json({ ok: true, message: 'کد ارسال شد (حالت توسعه)', devCode: code });
  }

  return res.json({ ok: true, message: `کد تأیید به ${normalizedEmail} ارسال شد` });
});

// ─── OTP: Verify code ─────────────────────────────────────────────────────────
app.post('/api/auth/otp/verify', (req, res) => {
  const { email, code } = req.body ?? {};
  if (!email || !code) return res.status(400).json({ message: 'ایمیل و کد الزامی است' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) return res.status(400).json({ message: 'کدی برای این ایمیل ارسال نشده یا منقضی شده' });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ message: 'کد منقضی شده. لطفاً دوباره درخواست کنید.' });
  }

  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    otpStore.delete(normalizedEmail);
    return res.status(429).json({ message: 'تعداد تلاش‌های مجاز تمام شد. کد جدید درخواست کنید.' });
  }

  if (String(code).trim() !== entry.code) {
    return res.status(400).json({ message: `کد نادرست است. ${5 - entry.attempts} تلاش باقی مانده.` });
  }

  otpStore.delete(normalizedEmail); // single-use
  return res.json({ ok: true, message: 'ایمیل تأیید شد' });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

// ── 2FA ──────────────────────────────────────────────────────────────────────

// Verify TOTP code after initial password auth, return full session
app.post('/api/auth/2fa/verify-login', async (req, res) => {
  const { pendingToken, code } = req.body ?? {};
  if (!pendingToken || !code) {
    return res.status(400).json({ message: 'pendingToken و code الزامی است' });
  }
  let pending;
  try {
    pending = jwt.verify(pendingToken, JWT_SECRET);
    if (pending.scope !== 'totp-pending') throw new Error('نوع توکن نامعتبر');
  } catch {
    return res.status(401).json({ message: 'توکن موقت نامعتبر یا منقضی شده' });
  }

  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === pending.shopCode);
  const user = shop?.users.find((u) => u.id === pending.sub);
  if (!user || !user.two_factor_enabled || !user.totp_secret) {
    return res.status(401).json({ message: 'تنظیمات 2FA یافت نشد' });
  }

  if (shop.status === 'suspended' || shop.status === 'inactive') {
    return res.status(403).json({
      message:
        'حساب فروشگاه شما معلق است. برای فعال‌سازی، پرداخت یا تمدید اشتراک را انجام دهید.',
      code: 'SHOP_SUSPENDED',
      status: shop.status,
    });
  }

  const isValid = totpAuth.verify({ token: String(code).replace(/\s/g, ''), secret: user.totp_secret });
  if (!isValid) {
    return res.status(401).json({ message: 'کد Google Authenticator نادرست است' });
  }

  const publicUser = buildPublicUser(shop, user);
  const shopConfig = ensureShopConfig(db, shop.code);
  const sessionMs = Number(shopConfig.session_timeout_minutes || 120) * 60_000;
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      shopCode: shop.code,
      tenantId: shop.tenantId,
      fullName: user.full_name,
      isDemo: Boolean(shop.is_demo),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  setSessionCookie(res, token, sessionMs);
  await appendLoginAudit(db, {
    shop_code: shop.code,
    user_id: user.id,
    role: user.role,
    ip: getClientIp(req),
    ok: true,
    method: '2fa',
  });
  return res.json({
    token,
    user: publicUser,
    shop: { code: shop.code, name: shop.name, tenant_id: shop.tenantId },
    sessionTimeoutMinutes: Number(shopConfig.session_timeout_minutes || 120),
    shop_meta: buildShopMeta(shop),
  });
});

// Generate TOTP secret + QR code for setup
app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  const uid2fa = Number(req.auth.sub);
  const user = shop?.users.find((u) => Number(u.id) === uid2fa);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });

  const secret = totpAuth.generateSecret();
  const label = user.username || user.full_name || 'user';
  const otpauth = totpAuth.keyuri(label, 'Dokanyar', secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  user.totp_pending_secret = secret;
  await saveDatabase(db);

  return res.json({ secret, qrCode, otpauth });
});

// Enable 2FA after verifying setup code
app.post('/api/auth/2fa/enable', authMiddleware, async (req, res) => {
  const { code } = req.body ?? {};
  if (!code) return res.status(400).json({ message: 'کد TOTP الزامی است' });

  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  const uidEn = Number(req.auth.sub);
  const user = shop?.users.find((u) => Number(u.id) === uidEn);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });
  if (!user.totp_pending_secret) {
    return res.status(400).json({ message: 'ابتدا 2FA را راه‌اندازی کنید' });
  }

  const isValid = totpAuth.verify({ token: String(code).replace(/\s/g, ''), secret: user.totp_pending_secret });
  if (!isValid) return res.status(400).json({ message: 'کد TOTP نادرست است' });

  user.totp_secret = user.totp_pending_secret;
  user.two_factor_enabled = true;
  delete user.totp_pending_secret;
  await saveDatabase(db);

  return res.json({ ok: true, message: '2FA با موفقیت فعال شد' });
});

// Disable 2FA after verifying current code
app.post('/api/auth/2fa/disable', authMiddleware, async (req, res) => {
  const { code } = req.body ?? {};
  if (!code) return res.status(400).json({ message: 'کد TOTP الزامی است' });

  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  const uidDis = Number(req.auth.sub);
  const user = shop?.users.find((u) => Number(u.id) === uidDis);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });
  if (!user.two_factor_enabled || !user.totp_secret) {
    return res.status(400).json({ message: '2FA فعال نیست' });
  }

  const isValid = totpAuth.verify({ token: String(code).replace(/\s/g, ''), secret: user.totp_secret });
  if (!isValid) return res.status(400).json({ message: 'کد TOTP نادرست است' });

  user.two_factor_enabled = false;
  delete user.totp_secret;
  delete user.totp_pending_secret;
  await saveDatabase(db);

  return res.json({ ok: true, message: '2FA غیرفعال شد' });
});

// ── Tenant / Shop Management (super_admin only) ──────────────────────────────

const shopToTenant = (shop, db) => {
  const shopState = db.stateByShop?.[shop.code] || {};
  const adminUser = Array.isArray(shop.users) ? shop.users.find((u) => u.role === 'admin') : null;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const trialEndsAt = shop.trial_ends_at || null;
  let trialDaysRemaining = null;
  if (trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }
  const books = Array.isArray(shopState.books) ? shopState.books : [];
  const products = Array.isArray(shopState.products) ? shopState.products : [];
  const productsCount = products.length + books.length;
  const invoices = Array.isArray(shopState.invoices) ? shopState.invoices : [];
  const salesToday = invoices
    .filter((i) => String(i.invoice_date || '').slice(0, 10) === today && String(i.status || '') === 'completed')
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const rec = shop.admin_credential_record && typeof shop.admin_credential_record === 'object' ? shop.admin_credential_record : null;
  return {
    id: shop.tenantId || shop.code,
    shop_name: shop.name,
    shop_code: shop.code,
    shop_domain: shop.domain || `${shop.code.toLowerCase()}.dokanyar.com`,
    shop_phone: shop.phone || adminUser?.phone || '',
    shop_address: shop.address || '',
    owner_name: adminUser?.full_name || shop.name,
    owner_phone: adminUser?.phone || '',
    owner_email: adminUser?.email || adminUser?.username || '',
    subscription_plan: shop.subscription_plan || 'basic',
    subscription_start: shop.subscription_start || now.slice(0, 10),
    subscription_end: shop.subscription_end || new Date(Date.now() + 30 * 24 * 3600_000).toISOString().slice(0, 10),
    subscription_status: shop.subscription_status || 'active',
    max_users: shop.max_users || 5,
    max_products: shop.max_products || 500,
    status: shop.status || 'active',
    is_demo: Boolean(shop.is_demo),
    trial_ends_at: trialEndsAt,
    trial_days_remaining: trialDaysRemaining,
    registered_at: shop.registered_at || shop.created_at || '',
    created_at: shop.created_at || now,
    last_login: shop.last_login || now,
    users_count: Array.isArray(shop.users) ? shop.users.length : 0,
    products_count: productsCount,
    sales_today: salesToday,
    /** فقط برای پنل ابرادمین — رمز ذخیره‌شده هنگام ایجاد/تأیید/بازنشانی */
    credential_record: shop.code === 'SUPERADMIN' ? null : rec,
  };
};

app.get('/api/master/tenants', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  const tenants = db.shops.map((shop) => shopToTenant(shop, db));
  return res.json({ tenants });
});

app.post('/api/master/tenants', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const { shop_name, shop_code, owner_name, owner_email, owner_phone, shop_password, subscription_plan } = req.body ?? {};
  if (!shop_name || !shop_code || !owner_name) {
    return res.status(400).json({ message: 'نام دکان، کد دکان و نام مالک الزامی است' });
  }
  if (!/^[A-Za-z0-9_-]{4,20}$/.test(String(shop_code))) {
    return res.status(400).json({ message: 'کد دکان باید ۴ تا ۲۰ کاراکتر الفبایی باشد' });
  }

  const db = await loadDatabase();
  const normalized = String(shop_code).trim().toUpperCase();
  if (db.shops.some((s) => s.code === normalized)) {
    return res.status(409).json({ message: 'کد دکان قبلاً ثبت شده' });
  }

  const tenantId = nextId(db.shops.map((s) => ({ id: s.tenantId })));
  const userId = nextId(db.shops.flatMap((s) => s.users || []));
  const pass = String(shop_password || generateCode('P', 12));
  const rolePass = generateCode('R', 12);

  const shop = {
    code: normalized,
    name: String(shop_name).trim(),
    tenantId,
    phone: owner_phone || '',
    passwordHash: await bcrypt.hash(pass, 10),
    subscription_plan: subscription_plan || 'basic',
    subscription_status: 'active',
    subscription_start: new Date().toISOString().slice(0, 10),
    subscription_end: new Date(Date.now() + 30 * 24 * 3600_000).toISOString().slice(0, 10),
    status: 'active',
    created_at: new Date().toISOString(),
    users: [
      {
        id: userId,
        username: owner_email || `admin_${normalized.toLowerCase()}`,
        email: owner_email || '',
        phone: owner_phone || '',
        full_name: String(owner_name).trim(),
        role: 'admin',
        passwordHash: await bcrypt.hash(rolePass, 10),
        status: 'active',
      },
    ],
  };

  shop.admin_credential_record = {
    shop_password_plain: pass,
    admin_role_password_plain: rolePass,
    recorded_at: new Date().toISOString(),
  };

  db.shops.push(shop);
  db.stateByShop = db.stateByShop || {};
  const bt0 = normalizeTenantBusinessType('supermarket');
  db.stateByShop[normalized] = initialDemoShopState(String(shop_name).trim(), owner_phone || '', bt0);
  ensureShopState(db, normalized);
  applyDemoBusinessSeed(db.stateByShop[normalized], bt0, tenantId);
  await saveDatabase(db);

  return res.status(201).json({
    ok: true,
    tenant: shopToTenant(shop, db),
    credentials: { shopCode: normalized, shopPassword: pass, adminRolePassword: rolePass },
  });
});

app.put('/api/master/tenants/:code', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const code = String(req.params.code).toUpperCase();
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === code);
  if (!shop) return res.status(404).json({ message: 'دکان یافت نشد' });

  const { shop_name, owner_name, owner_email, owner_phone, subscription_plan, subscription_status, status, max_users, max_products, trial_ends_at } = req.body ?? {};

  if (shop_name) shop.name = String(shop_name).trim();
  if (subscription_plan) shop.subscription_plan = subscription_plan;
  if (subscription_status) shop.subscription_status = subscription_status;
  if (status) shop.status = status;
  if (max_users) shop.max_users = Number(max_users);
  if (max_products) shop.max_products = Number(max_products);
  if (owner_phone) shop.phone = owner_phone;
  if (trial_ends_at !== undefined && trial_ends_at !== null) {
    const te = String(trial_ends_at).trim();
    shop.trial_ends_at = te || null;
  }

  const adminUser = shop.users.find((u) => u.role === 'admin');
  if (adminUser) {
    if (owner_name) adminUser.full_name = String(owner_name).trim();
    if (owner_email) { adminUser.email = owner_email; adminUser.username = owner_email; }
    if (owner_phone) adminUser.phone = owner_phone;
  }

  const arp = req.body?.admin_role_password;
  if (arp !== undefined && arp !== null && String(arp).trim()) {
    if (req.auth.role !== 'super_admin') {
      return res.status(403).json({ message: 'فقط ابرادمین می‌تواند رمز نقش مدیر را بازنشانی کند' });
    }
    const raw = String(arp).trim();
    if (raw.length < 4) {
      return res.status(400).json({ message: 'رمز نقش مدیر باید حداقل ۴ کاراکتر باشد' });
    }
    const adminForPwd = shop.users.find((u) => u.role === 'admin');
    if (!adminForPwd) {
      return res.status(404).json({ message: 'کاربر مدیر این دکان یافت نشد' });
    }
    adminForPwd.passwordHash = await bcrypt.hash(raw, 10);
    shop.admin_credential_record = {
      ...(shop.admin_credential_record && typeof shop.admin_credential_record === 'object' ? shop.admin_credential_record : {}),
      admin_role_password_plain: raw,
      recorded_at: new Date().toISOString(),
    };
  }

  await saveDatabase(db);
  return res.json({ ok: true, tenant: shopToTenant(shop, db) });
});

app.delete('/api/master/tenants/:code', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'فقط ابرادمین می‌تواند دکان را حذف کند' });
  }
  if (req.auth.isDemo) {
    return res.status(403).json({ message: 'در حساب آزمایشی حذف دکان مجاز نیست' });
  }
  const code = String(req.params.code).toUpperCase();
  if (code === 'SUPERADMIN') {
    return res.status(400).json({ message: 'حذف حساب ابرادمین مجاز نیست' });
  }
  const db = await loadDatabase();
  const idx = db.shops.findIndex((s) => s.code === code);
  if (idx === -1) return res.status(404).json({ message: 'دکان یافت نشد' });

  db.shops.splice(idx, 1);
  delete db.stateByShop?.[code];
  await saveDatabase(db);
  return res.json({ ok: true });
});

// Toggle tenant status (suspend / activate)
app.put('/api/master/tenants/:code/status', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const code = String(req.params.code).toUpperCase();
  const { status } = req.body ?? {};
  if (!['active', 'suspended', 'inactive'].includes(String(status))) {
    return res.status(400).json({ message: 'وضعیت نامعتبر است' });
  }
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === code);
  if (!shop) return res.status(404).json({ message: 'دکان یافت نشد' });

  shop.status = status;
  await saveDatabase(db);
  return res.json({ ok: true, tenant: shopToTenant(shop, db) });
});

// Subscription payments for tenants
app.get('/api/master/subscription-payments', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  if (!Array.isArray(db.subscriptionPayments)) db.subscriptionPayments = [];
  const shopCode = req.query.shopCode ? String(req.query.shopCode).toUpperCase() : null;
  const payments = shopCode
    ? db.subscriptionPayments.filter((p) => p.shop_code === shopCode)
    : db.subscriptionPayments;
  return res.json({ payments });
});

app.post('/api/master/subscription-payments', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const { shop_code, amount, plan, method, note } = req.body ?? {};
  if (!shop_code || !amount || !plan) {
    return res.status(400).json({ message: 'shop_code، amount و plan الزامی است' });
  }
  const code = String(shop_code).toUpperCase();
  const db = await loadDatabase();
  if (!db.shops.some((s) => s.code === code)) {
    return res.status(404).json({ message: 'دکان یافت نشد' });
  }
  if (!Array.isArray(db.subscriptionPayments)) db.subscriptionPayments = [];

  const payment = {
    id: nextId(db.subscriptionPayments),
    shop_code: code,
    amount: Number(amount),
    plan: String(plan),
    method: method || 'manual',
    note: String(note || ''),
    status: 'confirmed',
    created_by: req.auth.sub,
    created_at: new Date().toISOString(),
  };
  db.subscriptionPayments.unshift(payment);
  await saveDatabase(db);
  return res.status(201).json({ ok: true, payment });
});

app.post('/api/payments/register', async (req, res) => {
  const { ownerName, email, plan, payMethod, paymentMeta, shopCode } = req.body ?? {};
  if (!ownerName || !plan || !payMethod) {
    return res.status(400).json({ message: 'اطلاعات پرداخت ناقص است' });
  }
  if (!PLAN_PRICES_AFN[plan]) {
    return res.status(400).json({ message: 'پلن انتخابی نامعتبر است' });
  }

  const db = await loadDatabase();
  ensurePaymentStructures(db);
  const normalizedShopCode = shopCode ? normalizeShopCode(shopCode) : null;
  if (normalizedShopCode && !db.shops.some((s) => s.code === normalizedShopCode)) {
    return res.status(400).json({ message: 'shopCode نامعتبر است' });
  }

  const id = nextId(db.paymentRequests);
  const createdAt = new Date().toISOString();
  const payment = {
    id,
    owner_name: String(ownerName).trim(),
    email: String(email || '').trim().toLowerCase(),
    plan,
    amount_afn: PLAN_PRICES_AFN[plan],
    currency: 'AFN',
    pay_method: String(payMethod),
    pay_status: payMethod === 'hesabpay' ? 'gateway_pending' : 'manual_pending',
    payment_meta: paymentMeta && typeof paymentMeta === 'object' ? paymentMeta : {},
    shop_code: normalizedShopCode,
    tenant_id: normalizedShopCode ? (db.shops.find((s) => s.code === normalizedShopCode)?.tenantId ?? null) : null,
    gateway_transaction_id: null,
    gateway_checkout_url: null,
    admin_note: '',
    created_at: createdAt,
    updated_at: createdAt,
    verified_at: null,
    verified_by: null,
  };

  if (payMethod === 'hesabpay') {
    const txId = `HP-${Date.now()}-${id}`;
    payment.gateway_transaction_id = txId;
    payment.gateway_checkout_url = `https://sandbox.hesabpay.example/checkout/${txId}`;
  }

  db.paymentRequests.unshift(payment);
  appendPaymentEvent(db, payment.id, 'created', { payMethod: payment.pay_method, amount: payment.amount_afn });
  await saveDatabase(db);

  return res.status(201).json({
    ok: true,
    payment: {
      id: payment.id,
      plan: payment.plan,
      amount_afn: payment.amount_afn,
      pay_method: payment.pay_method,
      pay_status: payment.pay_status,
      gateway_transaction_id: payment.gateway_transaction_id,
      gateway_checkout_url: payment.gateway_checkout_url,
    },
  });
});

app.post('/api/payments/hesabpay/init', async (req, res) => {
  const { paymentId } = req.body ?? {};
  if (!paymentId) {
    return res.status(400).json({ message: 'شناسه پرداخت لازم است' });
  }
  const db = await loadDatabase();
  ensurePaymentStructures(db);
  const payment = db.paymentRequests.find((p) => Number(p.id) === Number(paymentId));
  if (!payment) return res.status(404).json({ message: 'درخواست پرداخت یافت نشد' });
  if (payment.pay_method !== 'hesabpay') {
    return res.status(400).json({ message: 'این پرداخت از نوع HesabPay نیست' });
  }
  if (!payment.gateway_transaction_id) {
    payment.gateway_transaction_id = `HP-${Date.now()}-${payment.id}`;
    payment.gateway_checkout_url = `https://sandbox.hesabpay.example/checkout/${payment.gateway_transaction_id}`;
  }
  payment.updated_at = new Date().toISOString();
  appendPaymentEvent(db, payment.id, 'hesabpay_init', { tx: payment.gateway_transaction_id });
  await saveDatabase(db);
  return res.json({
    ok: true,
    sandbox: true,
    transactionId: payment.gateway_transaction_id,
    checkoutUrl: payment.gateway_checkout_url,
  });
});

app.post('/api/payments/hesabpay/webhook', async (req, res) => {
  const webhookSecret = process.env.HESABPAY_WEBHOOK_SECRET || '';
  const providedSecret = req.headers['x-hesabpay-webhook-secret'];
  if (webhookSecret && providedSecret !== webhookSecret) {
    return res.status(401).json({ message: 'Webhook secret معتبر نیست' });
  }

  const { paymentId, gatewayTransactionId, status } = req.body ?? {};
  const db = await loadDatabase();
  ensurePaymentStructures(db);

  const payment = db.paymentRequests.find((p) =>
    (paymentId && Number(p.id) === Number(paymentId)) ||
    (gatewayTransactionId && p.gateway_transaction_id === gatewayTransactionId)
  );
  if (!payment) return res.status(404).json({ message: 'پرداخت هدف یافت نشد' });

  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'success') {
    payment.pay_status = 'paid_pending_admin';
  } else if (normalized === 'failed') {
    payment.pay_status = 'failed';
  } else if (normalized === 'cancelled' || normalized === 'canceled') {
    payment.pay_status = 'cancelled';
  } else {
    payment.pay_status = 'gateway_pending';
  }
  payment.updated_at = new Date().toISOString();
  appendPaymentEvent(db, payment.id, 'hesabpay_webhook', { status: normalized || 'unknown' });
  await saveDatabase(db);
  return res.json({ ok: true, paymentId: payment.id, status: payment.pay_status });
});

app.post('/api/register', async (req, res) => {
  const { shopCode, shopName, shopPassword, ownerName, ownerUsername, rolePassword } = req.body ?? {};
  if (!shopCode || !shopName || !shopPassword || !ownerName) {
    return res.status(400).json({ message: 'اطلاعات ثبت‌نام ناقص است' });
  }
  if (!/^[A-Za-z0-9_-]{4,20}$/.test(String(shopCode))) {
    return res.status(400).json({ message: 'کد فروشگاه باید ۴ تا ۲۰ کاراکتر و فقط شامل حروف/اعداد باشد' });
  }
  if (String(shopPassword).length < 8) {
    return res.status(400).json({ message: 'رمز فروشگاه باید حداقل ۸ کاراکتر باشد' });
  }
  if (String(rolePassword || '1234').length < 4) {
    return res.status(400).json({ message: 'رمز نقش باید حداقل ۴ کاراکتر باشد' });
  }

  const db = await loadDatabase();
  const normalizedCode = String(shopCode).trim().toUpperCase();
  const exists = db.shops.some((shop) => shop.code === normalizedCode);
  if (exists) {
    return res.status(409).json({ message: 'کد فروشگاه قبلاً ثبت شده است' });
  }

  const tenantId = nextId(db.shops.map((shop) => ({ id: shop.tenantId })));
  const adminRolePassword = String(rolePassword || '1234');
  const ownerEmail = String(req.body.email || '').trim();
  const shop = {
    code: normalizedCode,
    name: String(shopName),
    tenantId,
    status: 'pending_approval',
    owner_email: ownerEmail || undefined,
    registered_at: new Date().toISOString(),
    passwordHash: await bcrypt.hash(String(shopPassword), 10),
    users: [
      {
        id: nextId(db.shops.flatMap((s) => s.users || [])),
        username: String(ownerUsername || 'admin'),
        full_name: String(ownerName),
        role: 'admin',
        passwordHash: await bcrypt.hash(adminRolePassword, 10),
        status: 'active',
      },
    ],
  };

  db.shops.push(shop);
  db.stateByShop[normalizedCode] = db.stateByShop[normalizedCode] || {};
  await saveDatabase(db);

  // Notify admin of new registration
  if (GMAIL_USER) {
    void sendEmail({
      to: GMAIL_USER,
      subject: `[دکان‌یار] ثبت‌نام جدید: ${shop.name} (${normalizedCode})`,
      html: `<div dir="rtl" style="font-family:sans-serif;padding:20px">
        <h2>ثبت‌نام جدید دریافت شد</h2>
        <p><b>نام فروشگاه:</b> ${shop.name}</p>
        <p><b>کد فروشگاه:</b> ${normalizedCode}</p>
        <p><b>نام مالک:</b> ${ownerName}</p>
        ${ownerEmail ? `<p><b>ایمیل:</b> ${ownerEmail}</p>` : ''}
        <p><b>تاریخ:</b> ${new Date().toLocaleString('fa-IR')}</p>
        <p style="color:#f59e0b">وضعیت: در انتظار تأیید</p>
        <p>برای تأیید یا رد، وارد پنل ادمین شوید.</p>
      </div>`,
    });
  }

  // Notify the shop owner if email provided
  if (ownerEmail) {
    void sendEmail({
      to: ownerEmail,
      subject: 'ثبت‌نام شما در دکان‌یار دریافت شد',
      html: `<div dir="rtl" style="font-family:sans-serif;padding:20px">
        <h2>ثبت‌نام شما دریافت شد ✓</h2>
        <p>سلام ${ownerName} عزیز،</p>
        <p>درخواست ثبت فروشگاه <b>${shop.name}</b> با کد <b>${normalizedCode}</b> دریافت شد.</p>
        <p>درخواست شما در دست بررسی است و پس از تأیید توسط تیم دکان‌یار، اطلاع‌رسانی خواهید شد.</p>
        <p>با تشکر — تیم دکان‌یار</p>
      </div>`,
    });
  }

  return res.status(201).json({
    ok: true,
    pending: true,
    shop: { code: shop.code, name: shop.name, tenant_id: shop.tenantId },
    message: 'فروشگاه ثبت شد و در انتظار تأیید ادمین است. پس از تأیید می‌توانید وارد شوید.',
  });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) {
    return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  }
  const uid = Number(req.auth.sub);
  const user = shop.users.find((u) => Number(u.id) === uid);
  if (!user) {
    return res.status(404).json({ message: 'کاربر یافت نشد' });
  }
  const shopConfig = ensureShopConfig(db, shop.code);
  return res.json({
    user: buildPublicUser(shop, user),
    shop: { code: shop.code, name: shop.name, tenant_id: shop.tenantId },
    shop_meta: buildShopMeta(shop),
    sessionTimeoutMinutes: Number(shopConfig.session_timeout_minutes || 120),
  });
});

app.patch('/api/auth/me', authMiddleware, async (req, res) => {
  if (req.auth.role === 'super_admin') {
    return res.status(400).json({ message: 'پروفایل ابرادمین از این مسیر ویرایش نمی‌شود' });
  }
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  const uidPatch = Number(req.auth.sub);
  const user = shop?.users?.find((u) => Number(u.id) === uidPatch);
  if (!shop || !user) {
    return res.status(404).json({ message: 'کاربر یافت نشد' });
  }
  const { full_name, preferred_language, preferred_currency } = req.body ?? {};
  if (full_name !== undefined) user.full_name = String(full_name).trim() || user.full_name;
  if (preferred_language !== undefined) user.preferred_language = String(preferred_language).trim();
  if (preferred_currency !== undefined) user.preferred_currency = String(preferred_currency).trim();
  await saveDatabase(db);
  return res.json({ user: buildPublicUser(shop, user) });
});

// ─── Shop users (admin manages auth users for this shop) ───────────────────
app.get('/api/shop/users', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'فقط مدیر فروشگاه به لیست کاربران دسترسی دارد' });
  }
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const users = (shop.users || [])
    .filter((u) => u.role !== 'super_admin')
    .map(sanitizeShopUser);
  return res.json({ users });
});

app.put('/api/shop/users/:id', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'فقط مدیر فروشگاه' });
  }
  const userId = Number(req.params.id);
  const { full_name, username, status } = req.body ?? {};
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const user = shop.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });

  if (username !== undefined) {
    const nu = String(username).trim();
    if (nu.length < 2) return res.status(400).json({ message: 'نام کاربری کوتاه است' });
    const clash = shop.users.some(
      (u) => u.id !== userId && String(u.username).toLowerCase() === nu.toLowerCase()
    );
    if (clash) return res.status(400).json({ message: 'نام کاربری تکراری است' });
    user.username = nu;
  }
  if (full_name !== undefined) user.full_name = String(full_name).trim() || user.full_name;
  if (status !== undefined) {
    const st = String(status);
    if (!['active', 'inactive', 'pending'].includes(st)) {
      return res.status(400).json({ message: 'وضعیت نامعتبر است' });
    }
    user.status = st;
    if (st === 'active' && ['admin', 'seller', 'stock_keeper', 'accountant'].includes(user.role)) {
      shop.users.forEach((u) => {
        if (u.id !== user.id && u.role === user.role && u.status === 'active') {
          u.status = 'inactive';
        }
      });
    }
  }
  appendSettingsLog(db, shop.code, req.auth, 'update_shop_user', `user ${userId}`);
  await saveDatabase(db);
  return res.json({ ok: true, user: sanitizeShopUser(user) });
});

app.post('/api/shop/users/:id/set-password', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'فقط مدیر فروشگاه' });
  }
  const userId = Number(req.params.id);
  const password = req.body?.password;
  if (!password || String(password).length < 4) {
    return res.status(400).json({ message: 'رمز باید حداقل ۴ کاراکتر باشد' });
  }
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const user = shop.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });

  user.passwordHash = await bcrypt.hash(String(password), 10);
  user.status = 'active';
  if (['admin', 'seller', 'stock_keeper', 'accountant'].includes(user.role)) {
    shop.users.forEach((u) => {
      if (u.id !== user.id && u.role === user.role && u.status === 'active') {
        u.status = 'inactive';
      }
    });
  }
  appendSettingsLog(db, shop.code, req.auth, 'set_shop_user_password', `user ${userId}`);
  await saveDatabase(db);
  return res.json({ ok: true, user: sanitizeShopUser(user) });
});

app.get('/api/master/shops/:code/users', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const code = String(req.params.code || '').trim().toUpperCase();
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === code);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const users = (shop.users || []).map(sanitizeShopUser);
  return res.json({ users });
});

// ─── Master business types catalog ──────────────────────────────────────────
app.get('/api/master/business-types', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  if (!Array.isArray(db.businessTypes)) db.businessTypes = [];
  return res.json({ businessTypes: db.businessTypes });
});

app.put('/api/master/business-types', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const list = req.body?.businessTypes;
  if (!Array.isArray(list)) {
    return res.status(400).json({ message: 'businessTypes باید آرایه باشد' });
  }
  const db = await loadDatabase();
  db.businessTypes = list.map((row, i) => ({
    id: Number(row.id) || i + 1,
    name: String(row.name || ''),
    code: String(row.code || `type_${i}`),
    icon: row.icon != null ? String(row.icon) : '🏪',
    is_active: Boolean(row.is_active),
    features: Array.isArray(row.features) ? row.features : [],
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {},
  }));
  await saveDatabase(db);
  return res.json({ ok: true, businessTypes: db.businessTypes });
});

// ─── Support tickets ────────────────────────────────────────────────────────
const ensureSupportTickets = (db) => {
  if (!Array.isArray(db.supportTickets)) db.supportTickets = [];
};

app.post('/api/support/message', authMiddleware, async (req, res) => {
  if (req.auth.role === 'super_admin') {
    return res.status(400).json({ message: 'ابرادمین از مسیر master استفاده کند' });
  }
  const { subject, message, priority } = req.body ?? {};
  if (!subject || !message) {
    return res.status(400).json({ message: 'موضوع و متن الزامی است' });
  }
  const db = await loadDatabase();
  ensureSupportTickets(db);
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const uidSup = Number(req.auth.sub);
  const user = shop.users.find((u) => Number(u.id) === uidSup);
  const tid = nextId(db.supportTickets);
  const ticket = {
    id: tid,
    shop_code: shop.code,
    shop_name: shop.name,
    sender_name: user?.full_name || req.auth.fullName || '',
    sender_id: req.auth.sub,
    subject: String(subject).slice(0, 200),
    message: String(message).slice(0, 8000),
    priority: ['urgent', 'important', 'normal'].includes(String(priority)) ? priority : 'normal',
    status: 'pending',
    created_at: new Date().toISOString(),
    reply: '',
  };
  db.supportTickets.unshift(ticket);
  await saveDatabase(db);
  return res.json({ ok: true, ticket });
});

app.get('/api/support/tickets', authMiddleware, async (req, res) => {
  if (req.auth.role === 'super_admin') {
    return res.status(400).json({ message: 'از مسیر master استفاده کنید' });
  }
  const db = await loadDatabase();
  ensureSupportTickets(db);
  const tickets = db.supportTickets.filter((t) => t.shop_code === req.auth.shopCode);
  return res.json({ tickets });
});

app.get('/api/master/support', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  ensureSupportTickets(db);
  return res.json({ tickets: db.supportTickets });
});

app.put('/api/master/support/:id', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const tid = Number(req.params.id);
  const { reply, status } = req.body ?? {};
  const db = await loadDatabase();
  ensureSupportTickets(db);
  const ticket = db.supportTickets.find((t) => Number(t.id) === tid);
  if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });
  if (reply !== undefined) ticket.reply = String(reply).slice(0, 8000);
  if (status !== undefined && ['pending', 'read', 'replied'].includes(String(status))) {
    ticket.status = status;
  } else if (reply) {
    ticket.status = 'replied';
  }
  ticket.updated_at = new Date().toISOString();
  await saveDatabase(db);
  return res.json({ ok: true, ticket });
});

app.get('/api/master/shops', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  const shops = db.shops.map((shop) => ({
    code: shop.code,
    name: shop.name,
    tenant_id: shop.tenantId,
    users_count: Array.isArray(shop.users) ? shop.users.length : 0,
  }));
  return res.json({ shops });
});

// ─── Pending Registrations ──────────────────────────────────────────────────
app.get('/api/master/pending-registrations', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  const pending = db.shops
    .filter((s) => s.status === 'pending_approval')
    .map((s) => ({
      code: s.code,
      name: s.name,
      owner_name: s.users?.[0]?.full_name || '',
      owner_email: s.owner_email || '',
      registered_at: s.registered_at || '',
      status: s.status,
    }));
  return res.json({ registrations: pending });
});

app.post('/api/master/registrations/:code/approve', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const code = String(req.params.code).toUpperCase();
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === code);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  shop.status = 'active';
  const admin0 = shop.users?.[0];
  const phone = String(admin0?.phone || '').trim();
  const ownerLabel = String(admin0?.full_name || shop.name || '').trim() || shop.name;
  db.stateByShop = db.stateByShop || {};
  const st = db.stateByShop[code];
  if (!st || !st.shopSettings || !st.shopSettings.business_type) {
    const bt = normalizeTenantBusinessType(shop.business_type_code);
    db.stateByShop[code] = initialDemoShopState(ownerLabel, phone, bt);
    ensureShopState(db, code);
    applyDemoBusinessSeed(db.stateByShop[code], bt, shop.tenantId);
    if (shop.business_metadata == null || typeof shop.business_metadata !== 'object') {
      shop.business_metadata = {};
    }
    if (!shop.business_type_code) shop.business_type_code = bt;
  }
  await saveDatabase(db);

  if (shop.owner_email) {
    void sendEmail({
      to: shop.owner_email,
      subject: 'حساب شما در دکان‌یار تأیید شد ✓',
      html: `<div dir="rtl" style="font-family:sans-serif;padding:20px">
        <h2>تبریک! حساب شما تأیید شد ✓</h2>
        <p>سلام ${shop.users?.[0]?.full_name || ''} عزیز،</p>
        <p>فروشگاه <b>${shop.name}</b> با کد <b>${code}</b> توسط تیم دکان‌یار تأیید شد.</p>
        <p>اکنون می‌توانید با کد فروشگاه و رمز خود وارد سیستم شوید.</p>
        <p>با تشکر — تیم دکان‌یار</p>
      </div>`,
    });
  }

  return res.json({ ok: true, message: 'فروشگاه تأیید شد' });
});

app.post('/api/master/registrations/:code/reject', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const code = String(req.params.code).toUpperCase();
  const { reason } = req.body ?? {};
  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === code);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  shop.status = 'rejected';
  shop.rejection_reason = String(reason || '');
  await saveDatabase(db);

  if (shop.owner_email) {
    void sendEmail({
      to: shop.owner_email,
      subject: 'وضعیت ثبت‌نام دکان‌یار',
      html: `<div dir="rtl" style="font-family:sans-serif;padding:20px">
        <p>سلام ${shop.users?.[0]?.full_name || ''} عزیز،</p>
        <p>متأسفانه درخواست ثبت فروشگاه <b>${shop.name}</b> رد شد.</p>
        ${reason ? `<p><b>دلیل:</b> ${reason}</p>` : ''}
        <p>برای اطلاعات بیشتر با پشتیبانی تماس بگیرید: 0795074175</p>
      </div>`,
    });
  }

  return res.json({ ok: true, message: 'درخواست رد شد' });
});

// ─── Broadcast Notifications (super_admin) ──────────────────────────────────
app.get('/api/master/broadcasts', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const db = await loadDatabase();
  return res.json({ broadcasts: db.broadcasts || [] });
});

app.post('/api/master/broadcasts', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const { title, message, target_type, target_shops } = req.body ?? {};
  if (!title || !message) return res.status(400).json({ message: 'عنوان و پیام الزامی است' });

  const db = await loadDatabase();
  if (!db.broadcasts) db.broadcasts = [];

  const broadcast = {
    id: (db.broadcasts.length > 0 ? Math.max(...db.broadcasts.map(b => b.id)) + 1 : 1),
    title: String(title),
    message: String(message),
    target_type: target_type || 'all',
    target_shops: target_shops || [],
    created_at: new Date().toISOString(),
    created_by: 'مدیر پلتفرم',
  };
  db.broadcasts.unshift(broadcast);

  // Inject notification into each target shop's notification list
  const targetShops = target_type === 'all'
    ? db.shops.filter(s => s.code !== 'SUPERADMIN')
    : db.shops.filter(s => (target_shops || []).includes(s.code));

  for (const shop of targetShops) {
    const state = db.stateByShop[shop.code] || {};
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
      id: Date.now() + Math.random(),
      title: broadcast.title,
      message: broadcast.message,
      type: 'system',
      is_read: false,
      created_at: broadcast.created_at,
    });
    db.stateByShop[shop.code] = state;
  }

  await saveDatabase(db);
  return res.json({ ok: true, broadcast, delivered: targetShops.length });
});

app.delete('/api/master/broadcasts/:id', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const id = Number(req.params.id);
  const db = await loadDatabase();
  if (!db.broadcasts) db.broadcasts = [];
  db.broadcasts = db.broadcasts.filter(b => b.id !== id);
  await saveDatabase(db);
  return res.json({ ok: true });
});

// ─── Reset all shop data (keep only SUPERADMIN) ─────────────────────────────
app.post('/api/master/reset-all-data', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'دسترسی محدود به ابرادمین' });
  }
  if (req.auth.isDemo) {
    return res.status(403).json({ message: 'بازنشانی کل داده در حساب آزمایشی مجاز نیست' });
  }
  const db = await loadDatabase();
  const superShop = db.shops.find((s) => s.code === 'SUPERADMIN');
  db.shops = superShop ? [superShop] : [];
  db.stateByShop = {};
  db.shopConfigs = {};
  db.settingsLogs = [];
  await saveDatabase(db);
  return res.json({ ok: true, message: 'همه داده‌های دکان‌ها پاک شد' });
});

app.post('/api/master/platform-backup', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  try {
    const destPath = await copyPlatformDatabase();
    return res.json({ ok: true, path: destPath, at: new Date().toISOString() });
  } catch (e) {
    console.error('[backup]', e);
    return res.status(500).json({ message: 'کپی پایگاه داده انجام نشد', detail: String(e?.message || e) });
  }
});

app.get('/api/master/login-audit', authMiddleware, async (req, res) => {
  if (!(await assertMasterApi(req, res))) return;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const db = await loadDatabase();
  ensureLoginAuditLog(db);
  return res.json({ entries: db.loginAuditLog.slice(0, limit) });
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ message: 'رمز جدید باید حداقل ۴ کاراکتر باشد' });
  }

  const db = await loadDatabase();
  const shop = db.shops.find((s) => s.code === req.auth.shopCode);
  if (!shop) return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  const uidPwd = Number(req.auth.sub);
  const user = shop.users.find((u) => Number(u.id) === uidPwd);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });

  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'رمز فعلی نادرست است' });

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  appendSettingsLog(db, shop.code, req.auth, 'change_password', 'User changed own password');
  await saveDatabase(db);
  return res.json({ ok: true });
});

app.get('/api/settings', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.query.shopCode);
  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه یافت نشد' });
  }
  const config = ensureShopConfig(db, targetShop);
  await saveDatabase(db);
  return res.json({ settings: config });
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  const incoming = req.body?.settings;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ message: 'تنظیمات ارسالی نامعتبر است' });
  }

  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.body?.shopCode);
  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه هدف یافت نشد' });
  }

  const current = ensureShopConfig(db, targetShop);
  const next = {
    ...current,
    ...incoming,
    session_timeout_minutes: Math.max(5, Number(incoming.session_timeout_minutes ?? current.session_timeout_minutes ?? 120)),
  };
  db.shopConfigs[targetShop] = next;
  appendSettingsLog(db, targetShop, req.auth, 'update_settings', 'Shop settings updated');
  await saveDatabase(db);
  return res.json({ ok: true, settings: next });
});

app.get('/api/settings/logs', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  ensureSystemStructures(db);
  const targetShop = resolveCrossShopTarget(req, db, req.query.shopCode);
  const logs = db.settingsLogs.filter((l) => l.shop_code === targetShop).slice(0, 50);
  return res.json({ logs });
});

// ─── Backup history (from settings logs) ─────────────────────────────────────
app.get('/api/settings/backup/history', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.query.shopCode);
  const backupActions = new Set(['backup_export', 'backup_restore', 'backup_export_db']);
  const logs = (db.settingsLogs || [])
    .filter(
      (l) =>
        (l.shop_code || l.shopCode) === targetShop &&
        backupActions.has(l.action),
    )
    .slice(-20)
    .reverse()
    .map((l, idx) => ({
      id: idx + 1,
      action: l.action,
      timestamp: l.created_at || l.timestamp,
      by: l.actor_name || l.userFullName || l.username || 'system',
    }));
  return res.json({ logs });
});

app.get('/api/settings/backup/export', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.query.shopCode);
  const state = db.stateByShop[targetShop] || {};
  const exportedAt = new Date().toISOString();
  const dataStr = JSON.stringify(state);
  const checksum = crypto.createHash('sha256').update(dataStr).digest('hex');
  const payload = {
    format: 'dokanyar-shop-backup-v2',
    shopCode: targetShop,
    exportedAt,
    checksum,
    data: state,
  };
  appendSettingsLog(db, targetShop, req.auth, 'backup_export', `Exported backup v2 checksum=${checksum.slice(0, 12)}…`);
  await saveDatabase(db);
  return res.json(payload);
});

app.get('/api/settings/backup/export-db', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'فقط مدیر پلتفرم (سوپرادمین) می‌تواند فایل SQLite کل پلتفرم را دانلود کند.' });
  }
  try {
    const dbPath = resolvePlatformSqlitePath();
    await fsp.access(dbPath);
    const buf = await fsp.readFile(dbPath);
    const db = await loadDatabase();
    appendSettingsLog(db, req.auth.shopCode, req.auth, 'backup_export_db', 'Exported platform SQLite file');
    await saveDatabase(db);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="dokanyar_platform_${stamp}.db"`);
    return res.send(buf);
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'خطا در خواندن پایگاه داده' });
  }
});

app.post('/api/settings/backup/restore', authMiddleware, async (req, res) => {
  let restoreData = req.body?.data;
  if (!restoreData || typeof restoreData !== 'object') {
    return res.status(400).json({ message: 'فایل یا داده بازیابی نامعتبر است' });
  }
  const meta = req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : null;
  if (meta?.checksum && typeof meta.checksum === 'string') {
    const verifyStr = JSON.stringify(restoreData);
    const c2 = crypto.createHash('sha256').update(verifyStr).digest('hex');
    if (c2 !== meta.checksum) {
      return res.status(400).json({ message: 'checksum بکاپ با داده هم‌خوان نیست — فایل خراب یا دستکاری شده' });
    }
  }

  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.body?.shopCode);
  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه هدف یافت نشد' });
  }

  const shopEnt = db.shops.find((s) => s.code === targetShop);
  const skipShopPw = req.auth.role === 'super_admin' && Boolean(req.body?.skipShopPasswordVerify);
  if (!skipShopPw && shopEnt?.passwordHash) {
    const shopPw = String(req.body?.shopPassword || '').trim();
    if (!shopPw) {
      return res.status(400).json({ message: 'برای بازیابی بکاپ، رمز فروشگاه (ورود به دکان) الزامی است' });
    }
    const okPw = await bcrypt.compare(shopPw, shopEnt.passwordHash);
    if (!okPw) {
      return res.status(401).json({ message: 'رمز فروشگاه نادرست است' });
    }
  }

  db.stateByShop[targetShop] = restoreData;
  appendSettingsLog(db, targetShop, req.auth, 'backup_restore', 'Restored backup data (verified)');
  await saveDatabase(db);
  return res.json({ ok: true, shopCode: targetShop });
});

app.get('/api/system/reset-config', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'فقط ابرادمین اجازه دسترسی دارد' });
  }
  return res.json({ minLength: 8, hasCode: true });
});

app.put('/api/system/reset-code', authMiddleware, async (req, res) => {
  if (req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'فقط ابرادمین اجازه تغییر دارد' });
  }
  const { currentCode, newCode } = req.body ?? {};
  if (!currentCode || !newCode || String(newCode).length < 8) {
    return res.status(400).json({ message: 'کد جدید باید حداقل ۸ رقم باشد' });
  }

  const db = await loadDatabase();
  const ok = await bcrypt.compare(String(currentCode), db.systemSettings.resetCodeHash);
  if (!ok) {
    return res.status(401).json({ message: 'کد فعلی درست نیست' });
  }

  db.systemSettings.resetCodeHash = await bcrypt.hash(String(newCode), 10);
  appendSettingsLog(db, req.auth.shopCode, req.auth, 'change_reset_code', 'Changed reset security code');
  await saveDatabase(db);
  return res.json({ ok: true });
});

app.post('/api/system/reset-data', authMiddleware, async (req, res) => {
  const { resetCode, shopCode } = req.body ?? {};
  if (!resetCode) {
    return res.status(400).json({ message: 'کد ریست لازم است' });
  }

  const db = await loadDatabase();
  const codeOk = await bcrypt.compare(String(resetCode), db.systemSettings.resetCodeHash);
  if (!codeOk) {
    return res.status(401).json({ message: 'کد ریست نادرست است' });
  }

  const targetShop = resolveCrossShopTarget(req, db, shopCode);

  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه هدف یافت نشد' });
  }

  db.stateByShop[targetShop] = {};
  appendSettingsLog(db, targetShop, req.auth, 'reset_data', 'Shop data has been reset');
  await saveDatabase(db);
  return res.json({ ok: true, shopCode: targetShop });
});

app.get('/api/state', authMiddleware, async (req, res) => {
  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.query.shopCode);
  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه هدف یافت نشد' });
  }
  const state = ensureShopState(db, targetShop);
  return res.json({ state });
});

app.put('/api/state', authMiddleware, async (req, res) => {
  const incoming = req.body?.state;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ message: 'داده ارسالی نامعتبر است' });
  }
  const db = await loadDatabase();
  const targetShop = resolveCrossShopTarget(req, db, req.body?.shopCode);
  if (!db.shops.some((s) => s.code === targetShop)) {
    return res.status(404).json({ message: 'فروشگاه هدف یافت نشد' });
  }
  const prev = db.stateByShop[targetShop] || {};
  db.stateByShop[targetShop] = mergeShopStatePayload(prev, incoming);
  await saveDatabase(db);
  return res.json({ ok: true, updatedAt: new Date().toISOString() });
});

app.post('/api/sales/invoices', authMiddleware, async (req, res) => {
  if (req.auth.role === 'super_admin') {
    return res.status(403).json({ message: 'ابرادمین اجازه ثبت فروش ندارد' });
  }

  const invoiceInput = req.body?.invoice;
  if (!invoiceInput || !Array.isArray(invoiceInput.items) || invoiceInput.items.length === 0) {
    return res.status(400).json({ message: 'اطلاعات فاکتور نامعتبر است' });
  }

  const db = await loadDatabase();
  const shopCode = req.auth.shopCode;
  const state = ensureShopState(db, shopCode);

  const resolveStockLine = (productId) => {
    const p = state.products.find((x) => x.id === productId);
    if (p) return { kind: 'product', row: p, label: p.name };
    const b = state.books.find((x) => x.id === productId);
    if (b) return { kind: 'book', row: b, label: b.title };
    return null;
  };

  for (const item of invoiceInput.items) {
    const resolved = resolveStockLine(item.product_id);
    if (!resolved) {
      return res.status(400).json({ message: `قلم با شناسه ${item.product_id} یافت نشد` });
    }
    const fromWarehouse = item.stock_source === 'warehouse';
    const avail = fromWarehouse
      ? Number(resolved.row.stock_warehouse || 0)
      : Number(resolved.row.stock_shop || 0);
    if (Number(item.quantity) <= 0 || Number(item.quantity) > avail) {
      return res.status(400).json({
        message: `موجودی ${resolved.label} از ${fromWarehouse ? 'گدام' : 'دکان'} کافی نیست`,
      });
    }
  }

  const invoiceId = nextId(state.invoices);
  const invoiceNumber = `INV-${String(invoiceId).padStart(3, '0')}`;
  const nowDate = new Date().toISOString().slice(0, 10);
  const sellerName = req.auth.fullName || 'کاربر سیستم';
  const tenantId = req.auth.tenantId || 1;
  const isShopAdmin = req.auth.role === 'admin';
  const totalAmt = Number(invoiceInput.total || 0);
  const paidAmt = Number(invoiceInput.paid_amount || 0);
  const cashComplete =
    invoiceInput.payment_method === 'cash' && paidAmt >= totalAmt && totalAmt > 0;

  const invoice = {
    ...invoiceInput,
    id: invoiceId,
    invoice_number: invoiceNumber,
    tenant_id: tenantId,
    seller_id: req.auth.sub,
    seller_name: sellerName,
    invoice_date: invoiceInput.invoice_date || nowDate,
    approval_status: isShopAdmin ? 'approved' : 'pending',
    status: isShopAdmin ? (cashComplete ? 'completed' : 'pending') : 'pending',
  };

  state.invoices = [invoice, ...state.invoices];

  if (isShopAdmin) {
    const applyDeductions = (row) => {
      let next = { ...row };
      for (const item of invoice.items) {
        if (item.product_id !== row.id) continue;
        const qty = Number(item.quantity || 0);
        if (qty <= 0) continue;
        if (item.stock_source === 'warehouse') {
          next = {
            ...next,
            stock_warehouse: Math.max(0, Number(next.stock_warehouse || 0) - qty),
          };
        } else {
          next = {
            ...next,
            stock_shop: Math.max(0, Number(next.stock_shop || 0) - qty),
          };
        }
      }
      return next;
    };
    state.products = state.products.map(applyDeductions);
    state.books = state.books.map(applyDeductions);

    if (invoice.payment_method === 'credit' && Number(invoice.due_amount || 0) > 0) {
      const debtId = nextId(state.debts);
      const debt = {
        id: debtId,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone || '',
        amount: Number(invoice.due_amount),
        due_date: invoice.due_date || '',
        paid_amount: 0,
        remaining_amount: Number(invoice.due_amount),
        status: 'pending',
        tenant_id: tenantId,
        created_at: nowDate,
      };
      state.debts = [debt, ...state.debts];

      state.customers = state.customers.map((customer) => {
        if (customer.id !== invoice.customer_id) return customer;
        return {
          ...customer,
          balance: Number(customer.balance || 0) - Number(invoice.due_amount),
          total_purchases: Number(customer.total_purchases || 0) + Number(invoice.total || 0),
        };
      });
    }
  } else {
    const pendingId = nextId(state.pendingApprovals);
    state.pendingApprovals = [
      {
        id: pendingId,
        type: 'sale',
        title: `فاکتور فروش ${invoice.invoice_number}`,
        description: `فروش ${Number(invoice.total || 0).toLocaleString()} افغانی به ${invoice.customer_name}`,
        data: { invoice_id: invoice.id },
        submitted_by: sellerName,
        submitted_by_role: req.auth.role,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      ...state.pendingApprovals,
    ];
  }

  const shopRecord = db.shops.find((s) => s.code === shopCode);
  const adminUsers = (shopRecord?.users || []).filter((u) => u.role === 'admin' && u.status === 'active');

  let nextNotifications = [...state.notifications];
  if (isShopAdmin) {
    nextNotifications = [
      {
        id: nextId(nextNotifications),
        user_id: 1,
        type: 'pending',
        title: 'فاکتور جدید',
        message: `فاکتور ${invoice.invoice_number} به مبلغ ${Number(invoice.total || 0).toLocaleString()} افغانی ثبت شد`,
        link: '/invoices',
        is_read: false,
        is_heard: false,
        created_at: new Date().toISOString(),
      },
      ...nextNotifications,
    ];
  } else {
    for (const adminUser of adminUsers) {
      nextNotifications = [
        {
          id: nextId(nextNotifications),
          user_id: req.auth.sub,
          recipient_user_id: adminUser.id,
          type: 'pending',
          title: 'فاکتور فروش در انتظار تأیید',
          message: `${sellerName} فاکتور ${invoice.invoice_number} به مبلغ ${Number(invoice.total || 0).toLocaleString()} ؋ ثبت کرد — در «تأیید فروش» بررسی کنید.`,
          link: '/pending',
          is_read: false,
          is_heard: false,
          created_at: new Date().toISOString(),
        },
        ...nextNotifications,
      ];
    }
  }
  state.notifications = nextNotifications;

  db.stateByShop[shopCode] = state;
  await saveDatabase(db);
  return res.json({ invoice, state });
});

app.get('/api/admin/payments', authMiddleware, async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'فقط ادمین اجازه دسترسی دارد' });
  }
  const db = await loadDatabase();
  ensurePaymentStructures(db);
  const payments = req.auth.role === 'super_admin'
    ? db.paymentRequests
    : db.paymentRequests.filter((p) => p.shop_code === req.auth.shopCode);
  return res.json({ payments });
});

app.post('/api/admin/payments/verify', authMiddleware, async (req, res) => {
  if (!['super_admin', 'admin'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'فقط ادمین اجازه تایید دارد' });
  }
  const { paymentId, decision, note } = req.body ?? {};
  if (!paymentId || !decision) {
    return res.status(400).json({ message: 'paymentId و decision لازم است' });
  }
  if (!['approve', 'reject'].includes(String(decision))) {
    return res.status(400).json({ message: 'decision باید approve یا reject باشد' });
  }

  const db = await loadDatabase();
  ensurePaymentStructures(db);
  const payment = db.paymentRequests.find((p) => Number(p.id) === Number(paymentId));
  if (!payment) return res.status(404).json({ message: 'پرداخت یافت نشد' });
  if (req.auth.role !== 'super_admin' && payment.shop_code !== req.auth.shopCode) {
    return res.status(403).json({ message: 'اجازه دسترسی به این پرداخت را ندارید' });
  }

  if (payment.pay_status === 'approved' || payment.pay_status === 'rejected') {
    return res.status(400).json({ message: 'این پرداخت قبلاً تأیید یا رد شده است' });
  }

  let credentials = null;
  if (decision === 'approve') {
    if (!payment.shop_code) {
      if (req.auth.role !== 'super_admin') {
        return res.status(403).json({ message: 'فقط ابرادمین می‌تواند پرداخت ثبت‌نام (بدون دکان) را تأیید و فروشگاه بسازد' });
      }
      try {
        const prov = await provisionShopFromPaymentRequest(db, payment);
        credentials = {
          shopCode: prov.shopCode,
          shopPassword: prov.shopPassword,
          adminRolePassword: prov.adminRolePassword,
        };
        payment.shop_code = prov.shopCode;
        payment.tenant_id = prov.shop.tenantId;
        payment.provisioned_at = new Date().toISOString();
        appendPaymentEvent(db, payment.id, 'shop_provisioned', { shop_code: prov.shopCode });

        const regEmail = payment.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payment.email).trim())
          ? String(payment.email).trim().toLowerCase()
          : '';
        if (regEmail) {
          const esc = (s) =>
            String(s)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          const ownerNm = String(payment.owner_name || '').trim() || 'کاربر';
          void sendEmail({
            to: regEmail,
            subject: 'حساب دکان‌یار شما فعال شد',
            html: `<div dir="rtl" style="font-family:sans-serif;padding:20px;max-width:600px">
              <p>سلام <b>${esc(ownerNm)}</b>،</p>
              <p>پرداخت شما تأیید شد و فروشگاه ایجاد گردید.</p>
              <p><b>کد فروشگاه:</b> ${esc(prov.shopCode)}</p>
              <p><b>رمز فروشگاه:</b> ${esc(prov.shopPassword)}</p>
              <p><b>رمز نقش مدیر دکان:</b> ${esc(prov.adminRolePassword)}</p>
              <p>در صفحهٔ ورود کد و رمز فروشگاه را وارد کنید؛ نقش «مدیر دکان» و رمز نقش را مطابق بالا بزنید.</p>
            </div>`,
          });
        }
        payment.plain_credentials = {
          shopCode: prov.shopCode,
          shopPassword: prov.shopPassword,
          adminRolePassword: prov.adminRolePassword,
          issued_at: new Date().toISOString(),
        };
      } catch (e) {
        return res.status(500).json({ message: e.message || 'خطا در ایجاد فروشگاه' });
      }
    }
    payment.pay_status = 'approved';
  } else {
    payment.pay_status = 'rejected';
  }

  payment.admin_note = String(note || '');
  payment.verified_at = new Date().toISOString();
  payment.verified_by = req.auth.sub;
  payment.updated_at = new Date().toISOString();
  appendPaymentEvent(db, payment.id, 'admin_verify', { decision, note: payment.admin_note, by: req.auth.sub });
  await saveDatabase(db);

  return res.json({ ok: true, payment, credentials });
});

export default app;
