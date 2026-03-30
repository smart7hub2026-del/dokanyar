/** آیکن Lucide — باید در WelcomePage در ONBOARDING_LUCIDE ثبت شود */
export type OnboardingLucideIconName =
  | 'ShoppingCart'
  | 'Pill'
  | 'Smartphone'
  | 'UtensilsCrossed'
  | 'Gem'
  | 'Shirt'
  | 'Refrigerator'
  | 'BrickWall'
  | 'Car'
  | 'Croissant';

export type OnboardingBusinessTypeId = string;

export type OnboardingBusinessTypeDef = {
  id: OnboardingBusinessTypeId;
  lucideIcon: OnboardingLucideIconName;
  isActive: boolean;
  /** ثبت‌نام پولی / انتخاب در فرم — همه true */
  titleFa: string;
  titleEn: string;
  accent: string;
  /**
   * فقط سوپرمارکت: ثبت‌نام آزمایشی ۳ روزه با دیتابیس خالی ERP.
   * سایر صنوف از مسیر پرداخت و تأیید ادمین.
   */
  demoDatabaseEnabled?: boolean;
};

export const ONBOARDING_BUSINESS_TYPES: OnboardingBusinessTypeDef[] = [
  {
    id: 'supermarket',
    lucideIcon: 'ShoppingCart',
    isActive: true,
    demoDatabaseEnabled: true,
    titleFa: 'سوپرمارکت',
    titleEn: 'Supermarket',
    accent: 'from-emerald-600/90 to-teal-900/90',
  },
  {
    id: 'pharmacy',
    lucideIcon: 'Pill',
    isActive: true,
    titleFa: 'داروخانه',
    titleEn: 'Pharmacy',
    accent: 'from-cyan-600/90 to-blue-950/90',
  },
  {
    id: 'mobile_accessories',
    lucideIcon: 'Smartphone',
    isActive: true,
    titleFa: 'موبایل و لوازم جانبی',
    titleEn: 'Mobile & accessories',
    accent: 'from-violet-600/90 to-indigo-950/90',
  },
  {
    id: 'restaurant',
    lucideIcon: 'UtensilsCrossed',
    isActive: true,
    titleFa: 'رستوران و فست‌فود',
    titleEn: 'Restaurant & fast food',
    accent: 'from-orange-600/90 to-red-950/90',
  },
  {
    id: 'gold_jewelry',
    lucideIcon: 'Gem',
    isActive: true,
    titleFa: 'زرگری و طلا',
    titleEn: 'Gold & jewelry',
    accent: 'from-amber-500/90 to-yellow-950/90',
  },
  {
    id: 'clothing',
    lucideIcon: 'Shirt',
    isActive: true,
    titleFa: 'پوشاک',
    titleEn: 'Clothing',
    accent: 'from-rose-600/90 to-fuchsia-950/90',
  },
  {
    id: 'home_appliances',
    lucideIcon: 'Refrigerator',
    isActive: true,
    titleFa: 'لوازم خانگی',
    titleEn: 'Home appliances',
    accent: 'from-sky-600/90 to-blue-950/90',
  },
  {
    id: 'hardware_building',
    lucideIcon: 'BrickWall',
    isActive: true,
    titleFa: 'آهن‌فروشی و مصالح ساختمانی',
    titleEn: 'Hardware & building materials',
    accent: 'from-stone-600/90 to-neutral-950/90',
  },
  {
    id: 'auto_parts',
    lucideIcon: 'Car',
    isActive: true,
    titleFa: 'لوازم موتر و لوازم یدکی',
    titleEn: 'Auto parts',
    accent: 'from-slate-700/90 to-slate-950/90',
  },
  {
    id: 'bakery',
    lucideIcon: 'Croissant',
    isActive: true,
    titleFa: 'نانوایی و شیرینی',
    titleEn: 'Bakery & confectionery',
    accent: 'from-amber-500/90 to-orange-900/90',
  },
];

export const DEFAULT_BUSINESS_TYPE: OnboardingBusinessTypeId = 'supermarket';

export const ACTIVE_BUSINESS_TYPE_IDS = new Set<OnboardingBusinessTypeId>(
  ONBOARDING_BUSINESS_TYPES.filter((b) => b.isActive).map((b) => b.id)
);

/** صنوفی که ثبت‌نام آزمایشی با دیتابیس برایشان فعال است */
export const DEMO_DATABASE_BUSINESS_TYPE_IDS = new Set<OnboardingBusinessTypeId>(
  ONBOARDING_BUSINESS_TYPES.filter((b) => b.demoDatabaseEnabled).map((b) => b.id)
);
