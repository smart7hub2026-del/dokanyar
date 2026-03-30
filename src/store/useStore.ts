import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Product, Customer, Invoice, Debt, Supplier, PersonalReminder,
  Notification, Category, User, InvoiceItem, ProductExpiry, SerialNumber
} from '../data/mockData';

// ─── helpers ───────────────────────────────────────────────────────────────
const nextId = (arr: { id: number }[]) =>
  arr.length > 0 ? Math.max(...arr.map(a => a.id)) + 1 : 1;

// Hash simulation (in production use bcrypt on backend)
const hashPassword = (pw: string) => btoa(pw + '_smarthub_salt_2025');
const checkPassword = (pw: string, hash: string) => btoa(pw + '_smarthub_salt_2025') === hash;

// ─── PurchaseInvoice ────────────────────────────────────────────────────────
export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: 'cash' | 'credit';
  invoice_date: string;
  due_date?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'completed';
  created_at: string;
}

export interface StaffMember {
  id: number;
  full_name: string;
  role: string;
  phone: string;
  salary: number;
  join_date: string;
  status: 'active' | 'inactive';
  paid_months: string[];
  /** یادداشت داخلی (ذخیره در state) */
  notes?: string;
  /** یادداشت پرداخت حقوق به‌تفکیک ماه (YYYY-MM) */
  salary_payment_notes?: Record<string, string>;
  /** پایان قرارداد (اختیاری) */
  contract_end_date?: string;
  /** حضور و غیاب / شیفت / قرارداد — برای بایگانی HR */
  attendance_note?: string;
}

export interface WarehouseBin {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  date: string;
  paid_by: string;
  /** چه کسی درخواست پول نقد از صندوق کرده (برای رسید چاپی) */
  requested_by?: string;
}

export interface CashEntry {
  id: number;
  type: 'in' | 'out';
  amount: number;
  description: string;
  date: string;
  created_by?: string;
}

export interface ProductReturn {
  id: number;
  invoice_number: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  amount: number;
  reason: string;
  date: string;
  status: 'pending' | 'approved';
}

/** دادهٔ لیست خرید مشترک (فاکتور خرید → همکار → تأیید مدیر) */
export interface PurchaseListTaskData {
  purchase_invoice_id: number;
  invoice_number: string;
  supplier_name: string;
  assignee_user_id: number;
  assignee_name: string;
  phase: 'collecting' | 'awaiting_admin';
  line_labels: string[];
  line_qty: number[];
  picked: boolean[];
}

export interface PendingApproval {
  id: number;
  type:
    | 'sale'
    | 'purchase'
    | 'product_edit'
    | 'debt_payment'
    | 'stock_update'
    | 'purchase_list'
    | 'warehouse_transfer'
    | 'staff_expense'
    | 'staff_cash'
    | 'staff_return';
  title: string;
  description: string;
  data: Record<string, unknown>;
  submitted_by: string;
  submitted_by_role: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ShopSettings {
  shop_name: string;
  seller_name: string;
  shop_address: string;
  shop_phone: string;
  logo_url: string;
  paper_size: 'A4' | 'A5' | 'Letter' | '80mm' | '72mm' | '58mm';
  footer_text: string;
  show_shop_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_seller: boolean;
  show_barcode: boolean;
  security_code: string;
  print_copies: number;
  /** یک نسخه / دو نسخه (مشتری+مغازه) / سه نسخه (مشتری+مغازه+حسابداری) */
  invoice_copy_mode: 'single' | 'duplicate' | 'triple';
  /** نمایش تصویر کالا روی کارت‌های انتخاب در صفحه فروش */
  show_product_image_on_sales: boolean;
  /** پیش‌فرض: در چاپ A4 / A5 / Letter بخش «عکس کالاها» در پایان فاکتور */
  print_invoice_with_product_images: boolean;
  /** نوع کسب‌وکار (ثبت‌نام / تنظیمات) */
  business_type?: string;
  /** هم‌تراز با tenant در سرور — برای گزارش و ERP چندصنفی */
  tenant_id?: number;
}

/** قلم دستی «خرید بعدی» (لیست تأمین) */
export interface ProcurementManualLine {
  id: number;
  name: string;
  note?: string;
  quantity_hint?: number;
  created_at: string;
}

// ─── Store Interface ────────────────────────────────────────────────────────
interface AppStore {
  // Auth
  currentUser: User | null;
  shopCode: string;
  authToken: string | null;
  isDemo: boolean;
  sessionExpiry: number | null;
  /** پایان دوره آزمایشی دیمو (ISO) — فقط نمایش UI */
  demoTrialEndsAt: string | null;
  /** پس از 403 TRIAL_EXPIRED روی APIهای فروشگاه */
  demoTrialBlocked: boolean;
  /** دکان توسط ابرادمین معلق (suspended / inactive) */
  shopSuspended: boolean;
  setShopSuspended: (suspended: boolean) => void;
  login: (
    user: User,
    shopCode: string,
    isDemo?: boolean,
    sessionTimeoutMinutes?: number,
    demoTrialEndsAt?: string | null
  ) => void;
  setDemoTrialBlocked: (blocked: boolean) => void;
  /** Merge fields into logged-in user (e.g. after PATCH /api/auth/me) */
  patchCurrentUser: (partial: Partial<User> & Record<string, unknown>) => void;
  setAuthToken: (token: string | null) => void;
  logout: () => void;
  checkSession: () => boolean;
  hydrateFromServer: (payload: Partial<Record<string, unknown>>) => void;
  buildSyncPayload: () => Record<string, unknown>;

