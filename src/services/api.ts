export interface LoginRequest {
  shopCode: string;
  shopPassword: string;
  role: string;
  rolePassword: string;
  captchaToken?: string;
  deviceName?: string;
}

export interface ShopRole {
  role: string;
  full_name: string;
  status?: 'active' | 'inactive' | 'pending';
}

export const apiCheckShop = (shopCode: string, shopPassword: string) =>
  request<{
    ok: boolean;
    shopName: string;
    roles: ShopRole[];
    is_demo_shop?: boolean;
    admin_role_name?: string;
  }>('/api/auth/check-shop', {
    method: 'POST',
    body: JSON.stringify({ shopCode, shopPassword }),
  });

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  tenant_id?: number;
  shop_code?: string;
  two_factor_enabled?: boolean;
  last_login: string;
  preferred_language?: string;
  preferred_currency?: string;
  is_demo?: boolean;
}

export interface ShopUserRow {
  id: number;
  username: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  email?: string;
  preferred_language?: string;
  preferred_currency?: string;
}

export const apiGetShopUsers = (token?: string) =>
  request<{ users: ShopUserRow[] }>('/api/shop/users', { token });

export const apiUpdateShopUser = (
  id: number,
  payload: Partial<Pick<ShopUserRow, 'full_name' | 'username' | 'status'>>,
  token?: string
) =>
  request<{ ok: boolean; user: ShopUserRow }>(`/api/shop/users/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });

export const apiSetShopUserPassword = (id: number, password: string, token?: string) =>
  request<{ ok: boolean; user: ShopUserRow }>(`/api/shop/users/${id}/set-password`, {
    method: 'POST',
    token,
    body: JSON.stringify({ password }),
  });

export const apiPatchMe = (
  payload: Partial<Pick<AuthUser, 'full_name' | 'preferred_language' | 'preferred_currency'>>,
  token?: string
) =>
  request<{ user: AuthUser }>('/api/auth/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });

export const apiGetMasterShopUsers = (shopCode: string, token?: string) =>
  request<{ users: ShopUserRow[] }>(`/api/master/shops/${encodeURIComponent(shopCode)}/users`, { token });

export interface BusinessTypeRow {
  id: number;
  name: string;
  code: string;
  icon: string;
  is_active: boolean;
  features: string[];
  metadata?: Record<string, unknown>;
}

export const apiGetMasterBusinessTypes = (token?: string) =>
  request<{ businessTypes: BusinessTypeRow[] }>('/api/master/business-types', { token });

export const apiPutMasterBusinessTypes = (businessTypes: BusinessTypeRow[], token?: string) =>
  request<{ ok: boolean; businessTypes: BusinessTypeRow[] }>('/api/master/business-types', {
    method: 'PUT',
    token,
    body: JSON.stringify({ businessTypes }),
  });

export interface SupportTicket {
  id: number;
  shop_code: string;
  shop_name?: string;
  sender_name: string;
  sender_id?: number;
  subject: string;
  message: string;
  priority: string;
  status: string;
  created_at: string;
  reply?: string;
  updated_at?: string;
}

export const apiPostSupportMessage = (
  payload: { subject: string; message: string; priority?: string },
  token?: string
) =>
  request<{ ok: boolean; ticket: SupportTicket }>('/api/support/message', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export const apiGetSupportTickets = (token?: string) =>
  request<{ tickets: SupportTicket[] }>('/api/support/tickets', { token });

export const apiGetMasterSupport = (token?: string) =>
  request<{ tickets: SupportTicket[] }>('/api/master/support', { token });

export const apiPutMasterSupport = (
  id: number,
  payload: { reply?: string; status?: string },
  token?: string
) =>
  request<{ ok: boolean; ticket: SupportTicket }>(`/api/master/support/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });

export interface RegisterPaymentPayload {
  ownerName: string;
  email?: string;
  plan: string;
  payMethod: string;
  paymentMeta?: Record<string, string>;
  shopCode?: string;
}

export interface Tenant {
  id: number | string;
  shop_name: string;
  shop_code: string;
  shop_domain: string;
  shop_phone: string;
  shop_address: string;
  owner_name: string;
  owner_phone: string;
  owner_email?: string;
  subscription_plan: 'basic' | 'premium';
  subscription_start: string;
  subscription_end: string;
  subscription_status: 'active' | 'expired' | 'suspended';
  max_users: number;
  max_products: number;
  status: 'active' | 'inactive' | 'suspended';
  is_demo?: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  registered_at?: string;
  created_at: string;
  last_login: string;
  users_count: number;
  products_count: number;
  sales_today: number;
  credential_record?: {
    shop_password_plain?: string;
    admin_role_password_plain?: string;
    recorded_at?: string;
  } | null;
}

