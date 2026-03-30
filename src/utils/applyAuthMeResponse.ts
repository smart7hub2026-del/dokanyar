import type { AuthMeResponse } from '../services/api';
import type { User } from '../data/mockData';
import { useStore } from '../store/useStore';

/** اعمال پاسخ /api/auth/me روی استور — یک منبع برای App و پس از rehydrate پرسیست */
export function applyAuthMeResponse(data: AuthMeResponse): void {
  if (!data.user) return;
  const u = data.user as AuthMeResponse['user'] & { shop_code?: string; is_demo?: boolean };
  /** فقط از پاسخ سرور — هرگز shopCode قدیمی استور را برنگردان (باعث قاطی شدن دکان/نقش نمی‌شود) */
  const resolvedShopCode = String(data.shop?.code || u.shop_code || '').trim();
  const mins = Math.max(5, Number(data.sessionTimeoutMinutes ?? 120));
  useStore.getState().login(
    u as unknown as User,
    resolvedShopCode,
    Boolean(u.is_demo),
    mins,
    data.shop_meta?.trial_ends_at ?? null
  );
  if (data.shop_meta?.trial_expired) useStore.getState().setDemoTrialBlocked(true);
  else if (data.shop_meta && data.shop_meta.trial_expired === false) useStore.getState().setDemoTrialBlocked(false);
  if (data.shop_meta?.shop_suspended) useStore.getState().setShopSuspended(true);
  else if (data.shop_meta && data.shop_meta.shop_suspended === false) useStore.getState().setShopSuspended(false);
}