  // Products
  products: Product[];
  addProduct: (p: Omit<Product, 'id' | 'created_at'>) => Product;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: number) => void;
  deductStock: (productId: number, qty: number, source?: 'shop' | 'warehouse') => void;
  restoreStock: (productId: number, qty: number, source?: 'shop' | 'warehouse') => void;

  /** فقط کتابفروشی — همگام با سرور books */
  books: Book[];
  addBook: (p: Omit<Book, 'id' | 'created_at'>) => Book;
  updateBook: (b: Book) => void;
  deleteBook: (id: number) => void;
  deductBookStock: (bookId: number, qty: number, source?: 'shop' | 'warehouse') => void;
  restoreBookStock: (bookId: number, qty: number, source?: 'shop' | 'warehouse') => void;

  // Categories
  categories: Category[];
  addCategory: (name: string) => Category;
  deleteCategory: (id: number) => void;

  // Expiry
  expiryRecords: ProductExpiry[];
  addExpiry: (e: Omit<ProductExpiry, 'id' | 'created_at'>) => void;
  updateExpiry: (e: ProductExpiry) => void;
  deleteExpiry: (id: number) => void;

  // Serials
  serialNumbers: SerialNumber[];
  addSerial: (s: Omit<SerialNumber, 'id'>) => void;
  updateSerial: (s: SerialNumber) => void;
  deleteSerial: (id: number) => void;

  // Customers
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'created_at' | 'customer_code'>) => Customer;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: number) => void;
  updateCustomerBalance: (id: number, delta: number) => void;

  // Sales Invoices
  invoices: Invoice[];
  addInvoice: (inv: Omit<Invoice, 'id' | 'invoice_number'>) => Invoice;
  updateInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: number) => void;

  // Purchase Invoices
  purchaseInvoices: PurchaseInvoice[];
  addPurchaseInvoice: (p: Omit<PurchaseInvoice, 'id' | 'invoice_number' | 'created_at'>) => PurchaseInvoice;
  updatePurchaseInvoice: (p: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: number) => void;

  // Debts
  debts: Debt[];
  addDebt: (d: Omit<Debt, 'id' | 'created_at'>) => void;
  payDebt: (id: number, amount: number) => void;
  updateDebt: (d: Debt) => void;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, 'id' | 'created_at' | 'supplier_code'>) => Supplier;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: number) => void;
  updateSupplierBalance: (id: number, delta: number) => void;

  // Staff
  staff: StaffMember[];
  addStaff: (s: Omit<StaffMember, 'id' | 'paid_months'>) => void;
  updateStaff: (s: StaffMember) => void;
  deleteStaff: (id: number) => void;
  payStaffSalary: (id: number, month: string, opts?: { note?: string }) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: number) => void;

  // Cash
  cashEntries: CashEntry[];
  addCashEntry: (e: Omit<CashEntry, 'id'>) => void;

  // Product returns (accounting)
  productReturns: ProductReturn[];
  addProductReturn: (r: Omit<ProductReturn, 'id'>) => void;
  updateProductReturn: (r: ProductReturn) => void;
  deleteProductReturn: (id: number) => void;

  // Reminders
  reminders: PersonalReminder[];
  addReminder: (r: Omit<PersonalReminder, 'id' | 'created_at'>) => void;
  updateReminder: (r: PersonalReminder) => void;
  deleteReminder: (id: number) => void;
  toggleReminderDone: (id: number) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'created_at'>) => void;
  markAllRead: () => void;
  markRead: (id: number) => void;
  clearNotification: (id: number) => void;

  // Pending Approvals
  pendingApprovals: PendingApproval[];
  addPendingApproval: (p: Omit<PendingApproval, 'id' | 'created_at' | 'status'>) => void;
  updatePendingApproval: (id: number, updater: (p: PendingApproval) => PendingApproval) => void;
  /** گزارش فعالیت نقش‌های غیرمدیر به همهٔ مدیران فعال (اعلان + لینک تأیید) */
  reportStaffActivityToAdmins: (title: string, message: string, actorUserId: number, actorName: string) => void;
  /** فاکتور خرید → ارسال لیست برداشت به فروشنده/انباردار/حسابدار؛ تأیید نهایی با مدیر */
  addPurchaseListShare: (args: {
    invoiceId: number;
    invoiceNumber: string;
    supplierName: string;
    assignee: User;
    items: { product_name: string; quantity: number }[];
    managerName: string;
    managerId: number;
  }) => void;
  approveItem: (id: number, reviewerName: string) => void;
  rejectItem: (id: number, reviewerName: string) => void;

  // Users
  users: User[];
  addUser: (u: Omit<User, 'id' | 'last_login'>) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: number) => void;
  changeUserPassword: (id: number, newPassword: string) => void;

  // Settings
  shopSettings: ShopSettings;
  updateShopSettings: (s: Partial<ShopSettings>) => void;

  /** چند انبار نام‌گذاری‌شده (موجودی کل همان stock_warehouse است؛ برای سازمان‌دهی و آینده) */
  warehouses: WarehouseBin[];
  addWarehouse: (name: string) => void;
  removeWarehouse: (id: number) => void;

  /** اقلام دستی لیست خرید بعدی / تأمین */
  procurementManualLines: ProcurementManualLine[];
  addProcurementManualLine: (line: Omit<ProcurementManualLine, 'id' | 'created_at'>) => void;
  updateProcurementManualLine: (line: ProcurementManualLine) => void;
  deleteProcurementManualLine: (id: number) => void;

  // Currency rates (manual)
  currencyRates: Record<string, number>;
  updateCurrencyRate: (code: string, rate: number) => void;

  /** پاک‌سازی داده‌های عملیاتی محلی (persist): حسابداری، مشتری، تأمین‌کننده، بدهی، فاکتور و ... */
  resetLocalBusinessData: () => void;
}

// ─── Initial data ───────────────────────────────────────────────────────────
/** Blank defaults for new shops / server hydration when no data yet */
export const emptyShopSettings: ShopSettings = {
  shop_name: '',
  seller_name: '',
  shop_address: '',
  shop_phone: '',
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
};

const defaultShopSettings: ShopSettings = { ...emptyShopSettings };

const defaultStaff: StaffMember[] = [];
const defaultExpenses: Expense[] = [];
const defaultCashEntries: CashEntry[] = [];

/** هنگام تغییر فروشگاه یا ورود اولیه — جلوگیری از دیدن دادهٔ دکان قبلی */
function emptyBusinessSlice(): Partial<AppStore> {
  return {
    products: [],
    books: [],
    categories: [],
    expiryRecords: [],
    serialNumbers: [],
    customers: [],
    invoices: [],
    purchaseInvoices: [],
    debts: [],
    suppliers: [],
    staff: defaultStaff,
    expenses: defaultExpenses,
    cashEntries: defaultCashEntries,
    productReturns: [],
    reminders: [],
    notifications: [],
    pendingApprovals: [],
    users: [],
    shopSettings: { ...emptyShopSettings },
    currencyRates: { USD: 75, EUR: 82, IRT: 0.02 },
    procurementManualLines: [],
    warehouses: [{ id: 1, name: 'انبار اصلی' }],
  };
}

/** جلوگیری از بازگردانی نسخهٔ قدیمی localStorage که ممکن بود currentUser/shopCode ذخیره کند */
const AUTH_KEYS_NEVER_FROM_STORAGE = new Set<string>([
  'currentUser',
  'authToken',
  'shopCode',
  'isDemo',
  'sessionExpiry',
  'demoTrialEndsAt',
  'demoTrialBlocked',
  'shopSuspended',
]);

