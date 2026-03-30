import bcrypt from 'bcryptjs';
import prismaClientPkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const { PrismaClient } = prismaClientPkg;

// Prisma reads this at runtime. If the user didn't set DATABASE_URL yet,
// we fall back to a local SQLite file under server/prisma/.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'file:./server/prisma/dev.db';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PLATFORM_STATE_ID = 1;
const USE_DEV_DEFAULTS = process.env.NODE_ENV !== 'production';
const envOrDefault = (key, defaultValue) => {
  const val = process.env[key];
  if (val) return val;
  if (USE_DEV_DEFAULTS) return defaultValue;
  throw new Error(`${key} is required in production environment`);
};

const seedDatabase = () => {
  const superPasswordHash = bcrypt.hashSync(envOrDefault('SEED_SUPERADMIN_PASSWORD', 'super-secret-2026'), 10);
  const defaultResetCodeHash = bcrypt.hashSync(envOrDefault('SEED_RESET_CODE', '12345678'), 10);

  const shops = [
    {
      code: 'SUPERADMIN',
      name: 'Platform',
      tenantId: 0,
      passwordHash: superPasswordHash,
      users: [
        {
          id: 0,
          username: 'superadmin',
          full_name: 'مدیر پلتفرم',
          role: 'super_admin',
          passwordHash: superPasswordHash,
          status: 'active',
        },
      ],
    },
  ];

  /** در تست خودکار یک دکان نمونه لازم است؛ در dev/production پیش‌فرض فقط پلتفرم */
  if (process.env.NODE_ENV === 'test') {
    const shopPasswordHash = bcrypt.hashSync(envOrDefault('SEED_SHOP001_PASSWORD', 'shop123'), 10);
    const defaultRolePassword = envOrDefault('SEED_DEFAULT_ROLE_PASSWORD', '1234');
    const rolePasswords = {
      admin: bcrypt.hashSync(defaultRolePassword, 10),
      seller: bcrypt.hashSync(defaultRolePassword, 10),
      stock_keeper: bcrypt.hashSync(defaultRolePassword, 10),
      accountant: bcrypt.hashSync(defaultRolePassword, 10),
    };
    const pendingOnlyHash = bcrypt.hashSync(envOrDefault('SEED_PENDING_USER_PASSWORD', '__PENDING_SLOT__' + Math.random()), 10);
    shops.push({
      code: 'SHOP001',
      name: 'فروشگاه تست',
      tenantId: 1,
      passwordHash: shopPasswordHash,
      users: [
        { id: 1, username: 'admin', full_name: 'مدیر تست', role: 'admin', passwordHash: rolePasswords.admin, status: 'active' },
        { id: 2, username: '__pending_seller', full_name: 'فروشنده (معلق)', role: 'seller', passwordHash: pendingOnlyHash, status: 'pending' },
        { id: 3, username: '__pending_stock', full_name: 'انباردار (معلق)', role: 'stock_keeper', passwordHash: pendingOnlyHash, status: 'pending' },
        { id: 4, username: '__pending_accountant', full_name: 'حسابدار (معلق)', role: 'accountant', passwordHash: pendingOnlyHash, status: 'pending' },
      ],
    });
  }

  return {
    shops,
    stateByShop: {},
    shopConfigs: {},
    settingsLogs: [],
    paymentRequests: [],
    paymentEvents: [],
    broadcasts: [],
    systemSettings: {
      resetCodeHash: defaultResetCodeHash,
    },
  };
};

// Precompute the seeded database once.
// bcrypt.hashSync is relatively expensive; doing it on every request/test
// can push some endpoints past the vitest 5s default timeout.
const seededDatabase = seedDatabase();

/** نسخهٔ کاتالوگ — با تغییر فهرست صنوف این عدد را زیاد کنید تا دیتابیس‌های موجود همگام شوند */
const BUSINESS_TYPES_CATALOG_VERSION = 10;