export interface ShopSessionPayload {
  token: string;
  user: AuthUser;
  shop: { code: string; name: string; tenant_id: number; is_demo?: boolean };
  sessionTimeoutMinutes?: number;
  trialEndsAt?: string | null;
  trialDaysRemaining?: number | null;
  shop_meta?: AuthMeShopMeta;
}

export interface DemoRegisterPayload {
  registered: true;
  shopCode: string;
  shopPassword: string;
  shopName?: string;
  adminFullName: string;
  adminRoleTitle: string;
  adminRolePassword: string;
  trialEndsAt?: string | null;
  trialDaysRemaining?: number | null;
  shop_meta?: AuthMeShopMeta;
  message?: string;
}

export type DemoLoginApiResult = ShopSessionPayload | DemoRegisterPayload;

interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  pendingToken: string;
}

export type LoginResult = ShopSessionPayload | TwoFactorRequiredResponse;

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

// ============================================================
// ✅ اصلاح شده: آدرس بک‌اند مستقیماً به Render متصل شده
// ============================================================
const API_BASE = 'https://dokanyarshopi-backend.onrender.com';
// ============================================================

export const apiGetPublicMeta = async (): Promise<{ trial_quick_signup_enabled: boolean }> => {
  try {
    const res = await fetch(`${API_BASE}/api/meta/public`, { credentials: 'omit' });
    if (!res.ok) return { trial_quick_signup_enabled: true };
    const j = (await res.json()) as { trial_quick_signup_enabled?: boolean };
    return { trial_quick_signup_enabled: Boolean(j.trial_quick_signup_enabled ?? true) };
  } catch {
    return { trial_quick_signup_enabled: true };
  }
};

export const apiMasterPlatformBackup = (token?: string) =>
  request<{ ok: boolean; path: string; at: string }>('/api/master/platform-backup', {
    method: 'POST',
    token,
  });

export const apiMasterLoginAudit = (limit?: number, token?: string) =>
  request<{ entries: Record<string, unknown>[] }>(
    `/api/master/login-audit${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ''}`,
    { token }
  );

const request = async <T>(
  url: string,
  options?: RequestInit & { token?: string }
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const { token: _token, ...restOptions } = options ?? {};
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      credentials: 'include',
      headers,
      ...restOptions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const looksLikeNetwork =
      msg.toLowerCase().includes('fetch') ||
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('failed to load');
    throw new Error(
      looksLikeNetwork
        ? 'سرور در دسترس نیست (Failed to fetch). اگر با موبایل وارد شده‌اید: آدرس را با IP کامپیوتر باز کنید (مثلاً http://192.168.1.5:5173) و در .env مقدار VITE_API_BASE_URL را خالی بگذارید؛ سپس سرور dev را دوباره اجرا کنید. مطمئن شوید backend روی همان PC روی پورت ۴۰۰۰ اجرا است.'
        : msg
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((json as { message?: string })?.message || 'خطا در ارتباط با سرور') as Error & {
      status: number;
      code?: string;
    };
    error.status = res.status;
    const c = (json as { code?: string }).code;
    if (c) error.code = c;
    throw error;
  }
  return json as T;
};

export const apiLogin = (payload: LoginRequest) =>
  request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const apiDemoLogin = (payload: {
  mode?: 'register' | 'login';
  phone?: string;
  password?: string;
  name?: string;
  familyName?: string;
  email?: string;
  idToken?: string;
  businessType?: string;
  captchaToken?: string;
  deviceName?: string;
}) =>
  request<DemoLoginApiResult>('/api/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const apiGoogleLogin = (payload: { email: string; fullName: string; deviceName?: string }) =>
  request<ShopSessionPayload>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export interface UserSessionRow {
  id: number;
  device_name: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

export const apiGetUserSessions = (token?: string) =>
  request<{ sessions: UserSessionRow[] }>('/api/user/sessions', { token });

export const apiDeleteUserSession = (id: number, token?: string) =>
  request<{ ok: boolean }>(`/api/user/sessions/${id}`, { method: 'DELETE', token });

export const apiDeleteAllUserSessions = (token?: string) =>
  request<{ ok: boolean }>('/api/user/sessions', { method: 'DELETE', token });

export interface AuthMeShopMeta {
  is_demo: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  trial_expired: boolean;
  shop_status?: string | null;
  shop_suspended?: boolean;
}

export interface AuthMeResponse {
  user: AuthUser;
  shop?: { code: string; name: string; tenant_id: number };
  shop_meta?: AuthMeShopMeta;
  sessionTimeoutMinutes?: number;
}

export const apiMe = (token?: string) =>
  request<AuthMeResponse>('/api/auth/me', token ? { token } : {});

export const apiLogout = () =>
  request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });

export const apiTwoFactorSetup = (token?: string) =>
  request<{ secret: string; qrCode: string; otpauth: string }>('/api/auth/2fa/setup', {
    method: 'POST',
    token,
  });

export const apiTwoFactorEnable = (code: string, token?: string) =>
  request<{ ok: boolean; message: string }>('/api/auth/2fa/enable', {
    method: 'POST',
    token,
    body: JSON.stringify({ code }),
  });

export const apiTwoFactorDisable = (code: string, token?: string) =>
  request<{ ok: boolean; message: string }>('/api/auth/2fa/disable', {
    method: 'POST',
    token,
    body: JSON.stringify({ code }),
  });

export const apiVerifyTwoFactor = (pendingToken: string, code: string) =>
  request<ShopSessionPayload>('/api/auth/2fa/verify-login', {
    method: 'POST',
    body: JSON.stringify({ pendingToken, code }),
  });

export const apiGetTenants = (token?: string) =>
  request<{ tenants: Tenant[] }>('/api/master/tenants', { token });

export const apiCreateTenant = (
  payload: {
    shop_name: string;
    shop_code: string;
    owner_name: string;
    owner_email?: string;
    owner_phone?: string;
    shop_password?: string;
    subscription_plan?: string;
  },
  token?: string
) =>
  request<{ ok: boolean; tenant: Tenant; credentials: { shopCode: string; shopPassword: string; adminRolePassword: string } }>(
    '/api/master/tenants',
    { method: 'POST', token, body: JSON.stringify(payload) }
  );

export const apiUpdateTenant = (
  code: string,
  payload: Partial<Tenant & { shop_password?: string; admin_role_password?: string }>,
  token?: string
) =>
  request<{ ok: boolean; tenant: Tenant }>(
    `/api/master/tenants/${encodeURIComponent(code)}`,
    { method: 'PUT', token, body: JSON.stringify(payload) }
  );