function mergePersistedWithoutAuth(persistedState: unknown, currentState: AppStore): AppStore {
  if (persistedState === null || typeof persistedState !== 'object') return currentState;
  const p = persistedState as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...(currentState as unknown as Record<string, unknown>) };
  for (const key of Object.keys(p)) {
    if (AUTH_KEYS_NEVER_FROM_STORAGE.has(key)) continue;
    merged[key] = p[key];
  }
  return merged as unknown as AppStore;
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      shopCode: '',
      authToken: null,
      isDemo: false,
      sessionExpiry: null,
      demoTrialEndsAt: null,
      demoTrialBlocked: false,
      shopSuspended: false,

      warehouses: [{ id: 1, name: 'انبار اصلی' }],
      addWarehouse: (name) => {
        const list = get().warehouses;
        const id = nextId(list.length ? list : [{ id: 0 }]);
        const label = String(name || '').trim() || `انبار ${id}`;
        set({ warehouses: [...list, { id, name: label }] });
      },
      removeWarehouse: (id) => {
        if (id === 1) return;
        set((s) => ({ warehouses: s.warehouses.filter((w) => w.id !== id) }));
      },

      login: (user, shopCode, isDemo = false, sessionTimeoutMinutes = 120, demoTrialEndsAt: string | null = null) => {
        const expiry = Date.now() + Math.max(5, Number(sessionTimeoutMinutes || 120)) * 60 * 1000;
        const prev = get();
        const prevShop = prev.shopCode;
        const prevId = prev.currentUser?.id;
        const prevRole = prev.currentUser?.role;
        const authSlice = {
          currentUser: user,
          shopCode,
          isDemo,
          sessionExpiry: expiry,
          demoTrialEndsAt: demoTrialEndsAt ?? null,
          demoTrialBlocked: false,
          shopSuspended: false,
        };
        const identityChanged =
          prevShop !== shopCode ||
          prevId !== user.id ||
          prevRole !== user.role;
        if (identityChanged) {
          set({ ...emptyBusinessSlice(), ...authSlice });
        } else {
          set(authSlice);
        }
      },

      setDemoTrialBlocked: (blocked) => set({ demoTrialBlocked: blocked }),
      setShopSuspended: (suspended) => set({ shopSuspended: suspended }),

      patchCurrentUser: (partial) => {
        const cur = get().currentUser;
        if (!cur) return;
        set({ currentUser: { ...cur, ...partial } as User });
      },

      setAuthToken: (token) => set({ authToken: token }),

      logout: () =>
        set({
          currentUser: null,
          shopCode: '',
          authToken: null,
          isDemo: false,
          sessionExpiry: null,
          demoTrialEndsAt: null,
          demoTrialBlocked: false,
          shopSuspended: false,
        }),

      checkSession: () => {
        const { sessionExpiry } = get();
        if (!sessionExpiry) return false;
        if (Date.now() > sessionExpiry) {
          get().logout();
          return false;
        }
        return true;
      },

      hydrateFromServer: (payload) => {
        const syncFields = [
          'products', 'books', 'categories', 'expiryRecords', 'serialNumbers', 'customers',
          'invoices', 'purchaseInvoices', 'debts', 'suppliers', 'staff', 'expenses',
          'cashEntries', 'productReturns', 'reminders', 'notifications', 'pendingApprovals', 'users',
          'shopSettings', 'currencyRates', 'procurementManualLines',
        ] as const;

        const next: Partial<AppStore> = {};
        syncFields.forEach((field) => {
          if (field === 'shopSettings' && payload.shopSettings !== undefined && typeof payload.shopSettings === 'object') {
            (next as Record<string, unknown>).shopSettings = {
              ...emptyShopSettings,
              ...(payload.shopSettings as ShopSettings),
            };
          } else if (field === 'procurementManualLines' && Array.isArray(payload.procurementManualLines)) {
            (next as Record<string, unknown>).procurementManualLines = payload.procurementManualLines;
          } else if (payload[field] !== undefined) {
            (next as Record<string, unknown>)[field] = payload[field];
          }
          /* اگر کلیدی در payload نیست، مقدار محلی حفظ می‌شود (سرور ناقص نباید لیست‌ها را خالی کند) */
        });
        set(next);
      },

      buildSyncPayload: () => {
        const state = get();
        return {
          products: state.products,
          books: state.books,
          categories: state.categories,
          expiryRecords: state.expiryRecords,
          serialNumbers: state.serialNumbers,
          customers: state.customers,
          invoices: state.invoices,
          purchaseInvoices: state.purchaseInvoices,
          debts: state.debts,
          suppliers: state.suppliers,
          staff: state.staff,
          expenses: state.expenses,
          cashEntries: state.cashEntries,
          productReturns: state.productReturns,
          reminders: state.reminders,
          notifications: state.notifications,
          pendingApprovals: state.pendingApprovals,
          users: state.users,
          shopSettings: state.shopSettings,
          currencyRates: state.currencyRates,
          procurementManualLines: state.procurementManualLines,
          _schemaVersion: 1,
        };
      },

      // Products
      products: [],

      addProduct: (p) => {
        const newP: Product = {
          ...p, id: nextId(get().products),
          created_at: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ products: [newP, ...s.products] }));
        return newP;
      },

      updateProduct: (p) => set(s => ({
        products: s.products.map(x => x.id === p.id ? p : x)
      })),

      deleteProduct: (id) => set(s => ({
        products: s.products.filter(x => x.id !== id)
      })),

      deductStock: (productId, qty, source = 'shop') =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== productId) return p;
            if (source === 'warehouse') {
              return { ...p, stock_warehouse: Math.max(0, p.stock_warehouse - qty) };
            }
            return { ...p, stock_shop: Math.max(0, p.stock_shop - qty) };
          }),
        })),

      restoreStock: (productId, qty, source = 'shop') =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== productId) return p;
            if (source === 'warehouse') {
              return { ...p, stock_warehouse: p.stock_warehouse + qty };
            }
            return { ...p, stock_shop: p.stock_shop + qty };
          }),
        })),

      books: [],

      addBook: (p) => {
        const newB: Book = {
          ...p,
          id: nextId(get().books),
          created_at: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ books: [newB, ...s.books] }));
        return newB;
      },

      updateBook: (b) =>
        set((s) => ({
          books: s.books.map((x) => (x.id === b.id ? b : x)),
        })),

      deleteBook: (id) =>
        set((s) => ({
          books: s.books.filter((x) => x.id !== id),
        })),

      deductBookStock: (bookId, qty, source = 'shop') =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            if (source === 'warehouse') {
              return { ...b, stock_warehouse: Math.max(0, b.stock_warehouse - qty) };
            }
            return { ...b, stock_shop: Math.max(0, b.stock_shop - qty) };
          }),
        })),

      restoreBookStock: (bookId, qty, source = 'shop') =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            if (source === 'warehouse') {
              return { ...b, stock_warehouse: b.stock_warehouse + qty };
            }
            return { ...b, stock_shop: b.stock_shop + qty };
          }),
        })),

      // Categories
      categories: [],

      addCategory: (name) => {
        const newCat: Category = {
          id: nextId(get().categories),
          name, parent_id: null, status: 'active'
        };
        set(s => ({ categories: [...s.categories, newCat] }));
        return newCat;
      },

      deleteCategory: (id) => set(s => ({
        categories: s.categories.filter(c => c.id !== id)
      })),

      // Expiry
      expiryRecords: [],

      addExpiry: (e) => set(s => ({
        expiryRecords: [
          { ...e, id: nextId(s.expiryRecords), created_at: new Date().toISOString().slice(0, 10) },
          ...s.expiryRecords
        ]
      })),

      updateExpiry: (e) => set(s => ({
        expiryRecords: s.expiryRecords.map(x => x.id === e.id ? e : x)
      })),

      deleteExpiry: (id) => set(s => ({
        expiryRecords: s.expiryRecords.filter(x => x.id !== id)
      })),

      // Serials
      serialNumbers: [],

      addSerial: (s_) => set(s => ({
        serialNumbers: [{ ...s_, id: nextId(s.serialNumbers) }, ...s.serialNumbers]
      })),

      updateSerial: (s_) => set(s => ({
        serialNumbers: s.serialNumbers.map(x => x.id === s_.id ? s_ : x)
      })),

      deleteSerial: (id) => set(s => ({
        serialNumbers: s.serialNumbers.filter(x => x.id !== id)
      })),

      // Customers
      customers: [],

      addCustomer: (c) => {
        const newC: Customer = {
          ...c,
          id: nextId(get().customers),
          customer_code: `C${String(nextId(get().customers)).padStart(3, '0')}`,
          created_at: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ customers: [newC, ...s.customers] }));
        return newC;
      },

      updateCustomer: (c) => set(s => ({
        customers: s.customers.map(x => x.id === c.id ? c : x)
      })),

      deleteCustomer: (id) => set(s => ({
        customers: s.customers.filter(x => x.id !== id)
      })),

      updateCustomerBalance: (id, delta) => set(s => ({
        customers: s.customers.map(c =>
          c.id === id
            ? { ...c, balance: c.balance + delta, total_purchases: c.total_purchases + (delta > 0 ? 0 : Math.abs(delta)) }
            : c
        )
      })),

      // Sales Invoices
      invoices: [],

      addInvoice: (inv) => {
        const id = nextId(get().invoices);
        const newInv: Invoice = {
          ...inv,
          id,
          invoice_number: `INV-${String(id).padStart(3, '0')}`,
        };
        const user = get().currentUser;
        /** بدون کاربر (تست) یا مدیر دکان: فاکتور نهایی؛ فروشنده/انباردار/حسابدار: فقط پیش‌نوید تا تأیید مدیر */
        const finalizeNow = !user || user.role === 'admin';

        set(s => ({ invoices: [newInv, ...s.invoices] }));

        if (finalizeNow) {
          const bookstore = get().shopSettings.business_type === 'bookstore';
          newInv.items.forEach((item) => {
            if (bookstore) {
              get().deductBookStock(item.product_id, item.quantity, item.stock_source ?? 'shop');
            } else {
              get().deductStock(item.product_id, item.quantity, item.stock_source ?? 'shop');
            }
          });
          if (newInv.payment_method === 'credit' && newInv.due_amount > 0) {
            get().addDebt({
              invoice_id: newInv.id,
              invoice_number: newInv.invoice_number,
              customer_id: newInv.customer_id,
              customer_name: newInv.customer_name,
              customer_phone: newInv.customer_phone,
              amount: newInv.due_amount,
              due_date: newInv.due_date || '',
              paid_amount: 0,
              remaining_amount: newInv.due_amount,
              status: 'pending',
              tenant_id: get().currentUser?.tenant_id ?? 1,
            });
            get().updateCustomerBalance(newInv.customer_id, -newInv.due_amount);
          }
        }

        if (user && user.role !== 'admin') {
          get().addPendingApproval({
            type: 'sale',
            title: `فاکتور فروش ${newInv.invoice_number}`,
            description: `فروش ${newInv.total.toLocaleString()} افغانی به ${newInv.customer_name}`,
            data: { invoice_id: newInv.id },
            submitted_by: user.full_name,
            submitted_by_role: user.role,
          });
          get().reportStaffActivityToAdmins(
            'فاکتور فروش ثبت شد',
            `فاکتور ${newInv.invoice_number} به مبلغ ${newInv.total.toLocaleString()} ؋ — ${newInv.customer_name}. در «تأیید فروش» بررسی کنید.`,
            user.id,
            user.full_name
          );
        } else if (user) {
          get().addNotification({
            user_id: user.id,
            type: 'pending',
            title: 'فاکتور جدید',
            message: `فاکتور ${newInv.invoice_number} به مبلغ ${newInv.total.toLocaleString()} افغانی ثبت شد`,
            link: '/invoices',
            is_read: false,
            is_heard: false,
          });
        }

        return newInv;
      },

      updateInvoice: (inv) => set(s => ({
        invoices: s.invoices.map(x => x.id === inv.id ? inv : x)
      })),

      deleteInvoice: (id) => set(s => ({
        invoices: s.invoices.filter(x => x.id !== id)
      })),

      // Purchase Invoices
      purchaseInvoices: [],

      addPurchaseInvoice: (p) => {
        const id = nextId(get().purchaseInvoices.length > 0 ? get().purchaseInvoices : [{ id: 0 }]);
        const newP: PurchaseInvoice = {
          ...p,
          id,
          invoice_number: `PUR-${String(id).padStart(3, '0')}`,
          created_at: new Date().toISOString(),
        };
        set(s => ({ purchaseInvoices: [newP, ...s.purchaseInvoices] }));

        // Add stock for each item on purchase
        newP.items.forEach(item => {
          get().restoreStock(item.product_id, item.quantity);
        });

        // Update supplier balance
        if (newP.due_amount > 0) {
          get().updateSupplierBalance(newP.supplier_id, -newP.due_amount);
        }

        return newP;
      },

      updatePurchaseInvoice: (p) => set(s => ({
        purchaseInvoices: s.purchaseInvoices.map(x => x.id === p.id ? p : x)
      })),

      deletePurchaseInvoice: (id) => set(s => ({
        purchaseInvoices: s.purchaseInvoices.filter(x => x.id !== id)
      })),

      // Debts
      debts: [],

      addDebt: (d) => set(s => ({
        debts: [{ ...d, id: nextId(s.debts), created_at: new Date().toISOString().slice(0, 10) }, ...s.debts]
      })),

      payDebt: (id, amount) => set(s => {
        let customerId: number | null = null;
        const nextDebts = s.debts.map(d => {
          if (d.id !== id) return d;
          customerId = d.customer_id;
          const newPaid = d.paid_amount + amount;
          const newRemaining = Math.max(0, d.amount - newPaid);
          return {
            ...d,
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: (newRemaining <= 0 ? 'paid' : 'partial') as Debt['status'],
          };
        });
        const nextCustomers =
          customerId != null
            ? s.customers.map(c =>
                c.id === customerId ? { ...c, balance: c.balance + amount } : c
              )
            : s.customers;
        return { debts: nextDebts, customers: nextCustomers };
      }),

      updateDebt: (d) => set(s => ({
        debts: s.debts.map(x => x.id === d.id ? d : x)
      })),

      // Suppliers
      suppliers: [],

      addSupplier: (s_) => {
        const id = nextId(get().suppliers);
        const newS: Supplier = {
          ...s_,
          id,
          supplier_code: `SUP${String(id).padStart(3, '0')}`,
          created_at: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ suppliers: [newS, ...s.suppliers] }));
        return newS;
      },

      updateSupplier: (s_) => set(s => ({
        suppliers: s.suppliers.map(x => x.id === s_.id ? s_ : x)
      })),

      deleteSupplier: (id) => set(s => ({
        suppliers: s.suppliers.filter(x => x.id !== id)
      })),

      updateSupplierBalance: (id, delta) => set(s => ({
        suppliers: s.suppliers.map(sup =>
          sup.id === id ? { ...sup, balance: sup.balance + delta } : sup
        )
      })),

      // Staff
      staff: defaultStaff,

      addStaff: (s_) => set(s => ({
        staff: [{ ...s_, id: nextId(s.staff), paid_months: [] }, ...s.staff]
      })),

      updateStaff: (s_) => set(s => ({
        staff: s.staff.map(x => x.id === s_.id ? s_ : x)
      })),

      deleteStaff: (id) => set(s => ({
        staff: s.staff.filter(x => x.id !== id)
      })),

      payStaffSalary: (id, month, opts) => set(s => ({
        staff: s.staff.map(x => {
          if (x.id !== id || x.paid_months.includes(month)) return x;
          const note = opts?.note?.trim();
          return {
            ...x,
            paid_months: [...x.paid_months, month],
            salary_payment_notes:
              note
                ? { ...(x.salary_payment_notes || {}), [month]: note }
                : x.salary_payment_notes,
          };
        })
      })),

      // Expenses
      expenses: defaultExpenses,

      addExpense: (e) => set(s => ({
        expenses: [{ ...e, id: nextId(s.expenses) }, ...s.expenses]
      })),

      deleteExpense: (id) => set(s => ({
        expenses: s.expenses.filter(x => x.id !== id)
      })),

      // Cash
      cashEntries: defaultCashEntries,

      addCashEntry: (e) => set(s => ({
        cashEntries: [{ ...e, id: nextId(s.cashEntries) }, ...s.cashEntries]
      })),

      productReturns: [],

      addProductReturn: (r) => set(s => ({
        productReturns: [{ ...r, id: nextId(s.productReturns) }, ...s.productReturns]
      })),

      updateProductReturn: (r) => set(s => ({
        productReturns: s.productReturns.map(x => x.id === r.id ? r : x)
      })),

      deleteProductReturn: (id) => set(s => ({
        productReturns: s.productReturns.filter(x => x.id !== id)
      })),

      // Reminders
      reminders: [],

      addReminder: (r) => set(s => ({
        reminders: [
          { ...r, id: nextId(s.reminders), created_at: new Date().toISOString().slice(0, 10) },
          ...s.reminders
        ]
      })),

      updateReminder: (r) => set(s => ({
        reminders: s.reminders.map(x => x.id === r.id ? r : x)
      })),

      deleteReminder: (id) => set(s => ({
        reminders: s.reminders.filter(x => x.id !== id)
      })),

      toggleReminderDone: (id) => set(s => ({
        reminders: s.reminders.map(r =>
          r.id === id ? { ...r, is_done: !r.is_done } : r
        )
      })),

      // Notifications
      notifications: [],

      addNotification: (n) => set(s => ({
        notifications: [
          { ...n, id: nextId(s.notifications), created_at: new Date().toISOString() },
          ...s.notifications
        ]
      })),

      markAllRead: () => set(s => ({
        notifications: s.notifications.map(n => ({ ...n, is_read: true }))
      })),

      markRead: (id) => set(s => ({
        notifications: s.notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        )
      })),

      clearNotification: (id) => set(s => ({
        notifications: s.notifications.filter(n => n.id !== id)
      })),

      // Pending Approvals
      pendingApprovals: [],

      addPendingApproval: (p) => set(s => ({
        pendingApprovals: [
          {
            ...p, id: nextId(s.pendingApprovals),
            status: 'pending',
            created_at: new Date().toISOString()
          },
          ...s.pendingApprovals
        ]
      })),

      updatePendingApproval: (id, updater) => set(s => ({
        pendingApprovals: s.pendingApprovals.map(p => (p.id === id ? updater(p) : p)),
      })),

      reportStaffActivityToAdmins: (title, message, actorUserId, actorName) => {
        const admins = get().users.filter(u => u.role === 'admin' && u.status === 'active');
        const body = `${actorName}: ${message}`;
        for (const a of admins) {
          get().addNotification({
            user_id: actorUserId,
            recipient_user_id: a.id,
            type: 'pending',
            title,
            message: body,
            link: '/pending',
            is_read: false,
            is_heard: false,
          });
        }
      },

      addPurchaseListShare: ({
        invoiceId,
        invoiceNumber,
        supplierName,
        assignee,
        items,
        managerName,
        managerId,
      }) => {
        const line_labels = items.map(i => i.product_name);
        const line_qty = items.map(i => i.quantity);
        const picked = items.map(() => false);
        const data: PurchaseListTaskData = {
          purchase_invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          supplier_name: supplierName,
          assignee_user_id: assignee.id,
          assignee_name: assignee.full_name,
          phase: 'collecting',
          line_labels,
          line_qty,
          picked,
        };
        set(s => {
          const filtered = s.pendingApprovals.filter(p => {
            if (p.type !== 'purchase_list' || p.status !== 'pending') return true;
            const d = p.data as unknown as PurchaseListTaskData;
            return d.purchase_invoice_id !== invoiceId;
          });
          const id = nextId(filtered.length ? filtered : [{ id: 0 }]);
          const row: PendingApproval = {
            id,
            type: 'purchase_list',
            title: `لیست خرید ${invoiceNumber}`,
            description: `برداشت کالا — ${supplierName} — گیرنده: ${assignee.full_name}`,
            data: data as unknown as Record<string, unknown>,
            submitted_by: managerName,
            submitted_by_role: 'admin',
            status: 'pending',
            created_at: new Date().toISOString(),
          };
          return { pendingApprovals: [row, ...filtered] };
        });

        get().addNotification({
          user_id: managerId,
          recipient_user_id: assignee.id,
          type: 'pending',
          title: 'لیست خرید برای شماست',
          message: `${managerName} فاکتور خرید ${invoiceNumber} (${supplierName}) را برای برداشتن کالا فرستاد. از «تأیید فروش / لیست خرید» اقدام کنید.`,
          link: '/pending',
          is_read: false,
          is_heard: false,
        });

        get().reportStaffActivityToAdmins(
          'لیست خرید ارسال شد',
          `فاکتور ${invoiceNumber} برای ${assignee.full_name} (${assignee.role}) ارسال شد.`,
          managerId,
          managerName
        );
      },

      approveItem: (id, reviewerName) => {
        if (get().currentUser?.role !== 'admin') return;
        set(s => {
          const item = s.pendingApprovals.find(p => p.id === id);
          if (!item) return s;

          let nextInvoices = s.invoices;
          let nextProducts = s.products;
          let nextDebts = s.debts;
          let nextCustomers = s.customers;
          let nextExpenses = s.expenses;
          let nextCash = s.cashEntries;
          let nextReturns = s.productReturns;

          if (item.type === 'sale') {
            const invoiceId = (item.data as { invoice_id?: number }).invoice_id;
            const inv = invoiceId != null ? s.invoices.find(i => i.id === invoiceId) : undefined;
            if (inv) {
              nextInvoices = s.invoices.map(i =>
                i.id === invoiceId ? { ...i, approval_status: 'approved' as const, status: 'approved' as const } : i
              );
              nextProducts = s.products.map(p => {
                let next = { ...p };
                for (const line of inv.items) {
                  if (line.product_id !== p.id) continue;
                  const qty = line.quantity;
                  const src = line.stock_source ?? 'shop';
                  if (src === 'warehouse') {
                    next = { ...next, stock_warehouse: Math.max(0, Number(next.stock_warehouse || 0) - qty) };
                  } else {
                    next = { ...next, stock_shop: Math.max(0, Number(next.stock_shop || 0) - qty) };
                  }
                }
                return next;
              });
              if (inv.payment_method === 'credit' && inv.due_amount > 0) {
                const debtId = nextId(s.debts);
                const nowDate = new Date().toISOString().slice(0, 10);
                nextDebts = [
                  {
                    id: debtId,
                    invoice_id: inv.id,
                    invoice_number: inv.invoice_number,
                    customer_id: inv.customer_id,
                    customer_name: inv.customer_name,
                    customer_phone: inv.customer_phone,
                    amount: inv.due_amount,
                    due_date: inv.due_date || '',
                    paid_amount: 0,
                    remaining_amount: inv.due_amount,
                    status: 'pending' as const,
                    tenant_id: inv.tenant_id,
                    created_at: nowDate,
                  },
                  ...s.debts,
                ];
                nextCustomers = s.customers.map(c =>
                  c.id === inv.customer_id
                    ? { ...c, balance: c.balance - inv.due_amount, total_purchases: c.total_purchases + inv.total }
                    : c
                );
              }
            }
          }

          if (item.type === 'warehouse_transfer') {
            const d = item.data as { product_id: number; quantity: number };
            nextProducts = s.products.map(p => {
              if (p.id !== d.product_id) return p;
              const q = d.quantity;
              if (q > p.stock_warehouse) return p;
              return { ...p, stock_warehouse: p.stock_warehouse - q, stock_shop: p.stock_shop + q };
            });
          }

          if (item.type === 'staff_expense') {
            const payload = item.data as Omit<Expense, 'id'>;
            nextExpenses = [{ ...payload, id: nextId(s.expenses) }, ...s.expenses];
          }
          if (item.type === 'staff_cash') {
            const payload = item.data as Omit<CashEntry, 'id'>;
            nextCash = [{ ...payload, id: nextId(s.cashEntries) }, ...s.cashEntries];
          }
          if (item.type === 'staff_return') {
            const payload = item.data as Omit<ProductReturn, 'id'>;
            nextReturns = [
              { ...payload, id: nextId(s.productReturns), status: 'approved' as const },
              ...s.productReturns,
            ];
          }

          if (item.type === 'purchase_list') {
            const d = item.data as unknown as PurchaseListTaskData;
            const assigneeId = d.assignee_user_id;
            const reviewerId = get().currentUser?.id ?? 1;
            setTimeout(() => {
              get().addNotification({
                user_id: reviewerId,
                recipient_user_id: assigneeId,
                type: 'message',
                title: 'لیست خرید تأیید شد',
                message: `مدیر فاکتور خرید ${d.invoice_number} (${d.supplier_name}) را تأیید کرد.`,
                link: '/invoices',
                is_read: false,
                is_heard: false,
              });
            }, 0);
          }

          return {
            ...s,
            invoices: nextInvoices,
            products: nextProducts,
            debts: nextDebts,
            customers: nextCustomers,
            expenses: nextExpenses,
            cashEntries: nextCash,
            productReturns: nextReturns,
            pendingApprovals: s.pendingApprovals.map(p =>
              p.id === id
                ? { ...p, status: 'approved', reviewed_by: reviewerName, reviewed_at: new Date().toISOString() }
                : p
            ),
          };
        });
      },

      rejectItem: (id, reviewerName) => {
        if (get().currentUser?.role !== 'admin') return;
        set(s => {
          const item = s.pendingApprovals.find(p => p.id === id);
          if (!item) return s;

          let nextInvoices = s.invoices;
          if (item.type === 'sale') {
            const invoiceId = (item.data as { invoice_id?: number }).invoice_id;
            if (invoiceId != null) {
              nextInvoices = s.invoices.map(inv =>
                inv.id === invoiceId ? { ...inv, approval_status: 'rejected' as const, status: 'rejected' as const } : inv
              );
            }
          }

          if (item.type === 'purchase_list') {
            const d = item.data as unknown as PurchaseListTaskData;
            const assigneeId = d.assignee_user_id;
            const reviewerId = get().currentUser?.id ?? 1;
            setTimeout(() => {
              get().addNotification({
                user_id: reviewerId,
                recipient_user_id: assigneeId,
                type: 'message',
                title: 'لیست خرید رد شد',
                message: `مدیر فاکتور خرید ${d.invoice_number} را رد کرد. در صورت نیاز با مدیر هماهنگ کنید.`,
                link: '/pending',
                is_read: false,
                is_heard: false,
              });
            }, 0);
          }

          return {
            ...s,
            invoices: nextInvoices,
            pendingApprovals: s.pendingApprovals.map(p =>
              p.id === id
                ? { ...p, status: 'rejected', reviewed_by: reviewerName, reviewed_at: new Date().toISOString() }
                : p
            ),
          };
        });
      },

      // Users
      users: [],

      addUser: (u) => set(s => ({
        users: [
          {
            ...u,
            id: nextId(s.users),
            password: hashPassword(u.password),
            last_login: '',
          },
          ...s.users
        ]
      })),

      updateUser: (u) => set(s => ({
        users: s.users.map(x => x.id === u.id ? u : x)
      })),

      deleteUser: (id) => set(s => ({
        users: s.users.filter(x => x.id !== id)
      })),

      changeUserPassword: (id, newPassword) => set(s => ({
        users: s.users.map(u =>
          u.id === id ? { ...u, password: hashPassword(newPassword) } : u
        )
      })),

      // Settings
      shopSettings: defaultShopSettings,

      updateShopSettings: (s_) => set(s => ({
        shopSettings: { ...s.shopSettings, ...s_ }
      })),

      procurementManualLines: [],

      addProcurementManualLine: (line) => {
        const row: ProcurementManualLine = {
          ...line,
          id: nextId(get().procurementManualLines),
          created_at: new Date().toISOString().slice(0, 10),
        };
        set(s => ({ procurementManualLines: [row, ...s.procurementManualLines] }));
      },

      updateProcurementManualLine: (line) => set(s => ({
        procurementManualLines: s.procurementManualLines.map(x => x.id === line.id ? line : x),
      })),

      deleteProcurementManualLine: (id) => set(s => ({
        procurementManualLines: s.procurementManualLines.filter(x => x.id !== id),
      })),

      // Currency rates
      currencyRates: { USD: 75, EUR: 82, IRT: 0.02 },

      updateCurrencyRate: (code, rate) => set(s => ({
        currencyRates: { ...s.currencyRates, [code]: rate }
      })),

      resetLocalBusinessData: () =>
        set({
          products: [],
          books: [],
          categories: [],
          expiryRecords: [],
          serialNumbers: [],
          customers: [],
          invoices: [],
          purchaseInvoices: [],
          debts: [],
          suppliers: [],
          expenses: [],
          cashEntries: [],
          productReturns: [],
          reminders: [],
          notifications: [],
          pendingApprovals: [],
          procurementManualLines: [],
          warehouses: [{ id: 1, name: 'انبار اصلی' }],
        }),
    }),
    {
      name: 'smarthub-crm-store',
      partialize: (state) => ({
        products: state.products,
        books: state.books,
        categories: state.categories,
        expiryRecords: state.expiryRecords,
        serialNumbers: state.serialNumbers,
        customers: state.customers,
        invoices: state.invoices,
        purchaseInvoices: state.purchaseInvoices,
        debts: state.debts,
        suppliers: state.suppliers,
        staff: state.staff,
        expenses: state.expenses,
        cashEntries: state.cashEntries,
        productReturns: state.productReturns,
        reminders: state.reminders,
        notifications: state.notifications,
        pendingApprovals: state.pendingApprovals,
        users: state.users,
        shopSettings: state.shopSettings,
        currencyRates: state.currencyRates,
        procurementManualLines: state.procurementManualLines,
        warehouses: state.warehouses,
        // Keep auth/session in memory to reduce XSS persistence risk.
      }),
      merge: mergePersistedWithoutAuth,
      /** پس از merge با localStorage، با کوکی دوباره /me بزنیم تا نقش با نشست واقعی یکی بماند (رفع قاطی شدن نقش بعد از F5) */
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          void import('../utils/applyAuthMeResponse')
            .then(({ applyAuthMeResponse }) =>
              import('../services/api').then(({ apiMe }) =>
                apiMe()
                  .then((data) => {
                    if (data.user) applyAuthMeResponse(data);
                  })
                  .catch(() => {
                    /* بدون کوکی — عادی */
                  })
              )
            )
            .catch(() => {});
        });
      },
    }
  )
);

export { hashPassword, checkPassword };