/** ده صنف اولویت‌دار افغانستان؛ metadata برای توسعهٔ ماژول‌های اختصاصی هر tenant */
const DEFAULT_BUSINESS_TYPES = [
  {
    id: 1,
    name: 'سوپرمارکت',
    code: 'supermarket',
    icon: '🏪',
    is_active: true,
    features: ['expiry', 'barcode', 'category', 'bulk_discount', 'stock'],
    metadata: {
      specialty_fa:
        'تاریخ انقضا، بارکدخوان، تخفیف گروهی، دسته‌بندی محصولات',
      region: 'AF',
    },
  },
  {
    id: 2,
    name: 'داروخانه',
    code: 'pharmacy',
    icon: '💊',
    is_active: true,
    features: ['expiry', 'batch', 'prescription', 'stock'],
    metadata: {
      specialty_fa: 'انقضا با هشدار، نسخه پزشکی، واحد دوز (قرص/بسته)، هشدار کمبود موجودی',
      region: 'AF',
    },
  },
  {
    id: 3,
    name: 'موبایل و لوازم جانبی',
    code: 'mobile_accessories',
    icon: '📱',
    is_active: true,
    features: ['serial', 'warranty', 'imei', 'barcode'],
    metadata: {
      specialty_fa: 'IMEI/سریال، گارانتی، لوازم جانبی، برند و مدل',
      region: 'AF',
    },
  },
  {
    id: 4,
    name: 'رستوران و فست‌فود',
    code: 'restaurant',
    icon: '🍽️',
    is_active: true,
    features: ['table', 'recipe', 'wholesale'],
    metadata: {
      specialty_fa: 'منو (غذا و نوشیدنی)، سفارش آنلاین، میز و سالن، پیک و تحویل',
      region: 'AF',
    },
  },
  {
    id: 5,
    name: 'زرگری و طلا',
    code: 'gold_jewelry',
    icon: '💍',
    is_active: true,
    features: ['karat', 'weight', 'serial'],
    metadata: {
      specialty_fa: 'عیار ۱۸/۲۱/۲۴، وزن گرم و مثقال، اجرت ساخت، قیمت روز (API)',
      region: 'AF',
    },
  },
  {
    id: 6,
    name: 'پوشاک',
    code: 'clothing',
    icon: '👔',
    is_active: true,
    features: ['size', 'color', 'brand', 'barcode'],
    metadata: {
      specialty_fa: 'سایز و رنگ، فصل، برند، تخفیف collection',
      region: 'AF',
    },
  },
  {
    id: 7,
    name: 'لوازم خانگی',
    code: 'home_appliances',
    icon: '🏠',
    is_active: true,
    features: ['serial', 'warranty', 'barcode'],
    metadata: {
      specialty_fa: 'سریال و گارانتی، مدل و برند، خدمات پس از فروش',
      region: 'AF',
    },
  },
  {
    id: 8,
    name: 'آهن‌فروشی و مصالح ساختمانی',
    code: 'hardware_building',
    icon: '🧱',
    is_active: true,
    features: ['weight', 'wholesale', 'stock'],
    metadata: {
      specialty_fa: 'واحد کیلو/تن/متر، شماره بارنامه، قرارداد پروژه',
      region: 'AF',
    },
  },
  {
    id: 9,
    name: 'لوازم موتر و لوازم یدکی',
    code: 'auto_parts',
    icon: '🚗',
    is_active: true,
    features: ['serial', 'brand', 'barcode'],
    metadata: {
      specialty_fa: 'سازگاری با مدل موتر، شماره فنی (OEM)، انبار چند شعبه',
      region: 'AF',
    },
  },
  {
    id: 10,
    name: 'نانوایی و شیرینی',
    code: 'bakery',
    icon: '🥐',
    is_active: true,
    features: ['expiry', 'batch', 'recipe'],
    metadata: {
      specialty_fa: 'دسته نان و شیرینی، تولید روزانه، پیش‌سفارش، تاریخ تولید',
      region: 'AF',
    },
  },
];

const nextUserIdAcrossShops = (db) => {
  const ids = (db.shops || []).flatMap((s) =>
    (Array.isArray(s.users) ? s.users : []).map((u) => Number(u.id) || 0)
  );
  return ids.length ? Math.max(...ids) + 1 : 1;
};

const PENDING_ROLE_SLOTS = [
  { role: 'seller', full_name: 'فروشنده (معلق)', userPrefix: '__pending_seller' },
  { role: 'stock_keeper', full_name: 'انباردار (معلق)', userPrefix: '__pending_stock' },
  { role: 'accountant', full_name: 'حسابدار (معلق)', userPrefix: '__pending_accountant' },
];

/** اسلات‌های seller/stock/accountant + حداکثر یک active به ازای هر نقش */
const ensureShopRoleSlots = (db) => {
  let changed = false;
  if (!Array.isArray(db.shops)) return changed;
  const pendingPass = envOrDefault('SEED_PENDING_USER_PASSWORD', `__PENDING__${Date.now()}`);
  const placeholderHash = bcrypt.hashSync(pendingPass, 10);
  let nid = nextUserIdAcrossShops(db);

  for (const shop of db.shops) {
    if (shop.code === 'SUPERADMIN') continue;
    if (!Array.isArray(shop.users)) shop.users = [];

    for (const { role, full_name, userPrefix } of PENDING_ROLE_SLOTS) {
      const exists = shop.users.some((u) => u.role === role);
      if (!exists) {
        const codeSafe = String(shop.code || 'SHOP').toUpperCase().replace(/[^A-Z0-9]/g, '_');
        shop.users.push({
          id: nid++,
          username: `${userPrefix}_${codeSafe}`.toLowerCase(),
          full_name,
          role,
          passwordHash: placeholderHash,
          status: 'pending',
        });
        changed = true;
      }
    }

    for (const role of ['admin', 'seller', 'stock_keeper', 'accountant']) {
      const actives = shop.users.filter((u) => u.role === role && u.status === 'active');
      if (actives.length > 1) {
        actives.slice(1).forEach((u) => {
          u.status = 'inactive';
          changed = true;
        });
      }
    }
  }
  return changed;
};

const ensurePlatformState = async () => {
  await prisma.platformState.upsert({
    where: { id: PLATFORM_STATE_ID },
    create: { id: PLATFORM_STATE_ID, state: seededDatabase },
    update: {},
  });
};

export const loadDatabase = async () => {
  await ensurePlatformState();
  const row = await prisma.platformState.findUnique({
    where: { id: PLATFORM_STATE_ID },
  });

  // Prisma returns JSON as a JS value.
  const db = (row && row.state) ? row.state : {};

  let changed = false;
  if (!db.systemSettings || typeof db.systemSettings !== 'object') {
    db.systemSettings = {};
    changed = true;
  }
  if (!db.systemSettings.resetCodeHash) {
    db.systemSettings.resetCodeHash = bcrypt.hashSync(envOrDefault('SEED_RESET_CODE', '12345678'), 10);
    changed = true;
  }
  if (!db.shopConfigs || typeof db.shopConfigs !== 'object') {
    db.shopConfigs = {};
    changed = true;
  }
  if (!Array.isArray(db.settingsLogs)) {
    db.settingsLogs = [];
    changed = true;
  }
  if (!db.systemSettings.businessTypesCatalogVersion) {
    db.systemSettings.businessTypesCatalogVersion = 0;
    changed = true;
  }
  if (db.systemSettings.businessTypesCatalogVersion !== BUSINESS_TYPES_CATALOG_VERSION) {
    db.businessTypes = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_TYPES));
    db.systemSettings.businessTypesCatalogVersion = BUSINESS_TYPES_CATALOG_VERSION;
    changed = true;
  } else if (!Array.isArray(db.businessTypes)) {
    db.businessTypes = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_TYPES));
    changed = true;
  }
  if (!Array.isArray(db.supportTickets)) {
    db.supportTickets = [];
    changed = true;
  }
  if (!Array.isArray(db.loginAuditLog)) {
    db.loginAuditLog = [];
    changed = true;
  }
  if (!Array.isArray(db.paymentRequests)) {
    db.paymentRequests = [];
    changed = true;
  }
  if (!Array.isArray(db.paymentEvents)) {
    db.paymentEvents = [];
    changed = true;
  }
  if (!Array.isArray(db.broadcasts)) {
    db.broadcasts = [];
    changed = true;
  }
  if (ensureShopRoleSlots(db)) {
    changed = true;
  }
  if (changed) {
    await saveDatabase(db);
  }
  return db;
};

export const saveDatabase = async (db) => {
  await prisma.platformState.update({
    where: { id: PLATFORM_STATE_ID },
    data: { state: db },
  });
};

export const resetDatabase = async () => {
  await prisma.platformState.upsert({
    where: { id: PLATFORM_STATE_ID },
    create: { id: PLATFORM_STATE_ID, state: seededDatabase },
    update: { state: seededDatabase },
  });
};
