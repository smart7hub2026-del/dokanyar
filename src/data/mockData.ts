export type Role = 'super_admin' | 'admin' | 'seller' | 'stock_keeper';
export type LangCode = 'dari' | 'pashto' | 'farsi' | 'english';
export type CurrencyCode = 'AFN' | 'USD' | 'EUR' | 'IRT';

export interface User {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: Role;
  status: 'active' | 'inactive';
  last_login: string;
  tenant_id?: number;
  two_factor_enabled?: boolean;
  preferred_language?: LangCode;
  preferred_currency?: CurrencyCode;
}

export interface BusinessType {
  id: number;
  name: string;
  code: string;
  icon: string;
  is_active: boolean;
  features?: string[];
}

export interface Tenant {
  id: number;
  shop_name: string;
  shop_domain: string;
  shop_phone: string;
  shop_address: string;
  owner_name: string;
  owner_phone: string;
  owner_password?: string;
  owner_whatsapp?: string;
  owner_email?: string;
  subscription_plan: 'basic' | 'premium';
  subscription_start: string;
  subscription_end: string;
  subscription_status: 'active' | 'expired' | 'suspended';
  max_users: number;
  max_products: number;
  database_name: string;
  database_user?: string;
  database_password?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login: string;
  users_count: number;
  products_count: number;
  sales_today: number;
  business_type_id?: number;
  business_type_name?: string;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Currency {
  id: number;
  code: CurrencyCode;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
  is_active: boolean;
}

export interface Language {
  id: number;
  code: LangCode;
  name: string;
  direction: 'rtl' | 'ltr';
  is_default: boolean;
  is_active: boolean;
}

export interface Translation { [key: string]: string; }
export interface Translations {
  dari: Translation;
  pashto: Translation;
  farsi: Translation;
  english: Translation;
}

export interface Product {
  id: number;
  product_code: string;
  barcode: string;
  name: string;
  category_id: number;
  category_name: string;
  unit_id?: number;
  unit_name?: string;
  purchase_price: number;
  sale_price: number;
  stock_shop: number;
  stock_warehouse: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  tenant_id: number;
  has_expiry?: boolean;
  has_serial?: boolean;
  image_url?: string;
  /** واحد پول قیمت فروش (پیش‌فرض افغانی) */
  currency_code?: CurrencyCode;
}

/** موجودی جدا برای کتابفروشی — همگام با سرور کلید books */
export interface Book {
  id: number;
  sku: string;
  isbn: string;
  title: string;
  author_name: string;
  publisher_name: string;
  category_id: number;
  category_name: string;
  purchase_price: number;
  sale_price: number;
  stock_shop: number;
  stock_warehouse: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  tenant_id: number;
  currency_code?: CurrencyCode;
  image_url?: string;
}

export interface ProductExpiry {
  id: number;
  product_id: number;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  created_at: string;
}

export interface SerialNumber {
  id: number;
  product_id: number;
  product_name: string;
  serial_number: string;
  warranty_months: number;
  status: 'available' | 'sold';
  sold_invoice_id?: number;
}

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  balance: number;
  total_purchases: number;
  status: 'active' | 'inactive';
  reminder_enabled: boolean;
  reminder_days_before: number;
  last_reminder_date?: string;
  created_at: string;
  tenant_id: number;
}

export interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  /** برای چاپ فاکتور با عکس؛ اختیاری */
  image_url?: string;
  /** کسر موجودی از مغازه یا انبار مرکزی */
  stock_source?: 'shop' | 'warehouse';
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  seller_id: number;
  seller_name: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: 'cash' | 'credit';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approval_status: 'pending' | 'approved' | 'rejected';
  invoice_date: string;
  due_date: string;
  notes: string;
  items: InvoiceItem[];
  tenant_id: number;
  currency?: CurrencyCode;
}

export interface Debt {
  id: number;
  invoice_id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  amount: number;
  due_date: string;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  created_at: string;
  tenant_id: number;
}

export interface Reminder {
  id: number;
  debt_id: number;
  customer_name: string;
  reminder_date: string;
  reminder_type: 'sms' | 'whatsapp' | 'email';
  sent_to: string;
  message: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  /** اگر پر باشد فقط همین کاربر اعلان را می‌بیند؛ خالی = همه */
  recipient_user_id?: number | null;
  type: 'debt' | 'note' | 'stock' | 'expiry' | 'pending' | 'message';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  is_heard: boolean;
  created_at: string;
}

export interface SupportMessage {
  id: number;
  tenant_id: number;
  tenant_name: string;
  sender_name: string;
  sender_phone: string;
  subject: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  status: 'pending' | 'read' | 'replied';
  created_at: string;
  reply?: string;
}

export interface PrintSettings {
  paper_size: 'A4' | 'A5' | '80mm' | '58mm';
  logo_path: string;
  show_shop_name: boolean;
  show_shop_address: boolean;
  show_shop_phone: boolean;
  show_seller_name: boolean;
  show_barcode: boolean;
  footer_text: string;
  print_copies: number;
}

export interface BackupSettings {
  email: string;
  backup_time: string;
  frequency: 'daily' | 'weekly';
  keep_days: number;
  send_email: boolean;
  last_backup_date: string;
}

export interface SavedReport {
  id: number;
  report_name: string;
  report_type: string;
  format: 'pdf' | 'excel';
  created_by: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'active' | 'inactive';
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  table_name: string;
  record_id?: number;
  old_data?: string;
  new_data?: string;
  ip_address: string;
  created_at: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  user_name: string;
  ip_address: string;
  user_agent: string;
  login_time: string;
  last_activity: string;
  expiry_time: string;
  is_active: boolean;
}

export interface OfflineQueue {
  id: string;
  operation_type: 'insert' | 'update' | 'delete';
  table_name: string;
  data: string;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date: string;
}

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  target_type: 'all' | 'selected';
  send_sms: boolean;
  send_in_app: boolean;
  created_at: string;
  created_by: string;
}

export interface Supplier {
  id: number;
  supplier_code: string;
  company_name: string;
  contact_name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  product_types: string;
  balance: number; // negative = we owe them
  total_purchases: number;
  status: 'active' | 'inactive';
  created_at: string;
  notes?: string;
}

export interface PersonalReminder {
  id: number;
  title: string;
  note: string;
  reminder_date: string;
  reminder_time?: string;
  is_done: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
}

export interface Payment {
  id: number;
  tenant_id: number;
  tenant_name: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank';
  for_month: string;
  status: 'pending' | 'completed';
}

// ============= TRANSLATIONS =============
export const translations: Translations = {
  dari: {
    dashboard: 'داشبورد', products: 'محصولات', bookstore_inventory: 'کتاب‌ها و موجودی', customers: 'مشتریان',
    sales: 'فروش', reports: 'گزارش‌ها', settings: 'تنظیمات',
    users: 'کاربران', shop_users: 'کاربران فروشگاه', debts: 'بدهی‌ها', notifications: 'اعلان‌ها',
    backup: 'بکاپ', support: 'پشتیبانی', logout: 'خروج',
    search: 'جستجو', add: 'افزودن', edit: 'ویرایش', delete: 'حذف',
    save: 'ذخیره', cancel: 'انصراف', confirm: 'تأیید',
    name: 'نام', phone: 'موبایل', address: 'آدرس', status: 'وضعیت',
    active: 'فعال', inactive: 'غیرفعال', total: 'مجموع',
    date: 'تاریخ', notes: 'یادداشت', actions: 'عملیات',
    price: 'قیمت', quantity: 'تعداد', currency: 'ارز',
    language: 'زبان', security: 'امنیت', offline: 'آفلاین',
    sync: 'همگام‌سازی', pending_sales: 'تأیید و لیست خرید',
    expiry: 'تاریخ انقضا', serial: 'سریال‌نامبر',
    reminders: 'یادآوری‌ها', print_settings: 'تنظیمات چاپ',
    product_sales_ranking: 'رتبه فروش کالاها',
    reorder_list_title: 'خرید بعدی و اتمام موجودی',
    business_types: 'صنف‌ها', image_search: 'جستجوی تصویری',
    warehouse_page: 'انبار', warehouse_subtitle: 'موجودی کالا در انبار مرکزی؛ انتقال به مغازه برای فروش',
    two_factor: 'احراز دو مرحله‌ای', activity_log: 'لاگ فعالیت',
    sessions: 'نشست‌های فعال', exchange_rate: 'نرخ ارز',
    welcome: 'خوش آمدید', tenants: 'دکان‌ها', payments: 'پرداخت‌ها',
    manage_shops: 'مدیریت دکان‌ها', billing: 'صورتحساب', analytics360: 'آنالیتیکس ۳۶۰°',
    architecture: 'معماری سیستم', security_analysis: 'تحلیل امنیت', system_analysis: 'تحلیل کمبودها',
    broadcast_notifications: 'اعلان همگانی', general_reports: 'گزارش‌های کلی', language_currency: 'زبان و ارز',
    sales_pos: 'فروش / POS', invoices: 'فاکتورها', suppliers: 'تامین‌کنندگان', accounting: 'حسابداری',
    staff_payroll: 'پرسنل و حقوق', inventory_management: 'مدیریت موجودی', purchase_invoices: 'فاکتورها (خرید)',
    inventory_reports: 'گزارش موجودی', shop_management: 'مدیریت فروشگاه', role_super_admin: 'ابرادمین',
    role_admin: 'مدیر دکان', role_seller: 'فروشنده', role_stock_keeper: 'انباردار', role_accountant: 'حسابدار',
    online: 'آنلاین', offline_mode: 'حالت آفلاین', app_name: 'دکان یار',
    search_products_customers_pages: 'جستجوی محصول، مشتری، صفحه...',
    no_results_found: 'نتیجه‌ای یافت نشد', quick_access: 'دسترسی سریع',
    close: 'بستن', manage_account_settings: 'مدیریت تنظیمات حساب کاربری',
    read_all: 'خواندن همه', no_notifications: 'اعلانی وجود ندارد',
    view_all_notifications: 'مشاهده همه اعلان‌ها',
    welcome_message: 'خوش آمدید', smart_management: 'مدیریت هوشمند فروشگاه در یک نگاه',
    new_sale: 'فروش جدید', add_product: 'افزودن کالا', new_customer: 'مشتری جدید',
    new_invoice: 'صدور فاکتور', daily_report: 'گزارش روزانه', profit_analysis: 'آنالیز سود',
    today_sales: 'فروش امروز', monthly_profit: 'سود خالص ماهانه', low_stock: 'کم‌موجودی انبار',
    overdue_debts: 'بدهی‌های معوق', sales_expense_chart: 'نمودار فروش و هزینه',
    top_products: 'پرفروش‌ترین کالاها', recent_transactions: 'آخرین تراکنش‌ها',
    no_data: 'داده‌ای وجود ندارد', loading: 'در حال بارگذاری', showing: 'نمایش', of: 'از',
    rows_per_page: 'ردیف در صفحه', filter: 'فیلتر', sort: 'مرتب‌سازی', export: 'صادرات',
    product_name: 'نام محصول', category: 'دسته‌بندی', stock: 'موجودی',
    purchase_price: 'قیمت خرید', sale_price: 'قیمت فروش', barcode: 'بارکد',
    description: 'توضیحات', all_products: 'همه محصولات',
    customer_name: 'نام مشتری', total_purchases: 'کل خرید', last_purchase: 'آخرین خرید',
    balance: 'مانده حساب', all_customers: 'همه مشتریان',
    create: 'ایجاد', update: 'بروزرسانی', details: 'جزئیات', back: 'بازگشت',
    next: 'بعدی', previous: 'قبلی', submit: 'ثبت', clear: 'پاک کردن',
    select_all: 'انتخاب همه', from_date: 'از تاریخ', to_date: 'تا تاریخ',
    download: 'دانلود', upload: 'آپلود', success: 'موفق', error: 'خطا',
    warning: 'هشدار', required: 'الزامی', optional: 'اختیاری', yes: 'بله', no: 'خیر',
    // Dashboard extra
    last_update: 'آخرین به‌روزرسانی', minutes_ago: 'دقیقه پیش', increase_vs_last_month: 'افزایش نسبت به ماه قبل',
    needs_restock: 'نیازمند بازپر', stock_ok: 'موجودی انبار مناسب است', debtor_customer: 'مشتری بدهکار',
    performance_7d: 'تحلیل عملکرد در ۷ روز گذشته', weekly_sales_count: 'بر اساس تعداد فروش هفتگی',
    unit: 'واحد', expense: 'هزینه', recent_invoices: 'آخرین فاکتورهای فروش', view_all: 'مشاهده همه',
    cash: 'نقد', credit: 'نسیه', low_stock_products: 'محصولات کم‌موجودی', manage_inventory: 'مدیریت انبار',
    product: 'کالا', out_of_stock: 'ناموجود', low: 'کم',
    // Products extra
    product_label: 'لیبل محصول', print_label: 'چاپ لیبل', label_size: 'سایز لیبل',
    are_you_sure: 'آیا مطمئن هستید؟', yes_delete: 'بله، حذف شود', irreversible: 'این عمل قابل بازگشت نیست.',
    manage_products: 'مدیریت محصولات', registered_product: 'محصول ثبت‌شده', export_excel: 'خروجی Excel',
    new_product: 'محصول جدید', search_name_code_barcode: 'جستجو (نام، کد، بارکد)...', all: 'همه',
    stop_voice_search: 'توقف جستجوی صوتی',
    voice_search: 'جستجوی صوتی', scan_barcode: 'اسکن بارکد با دوربین', image_search_product: 'جستجو با عکس محصول',
    total_products: 'کل محصولات', active_products: 'فعال', low_stock_count: 'کم‌موجودی', out_of_stock_count: 'اتمام موجودی',
    code: 'کد', warehouse: 'انبار', expiry_badge: 'انقضا', serial_badge: 'سریال',
    edit_product: 'ویرایش محصول', add_new_product: 'افزودن محصول جدید', product_code: 'کد محصول',
    auto_barcode: 'ایجاد بارکد خودکار', register_product: 'ثبت محصول', save_changes: 'ذخیره تغییرات',
    serial_management: 'مدیریت سریال نامبر', available: 'موجود', sold: 'فروخته شده',
    month: 'ماه', add_serial_help: 'برای افزودن سریال جدید...',
    expiry_products: 'تاریخ انقضای محصولات', expired: 'منقضی', under_30_days: 'زیر ۳۰ روز',
    barcode_required: 'بارکد اجباری است',
    // Customers extra
    manage_customers: 'مدیریت مشتریان', print_list: 'چاپ لیست',
    search_name_phone_code: 'جستجو (نام، موبایل، کد)...', debtor: 'بدهکار', creditor: 'بستانکار',
    reminder: 'یادآوری', days_ago: 'روز قبل', new_customer_btn: 'مشتری جدید',
    contact: 'تماس', auto_debt_reminder: 'یادآوری خودکار بدهی',
    days_before_due: 'چند روز قبل از سررسید', register_customer: 'ثبت مشتری',
    customer_history: 'سوابق خرید', invoice_count: 'تعداد فاکتور', active_debt: 'بدهی فعال',
    settled: 'تسویه', invoices_history: 'سوابق فاکتورها', no_invoices: 'هیچ فاکتوری ثبت نشده',
    items: 'قلم', remaining: 'مانده', active_debts: 'بدهی‌های فعال', due_date: 'سررسید',
    paid_amount: 'پرداخت شده', send_message: 'ارسال پیام', whatsapp: 'واتساپ', email: 'ایمیل',
    message_text: 'متن پیام', sent: 'ارسال شد',
    // Sales extra
    new_sale_pos: 'فروش جدید (POS)', register_sale_invoice: 'ثبت فروش و صدور فاکتور',
    print_last_invoice: 'چاپ آخرین فاکتور', search_product: 'جستجوی محصول...', product_not_found: 'محصولی یافت نشد',
    select_customer: 'جستجو یا انتخاب مشتری...', existing_debt: 'بدهی موجود',
    shopping_cart: 'سبد خرید', clear_cart: 'پاک کردن', clear_cart_confirm: 'سبد خرید پاک شود؟',
    no_product_selected: 'محصولی انتخاب نشده', cash_payment: 'نقدی', credit_payment: 'نسیه',
    discount: 'تخفیف', received_amount: 'دریافتی', total_items: 'جمع کالاها',
    total_amount: 'مبلغ کل', change_return: 'باقی برگشت', credit_debt: 'بدهی نسیه',
    optional_note: 'یادداشت اختیاری...', register_invoice: 'ثبت فاکتور',
    invoice_registered: 'فاکتور ثبت شد', print_invoice_prompt: 'آیا می‌خواهید فاکتور چاپ شود؟',
    print: 'چاپ', skip: 'رد کردن', seconds: 'ثانیه', select_print_size: 'انتخاب سایز چاپ',
    print_invoice: 'چاپ فاکتور', cart_empty: 'سبد خالی', select_customer_required: 'انتخاب مشتری',
    insufficient_stock: 'موجودی ناکافی', sale_failed: 'ثبت فروش ناموفق',
    cash_customer: 'مشتری نقدی', invoice_number: 'فاکتور شماره', customer_label: 'مشتری',
    seller: 'فروشنده', payment: 'پرداخت', thanks_purchase: 'ممنون از خرید شما',
    // Debts extra
    manage_debts: 'مدیریت بدهی‌ها', active_debt_count: 'بدهی فعال', total_debt: 'کل بدهی',
    overdue: 'معوق', partial: 'جزئی', settlements: 'تسویه‌ها',
    search_customer_invoice: 'جستجو (نام مشتری، شماره فاکتور)...', pending: 'در انتظار',
    invoice_col: 'فاکتور', original_amount: 'مبلغ اصلی', remaining_col: 'مانده',
    receive_payment: 'دریافت', register_payment: 'ثبت پرداخت',
    payment_amount: 'مبلغ دریافتی', max_amount: 'حداکثر', full: 'کامل', half: 'نصف', quarter: 'ربع',
    payment_note_hint: 'مثلاً: پرداخت نقدی', enter_amount: 'مبلغ را وارد کنید',
    amount_exceeds: 'مبلغ بیشتر از مانده است', payment_registered: 'پرداخت ثبت شد',
    no_debts_found: 'بدهی‌ای یافت نشد',
    // Suppliers
    manage_suppliers: 'مدیریت تامین‌کنندگان', new_supplier: 'تامین‌کننده جدید',
    supplier_name: 'نام تامین‌کننده', company: 'شرکت',
    // Staff
    manage_staff: 'مدیریت پرسنل', new_staff: 'پرسنل جدید', role: 'نقش', salary: 'حقوق',
    // Reports
    sales_report: 'گزارش فروش', inventory_report: 'گزارش موجودی', debt_report: 'گزارش بدهی',
    profit_report: 'گزارش سود', financial_report: 'گزارش مالی',
    // General
    general: 'عمومی', today: 'امروز', this_week: 'این هفته', this_month: 'این ماه',
    custom_range: 'بازه دلخواه', refresh: 'بازنشانی', apply: 'اعمال',
    email_address: 'آدرس ایمیل', password: 'رمز عبور', username: 'نام کاربری',
    login: 'ورود', register: 'ثبت‌نام', forgot_password: 'فراموشی رمز',
    shop_code: 'کد فروشگاه', shop_name: 'نام فروشگاه', shop_password: 'رمز فروشگاه',
    owner_name: 'نام مالک', continue_with_google: 'ادامه با گوگل',
    about_us: 'درباره ما', enter: 'ورود', demo_free: 'آزمایشی رایگان',
    select_plan: 'انتخاب طرح', payment_method: 'روش پرداخت',
    // Accounting
    income: 'درآمد', expense_item: 'هزینه', profit: 'سود', loss: 'ضرر',
    cash_register: 'صندوق', cash_in: 'واریز', cash_out: 'برداشت',
    // Notifications
    notification_title: 'عنوان اعلان', notification_message: 'متن اعلان',
    send_notification: 'ارسال اعلان', target_all: 'همه دکان‌ها', target_specific: 'دکان‌های خاص',
    // Backup
    backup_export: 'صادرات بکاپ', backup_import: 'واردات بکاپ', backup_history: 'تاریخچه بکاپ',
    restore: 'بازیابی', last_backup: 'آخرین بکاپ',
    page_business_types_subtitle: 'تعریف انواع کسب‌وکار در سطح پلتفرم (ذخیره در سرور).',
    page_business_types_new: 'صنف جدید', page_business_types_edit: 'ویرایش صنف',
    page_support_subtitle_master: 'همهٔ تیکت‌های فروشگاه‌ها — پاسخ از اینجا ثبت می‌شود.',
    page_support_subtitle_shop: 'ارسال تیکت به پشتیبانی پلتفرم و پیگیری وضعیت.',
    support_send_ticket: 'تیکت جدید', support_reply_sent: 'پاسخ ثبت شد', support_ticket_sent: 'تیکت ارسال شد',
    support_priority_urgent: 'فوری', support_priority_important: 'مهم', support_priority_normal: 'عادی',
    support_status_replied: 'پاسخ داده', support_status_read: 'خوانده‌شده', support_status_pending: 'در انتظار',
    support_stat_total: 'کل تیکت‌ها', support_stat_pending: 'در انتظار', support_stat_read: 'خوانده‌شده', support_stat_replied: 'پاسخ‌داده',
    support_no_tickets: 'تیکتی یافت نشد', support_reply_label: 'پاسخ پشتیبانی', support_sender: 'فرستنده',
    support_message_body: 'متن پیام', support_your_reply: 'پاسخ شما', support_reply_placeholder: 'پاسخ را بنویسید...',
    support_subject: 'موضوع', support_priority: 'اولویت',
    profile_tab: 'پروفایل', profile_super_readonly: 'ویرایش پروفایل برای ابرادمین از این مسیر در دسترس نیست.',
    loading_session: 'در حال بارگذاری نشست...',
    demo_cta: 'ارتقاء اشتراک',
    legal_privacy: 'حریم خصوصی',
    legal_terms: 'شرایط استفاده',
    onboarding_title: 'شروع کار با دکان‌یار',
    onboarding_subtitle: 'سه گام کوتاه برای استفادهٔ روزمره:',
    onboarding_step_dashboard: 'داشبورد',
    onboarding_step_dashboard_body: 'خلاصه فروش، هشدار موجودی و دسترسی سریع به بخش‌ها از اینجاست.',
    onboarding_step_products: 'کالاها و انبار',
    onboarding_step_products_body: 'ابتدا کالا و دسته را تعریف کنید؛ موجودی و حداقل انبار را برای هشدار درست تنظیم کنید.',
    onboarding_step_sales: 'فروش و فاکتور',
    onboarding_step_sales_body: 'از بخش فروش فاکتور بزنید؛ پس از اتصال اینترنت، اطلاعات با سرور همگام می‌شود.',
    onboarding_cta: 'متوجه شدم، ادامه می‌دهم',
    sync_pending_banner: 'آخرین ذخیرهٔ ابری انجام نشد؛ با برقراری اینترنت دوباره تلاش می‌شود.',
    offline_banner: 'اینترنت قطع است — همگام‌سازی با سرور ممکن نیست.',
    header_brand_line: 'مدیریت هوشمند', select: 'انتخاب',
    result_type_product: 'محصول', result_type_customer: 'مشتری', result_type_page: 'صفحه',
    profile_display_name: 'نام نمایشی',
    profile_prefs_hint: 'زبان و ارز با تنظیمات برنامه هم‌تراز می‌شود.', profile_save: 'ذخیره پروفایل',
    profile_saved: 'پروفایل به‌روز شد', profile_link_security: 'رمز عبور و احراز دو مرحله‌ای',
    tab_general: 'عمومی', tab_language: 'زبان و ارز', tab_security: 'امنیت', tab_backup: 'بکاپ‌گیری',
    welcome_hero_body: 'دکان یار؛ راهکاری جامع و قدرتمند برای مدیریت انبار، فروش و حسابداری. کسب‌وکار خود را با تکنولوژی روز دنیا متحول کنید و به سوددهی بیشتر برسید.',
    welcome_about_title: 'درباره دکان‌یار', welcome_login_panel: 'ورود به سیستم',
    welcome_info_subtitle: 'راهکاری جامع و قدرتمند برای مدیریت انبار، فروش و حسابداری کسب‌وکارهای افغانستان',
    welcome_info_intro: 'دکان‌یار یک نرم‌افزار جامع مدیریت دکانداری است که برای سهولت امور روزمره فروشگاه‌ها طراحی شده.',
    welcome_info_detail: 'از ثبت و پیگیری فروش تا مدیریت موجودی، حساب‌های مالی و چاپ حرارتی، همه چیز به شکلی هوشمند گردآوری شده است.',
    users_page_hint: 'کاربران از سرور؛ هر نقش یک حساب فعال. نقش‌های معلق را با نام کاربری و رمز فعال کنید.',
  },
  pashto: {
    dashboard: 'ډشبورډ', products: 'محصولات', bookstore_inventory: 'کتابونه او موجودی', customers: 'پیریدونکي',
    sales: 'پلور', reports: 'راپورونه', settings: 'ترتیبات',
    users: 'کارونکي', shop_users: 'د دوکان کارونکي', debts: 'پورونه', notifications: 'خبرتیاوې',
    backup: 'بکاپ', support: 'ملاتړ', logout: 'وتل',
    search: 'لټون', add: 'زیاتول', edit: 'سمول', delete: 'ړنګول',
    save: 'خوندي', cancel: 'لغوه', confirm: 'تایید',
    name: 'نوم', phone: 'موبایل', address: 'پته', status: 'حالت',
    active: 'فعال', inactive: 'غیر فعال', total: 'ټول',
    date: 'نیټه', notes: 'یادښتونه', actions: 'عملیات',
    price: 'بیه', quantity: 'شمیر', currency: 'اسعار',
    language: 'ژبه', security: 'امنیت', offline: 'آفلاین',
    sync: 'همغږي', pending_sales: 'پلور تایید',
    expiry: 'د پای نیټه', serial: 'سیریل نمبر',
    reminders: 'یادونې', print_settings: 'چاپ ترتیبات',
    product_sales_ranking: 'د توکو پلور رتبه',
    reorder_list_title: 'بیا پیرود او کم موجودی',
    business_types: 'سوداګري ډولونه', image_search: 'انځور لټون',
    warehouse_page: 'ګدام', warehouse_subtitle: 'په مرکزي ګدام کې موجودي؛ پلور لپاره مغازې ته لیږد',
    two_factor: 'دوه مرحله تصدیق', activity_log: 'فعالیت لاګ',
    sessions: 'فعال ناستې', exchange_rate: 'د اسعارو نرخ',
    welcome: 'ښه راغلاست', tenants: 'دوکانونه', payments: 'تادیات',
    manage_shops: 'د دوکانونو مدیریت', billing: 'بلینګ', analytics360: '۳۶۰ تحلیلات',
    architecture: 'سیستم جوړښت', security_analysis: 'امنیت تحلیل', system_analysis: 'د کمښت تحلیل',
    broadcast_notifications: 'عام خبرتیا', general_reports: 'عمومي راپورونه', language_currency: 'ژبه او اسعار',
    sales_pos: 'پلور / POS', invoices: 'بلونه', suppliers: 'عرضه کوونکي', accounting: 'حسابداري',
    staff_payroll: 'کارکوونکي او معاش', inventory_management: 'د موجودي مدیریت', purchase_invoices: 'د پیرود بلونه',
    inventory_reports: 'د موجودي راپورونه', shop_management: 'د دوکان مدیریت', role_super_admin: 'سوپر اډمین',
    role_admin: 'دوکان مدیر', role_seller: 'پلورونکی', role_stock_keeper: 'ګدام دار', role_accountant: 'حسابدار',
    online: 'آنلاین', offline_mode: 'آفلاین حالت', app_name: 'دکان یار',
    search_products_customers_pages: 'د محصول، پیریدونکي او پاڼې لټون...',
    no_results_found: 'هیڅ پایله ونه موندل شوه', quick_access: 'چټک لاسرسی',
    close: 'بندول', manage_account_settings: 'د حساب ترتیباتو مدیریت',
    read_all: 'ټول ولولئ', no_notifications: 'هیڅ خبرتیا نشته',
    view_all_notifications: 'ټولې خبرتیاوې وګورئ',
    welcome_message: 'ښه راغلاست', smart_management: 'د دوکان هوښیار مدیریت په یوه کتنه',
    new_sale: 'نوی پلور', add_product: 'نوی محصول', new_customer: 'نوی پیریدونکی',
    new_invoice: 'نوی بل', daily_report: 'ورځنی راپور', profit_analysis: 'ګټې تحلیل',
    today_sales: 'نن پلور', monthly_profit: 'میاشتنی خالص ګټه', low_stock: 'لږ موجودي',
    overdue_debts: 'ناوخته پورونه', sales_expense_chart: 'د پلور او لګښت چارت',
    top_products: 'غوره محصولات', recent_transactions: 'وروستي معاملات',
    no_data: 'هیڅ معلومات نشته', loading: 'بارول کیږي', showing: 'ښودل', of: 'له',
    rows_per_page: 'په پاڼه کې قطارونه', filter: 'فلتر', sort: 'ترتیب', export: 'صادرات',
    product_name: 'د محصول نوم', category: 'کتګوري', stock: 'موجودي',
    purchase_price: 'د پیرود بیه', sale_price: 'د پلور بیه', barcode: 'بارکوډ',
    description: 'تشریح', all_products: 'ټول محصولات',
    customer_name: 'د پیریدونکي نوم', total_purchases: 'ټول پیرود', last_purchase: 'وروستی پیرود',
    balance: 'پاتې حساب', all_customers: 'ټول پیریدونکي',
    create: 'جوړول', update: 'تازه کول', details: 'تفصیلات', back: 'شاته',
    next: 'راتلونکی', previous: 'تیر', submit: 'ثبت', clear: 'پاکول',
    select_all: 'ټول غوره', from_date: 'له نیټې', to_date: 'تر نیټې',
    download: 'ډاونلوډ', upload: 'اپلوډ', success: 'بریالی', error: 'تیروتنه',
    warning: 'خبرداری', required: 'اړین', optional: 'اختیاري', yes: 'هو', no: 'نه',
    // Dashboard extra
    last_update: 'وروستۍ تازه', minutes_ago: 'دقیقې مخکې', increase_vs_last_month: 'تیرې میاشتې په پرتله زیاتوالی',
    needs_restock: 'بیا ډکولو ته اړتیا', stock_ok: 'د ګدام موجودي مناسبه ده', debtor_customer: 'پورمن پیریدونکی',
    performance_7d: 'په ۷ ورځو کې د فعالیت تحلیل', weekly_sales_count: 'د اونۍ د پلور شمیر پر اساس',
    unit: 'واحد', expense: 'لګښت', recent_invoices: 'وروستي د پلور بلونه', view_all: 'ټول وګورئ',
    cash: 'نقد', credit: 'نسیه', low_stock_products: 'لږ موجودي محصولات', manage_inventory: 'د ګدام مدیریت',
    product: 'توکی', out_of_stock: 'نشته', low: 'لږ',
    // Products extra
    product_label: 'د محصول لیبل', print_label: 'لیبل چاپ', label_size: 'د لیبل اندازه',
    are_you_sure: 'ایا تاسو ډاډه یاست؟', yes_delete: 'هو، ړنګ یې کړه', irreversible: 'دا عمل د بیرته راستنیدو وړ نه دی.',
    manage_products: 'د محصولاتو مدیریت', registered_product: 'ثبت شوی محصول', export_excel: 'ایکسل صادرات',
    new_product: 'نوی محصول', search_name_code_barcode: 'لټون (نوم، کوډ، بارکوډ)...', all: 'ټول',
    stop_voice_search: 'غږیز لټون ودروئ',
    voice_search: 'غږیز لټون', scan_barcode: 'د کامرې سره بارکوډ سکین', image_search_product: 'د عکس سره لټون',
    total_products: 'ټول محصولات', active_products: 'فعال', low_stock_count: 'لږ موجودي', out_of_stock_count: 'پای ته رسیدلي',
    code: 'کوډ', warehouse: 'ګدام', expiry_badge: 'پای نیټه', serial_badge: 'سیریل',
    edit_product: 'محصول سمول', add_new_product: 'نوی محصول زیاتول', product_code: 'د محصول کوډ',
    auto_barcode: 'اتوماتیک بارکوډ', register_product: 'محصول ثبت', save_changes: 'بدلونونه خوندي کړئ',
    serial_management: 'د سیریل نمبر مدیریت', available: 'شته', sold: 'پلورل شوی',
    month: 'میاشت', add_serial_help: 'د نوي سیریل اضافه کولو لپاره...',
    expiry_products: 'د محصولاتو پای نیټه', expired: 'پای ته رسیدلی', under_30_days: 'تر ۳۰ ورځو لاندې',
    barcode_required: 'بارکوډ اجباري دی',
    // Customers extra
    manage_customers: 'د پیریدونکو مدیریت', print_list: 'لیست چاپ',
    search_name_phone_code: 'لټون (نوم، موبایل، کوډ)...', debtor: 'پورمن', creditor: 'پورورکوونکی',
    reminder: 'یادونه', days_ago: 'ورځې مخکې', new_customer_btn: 'نوی پیریدونکی',
    contact: 'اړیکه', auto_debt_reminder: 'اتوماتیک د پور یادونه',
    days_before_due: 'د سررسید نه مخکې څو ورځې', register_customer: 'پیریدونکی ثبت',
    customer_history: 'د پیرود سوابق', invoice_count: 'د بلونو شمیر', active_debt: 'فعال پور',
    settled: 'تصفیه', invoices_history: 'د بلونو سوابق', no_invoices: 'هیڅ بل ثبت نه دی',
    items: 'توکي', remaining: 'پاتې', active_debts: 'فعال پورونه', due_date: 'سررسید',
    paid_amount: 'تادیه شوی', send_message: 'پیغام لیږل', whatsapp: 'واتساپ', email: 'بریښنالیک',
    message_text: 'د پیغام متن', sent: 'لیږل شو',
    // Sales extra
    new_sale_pos: 'نوی پلور (POS)', register_sale_invoice: 'د پلور ثبت او بل صدور',
    print_last_invoice: 'وروستی بل چاپ', search_product: 'محصول لټول...', product_not_found: 'محصول ونه موندل شو',
    select_customer: 'پیریدونکی لټون یا غوره...', existing_debt: 'موجود پور',
    shopping_cart: 'د پیرود ګاډی', clear_cart: 'پاکول', clear_cart_confirm: 'ګاډی پاک شي؟',
    no_product_selected: 'هیڅ محصول غوره شوی نه دی', cash_payment: 'نقد', credit_payment: 'نسیه',
    discount: 'تخفیف', received_amount: 'ترلاسه شوې', total_items: 'د توکو مجموعه',
    total_amount: 'ټوله اندازه', change_return: 'پاتې بیرته', credit_debt: 'نسیه پور',
    optional_note: 'اختیاري یادښت...', register_invoice: 'بل ثبت',
    invoice_registered: 'بل ثبت شو', print_invoice_prompt: 'غواړئ بل چاپ شي؟',
    print: 'چاپ', skip: 'تیرول', seconds: 'ثانیې', select_print_size: 'د چاپ اندازه غوره کړئ',
    print_invoice: 'بل چاپ', cart_empty: 'ګاډی خالي دی', select_customer_required: 'پیریدونکی غوره کړئ',
    insufficient_stock: 'موجودي کافي نه ده', sale_failed: 'پلور ناکام',
    cash_customer: 'نقد پیریدونکی', invoice_number: 'بل نمبر', customer_label: 'پیریدونکی',
    seller: 'پلورونکی', payment: 'تادیه', thanks_purchase: 'مننه له پیرود نه',
    // Debts extra
    manage_debts: 'د پورونو مدیریت', active_debt_count: 'فعال پور', total_debt: 'ټول پور',
    overdue: 'ناوخته', partial: 'جزئي', settlements: 'تصفیې',
    search_customer_invoice: 'لټون (د پیریدونکي نوم، د بل نمبر)...', pending: 'په انتظار',
    invoice_col: 'بل', original_amount: 'اصلي اندازه', remaining_col: 'پاتې',
    receive_payment: 'ترلاسه کول', register_payment: 'تادیه ثبت',
    payment_amount: 'ترلاسه شوې اندازه', max_amount: 'اعظمي', full: 'بشپړ', half: 'نیم', quarter: 'ربع',
    payment_note_hint: 'لکه: نقد تادیه', enter_amount: 'اندازه ولیکئ',
    amount_exceeds: 'اندازه له پاتې زیاته ده', payment_registered: 'تادیه ثبت شوه',
    no_debts_found: 'هیڅ پور ونه موندل شو',
    // Suppliers
    manage_suppliers: 'د عرضه کوونکو مدیریت', new_supplier: 'نوی عرضه کوونکی',
    supplier_name: 'د عرضه کوونکي نوم', company: 'شرکت',
    // Staff
    manage_staff: 'د کارکوونکو مدیریت', new_staff: 'نوی کارکوونکی', role: 'نقش', salary: 'معاش',
    // Reports
    sales_report: 'د پلور راپور', inventory_report: 'د موجودي راپور', debt_report: 'د پور راپور',
    profit_report: 'د ګټې راپور', financial_report: 'مالي راپور',
    // General
    general: 'عمومي', today: 'نن', this_week: 'دا اونۍ', this_month: 'دا میاشت',
    custom_range: 'خپله بازه', refresh: 'تازه کول', apply: 'اعمال',
    email_address: 'بریښنالیک پته', password: 'پاسورډ', username: 'کاروونکي نوم',
    login: 'ننوتل', register: 'ثبت‌نام', forgot_password: 'پاسورډ هیر شو',
    shop_code: 'د دوکان کوډ', shop_name: 'د دوکان نوم', shop_password: 'د دوکان پاسورډ',
    owner_name: 'د مالک نوم', continue_with_google: 'د ګوګل سره دوام',
    about_us: 'زموږ په اړه', enter: 'ننوتل', demo_free: 'ازمایښتي پلان',
    select_plan: 'پلان غوره کړئ', payment_method: 'د تادیې لار',
    // Accounting
    income: 'عاید', expense_item: 'لګښت', profit: 'ګټه', loss: 'زیان',
    cash_register: 'صندوق', cash_in: 'واریز', cash_out: 'برداشت',
    // Notifications
    notification_title: 'د خبرتیا سرلیک', notification_message: 'د خبرتیا متن',
    send_notification: 'خبرتیا لیږل', target_all: 'ټول دوکانونه', target_specific: 'ځانګړي دوکانونه',
    // Backup
    backup_export: 'بکاپ صادرول', backup_import: 'بکاپ واردول', backup_history: 'د بکاپ تاریخچه',
    restore: 'بیرته راوړل', last_backup: 'وروستی بکاپ',
    page_business_types_subtitle: 'د پلیټ فارم په کچه د سوداګرۍ ډولونه (په سرور کې).',
    page_business_types_new: 'نوی ډول', page_business_types_edit: 'سمول',
    page_support_subtitle_master: 'ټول ټیکټونه — ځواب دلته ثبت کیږي.',
    page_support_subtitle_shop: 'پلیټ فارم ملاتړ ته ټیکټ لیږل.',
    support_send_ticket: 'نوی ټیکټ', support_reply_sent: 'ځواب ثبت شو', support_ticket_sent: 'ټیکټ ولیږل شو',
    support_priority_urgent: 'بیړنی', support_priority_important: 'مهم', support_priority_normal: 'عادي',
    support_status_replied: 'ځواب ورکړل شو', support_status_read: 'لوستل شوی', support_status_pending: 'په تمه',
    support_stat_total: 'ټول ټیکټونه', support_stat_pending: 'په تمه', support_stat_read: 'لوستل شوي', support_stat_replied: 'ځواب ورکړل شوي',
    support_no_tickets: 'ټیکټ ونه موندل شو', support_reply_label: 'د ملاتړ ځواب', support_sender: 'لیږونکی',
    support_message_body: 'د پیغام متن', support_your_reply: 'ستاسو ځواب', support_reply_placeholder: 'ځواب ولیکئ...',
    support_subject: 'موضوع', support_priority: 'لومړیتوب',
    profile_tab: 'پروفایل', profile_super_readonly: 'د سوپر اډمین پروفایل دلته نشي سمیدلی.',
    loading_session: 'ناسته بارول کیږي...',
    demo_cta: 'اشتراک پورته کړئ',
    legal_privacy: 'محرمیت',
    legal_terms: 'د کارولو شرایط',
    onboarding_title: 'پیل کول',
    onboarding_subtitle: 'درې لنډې ګامونه:',
    onboarding_step_dashboard: 'ډاشبورډ',
    onboarding_step_dashboard_body: 'لنډیز، موجودي خبرتیاوې او چټک لاسرسی.',
    onboarding_step_products: 'توکي',
    onboarding_step_products_body: 'لومړی توکي او کټګوري جوړ کړئ؛ لږ موجودي حدونه تنظیم کړئ.',
    onboarding_step_sales: 'پلور',
    onboarding_step_sales_body: 'د پلور برخې څخه فاکتور ثبت کړئ؛ انټرنټ سره همغږي کیږي.',
    onboarding_cta: 'پوه شوم، دوام ورکوم',
    sync_pending_banner: 'وروستی ابري ساتل ناکام — انټرنټ سره بیا هڅه کیږي.',
    offline_banner: 'انټرنټ نشته — د سرور همغږي ستونزمنه ده.',
    header_brand_line: 'هوښیار مدیریت', select: 'غوره کول',
    result_type_product: 'محصول', result_type_customer: 'پیریدونکی', result_type_page: 'پاڼه',
    profile_display_name: 'ښکارې نوم',
    profile_prefs_hint: 'ژبه او اسعار د اپ ترتیباتو سره سم کیږي.', profile_save: 'پروفایل خوندي کړئ',
    profile_saved: 'پروفایل تازه شو', profile_link_security: 'پټنوم او دوه مرحلې تصدیق',
    tab_general: 'عمومي', tab_language: 'ژبه او اسعار', tab_security: 'امنیت', tab_backup: 'بکاپ',
    welcome_hero_body: 'دکان یار؛ د انبار، پلور او حسابدارۍ بشپړ او پیاوونکی حل. خپله سوداګري د نن ورځې ټیکنالوژۍ سره بدله کړئ.',
    welcome_about_title: 'د دکان یار په اړه', welcome_login_panel: 'سیسټم ته ننوتل',
    welcome_info_subtitle: 'د افغانستان د سوداګریو د انبار، پلور او حسابدارۍ مدیریت لپاره بشپړ حل',
    welcome_info_intro: 'دکان یار د دوکانونو د ورځني کارونو اسانتیا لپاره ډیزاین شوی بشپړ سافټویر دی.',
    welcome_info_detail: 'د پلور څخه تر موجودي، مالي حسابونو او حرارتي چاپ پورې ټولې برخې په هوښیار ډول سره یوځای شوي دي.',
    users_page_hint: 'کارونکي له سرور څخه؛ هر رول یو فعال حساب. معلق رولونه د کارن نوم او پټنوم سره فعال کړئ.',
  },
  farsi: {
    dashboard: 'داشبورد', products: 'کالاها', bookstore_inventory: 'کتاب‌ها و موجودی', customers: 'مشتریان',
    sales: 'فروش', reports: 'گزارش‌ها', settings: 'تنظیمات',
    users: 'کاربران', shop_users: 'کاربران فروشگاه', debts: 'بدهی‌ها', notifications: 'اعلان‌ها',
    backup: 'پشتیبان‌گیری', support: 'پشتیبانی', logout: 'خروج',
    search: 'جستجو', add: 'افزودن', edit: 'ویرایش', delete: 'حذف',
    save: 'ذخیره', cancel: 'انصراف', confirm: 'تأیید',
    name: 'نام', phone: 'موبایل', address: 'آدرس', status: 'وضعیت',
    active: 'فعال', inactive: 'غیرفعال', total: 'جمع کل',
    date: 'تاریخ', notes: 'یادداشت', actions: 'عملیات',
    price: 'قیمت', quantity: 'تعداد', currency: 'ارز',
    language: 'زبان', security: 'امنیت', offline: 'آفلاین',
    sync: 'همگام‌سازی', pending_sales: 'تأیید و لیست خرید',
    expiry: 'تاریخ انقضا', serial: 'سریال‌نامبر',
    reminders: 'یادآوری‌ها', print_settings: 'تنظیمات چاپ',
    product_sales_ranking: 'رتبه فروش کالاها',
    reorder_list_title: 'خرید بعدی و اتمام موجودی',
    business_types: 'نوع کسب‌وکار', image_search: 'جستجوی تصویری',
    warehouse_page: 'انبار', warehouse_subtitle: 'موجودی انبار مرکزی؛ انتقال به مغازه برای فروش',
    two_factor: 'احراز هویت دو مرحله‌ای', activity_log: 'گزارش فعالیت',
    sessions: 'جلسات فعال', exchange_rate: 'نرخ ارز',
    welcome: 'خوش آمدید', tenants: 'فروشگاه‌ها', payments: 'پرداخت‌ها',
    manage_shops: 'مدیریت فروشگاه‌ها', billing: 'صورت‌حساب', analytics360: 'آنالیتیکس ۳۶۰°',
    architecture: 'معماری سیستم', security_analysis: 'تحلیل امنیت', system_analysis: 'تحلیل کمبودها',
    broadcast_notifications: 'اعلان عمومی', general_reports: 'گزارش‌های کلی', language_currency: 'زبان و ارز',
    sales_pos: 'فروش / POS', invoices: 'فاکتورها', suppliers: 'تامین‌کنندگان', accounting: 'حسابداری',
    staff_payroll: 'پرسنل و حقوق', inventory_management: 'مدیریت موجودی', purchase_invoices: 'فاکتورهای خرید',
    inventory_reports: 'گزارش موجودی', shop_management: 'مدیریت فروشگاه', role_super_admin: 'ابرادمین',
    role_admin: 'مدیر فروشگاه', role_seller: 'فروشنده', role_stock_keeper: 'انباردار', role_accountant: 'حسابدار',
    online: 'آنلاین', offline_mode: 'حالت آفلاین', app_name: 'دکان یار',
    search_products_customers_pages: 'جستجوی محصول، مشتری، صفحه...',
    no_results_found: 'نتیجه‌ای یافت نشد', quick_access: 'دسترسی سریع',
    close: 'بستن', manage_account_settings: 'مدیریت تنظیمات حساب کاربری',
    read_all: 'خواندن همه', no_notifications: 'اعلانی وجود ندارد',
    view_all_notifications: 'مشاهده همه اعلان‌ها',
    welcome_message: 'خوش آمدید', smart_management: 'مدیریت هوشمند فروشگاه در یک نگاه',
    new_sale: 'فروش جدید', add_product: 'افزودن کالا', new_customer: 'مشتری جدید',
    new_invoice: 'صدور فاکتور', daily_report: 'گزارش روزانه', profit_analysis: 'آنالیز سود',
    today_sales: 'فروش امروز', monthly_profit: 'سود خالص ماهانه', low_stock: 'کم‌موجودی انبار',
    overdue_debts: 'بدهی‌های معوق', sales_expense_chart: 'نمودار فروش و هزینه',
    top_products: 'پرفروش‌ترین کالاها', recent_transactions: 'آخرین تراکنش‌ها',
    no_data: 'داده‌ای وجود ندارد', loading: 'در حال بارگذاری', showing: 'نمایش', of: 'از',
    rows_per_page: 'ردیف در صفحه', filter: 'فیلتر', sort: 'مرتب‌سازی', export: 'صادرات',
    product_name: 'نام محصول', category: 'دسته‌بندی', stock: 'موجودی',
    purchase_price: 'قیمت خرید', sale_price: 'قیمت فروش', barcode: 'بارکد',
    description: 'توضیحات', all_products: 'همه محصولات',
    customer_name: 'نام مشتری', total_purchases: 'کل خرید', last_purchase: 'آخرین خرید',
    balance: 'مانده حساب', all_customers: 'همه مشتریان',
    create: 'ایجاد', update: 'بروزرسانی', details: 'جزئیات', back: 'بازگشت',
    next: 'بعدی', previous: 'قبلی', submit: 'ثبت', clear: 'پاک کردن',
    select_all: 'انتخاب همه', from_date: 'از تاریخ', to_date: 'تا تاریخ',
    download: 'دانلود', upload: 'آپلود', success: 'موفق', error: 'خطا',
    warning: 'هشدار', required: 'الزامی', optional: 'اختیاری', yes: 'بله', no: 'خیر',
    last_update: 'آخرین به‌روزرسانی', minutes_ago: 'دقیقه پیش', increase_vs_last_month: 'افزایش نسبت به ماه قبل',
    needs_restock: 'نیازمند بازپر', stock_ok: 'موجودی انبار مناسب است', debtor_customer: 'مشتری بدهکار',
    performance_7d: 'تحلیل عملکرد در ۷ روز گذشته', weekly_sales_count: 'بر اساس تعداد فروش هفتگی',
    unit: 'واحد', expense: 'هزینه', recent_invoices: 'آخرین فاکتورهای فروش', view_all: 'مشاهده همه',
    cash: 'نقد', credit: 'نسیه', low_stock_products: 'محصولات کم‌موجودی', manage_inventory: 'مدیریت انبار',
    product: 'کالا', out_of_stock: 'ناموجود', low: 'کم',
    product_label: 'لیبل محصول', print_label: 'چاپ لیبل', label_size: 'سایز لیبل',
    are_you_sure: 'آیا مطمئن هستید؟', yes_delete: 'بله، حذف شود', irreversible: 'این عمل قابل بازگشت نیست.',
    manage_products: 'مدیریت محصولات', registered_product: 'محصول ثبت‌شده', export_excel: 'خروجی Excel',
    new_product: 'محصول جدید', search_name_code_barcode: 'جستجو (نام، کد، بارکد)...', all: 'همه',
    stop_voice_search: 'توقف جستجوی صوتی', voice_search: 'جستجوی صوتی',
    scan_barcode: 'اسکن بارکد با دوربین', image_search_product: 'جستجو با عکس محصول',
    total_products: 'کل محصولات', active_products: 'فعال', low_stock_count: 'کم‌موجودی', out_of_stock_count: 'اتمام موجودی',
    code: 'کد', warehouse: 'انبار', expiry_badge: 'انقضا', serial_badge: 'سریال',
    edit_product: 'ویرایش محصول', add_new_product: 'افزودن محصول جدید', product_code: 'کد محصول',
    auto_barcode: 'ایجاد بارکد خودکار', register_product: 'ثبت محصول', save_changes: 'ذخیره تغییرات',
    serial_management: 'مدیریت سریال نامبر', available: 'موجود', sold: 'فروخته شده',
    month: 'ماه', add_serial_help: 'برای افزودن سریال جدید...',
    expiry_products: 'تاریخ انقضای محصولات', expired: 'منقضی', under_30_days: 'زیر ۳۰ روز',
    barcode_required: 'بارکد اجباری است',
    manage_customers: 'مدیریت مشتریان', print_list: 'چاپ لیست',
    search_name_phone_code: 'جستجو (نام، موبایل، کد)...', debtor: 'بدهکار', creditor: 'بستانکار',
    reminder: 'یادآوری', days_ago: 'روز قبل', new_customer_btn: 'مشتری جدید',
    contact: 'تماس', auto_debt_reminder: 'یادآوری خودکار بدهی',
    days_before_due: 'چند روز قبل از سررسید', register_customer: 'ثبت مشتری',
    customer_history: 'سوابق خرید', invoice_count: 'تعداد فاکتور', active_debt: 'بدهی فعال',
    settled: 'تسویه', invoices_history: 'سوابق فاکتورها', no_invoices: 'هیچ فاکتوری ثبت نشده',
    items: 'قلم', remaining: 'مانده', active_debts: 'بدهی‌های فعال', due_date: 'سررسید',
    paid_amount: 'پرداخت شده', send_message: 'ارسال پیام', whatsapp: 'واتساپ', email: 'ایمیل',
    message_text: 'متن پیام', sent: 'ارسال شد',
    new_sale_pos: 'فروش جدید (POS)', register_sale_invoice: 'ثبت فروش و صدور فاکتور',
    print_last_invoice: 'چاپ آخرین فاکتور', search_product: 'جستجوی محصول...', product_not_found: 'محصولی یافت نشد',
    select_customer: 'جستجو یا انتخاب مشتری...', existing_debt: 'بدهی موجود',
    shopping_cart: 'سبد خرید', clear_cart: 'پاک کردن', clear_cart_confirm: 'سبد خرید پاک شود؟',
    no_product_selected: 'محصولی انتخاب نشده', cash_payment: 'نقدی', credit_payment: 'نسیه',
    discount: 'تخفیف', received_amount: 'دریافتی', total_items: 'جمع کالاها',
    total_amount: 'مبلغ کل', change_return: 'باقی برگشت', credit_debt: 'بدهی نسیه',
    optional_note: 'یادداشت اختیاری...', register_invoice: 'ثبت فاکتور',
    invoice_registered: 'فاکتور ثبت شد', print_invoice_prompt: 'آیا می‌خواهید فاکتور چاپ شود؟',
    print: 'چاپ', skip: 'رد کردن', seconds: 'ثانیه', select_print_size: 'انتخاب سایز چاپ',
    print_invoice: 'چاپ فاکتور', cart_empty: 'سبد خالی', select_customer_required: 'انتخاب مشتری',
    insufficient_stock: 'موجودی ناکافی', sale_failed: 'ثبت فروش ناموفق',
    cash_customer: 'مشتری نقدی', invoice_number: 'فاکتور شماره', customer_label: 'مشتری',
    seller: 'فروشنده', payment: 'پرداخت', thanks_purchase: 'ممنون از خرید شما',
    manage_debts: 'مدیریت بدهی‌ها', active_debt_count: 'بدهی فعال', total_debt: 'کل بدهی',
    overdue: 'معوق', partial: 'جزئی', settlements: 'تسویه‌ها',
    search_customer_invoice: 'جستجو (نام مشتری، شماره فاکتور)...', pending: 'در انتظار',
    invoice_col: 'فاکتور', original_amount: 'مبلغ اصلی', remaining_col: 'مانده',
    receive_payment: 'دریافت', register_payment: 'ثبت پرداخت',
    payment_amount: 'مبلغ دریافتی', max_amount: 'حداکثر', full: 'کامل', half: 'نصف', quarter: 'ربع',
    payment_note_hint: 'مثلاً: پرداخت نقدی', enter_amount: 'مبلغ را وارد کنید',
    amount_exceeds: 'مبلغ بیشتر از مانده است', payment_registered: 'پرداخت ثبت شد',
    no_debts_found: 'بدهی‌ای یافت نشد',
    manage_suppliers: 'مدیریت تامین‌کنندگان', new_supplier: 'تامین‌کننده جدید',
    supplier_name: 'نام تامین‌کننده', company: 'شرکت',
    manage_staff: 'مدیریت پرسنل', new_staff: 'پرسنل جدید', role: 'نقش', salary: 'حقوق',
    sales_report: 'گزارش فروش', inventory_report: 'گزارش موجودی', debt_report: 'گزارش بدهی',
    profit_report: 'گزارش سود', financial_report: 'گزارش مالی',
    general: 'عمومی', today: 'امروز', this_week: 'این هفته', this_month: 'این ماه',
    custom_range: 'بازه دلخواه', refresh: 'بازنشانی', apply: 'اعمال',
    email_address: 'آدرس ایمیل', password: 'رمز عبور', username: 'نام کاربری',
    login: 'ورود', register: 'ثبت‌نام', forgot_password: 'فراموشی رمز',
    shop_code: 'کد فروشگاه', shop_name: 'نام فروشگاه', shop_password: 'رمز فروشگاه',
    owner_name: 'نام مالک', continue_with_google: 'ادامه با گوگل',
    about_us: 'درباره ما', enter: 'ورود', demo_free: 'آزمایشی رایگان',
    select_plan: 'انتخاب طرح', payment_method: 'روش پرداخت',
    income: 'درآمد', expense_item: 'هزینه', profit: 'سود', loss: 'ضرر',
    cash_register: 'صندوق', cash_in: 'واریز', cash_out: 'برداشت',
    notification_title: 'عنوان اعلان', notification_message: 'متن اعلان',
    send_notification: 'ارسال اعلان', target_all: 'همه فروشگاه‌ها', target_specific: 'فروشگاه‌های خاص',
    backup_export: 'صادرات پشتیبان', backup_import: 'واردات پشتیبان', backup_history: 'تاریخچه پشتیبان‌گیری',
    restore: 'بازیابی', last_backup: 'آخرین پشتیبان',
    page_business_types_subtitle: 'تعریف انواع کسب‌وکار در سطح پلتفرم (ذخیره در سرور).',
    page_business_types_new: 'صنف جدید', page_business_types_edit: 'ویرایش صنف',
    page_support_subtitle_master: 'همهٔ تیکت‌ها — پاسخ از اینجا ثبت می‌شود.',
    page_support_subtitle_shop: 'ارسال تیکت به پشتیبانی و پیگیری وضعیت.',
    support_send_ticket: 'تیکت جدید', support_reply_sent: 'پاسخ ثبت شد', support_ticket_sent: 'تیکت ارسال شد',
    support_priority_urgent: 'فوری', support_priority_important: 'مهم', support_priority_normal: 'عادی',
    support_status_replied: 'پاسخ داده', support_status_read: 'خوانده‌شده', support_status_pending: 'در انتظار',
    support_stat_total: 'کل تیکت‌ها', support_stat_pending: 'در انتظار', support_stat_read: 'خوانده‌شده', support_stat_replied: 'پاسخ‌داده',
    support_no_tickets: 'تیکتی یافت نشد', support_reply_label: 'پاسخ پشتیبانی', support_sender: 'فرستنده',
    support_message_body: 'متن پیام', support_your_reply: 'پاسخ شما', support_reply_placeholder: 'پاسخ را بنویسید...',
    support_subject: 'موضوع', support_priority: 'اولویت',
    profile_tab: 'پروفایل', profile_super_readonly: 'ویرایش پروفایل ابرادمین از این مسیر در دسترس نیست.',
    loading_session: 'در حال بارگذاری نشست...',
    demo_cta: 'ارتقاء اشتراک',
    legal_privacy: 'حریم خصوصی',
    legal_terms: 'شرایط استفاده',
    onboarding_title: 'شروع کار با دکان‌یار',
    onboarding_subtitle: 'سه گام کوتاه برای استفادهٔ روزمره:',
    onboarding_step_dashboard: 'داشبورد',
    onboarding_step_dashboard_body: 'خلاصه فروش، هشدار موجودی و دسترسی سریع به بخش‌ها از اینجاست.',
    onboarding_step_products: 'کالاها و انبار',
    onboarding_step_products_body: 'ابتدا کالا و دسته را تعریف کنید؛ موجودی و حداقل انبار را برای هشدار درست تنظیم کنید.',
    onboarding_step_sales: 'فروش و فاکتور',
    onboarding_step_sales_body: 'از بخش فروش فاکتور بزنید؛ پس از اتصال اینترنت، اطلاعات با سرور همگام می‌شود.',
    onboarding_cta: 'متوجه شدم، ادامه می‌دهم',
    sync_pending_banner: 'آخرین ذخیرهٔ ابری انجام نشد؛ با برقراری اینترنت دوباره تلاش می‌شود.',
    offline_banner: 'اینترنت قطع است — همگام‌سازی با سرور ممکن نیست.',
    header_brand_line: 'مدیریت هوشمند', select: 'انتخاب',
    result_type_product: 'کالا', result_type_customer: 'مشتری', result_type_page: 'صفحه',
    profile_display_name: 'نام نمایشی',
    profile_prefs_hint: 'زبان و ارز با تنظیمات برنامه هم‌تراز می‌شود.', profile_save: 'ذخیره پروفایل',
    profile_saved: 'پروفایل به‌روز شد', profile_link_security: 'رمز عبور و احراز دو مرحله‌ای',
    tab_general: 'عمومی', tab_language: 'زبان و ارز', tab_security: 'امنیت', tab_backup: 'بکاپ‌گیری',
    welcome_hero_body: 'دکان یار؛ راهکاری جامع برای مدیریت انبار، فروش و حسابداری. کسب‌وکار خود را با فناوری امروز متحول کنید.',
    welcome_about_title: 'درباره دکان‌یار', welcome_login_panel: 'ورود به سامانه',
    welcome_info_subtitle: 'راهکاری جامع برای مدیریت انبار، فروش و حسابداری کسب‌وکارها',
    welcome_info_intro: 'دکان‌یار نرم‌افزار جامع مدیریت فروشگاه برای تسهیل امور روزمره است.',
    welcome_info_detail: 'از ثبت فروش تا موجودی، امور مالی و چاپ حرارتی، همه در یک سامانه هوشمند گردآوری شده است.',
    users_page_hint: 'کاربران از سرور؛ هر نقش یک حساب فعال. نقش‌های معلق را با نام کاربری و رمز فعال کنید.',
  },
  english: {
    dashboard: 'Dashboard', products: 'Products', bookstore_inventory: 'Books & stock', customers: 'Customers',
    sales: 'Sales', reports: 'Reports', settings: 'Settings',
    users: 'Users', shop_users: 'Shop users', debts: 'Debts', notifications: 'Notifications',
    backup: 'Backup', support: 'Support', logout: 'Logout',
    search: 'Search', add: 'Add', edit: 'Edit', delete: 'Delete',
    save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
    name: 'Name', phone: 'Phone', address: 'Address', status: 'Status',
    active: 'Active', inactive: 'Inactive', total: 'Total',
    date: 'Date', notes: 'Notes', actions: 'Actions',
    price: 'Price', quantity: 'Quantity', currency: 'Currency',
    language: 'Language', security: 'Security', offline: 'Offline',
    sync: 'Sync', pending_sales: 'Pending Sales',
    expiry: 'Expiry Date', serial: 'Serial Numbers',
    reminders: 'Reminders', print_settings: 'Print Settings',
    product_sales_ranking: 'Product sales ranking',
    reorder_list_title: 'Reorder & stockout list',
    business_types: 'Business Types', image_search: 'Image Search',
    warehouse_page: 'Warehouse', warehouse_subtitle: 'Central warehouse stock; transfer to shop for sales',
    two_factor: 'Two-Factor Auth', activity_log: 'Activity Log',
    sessions: 'Active Sessions', exchange_rate: 'Exchange Rate',
    welcome: 'Welcome', tenants: 'Shops', payments: 'Payments',
    manage_shops: 'Manage Shops', billing: 'Billing', analytics360: 'Analytics 360°',
    architecture: 'System Architecture', security_analysis: 'Security Analysis', system_analysis: 'Gap Analysis',
    broadcast_notifications: 'Broadcast Notifications', general_reports: 'General Reports', language_currency: 'Language & Currency',
    sales_pos: 'Sales / POS', invoices: 'Invoices', suppliers: 'Suppliers', accounting: 'Accounting',
    staff_payroll: 'Staff & Payroll', inventory_management: 'Inventory Management', purchase_invoices: 'Purchase Invoices',
    inventory_reports: 'Inventory Reports', shop_management: 'Shop Management', role_super_admin: 'Super Admin',
    role_admin: 'Shop Admin', role_seller: 'Seller', role_stock_keeper: 'Stock Keeper', role_accountant: 'Accountant',
    online: 'Online', offline_mode: 'Offline Mode',
    search_products_customers_pages: 'Search products, customers, pages...',
    no_results_found: 'No results found', quick_access: 'Quick Access',
    close: 'Close', manage_account_settings: 'Manage account settings',
    read_all: 'Read all', no_notifications: 'No notifications',
    view_all_notifications: 'View all notifications',
    welcome_message: 'Welcome', smart_management: 'Smart store management at a glance',
    new_sale: 'New Sale', add_product: 'Add Product', new_customer: 'New Customer',
    new_invoice: 'New Invoice', daily_report: 'Daily Report', profit_analysis: 'Profit Analysis',
    today_sales: "Today's Sales", monthly_profit: 'Monthly Net Profit', low_stock: 'Low Stock',
    overdue_debts: 'Overdue Debts', sales_expense_chart: 'Sales & Expense Chart',
    top_products: 'Top Products', recent_transactions: 'Recent Transactions',
    no_data: 'No data available', loading: 'Loading', showing: 'Showing', of: 'of',
    rows_per_page: 'Rows per page', filter: 'Filter', sort: 'Sort', export: 'Export',
    product_name: 'Product Name', category: 'Category', stock: 'Stock',
    purchase_price: 'Purchase Price', sale_price: 'Sale Price', barcode: 'Barcode',
    description: 'Description', all_products: 'All Products',
    customer_name: 'Customer Name', total_purchases: 'Total Purchases', last_purchase: 'Last Purchase',
    balance: 'Balance', all_customers: 'All Customers',
    create: 'Create', update: 'Update', details: 'Details', back: 'Back',
    next: 'Next', previous: 'Previous', submit: 'Submit', clear: 'Clear',
    select_all: 'Select All', from_date: 'From Date', to_date: 'To Date',
    download: 'Download', upload: 'Upload', success: 'Success', error: 'Error',
    warning: 'Warning', required: 'Required', optional: 'Optional', yes: 'Yes', no: 'No',
    app_name: 'Dokanyar',
    last_update: 'Last update', minutes_ago: 'minutes ago', increase_vs_last_month: 'Increase vs last month',
    needs_restock: 'Needs restock', stock_ok: 'Stock is adequate', debtor_customer: 'Debtor customer',
    performance_7d: 'Performance analysis for the last 7 days', weekly_sales_count: 'Based on weekly sales count',
    unit: 'unit', expense: 'Expense', recent_invoices: 'Recent Sales Invoices', view_all: 'View All',
    cash: 'Cash', credit: 'Credit', low_stock_products: 'Low Stock Products', manage_inventory: 'Manage Inventory',
    product: 'Product', out_of_stock: 'Out of stock', low: 'Low',
    product_label: 'Product Label', print_label: 'Print Label', label_size: 'Label Size',
    are_you_sure: 'Are you sure?', yes_delete: 'Yes, delete it', irreversible: 'This action cannot be undone.',
    manage_products: 'Product Management', registered_product: 'registered product', export_excel: 'Export Excel',
    new_product: 'New Product', search_name_code_barcode: 'Search (name, code, barcode)...', all: 'All',
    stop_voice_search: 'Stop voice search', voice_search: 'Voice search',
    scan_barcode: 'Scan barcode with camera', image_search_product: 'Search by product image',
    total_products: 'Total Products', active_products: 'Active', low_stock_count: 'Low Stock', out_of_stock_count: 'Out of Stock',
    code: 'Code', warehouse: 'Warehouse', expiry_badge: 'Expiry', serial_badge: 'Serial',
    edit_product: 'Edit Product', add_new_product: 'Add New Product', product_code: 'Product Code',
    auto_barcode: 'Auto-generate barcode', register_product: 'Register Product', save_changes: 'Save Changes',
    serial_management: 'Serial Number Management', available: 'Available', sold: 'Sold',
    month: 'Month', add_serial_help: 'To add a new serial...',
    expiry_products: 'Product Expiry Dates', expired: 'Expired', under_30_days: 'Under 30 days',
    barcode_required: 'Barcode is required',
    manage_customers: 'Customer Management', print_list: 'Print List',
    search_name_phone_code: 'Search (name, phone, code)...', debtor: 'Debtor', creditor: 'Creditor',
    reminder: 'Reminder', days_ago: 'days ago', new_customer_btn: 'New Customer',
    contact: 'Contact', auto_debt_reminder: 'Auto debt reminder',
    days_before_due: 'Days before due date', register_customer: 'Register Customer',
    customer_history: 'Purchase History', invoice_count: 'Invoice Count', active_debt: 'Active Debt',
    settled: 'Settled', invoices_history: 'Invoice History', no_invoices: 'No invoices recorded',
    items: 'items', remaining: 'Remaining', active_debts: 'Active Debts', due_date: 'Due Date',
    paid_amount: 'Paid', send_message: 'Send Message', whatsapp: 'WhatsApp', email: 'Email',
    message_text: 'Message text', sent: 'Sent',
    new_sale_pos: 'New Sale (POS)', register_sale_invoice: 'Register sale & issue invoice',
    print_last_invoice: 'Print Last Invoice', search_product: 'Search product...', product_not_found: 'No products found',
    select_customer: 'Search or select customer...', existing_debt: 'Existing debt',
    shopping_cart: 'Shopping Cart', clear_cart: 'Clear', clear_cart_confirm: 'Clear shopping cart?',
    no_product_selected: 'No product selected', cash_payment: 'Cash', credit_payment: 'Credit',
    discount: 'Discount', received_amount: 'Received', total_items: 'Total Items',
    total_amount: 'Total Amount', change_return: 'Change', credit_debt: 'Credit Debt',
    optional_note: 'Optional note...', register_invoice: 'Register Invoice',
    invoice_registered: 'Invoice registered', print_invoice_prompt: 'Would you like to print the invoice?',
    print: 'Print', skip: 'Skip', seconds: 'seconds', select_print_size: 'Select print size',
    print_invoice: 'Print Invoice', cart_empty: 'Cart is empty', select_customer_required: 'Select a customer',
    insufficient_stock: 'Insufficient stock', sale_failed: 'Sale registration failed',
    cash_customer: 'Cash Customer', invoice_number: 'Invoice #', customer_label: 'Customer',
    seller: 'Seller', payment: 'Payment', thanks_purchase: 'Thank you for your purchase',
    manage_debts: 'Debt Management', active_debt_count: 'Active Debt', total_debt: 'Total Debt',
    overdue: 'Overdue', partial: 'Partial', settlements: 'Settlements',
    search_customer_invoice: 'Search (customer name, invoice #)...', pending: 'Pending',
    invoice_col: 'Invoice', original_amount: 'Original Amount', remaining_col: 'Remaining',
    receive_payment: 'Receive', register_payment: 'Register Payment',
    payment_amount: 'Payment Amount', max_amount: 'Maximum', full: 'Full', half: 'Half', quarter: 'Quarter',
    payment_note_hint: 'e.g.: Cash payment', enter_amount: 'Enter amount',
    amount_exceeds: 'Amount exceeds remaining', payment_registered: 'Payment registered',
    no_debts_found: 'No debts found',
    manage_suppliers: 'Supplier Management', new_supplier: 'New Supplier',
    supplier_name: 'Supplier Name', company: 'Company',
    manage_staff: 'Staff Management', new_staff: 'New Staff', role: 'Role', salary: 'Salary',
    sales_report: 'Sales Report', inventory_report: 'Inventory Report', debt_report: 'Debt Report',
    profit_report: 'Profit Report', financial_report: 'Financial Report',
    general: 'General', today: 'Today', this_week: 'This Week', this_month: 'This Month',
    custom_range: 'Custom Range', refresh: 'Refresh', apply: 'Apply',
    email_address: 'Email Address', password: 'Password', username: 'Username',
    login: 'Login', register: 'Register', forgot_password: 'Forgot Password',
    shop_code: 'Shop Code', shop_name: 'Shop Name', shop_password: 'Shop Password',
    owner_name: 'Owner Name', continue_with_google: 'Continue with Google',
    about_us: 'About Us', enter: 'Enter', demo_free: 'Free trial',
    select_plan: 'Select Plan', payment_method: 'Payment Method',
    income: 'Income', expense_item: 'Expense', profit: 'Profit', loss: 'Loss',
    cash_register: 'Cash Register', cash_in: 'Deposit', cash_out: 'Withdraw',
    notification_title: 'Notification Title', notification_message: 'Notification Message',
    send_notification: 'Send Notification', target_all: 'All Shops', target_specific: 'Specific Shops',
    backup_export: 'Export Backup', backup_import: 'Import Backup', backup_history: 'Backup History',
    restore: 'Restore', last_backup: 'Last Backup',
    page_business_types_subtitle: 'Platform-wide business types (stored on server).',
    page_business_types_new: 'New type', page_business_types_edit: 'Edit type',
    page_support_subtitle_master: 'All shop tickets — reply is saved here.',
    page_support_subtitle_shop: 'Open a ticket with platform support and track status.',
    support_send_ticket: 'New ticket', support_reply_sent: 'Reply saved', support_ticket_sent: 'Ticket sent',
    support_priority_urgent: 'Urgent', support_priority_important: 'Important', support_priority_normal: 'Normal',
    support_status_replied: 'Replied', support_status_read: 'Read', support_status_pending: 'Pending',
    support_stat_total: 'All tickets', support_stat_pending: 'Pending', support_stat_read: 'Read', support_stat_replied: 'Replied',
    support_no_tickets: 'No tickets', support_reply_label: 'Support reply', support_sender: 'Sender',
    support_message_body: 'Message', support_your_reply: 'Your reply', support_reply_placeholder: 'Write a reply...',
    support_subject: 'Subject', support_priority: 'Priority',
    profile_tab: 'Profile', profile_super_readonly: 'Super admin profile cannot be edited here.',
    loading_session: 'Loading session...',
    demo_cta: 'Upgrade subscription',
    legal_privacy: 'Privacy',
    legal_terms: 'Terms of use',
    onboarding_title: 'Get started with Dokanyar',
    onboarding_subtitle: 'Three quick steps:',
    onboarding_step_dashboard: 'Dashboard',
    onboarding_step_dashboard_body: 'Sales summary, stock alerts, and quick navigation.',
    onboarding_step_products: 'Products & stock',
    onboarding_step_products_body: 'Define products and categories; set minimum stock for alerts.',
    onboarding_step_sales: 'Sales & invoices',
    onboarding_step_sales_body: 'Issue invoices from Sales; data syncs when you are online.',
    onboarding_cta: 'Got it, continue',
    sync_pending_banner: 'Last cloud save failed; retry will run when you are online.',
    offline_banner: 'You are offline — server sync may be unavailable.',
    header_brand_line: 'Smart management', select: 'Select',
    result_type_product: 'Product', result_type_customer: 'Customer', result_type_page: 'Page',
    profile_display_name: 'Display name',
    profile_prefs_hint: 'Language and currency stay in sync with app preferences.', profile_save: 'Save profile',
    profile_saved: 'Profile updated', profile_link_security: 'Password & two-factor',
    tab_general: 'General', tab_language: 'Language & currency', tab_security: 'Security', tab_backup: 'Backup',
    welcome_hero_body: 'Dokanyar: full-featured inventory, sales, and accounting. Modernize your business and grow profit.',
    welcome_about_title: 'About Dokanyar', welcome_login_panel: 'Sign in to dashboard',
    welcome_info_subtitle: 'End-to-end inventory, sales, and accounting for your shop',
    welcome_info_intro: 'Dokanyar is a complete shop-management suite for day-to-day retail work.',
    welcome_info_detail: 'From sales to stock, finances, and thermal printing — unified in one smart workspace.',
    users_page_hint: 'Users from the server; one active account per role. Activate pending roles with username and password.',
  },
};

// ============= MOCK DATA =============

export const superAdminUser: User = {
  id: 1, username: 'admin', password: 'admin123',
  full_name: 'مدیر پلتفرم', role: 'super_admin', status: 'active',
  last_login: '2025-01-15 10:30:00', preferred_language: 'dari', preferred_currency: 'AFN',
};

export const mockBusinessTypes: BusinessType[] = [
  { id: 1, name: 'سوپرمارکت', code: 'supermarket', icon: '🏪', is_active: true, features: ['expiry', 'stock', 'wholesale'] },
  { id: 2, name: 'زرگری', code: 'gold', icon: '💍', is_active: true, features: ['serial', 'weight', 'karat'] },
  { id: 3, name: 'موبایل فروشی', code: 'mobile', icon: '📱', is_active: true, features: ['serial', 'warranty', 'imei'] },
  { id: 4, name: 'پوشاک', code: 'clothing', icon: '👔', is_active: true, features: ['size', 'color', 'brand'] },
  { id: 5, name: 'فروشگاه عمومی', code: 'general', icon: '🛒', is_active: true, features: ['stock', 'wholesale'] },
  { id: 6, name: 'دارویی', code: 'pharmacy', icon: '💊', is_active: true, features: ['expiry', 'batch', 'prescription'] },
  { id: 7, name: 'رستوران', code: 'restaurant', icon: '🍽️', is_active: true, features: ['table', 'recipe', 'ingredients'] },
  { id: 8, name: 'لوازم خانگی', code: 'appliances', icon: '🏠', is_active: false, features: ['serial', 'warranty'] },
];

export const mockUnits: Unit[] = [
  { id: 1, name: 'عدد', code: 'pcs', is_active: true },
  { id: 2, name: 'کیلوگرم', code: 'kg', is_active: true },
  { id: 3, name: 'گرم', code: 'g', is_active: true },
  { id: 4, name: 'لیتر', code: 'l', is_active: true },
  { id: 5, name: 'متر', code: 'm', is_active: true },
  { id: 6, name: 'بسته', code: 'pack', is_active: true },
  { id: 7, name: 'جعبه', code: 'box', is_active: true },
  { id: 8, name: 'دوجین', code: 'dozen', is_active: false },
];

export const mockCurrencies: Currency[] = [
  { id: 1, code: 'AFN', name: 'افغانی', symbol: '؋', exchange_rate: 1, is_default: true, is_active: true },
  { id: 2, code: 'USD', name: 'دالر', symbol: '$', exchange_rate: 75, is_default: false, is_active: true },
  { id: 3, code: 'EUR', name: 'یورو', symbol: '€', exchange_rate: 82, is_default: false, is_active: true },
  { id: 4, code: 'IRT', name: 'تومان', symbol: 'ت', exchange_rate: 0.02, is_default: false, is_active: true },
];

/** رابط کاربری سه‌زبانه: پشتو، فارسی، انگلیسی — دری در نوع داده باقی مانده ولی در تنظیمات پنهان است */
export const mockLanguages: Language[] = [
  { id: 1, code: 'pashto', name: 'پشتو', direction: 'rtl', is_default: true, is_active: true },
  { id: 2, code: 'farsi', name: 'فارسی', direction: 'rtl', is_default: false, is_active: true },
  { id: 3, code: 'english', name: 'English', direction: 'ltr', is_default: false, is_active: true },
  { id: 4, code: 'dari', name: 'دری', direction: 'rtl', is_default: false, is_active: false },
];

export const mockTenants: Tenant[] = [
  {
    id: 1, shop_name: 'فروشگاه احمد', shop_domain: 'ahmad-shop',
    shop_phone: '0791234567', shop_address: 'کابل، شهرنو، سرک سوم',
    owner_name: 'احمد رحیمی', owner_phone: '0791234567',
    owner_whatsapp: '0791234567', owner_email: 'ahmad@example.com',
    subscription_plan: 'premium', subscription_start: '2025-01-01',
    subscription_end: '2025-12-31', subscription_status: 'active',
    max_users: 10, max_products: 1000, database_name: 'tenant_ahmad',
    status: 'active', created_at: '2025-01-01', last_login: '2025-01-15 09:00:00',
    users_count: 4, products_count: 145, sales_today: 12500,
    business_type_id: 1, business_type_name: 'سوپرمارکت',
  },
  {
    id: 2, shop_name: 'سوپرمارکت کریمی', shop_domain: 'karimi-market',
    shop_phone: '0799876543', shop_address: 'کابل، وزیراکبرخان',
    owner_name: 'محمد کریمی', owner_phone: '0799876543',
    owner_whatsapp: '0799876543',
    subscription_plan: 'basic', subscription_start: '2025-01-01',
    subscription_end: '2025-06-30', subscription_status: 'active',
    max_users: 3, max_products: 500, database_name: 'tenant_karimi',
    status: 'active', created_at: '2025-01-05', last_login: '2025-01-15 08:00:00',
    users_count: 2, products_count: 89, sales_today: 8200,
    business_type_id: 5, business_type_name: 'فروشگاه عمومی',
  },
  {
    id: 3, shop_name: 'دارویی صحت', shop_domain: 'sehat-pharmacy',
    shop_phone: '0785432198', shop_address: 'کابل، مکروریان',
    owner_name: 'زهرا نوری', owner_phone: '0785432198',
    owner_email: 'zahra@sehat.af',
    subscription_plan: 'premium', subscription_start: '2024-12-01',
    subscription_end: '2025-03-31', subscription_status: 'active',
    max_users: 10, max_products: 1000, database_name: 'tenant_sehat',
    status: 'active', created_at: '2024-12-01', last_login: '2025-01-14 16:00:00',
    users_count: 6, products_count: 312, sales_today: 22000,
    business_type_id: 6, business_type_name: 'دارویی',
  },
  {
    id: 4, shop_name: 'موبایل فروشی یاسر', shop_domain: 'yaser-mobile',
    shop_phone: '0781111222', shop_address: 'کابل، جاده میوند',
    owner_name: 'یاسر احمدی', owner_phone: '0781111222',
    subscription_plan: 'basic', subscription_start: '2024-10-01',
    subscription_end: '2025-01-01', subscription_status: 'expired',
    max_users: 3, max_products: 500, database_name: 'tenant_yaser',
    status: 'suspended', created_at: '2024-10-01', last_login: '2025-01-01 12:00:00',
    users_count: 1, products_count: 45, sales_today: 0,
    business_type_id: 3, business_type_name: 'موبایل فروشی',
  },
  {
    id: 5, shop_name: 'زرگری نوری', shop_domain: 'noori-gold',
    shop_phone: '0786543210', shop_address: 'کابل، جاده پل سرخ',
    owner_name: 'عبدالله نوری', owner_phone: '0786543210',
    owner_whatsapp: '0786543210', owner_email: 'noori@gold.af',
    subscription_plan: 'premium', subscription_start: '2025-01-10',
    subscription_end: '2026-01-10', subscription_status: 'active',
    max_users: 10, max_products: 1000, database_name: 'tenant_noori',
    status: 'active', created_at: '2025-01-10', last_login: '2025-01-15 11:00:00',
    users_count: 3, products_count: 210, sales_today: 45000,
    business_type_id: 2, business_type_name: 'زرگری',
  },
];

export const mockCategories: Category[] = [
  { id: 1, name: 'مواد غذایی', parent_id: null, status: 'active' },
  { id: 2, name: 'لبنیات', parent_id: 1, status: 'active' },
  { id: 3, name: 'نوشیدنی', parent_id: 1, status: 'active' },
  { id: 4, name: 'پوشاک', parent_id: null, status: 'active' },
  { id: 5, name: 'الکترونیک', parent_id: null, status: 'active' },
  { id: 6, name: 'دارویی', parent_id: null, status: 'active' },
];

export const mockProducts: Product[] = [
  { id: 1, product_code: 'P001', barcode: '123456789', name: 'برنج باسمتی ۵ کیلو', category_id: 1, category_name: 'مواد غذایی', unit_id: 2, unit_name: 'کیلوگرم', purchase_price: 350, sale_price: 420, stock_shop: 45, stock_warehouse: 200, min_stock: 20, is_active: true, created_at: '2025-01-01', tenant_id: 1, has_expiry: true },
  { id: 2, product_code: 'P002', barcode: '987654321', name: 'روغن زیتون ۱ لیتر', category_id: 1, category_name: 'مواد غذایی', unit_id: 4, unit_name: 'لیتر', purchase_price: 180, sale_price: 220, stock_shop: 30, stock_warehouse: 120, min_stock: 15, is_active: true, created_at: '2025-01-01', tenant_id: 1, has_expiry: true },
  { id: 3, product_code: 'P003', barcode: '456789123', name: 'شیر پاستوریزه ۱ لیتر', category_id: 2, category_name: 'لبنیات', unit_id: 4, unit_name: 'لیتر', purchase_price: 55, sale_price: 70, stock_shop: 80, stock_warehouse: 300, min_stock: 50, is_active: true, created_at: '2025-01-02', tenant_id: 1, has_expiry: true },
  { id: 4, product_code: 'P004', barcode: '321654987', name: 'ماست طبیعی ۵۰۰ گرم', category_id: 2, category_name: 'لبنیات', unit_id: 3, unit_name: 'گرم', purchase_price: 45, sale_price: 60, stock_shop: 15, stock_warehouse: 80, min_stock: 20, is_active: true, created_at: '2025-01-02', tenant_id: 1, has_expiry: true },
  { id: 5, product_code: 'P005', barcode: '654321789', name: 'آب معدنی ۱.۵ لیتر', category_id: 3, category_name: 'نوشیدنی', unit_id: 4, unit_name: 'لیتر', purchase_price: 20, sale_price: 30, stock_shop: 200, stock_warehouse: 1000, min_stock: 100, is_active: true, created_at: '2025-01-03', tenant_id: 1 },
  { id: 6, product_code: 'P006', barcode: '789123456', name: 'نوشابه کوکاکولا ۳۳۰ml', category_id: 3, category_name: 'نوشیدنی', unit_id: 1, unit_name: 'عدد', purchase_price: 35, sale_price: 50, stock_shop: 5, stock_warehouse: 20, min_stock: 30, is_active: true, created_at: '2025-01-03', tenant_id: 1, has_expiry: true },
  { id: 7, product_code: 'P007', barcode: '111222333', name: 'چای احمد ۵۰۰ گرم', category_id: 1, category_name: 'مواد غذایی', unit_id: 6, unit_name: 'بسته', purchase_price: 120, sale_price: 150, stock_shop: 25, stock_warehouse: 100, min_stock: 10, is_active: true, created_at: '2025-01-04', tenant_id: 1 },
  { id: 8, product_code: 'P008', barcode: '444555666', name: 'شکر سفید ۱ کیلو', category_id: 1, category_name: 'مواد غذایی', unit_id: 2, unit_name: 'کیلوگرم', purchase_price: 40, sale_price: 55, stock_shop: 60, stock_warehouse: 500, min_stock: 50, is_active: false, created_at: '2025-01-05', tenant_id: 1 },
  { id: 9, product_code: 'P009', barcode: '555666777', name: 'آیفون ۱۵ پرو', category_id: 5, category_name: 'الکترونیک', unit_id: 1, unit_name: 'عدد', purchase_price: 45000, sale_price: 52000, stock_shop: 5, stock_warehouse: 10, min_stock: 2, is_active: true, created_at: '2025-01-06', tenant_id: 1, has_serial: true },
  { id: 10, product_code: 'P010', barcode: '666777888', name: 'پنیر محلی ۲۵۰ گرم', category_id: 2, category_name: 'لبنیات', unit_id: 3, unit_name: 'گرم', purchase_price: 60, sale_price: 80, stock_shop: 0, stock_warehouse: 50, min_stock: 10, is_active: true, created_at: '2025-01-07', tenant_id: 1, has_expiry: true },
];

export const mockProductExpiry: ProductExpiry[] = [
  { id: 1, product_id: 1, product_name: 'برنج باسمتی ۵ کیلو', batch_number: 'B001', expiry_date: '2025-06-30', quantity: 50, created_at: '2025-01-01' },
  { id: 2, product_id: 2, product_name: 'روغن زیتون ۱ لیتر', batch_number: 'B002', expiry_date: '2025-03-15', quantity: 30, created_at: '2025-01-01' },
  { id: 3, product_id: 3, product_name: 'شیر پاستوریزه ۱ لیتر', batch_number: 'B003', expiry_date: '2025-02-01', quantity: 80, created_at: '2025-01-10' },
  { id: 4, product_id: 4, product_name: 'ماست طبیعی ۵۰۰ گرم', batch_number: 'B004', expiry_date: '2025-01-25', quantity: 15, created_at: '2025-01-12' },
  { id: 5, product_id: 6, product_name: 'نوشابه کوکاکولا', batch_number: 'B005', expiry_date: '2025-12-31', quantity: 120, created_at: '2025-01-05' },
  { id: 6, product_id: 10, product_name: 'پنیر محلی ۲۵۰ گرم', batch_number: 'B006', expiry_date: '2025-01-20', quantity: 50, created_at: '2025-01-07' },
];

export const mockSerialNumbers: SerialNumber[] = [
  { id: 1, product_id: 9, product_name: 'آیفون ۱۵ پرو', serial_number: 'SN-IP15-001', warranty_months: 12, status: 'available' },
  { id: 2, product_id: 9, product_name: 'آیفون ۱۵ پرو', serial_number: 'SN-IP15-002', warranty_months: 12, status: 'available' },
  { id: 3, product_id: 9, product_name: 'آیفون ۱۵ پرو', serial_number: 'SN-IP15-003', warranty_months: 12, status: 'sold', sold_invoice_id: 1 },
  { id: 4, product_id: 9, product_name: 'آیفون ۱۵ پرو', serial_number: 'SN-IP15-004', warranty_months: 12, status: 'available' },
  { id: 5, product_id: 9, product_name: 'آیفون ۱۵ پرو', serial_number: 'SN-IP15-005', warranty_months: 12, status: 'sold', sold_invoice_id: 2 },
];

export const mockCustomers: Customer[] = [
  { id: 1, customer_code: 'C001', name: 'علی احمدزاده', phone: '0791111111', whatsapp: '0791111111', email: 'ali@example.com', address: 'کابل، کارته سه', balance: -12000, total_purchases: 85000, status: 'active', reminder_enabled: true, reminder_days_before: 3, created_at: '2025-01-01', tenant_id: 1 },
  { id: 2, customer_code: 'C002', name: 'فاطمه محمدی', phone: '0792222222', whatsapp: '0792222222', address: 'کابل، شهرنو', balance: 5000, total_purchases: 42000, status: 'active', reminder_enabled: true, reminder_days_before: 2, created_at: '2025-01-02', tenant_id: 1 },
  { id: 3, customer_code: 'C003', name: 'حسین رضایی', phone: '0793333333', email: 'hosein@example.com', address: 'کابل، مکروریان دوم', balance: -28500, total_purchases: 120000, status: 'active', reminder_enabled: true, reminder_days_before: 5, created_at: '2025-01-03', tenant_id: 1 },
  { id: 4, customer_code: 'C004', name: 'زینب کریمی', phone: '0794444444', address: 'کابل، وزیراکبرخان', balance: 0, total_purchases: 15000, status: 'active', reminder_enabled: false, reminder_days_before: 3, created_at: '2025-01-05', tenant_id: 1 },
  { id: 5, customer_code: 'C005', name: 'محمود نوری', phone: '0795555555', address: 'کابل، چهاراهی قمبر', balance: -5500, total_purchases: 38000, status: 'inactive', reminder_enabled: true, reminder_days_before: 3, created_at: '2025-01-06', tenant_id: 1 },
  { id: 6, customer_code: 'C006', name: 'نسرین صدیقی', phone: '0796666666', whatsapp: '0796666666', email: 'nasrin@mail.af', address: 'کابل، پل سرخ', balance: 2000, total_purchases: 65000, status: 'active', reminder_enabled: true, reminder_days_before: 2, created_at: '2025-01-07', tenant_id: 1 },
];

export const mockReminders: Reminder[] = [
  { id: 1, debt_id: 1, customer_name: 'علی احمدزاده', reminder_date: '2025-02-12', reminder_type: 'whatsapp', sent_to: '0791111111', message: 'مشتری گرامی، شما ۱۲۰۰۰ افغانی بدهی دارید که در ۳ روز آینده سررسید می‌شود.', status: 'sent', sent_at: '2025-02-12 09:00', created_at: '2025-01-15' },
  { id: 2, debt_id: 2, customer_name: 'حسین رضایی', reminder_date: '2025-01-29', reminder_type: 'sms', sent_to: '0793333333', message: 'یادآوری بدهی ۲۸۵۰۰ افغانی تا ۵ روز دیگر.', status: 'pending', created_at: '2025-01-15' },
  { id: 3, debt_id: 3, customer_name: 'محمود نوری', reminder_date: '2025-01-08', reminder_type: 'sms', sent_to: '0795555555', message: 'بدهی معوق شما ۵۵۰۰ افغانی است.', status: 'failed', created_at: '2025-01-07' },
  { id: 4, debt_id: 1, customer_name: 'علی احمدزاده', reminder_date: '2025-01-10', reminder_type: 'email', sent_to: 'ali@example.com', message: 'یادآوری بدهی از طریق ایمیل', status: 'sent', sent_at: '2025-01-10 10:30', created_at: '2025-01-09' },
];

export const mockNotifications: Notification[] = [
  { id: 1, user_id: 1, type: 'debt', title: 'بدهی معوق', message: 'محمود نوری ۵۵۰۰ افغانی بدهی معوق دارد', link: '/debts', is_read: false, is_heard: false, created_at: '2025-01-15 08:00' },
  { id: 2, user_id: 1, type: 'stock', title: 'کم‌موجودی', message: 'نوشابه کوکاکولا به حداقل موجودی رسیده', link: '/products', is_read: false, is_heard: false, created_at: '2025-01-15 09:30' },
  { id: 3, user_id: 1, type: 'expiry', title: 'تاریخ انقضا', message: 'ماست طبیعی در ۱۰ روز دیگر منقضی می‌شود', link: '/products', is_read: true, is_heard: true, created_at: '2025-01-14 10:00' },
  { id: 4, user_id: 1, type: 'pending', title: 'فروش در انتظار', message: 'فاکتور INV-003 منتظر تأیید است', link: '/pending', is_read: false, is_heard: false, created_at: '2025-01-15 11:00' },
  { id: 5, user_id: 1, type: 'stock', title: 'اتمام موجودی', message: 'پنیر محلی موجودی ندارد', link: '/products', is_read: false, is_heard: false, created_at: '2025-01-15 12:00' },
];

export const mockSupportMessages: SupportMessage[] = [
  { id: 1, tenant_id: 1, tenant_name: 'فروشگاه احمد', sender_name: 'احمد رحیمی', sender_phone: '0791234567', subject: 'مشکل در چاپ فاکتور', message: 'سلام، وقتی می‌خواهم فاکتور چاپ کنم خطا می‌دهد. لطفاً کمک کنید.', priority: 'important', status: 'pending', created_at: '2025-01-15 10:00' },
  { id: 2, tenant_id: 2, tenant_name: 'سوپرمارکت کریمی', sender_name: 'محمد کریمی', sender_phone: '0799876543', subject: 'درخواست افزایش محدودیت محصولات', message: 'محصولات ما بیشتر از ۵۰۰ عدد است. آیا می‌توانیم طرح را ارتقا دهیم؟', priority: 'normal', status: 'read', created_at: '2025-01-14 14:00' },
  { id: 3, tenant_id: 3, tenant_name: 'دارویی صحت', sender_name: 'زهرا نوری', sender_phone: '0785432198', subject: 'خطای ورود به سیستم', message: 'رمز عبور فروشنده کار نمی‌کند.', priority: 'urgent', status: 'replied', created_at: '2025-01-13 16:30', reply: 'مشکل برطرف شد. رمز عبور ریست گردید.' },
  { id: 4, tenant_id: 4, tenant_name: 'موبایل فروشی یاسر', sender_name: 'یاسر احمدی', sender_phone: '0781111222', subject: 'تمدید اشتراک', message: 'اشتراکم منقضی شده، چگونه تمدید کنم؟', priority: 'important', status: 'pending', created_at: '2025-01-15 14:00' },
];

export const mockPrintSettings: PrintSettings = {
  paper_size: '80mm', logo_path: '', show_shop_name: true,
  show_shop_address: true, show_shop_phone: true, show_seller_name: true,
  show_barcode: true, footer_text: 'ممنون از خرید شما', print_copies: 1,
};

export const mockBackupSettings: BackupSettings = {
  email: 'backup@shop.af', backup_time: '02:00', frequency: 'daily',
  keep_days: 30, send_email: true, last_backup_date: '2025-01-15',
};

export const mockSavedReports: SavedReport[] = [
  { id: 1, report_name: 'گزارش فروش ماهانه دی', report_type: 'sales', format: 'excel', created_by: 'احمد رحیمی', created_at: '2025-01-01' },
  { id: 2, report_name: 'گزارش موجودی انبار', report_type: 'inventory', format: 'pdf', created_by: 'علی انباردار', created_at: '2025-01-10' },
  { id: 3, report_name: 'گزارش بدهی مشتریان', report_type: 'debts', format: 'excel', created_by: 'احمد رحیمی', created_at: '2025-01-15' },
];

export const mockInvoices: Invoice[] = [
  {
    id: 1, invoice_number: 'INV-001', customer_id: 1, customer_name: 'علی احمدزاده', customer_phone: '0791111111',
    seller_id: 2, seller_name: 'احمد فروشنده', subtotal: 12500, discount: 500, total: 12000, paid_amount: 0, due_amount: 12000,
    payment_method: 'credit', status: 'approved', approval_status: 'approved', invoice_date: '2025-01-15', due_date: '2025-02-15',
    notes: '', tenant_id: 1, currency: 'AFN',
    items: [
      { id: 1, product_id: 1, product_name: 'برنج باسمتی ۵ کیلو', quantity: 20, unit_price: 420, total_price: 8400 },
      { id: 2, product_id: 3, product_name: 'شیر پاستوریزه ۱ لیتر', quantity: 10, unit_price: 70, total_price: 700 },
      { id: 3, product_id: 7, product_name: 'چای احمد ۵۰۰ گرم', quantity: 20, unit_price: 150, total_price: 3000 },
    ]
  },
  {
    id: 2, invoice_number: 'INV-002', customer_id: 2, customer_name: 'فاطمه محمدی', customer_phone: '0792222222',
    seller_id: 2, seller_name: 'احمد فروشنده', subtotal: 8500, discount: 0, total: 8500, paid_amount: 8500, due_amount: 0,
    payment_method: 'cash', status: 'completed', approval_status: 'approved', invoice_date: '2025-01-14', due_date: '',
    notes: 'مشتری وفادار', tenant_id: 1, currency: 'AFN',
    items: [
      { id: 4, product_id: 2, product_name: 'روغن زیتون ۱ لیتر', quantity: 20, unit_price: 220, total_price: 4400 },
      { id: 5, product_id: 7, product_name: 'چای احمد ۵۰۰ گرم', quantity: 10, unit_price: 150, total_price: 1500 },
      { id: 6, product_id: 5, product_name: 'آب معدنی', quantity: 86, unit_price: 30, total_price: 2580 },
    ]
  },
  {
    id: 3, invoice_number: 'INV-003', customer_id: 3, customer_name: 'حسین رضایی', customer_phone: '0793333333',
    seller_id: 2, seller_name: 'احمد فروشنده', subtotal: 28500, discount: 0, total: 28500, paid_amount: 0, due_amount: 28500,
    payment_method: 'credit', status: 'pending', approval_status: 'pending', invoice_date: '2025-01-15', due_date: '2025-02-01',
    notes: '', tenant_id: 1, currency: 'AFN',
    items: [
      { id: 7, product_id: 1, product_name: 'برنج باسمتی ۵ کیلو', quantity: 50, unit_price: 420, total_price: 21000 },
      { id: 8, product_id: 2, product_name: 'روغن زیتون ۱ لیتر', quantity: 20, unit_price: 220, total_price: 4400 },
      { id: 9, product_id: 8, product_name: 'شکر سفید ۱ کیلو', quantity: 55, unit_price: 55, total_price: 3025 },
    ]
  },
];

export const mockDebts: Debt[] = [
  { id: 1, invoice_id: 1, invoice_number: 'INV-001', customer_id: 1, customer_name: 'علی احمدزاده', customer_phone: '0791111111', amount: 12000, due_date: '2025-02-15', paid_amount: 0, remaining_amount: 12000, status: 'pending', created_at: '2025-01-15', tenant_id: 1 },
  { id: 2, invoice_id: 3, invoice_number: 'INV-003', customer_id: 3, customer_name: 'حسین رضایی', customer_phone: '0793333333', amount: 28500, due_date: '2025-02-01', paid_amount: 0, remaining_amount: 28500, status: 'pending', created_at: '2025-01-15', tenant_id: 1 },
  { id: 3, invoice_id: 0, invoice_number: 'INV-OLD', customer_id: 5, customer_name: 'محمود نوری', customer_phone: '0795555555', amount: 5500, due_date: '2025-01-10', paid_amount: 0, remaining_amount: 5500, status: 'overdue', created_at: '2024-12-10', tenant_id: 1 },
  { id: 4, invoice_id: 0, invoice_number: 'INV-OLD2', customer_id: 6, customer_name: 'نسرین صدیقی', customer_phone: '0796666666', amount: 15000, due_date: '2025-01-31', paid_amount: 7500, remaining_amount: 7500, status: 'partial', created_at: '2024-12-20', tenant_id: 1 },
];

export const mockTenantUsers: User[] = [
  { id: 1, username: 'admin', password: 'admin123', full_name: 'مدیر دکان', role: 'admin', status: 'active', last_login: '2025-01-15 09:00', tenant_id: 1, two_factor_enabled: false, preferred_language: 'dari', preferred_currency: 'AFN' },
  { id: 2, username: 'seller1', password: 'seller123', full_name: 'احمد فروشنده', role: 'seller', status: 'active', last_login: '2025-01-15 08:30', tenant_id: 1, two_factor_enabled: false, preferred_language: 'dari', preferred_currency: 'AFN' },
  { id: 3, username: 'stock1', password: 'stock123', full_name: 'علی انباردار', role: 'stock_keeper', status: 'active', last_login: '2025-01-14 17:00', tenant_id: 1, two_factor_enabled: true, preferred_language: 'pashto', preferred_currency: 'AFN' },
  { id: 4, username: 'seller2', password: 'seller456', full_name: 'مریم فروشنده', role: 'seller', status: 'inactive', last_login: '2025-01-10 16:00', tenant_id: 1, two_factor_enabled: false, preferred_language: 'dari', preferred_currency: 'AFN' },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: 1, user_id: 2, user_name: 'احمد فروشنده', action: 'ایجاد فاکتور', table_name: 'invoices', record_id: 3, new_data: '{"invoice_number":"INV-003","total":28500}', ip_address: '192.168.1.10', created_at: '2025-01-15 11:00' },
  { id: 2, user_id: 1, user_name: 'مدیر دکان', action: 'تأیید فاکتور', table_name: 'invoices', record_id: 1, old_data: '{"status":"pending"}', new_data: '{"status":"approved"}', ip_address: '192.168.1.1', created_at: '2025-01-15 10:30' },
  { id: 3, user_id: 1, user_name: 'مدیر دکان', action: 'ویرایش محصول', table_name: 'products', record_id: 1, old_data: '{"sale_price":400}', new_data: '{"sale_price":420}', ip_address: '192.168.1.1', created_at: '2025-01-15 09:00' },
  { id: 4, user_id: 3, user_name: 'علی انباردار', action: 'افزودن موجودی', table_name: 'products', record_id: 5, old_data: '{"stock_warehouse":800}', new_data: '{"stock_warehouse":1000}', ip_address: '192.168.1.15', created_at: '2025-01-14 16:00' },
  { id: 5, user_id: 2, user_name: 'احمد فروشنده', action: 'ثبت مشتری جدید', table_name: 'customers', record_id: 6, new_data: '{"name":"نسرین صدیقی"}', ip_address: '192.168.1.10', created_at: '2025-01-14 14:30' },
  { id: 6, user_id: 1, user_name: 'مدیر دکان', action: 'حذف محصول', table_name: 'products', record_id: 8, old_data: '{"name":"شکر سفید"}', ip_address: '192.168.1.1', created_at: '2025-01-13 11:00' },
  { id: 7, user_id: 2, user_name: 'احمد فروشنده', action: 'دریافت پرداخت', table_name: 'debts', record_id: 4, old_data: '{"paid_amount":0}', new_data: '{"paid_amount":7500}', ip_address: '192.168.1.10', created_at: '2025-01-13 09:30' },
];

export const mockUserSessions: UserSession[] = [
  { id: 1, user_id: 1, user_name: 'مدیر دکان', ip_address: '192.168.1.1', user_agent: 'Chrome 120 / Windows 11', login_time: '2025-01-15 08:00', last_activity: '2025-01-15 11:30', expiry_time: '2025-01-15 12:00', is_active: true },
  { id: 2, user_id: 2, user_name: 'احمد فروشنده', ip_address: '192.168.1.10', user_agent: 'Firefox 121 / Android 13', login_time: '2025-01-15 08:30', last_activity: '2025-01-15 11:00', expiry_time: '2025-01-15 12:00', is_active: true },
  { id: 3, user_id: 3, user_name: 'علی انباردار', ip_address: '192.168.1.15', user_agent: 'Safari / iOS 17', login_time: '2025-01-14 07:00', last_activity: '2025-01-14 17:00', expiry_time: '2025-01-14 17:30', is_active: false },
  { id: 4, user_id: 1, user_name: 'مدیر دکان', ip_address: '10.0.0.5', user_agent: 'Chrome 120 / macOS', login_time: '2025-01-14 10:00', last_activity: '2025-01-14 18:00', expiry_time: '2025-01-14 18:30', is_active: false },
];

export const mockOfflineQueue: OfflineQueue[] = [
  { id: 'q-001', operation_type: 'insert', table_name: 'invoices', data: '{"invoice_number":"INV-004","total":5200}', status: 'pending', created_at: '2025-01-15 11:45' },
  { id: 'q-002', operation_type: 'update', table_name: 'customers', data: '{"id":3,"balance":-28500}', status: 'synced', created_at: '2025-01-15 10:00' },
  { id: 'q-003', operation_type: 'insert', table_name: 'invoices', data: '{"invoice_number":"INV-OLD","total":3100}', status: 'failed', created_at: '2025-01-14 18:00' },
  { id: 'q-004', operation_type: 'update', table_name: 'products', data: '{"id":5,"stock_shop":195}', status: 'pending', created_at: '2025-01-15 12:00' },
];

export const mockAdminNotifications: AdminNotification[] = [
  { id: 1, title: 'بروزرسانی سیستم', message: 'نسخه ۲.۰ سیستم در شب امروز نصب خواهد شد. لطفاً قبل از ساعت ۱۱ شب از سیستم خارج شوید.', target_type: 'all', send_sms: false, send_in_app: true, created_at: '2025-01-15 09:00', created_by: 'مدیر پلتفرم' },
  { id: 2, title: 'تعطیلات سیستم', message: 'روز جمعه سیستم از ساعت ۲ تا ۴ صبح دسترسی ندارد. از همکاری شما ممنونیم.', target_type: 'all', send_sms: true, send_in_app: true, created_at: '2025-01-14 14:00', created_by: 'مدیر پلتفرم' },
  { id: 3, title: 'ویژگی جدید: چاپ فاکتور', message: 'قابلیت چاپ فاکتور با ۴ اندازه مختلف اضافه شد. از تنظیمات چاپ آن را تنظیم کنید.', target_type: 'all', send_sms: false, send_in_app: true, created_at: '2025-01-10 10:00', created_by: 'مدیر پلتفرم' },
];

export const mockSuppliers: Supplier[] = [
  { id: 1, supplier_code: 'SUP001', company_name: 'شرکت توزیع مواد غذایی افغان', contact_name: 'محمد حسن', phone: '0701111111', whatsapp: '0701111111', email: 'afgan@supply.af', address: 'کابل، پل باغ عمومی', product_types: 'مواد غذایی، روغن، شکر', balance: -45000, total_purchases: 380000, status: 'active', created_at: '2024-10-01', notes: 'تامین‌کننده اصلی مواد غذایی' },
  { id: 2, supplier_code: 'SUP002', company_name: 'لبنیات گلستان', contact_name: 'احمد گل', phone: '0702222222', address: 'کابل، چهاراهی سدارت', product_types: 'لبنیات، شیر، ماست', balance: -12000, total_purchases: 95000, status: 'active', created_at: '2024-11-01' },
  { id: 3, supplier_code: 'SUP003', company_name: 'نوشیدنی نوشین', contact_name: 'علی رضا', phone: '0703333333', email: 'nowshin@drink.af', address: 'کابل، ده افغانان', product_types: 'نوشیدنی، آب معدنی', balance: 0, total_purchases: 52000, status: 'active', created_at: '2024-12-01' },
  { id: 4, supplier_code: 'SUP004', company_name: 'واردات کالای الکترونیک', contact_name: 'یاسین', phone: '0704444444', whatsapp: '0704444444', address: 'کابل، جاده میوند', product_types: 'موبایل، لوازم جانبی', balance: -180000, total_purchases: 750000, status: 'active', created_at: '2024-09-01' },
  { id: 5, supplier_code: 'SUP005', company_name: 'دارویی صحت‌زا', contact_name: 'دکتر نوری', phone: '0705555555', email: 'sahat@pharma.af', address: 'کابل، مکروریان', product_types: 'دارو، ملزومات پزشکی', balance: -22000, total_purchases: 120000, status: 'inactive', created_at: '2024-08-01' },
];

export const mockPersonalReminders: PersonalReminder[] = [
  { id: 1, title: 'پرداخت اجاره دکان', note: 'اجاره ماه جاری را پرداخت کنم', reminder_date: '2025-01-25', reminder_time: '09:00', is_done: false, priority: 'high', created_at: '2025-01-15' },
  { id: 2, title: 'ملاقات با تامین‌کننده', note: 'جلسه با محمد حسن از شرکت توزیع برای مذاکره قیمت جدید', reminder_date: '2025-01-20', reminder_time: '10:00', is_done: false, priority: 'normal', created_at: '2025-01-14' },
  { id: 3, title: 'تمدید اشتراک سیستم', note: 'اشتراک سیستم مدیریت فروشگاه تمدید شود', reminder_date: '2025-02-01', is_done: false, priority: 'high', created_at: '2025-01-10' },
  { id: 4, title: 'بررسی موجودی انبار', note: 'موجودی کالاهای با فروش بالا بررسی شود', reminder_date: '2025-01-18', reminder_time: '14:00', is_done: true, priority: 'normal', created_at: '2025-01-10' },
];

export const mockPayments: Payment[] = [
  { id: 1, tenant_id: 1, tenant_name: 'فروشگاه احمد', amount: 1500, payment_date: '2025-01-01', payment_method: 'bank', for_month: '2025-01', status: 'completed' },
  { id: 2, tenant_id: 2, tenant_name: 'سوپرمارکت کریمی', amount: 800, payment_date: '2025-01-02', payment_method: 'cash', for_month: '2025-01', status: 'completed' },
  { id: 3, tenant_id: 3, tenant_name: 'دارویی صحت', amount: 1500, payment_date: '2025-01-03', payment_method: 'bank', for_month: '2025-01', status: 'completed' },
  { id: 4, tenant_id: 5, tenant_name: 'زرگری نوری', amount: 1500, payment_date: '2025-01-10', payment_method: 'bank', for_month: '2025-01', status: 'completed' },
  { id: 5, tenant_id: 4, tenant_name: 'موبایل فروشی یاسر', amount: 800, payment_date: '2024-10-05', payment_method: 'cash', for_month: '2024-10', status: 'completed' },
];

export const salesChartData = [
  { name: 'شنبه', sales: 45000, cost: 32000 },
  { name: 'یکشنبه', sales: 52000, cost: 38000 },
  { name: 'دوشنبه', sales: 38000, cost: 27000 },
  { name: 'سه‌شنبه', sales: 61000, cost: 44000 },
  { name: 'چهارشنبه', sales: 55000, cost: 40000 },
  { name: 'پنج‌شنبه', sales: 72000, cost: 52000 },
  { name: 'جمعه', sales: 28000, cost: 20000 },
];

export const monthlyData = [
  { name: 'حمل', sales: 320000, tenants: 2 },
  { name: 'ثور', sales: 410000, tenants: 3 },
  { name: 'جوزا', sales: 380000, tenants: 3 },
  { name: 'سرطان', sales: 520000, tenants: 4 },
  { name: 'اسد', sales: 490000, tenants: 4 },
  { name: 'سنبله', sales: 610000, tenants: 5 },
];