export const apiDeleteTenant = (code: string, token?: string) =>
  request<{ ok: boolean }>(`/api/master/tenants/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    token,
  });

export const apiSetTenantStatus = (code: string, status: string, token?: string) =>
  request<{ ok: boolean; tenant: Tenant }>(
    `/api/master/tenants/${encodeURIComponent(code)}/status`,
    { method: 'PUT', token, body: JSON.stringify({ status }) }
  );

export const apiGetSubscriptionPayments = (shopCode?: string, token?: string) =>
  request<{ payments: Record<string, unknown>[] }>(
    `/api/master/subscription-payments${shopCode ? `?shopCode=${encodeURIComponent(shopCode)}` : ''}`,
    { token }
  );

export const apiCreateSubscriptionPayment = (
  payload: { shop_code: string; amount: number; plan: string; method?: string; note?: string },
  token?: string
) =>
  request<{ ok: boolean; payment: Record<string, unknown> }>('/api/master/subscription-payments', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

export interface AdminPaymentRequestRow {
  id: number;
  owner_name: string;
  email: string;
  plan: string;
  amount_afn: number;
  pay_method: string;
  pay_status: string;
  shop_code: string | null;
  tenant_id?: number | null;
  payment_meta?: Record<string, unknown>;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
  verified_at?: string | null;
  verified_by?: string | null;
  provisioned_at?: string | null;
  plain_credentials?: {
    shopCode: string;
    shopPassword: string;
    adminRolePassword: string;
    issued_at?: string;
  };
}

export const apiGetAdminPayments = (token?: string) =>
  request<{ payments: AdminPaymentRequestRow[] }>('/api/admin/payments', { token });

export const apiVerifyAdminPayment = (
  paymentId: number,
  decision: 'approve' | 'reject',
  note?: string,
  token?: string
) =>
  request<{
    ok: boolean;
    payment: AdminPaymentRequestRow;
    credentials?: { shopCode: string; shopPassword: string; adminRolePassword: string };
  }>('/api/admin/payments/verify', {
    method: 'POST',
    token,
    body: JSON.stringify({ paymentId, decision, note: note ?? '' }),
  });

export const apiLoadState = (token?: string, shopCode?: string) =>
  request<{ state: Record<string, unknown> | null }>(
    `/api/state${shopCode ? `?shopCode=${encodeURIComponent(shopCode)}` : ''}`,
    { token }
  );

export const apiSaveState = (token?: string, state?: Record<string, unknown>, shopCode?: string) =>
  request<{ ok: boolean; updatedAt: string }>('/api/state', {
    method: 'PUT',
    token,
    body: JSON.stringify({ state, shopCode }),
  });

export const apiCreateSaleInvoice = (token?: string, invoice?: Record<string, unknown>) =>
  request<{ invoice: Record<string, unknown>; state: Record<string, unknown> }>('/api/sales/invoices', {
    method: 'POST',
    token,
    body: JSON.stringify({ invoice }),
  });

export const apiResetData = (token?: string, resetCode?: string, shopCode?: string) =>
  request<{ ok: boolean; shopCode: string }>('/api/system/reset-data', {
    method: 'POST',
    token,
    body: JSON.stringify({ resetCode, shopCode }),
  });

export const apiChangeResetCode = (token?: string, currentCode?: string, newCode?: string) =>
  request<{ ok: boolean }>('/api/system/reset-code', {
    method: 'PUT',
    token,
    body: JSON.stringify({ currentCode, newCode }),
  });

export const apiRegisterPayment = (payload: RegisterPaymentPayload) =>
  request<{
    ok: boolean;
    payment: {
      id: number;
      plan: string;
      amount_afn: number;
      pay_method: string;
      pay_status: string;
      gateway_transaction_id?: string | null;
      gateway_checkout_url?: string | null;
    };
  }>('/api/payments/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const apiInitHesabPay = (paymentId: number) =>
  request<{ ok: boolean; sandbox: boolean; transactionId: string; checkoutUrl: string }>(
    '/api/payments/hesabpay/init',
    { method: 'POST', body: JSON.stringify({ paymentId }) }
  );

export const apiAdminVerifyPayment = (
  token?: string,
  paymentId?: number,
  decision?: 'approve' | 'reject',
  note?: string
) =>
  request<{ ok: boolean; payment: Record<string, unknown> }>('/api/admin/payments/verify', {
    method: 'POST',
    token,
    body: JSON.stringify({ paymentId, decision, note }),
  });

export interface PendingRegistration {
  code: string;
  name: string;
  owner_name: string;
  owner_email: string;
  registered_at: string;
  status: string;
}

export const apiGetPendingRegistrations = (token?: string) =>
  request<{ registrations: PendingRegistration[] }>('/api/master/pending-registrations', { token });

export const apiApproveRegistration = (code: string, token?: string) =>
  request<{ ok: boolean; message: string }>(`/api/master/registrations/${code}/approve`, {
    method: 'POST',
    token,
  });

export const apiRejectRegistration = (code: string, reason?: string, token?: string) =>
  request<{ ok: boolean; message: string }>(`/api/master/registrations/${code}/reject`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });

export const apiResetAllData = (token?: string) =>
  request<{ ok: boolean; message: string }>('/api/master/reset-all-data', {
    method: 'POST',
    token,
  });

export interface Broadcast {
  id: number; title: string; message: string;
  target_type: string; target_shops: string[];
  created_at: string; created_by: string;
}

export const apiGetBroadcasts = (token?: string) =>
  request<{ broadcasts: Broadcast[] }>('/api/master/broadcasts', { token });

export const apiSendBroadcast = (data: { title: string; message: string; target_type: string; target_shops?: string[] }, token?: string) =>
  request<{ ok: boolean; broadcast: Broadcast; delivered: number }>('/api/master/broadcasts', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });

export const apiDeleteBroadcast = (id: number, token?: string) =>
  request<{ ok: boolean }>(`/api/master/broadcasts/${id}`, { method: 'DELETE', token });

export const apiSendOtp = (email: string) =>
  request<{ ok: boolean; message: string; devCode?: string }>('/api/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const apiVerifyOtp = (email: string, code: string) =>
  request<{ ok: boolean; message: string }>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });