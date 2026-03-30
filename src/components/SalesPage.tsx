import { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, X, Check, Package, User, CreditCard, Banknote, Printer, ChevronDown, ChevronUp, Mic, MicOff, Send } from 'lucide-react';
import { Invoice, InvoiceItem, Product, type CurrencyCode } from '../data/mockData';
import { useToast } from './Toast';
import { useApp } from '../context/AppContext';
import { useStore, type ShopSettings } from '../store/useStore';
import { apiCreateSaleInvoice } from '../services/api';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { buildProductImagesPrintSection } from '../utils/invoicePrintProductImages';
import { bookToProductForSale } from '../utils/bookInventory';
import FormModal from './ui/FormModal';

interface CartItem extends InvoiceItem {
  stock_available: number;
  image_url?: string;
  stock_source: 'shop' | 'warehouse';
  currency_code?: CurrencyCode;
}

type PaperSize = ShopSettings['paper_size'];

type PrintInvoiceOpts = {
  paper_size: PaperSize;
  invoice_copy_mode: ShopSettings['invoice_copy_mode'];
  print_copies: number;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  seller_name: string;
  logo_url: string;
  /** فقط برای A4 / A5 / Letter */
  include_product_images: boolean;
  products: Product[];
};

function printInvoice(inv: Invoice, opts: PrintInvoiceOpts) {
  const size = opts.paper_size;
  const widthMap: Record<PaperSize, string> = {
    A4: '210mm',
    A5: '148mm',
    Letter: '216mm',
    '80mm': '80mm',
    '72mm': '72mm',
    '58mm': '58mm',
  };
  const heightMap: Record<PaperSize, string> = {
    A4: '297mm',
    A5: '210mm',
    Letter: '279mm',
    '80mm': 'auto',
    '72mm': 'auto',
    '58mm': 'auto',
  };
  const fontMap: Record<PaperSize, string> = {
    A4: '13px',
    A5: '11px',
    Letter: '12px',
    '80mm': '10px',
    '72mm': '10px',
    '58mm': '9px',
  };
  const paddingMap: Record<PaperSize, string> = {
    A4: '20mm',
    A5: '15mm',
    Letter: '18mm',
    '80mm': '5mm',
    '72mm': '4mm',
    '58mm': '3mm',
  };
  const isThermal = size === '80mm' || size === '58mm' || size === '72mm';
  const w = widthMap[size];
  const h = heightMap[size];
  const f = fontMap[size];
  const p = paddingMap[size];
  const canPhoto = !isThermal && (size === 'A4' || size === 'A5' || size === 'Letter');
  const photoTitleSize = size === 'A4' ? '12px' : '11px';
  const photosBlock =
    canPhoto && opts.include_product_images
      ? buildProductImagesPrintSection(inv, opts.products, photoTitleSize)
      : '';

  const shopInfo = {
    name: opts.shop_name || 'فروشگاه',
    address: opts.shop_address || '',
    phone: opts.shop_phone || '',
    seller: opts.seller_name || '',
    logo: opts.logo_url || '',
  };

  const copyLabels =
    opts.invoice_copy_mode === 'single'
      ? ['']
      : opts.invoice_copy_mode === 'duplicate'
        ? ['نسخه مشتری', 'نسخه مغازه']
        : ['نسخه مشتری', 'نسخه مغازه', 'نسخه حسابداری'];

  const physicalRuns = Math.max(1, Math.min(9, Math.floor(Number(opts.print_copies) || 1)));

  const oneCopyHtml = (copyLabel: string) => `
  <div class="copy-root">
    ${copyLabel ? `<div class="copy-banner">${copyLabel}</div>` : ''}
    <div class="header">
      ${shopInfo.logo ? `<img src="${shopInfo.logo}" class="logo" alt="" />` : ''}
      <div class="shop-name">${shopInfo.name}</div>
      <div class="shop-sub">${shopInfo.address}</div>
      <div class="shop-sub">📞 ${shopInfo.phone}</div>
      <div class="inv-num">فاکتور شماره: ${inv.invoice_number}</div>
    </div>
    <div class="info-section">
      <div><span class="info-label">مشتری: </span><span class="info-val">${inv.customer_name}</span></div>
      <div><span class="info-label">تاریخ: </span><span class="info-val">${inv.invoice_date}</span></div>
      <div><span class="info-label">موبایل: </span><span class="info-val">${inv.customer_phone || '—'}</span></div>
      <div><span class="info-label">فروشنده: </span><span class="info-val">${inv.seller_name}</span></div>
      <div><span class="info-label">پرداخت: </span><span class="info-val">${inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}</span></div>
      ${inv.due_date ? `<div><span class="info-label">سررسید: </span><span class="info-val">${inv.due_date}</span></div>` : ''}
    </div>
    <hr class="sep">
    <table>
      <thead><tr><th>محصول</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
      <tbody>${inv.items
        .map(
          (item) => `<tr>
        <td>${item.product_name}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:left">${item.unit_price.toLocaleString()} ؋</td>
        <td style="text-align:left">${item.total_price.toLocaleString()} ؋</td>
      </tr>`
        )
        .join('')}</tbody>
    </table>
    <hr class="sep">
    <div class="totals">
      <div class="total-row"><span>جمع کالاها:</span><span>${inv.subtotal.toLocaleString()} ؋</span></div>
      ${inv.discount > 0 ? `<div class="total-row" style="color:red"><span>تخفیف:</span><span>- ${inv.discount.toLocaleString()} ؋</span></div>` : ''}
      <div class="total-row grand"><span>مبلغ کل:</span><span>${inv.total.toLocaleString()} ؋</span></div>
      ${inv.paid_amount > 0 ? `<div class="total-row" style="color:green"><span>پرداخت شده:</span><span>${inv.paid_amount.toLocaleString()} ؋</span></div>` : ''}
      ${inv.due_amount > 0 ? `<div class="total-row" style="color:red"><span>مانده:</span><span>${inv.due_amount.toLocaleString()} ؋</span></div>` : ''}
    </div>
    ${inv.notes ? `<div class="footer">یادداشت: ${inv.notes}</div>` : ''}
    ${photosBlock}
    <div class="footer">🌸 ممنون از خرید شما — ${shopInfo.name} 🌸</div>
  </div>`;

  const blocks: string[] = [];
  for (let r = 0; r < physicalRuns; r += 1) {
    copyLabels.forEach((label) => {
      blocks.push(oneCopyHtml(label));
    });
  }

  const bodyInner = blocks
    .map(
      (html, i) =>
        `<div class="page-block" style="page-break-after:${i < blocks.length - 1 ? 'always' : 'auto'}">${html}</div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاکتور ${inv.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap');
    @page { size: ${w} ${h}; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Vazirmatn','Tahoma',sans-serif; }
    body { width:${w}; font-size:${f}; direction:rtl; padding:${p}; background:#fff; color:#000; }
    .copy-banner { text-align:center; font-weight:700; font-size:${isThermal ? '10px' : '12px'}; margin-bottom:6px; padding:4px; border:1px dashed #333; background:#f5f5f5; }
    .header { text-align:center; border-bottom:${isThermal ? '1px dashed #000' : '2px solid #333'}; padding-bottom:${isThermal ? '4px' : '12px'}; margin-bottom:${isThermal ? '4px' : '12px'}; }
    .logo { max-width:${isThermal ? '40px' : '60px'}; max-height:${isThermal ? '40px' : '60px'}; display:block; margin:0 auto ${isThermal ? '3px' : '6px'}; }
    .shop-name { font-size:${isThermal ? '13px' : '20px'}; font-weight:700; }
    .shop-sub { font-size:${isThermal ? '8px' : '11px'}; color:#555; margin-top:2px; }
    .inv-num { font-size:${isThermal ? '10px' : '13px'}; font-weight:700; margin-top:4px; }
    .info-section { display:grid; grid-template-columns:1fr 1fr; gap:${isThermal ? '2px' : '6px'}; margin-bottom:${isThermal ? '4px' : '10px'}; font-size:${isThermal ? '8px' : '11px'}; }
    .info-label { color:#666; }
    .info-val { font-weight:600; }
    .sep { border:none; border-top:${isThermal ? '1px dashed #999' : '1px solid #ddd'}; margin:${isThermal ? '4px' : '8px'} 0; }
    table { width:100%; border-collapse:collapse; margin-bottom:${isThermal ? '4px' : '10px'}; }
    th { background:#f0f0f0; padding:${isThermal ? '2px 3px' : '5px 7px'}; font-size:${isThermal ? '8px' : '10px'}; text-align:right; border:1px solid #ccc; }
    td { padding:${isThermal ? '2px 3px' : '4px 7px'}; font-size:${isThermal ? '8px' : '10px'}; border:1px solid #ddd; text-align:right; }
    .totals { font-size:${isThermal ? '9px' : '11px'}; }
    .total-row { display:flex; justify-content:space-between; padding:2px 0; }
    .grand { font-weight:700; font-size:${isThermal ? '12px' : '15px'}; border-top:${isThermal ? '1px dashed #000' : '2px solid #333'}; padding-top:4px; margin-top:3px; }
    .footer { text-align:center; margin-top:${isThermal ? '6px' : '14px'}; font-size:${isThermal ? '8px' : '10px'}; color:#666; border-top:${isThermal ? '1px dashed #ccc' : '1px solid #eee'}; padding-top:${isThermal ? '4px' : '8px'}; }
    @media print { body { margin:0 !important; } }
  </style>
</head>
<body>
${bodyInner}
  <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 1500); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function SalesPage() {
  const { formatPrice, t } = useApp();
  const { success, error, warning } = useToast();
  const storeProducts = useStore(s => s.products);
  const storeBooks = useStore(s => s.books);
  const storeCustomers = useStore(s => s.customers);
  const storeAddInvoice = useStore(s => s.addInvoice);
  const storeCurrentUser = useStore(s => s.currentUser);
  const storeSettings = useStore(s => s.shopSettings);
  const authToken = useStore(s => s.authToken);
  const hydrateFromServer = useStore(s => s.hydrateFromServer);
  const storeUsers = useStore(s => s.users);
  const addNotification = useStore(s => s.addNotification);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // After-sale print popup state
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [printPromptTimer, setPrintPromptTimer] = useState(5);
  const [printSize, setPrintSize] = useState<PaperSize>('80mm');
  const [printCopyMode, setPrintCopyMode] = useState<ShopSettings['invoice_copy_mode']>('single');
  const [printRunCopies, setPrintRunCopies] = useState(1);
  const [printIncludeProductImages, setPrintIncludeProductImages] = useState(false);
  const [showPrintSizeModal, setShowPrintSizeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotifyUserModal, setShowNotifyUserModal] = useState(false);
  const [notifyTargetUserId, setNotifyTargetUserId] = useState<number | ''>('');

  const recipientUsers = useMemo(() => {
    const tid = storeCurrentUser?.tenant_id;
    return storeUsers.filter(
      (u) =>
        u.status === 'active' &&
        u.id !== storeCurrentUser?.id &&
        (tid == null || u.tenant_id == null || u.tenant_id === tid)
    );
  }, [storeUsers, storeCurrentUser]);

  const canSendInvoiceNotify = storeCurrentUser?.role === 'admin' && recipientUsers.length > 0;

  useEffect(() => {
    if (!showPrintSizeModal) return;
    const ps = storeSettings.paper_size as PaperSize;
    if (['A4', 'A5', 'Letter', '80mm', '72mm', '58mm'].includes(ps)) {
      setPrintSize(ps);
    }
    setPrintCopyMode(storeSettings.invoice_copy_mode || 'single');
    setPrintRunCopies(Math.max(1, Math.min(9, Number(storeSettings.print_copies) || 1)));
    setPrintIncludeProductImages(Boolean(storeSettings.print_invoice_with_product_images));
  }, [showPrintSizeModal, storeSettings.paper_size, storeSettings.invoice_copy_mode, storeSettings.print_copies, storeSettings.print_invoice_with_product_images]);

  const { isListening: isListeningProduct, startListening: startListeningProduct, stopListening: stopListeningProduct, supported: supportedProduct } = useVoiceSearch((text) => {
    setProductSearch(text);
  });

  const { isListening: isListeningCustomer, startListening: startListeningCustomer, stopListening: stopListeningCustomer, supported: supportedCustomer } = useVoiceSearch((text) => {
    setCustomerSearch(text);
    setSelectedCustomer(null);
    setShowCustomerDropdown(true);
  });

  // Timer for print prompt
  useEffect(() => {
    if (!showPrintPrompt) return;
    if (printPromptTimer <= 0) { setShowPrintPrompt(false); return; }
    const t = setTimeout(() => setPrintPromptTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [showPrintPrompt, printPromptTimer]);

  const salesCatalogProducts = useMemo((): Product[] => {
    if (storeSettings.business_type === 'bookstore') {
      return storeBooks.filter((b) => b.is_active).map(bookToProductForSale);
    }
    return storeProducts;
  }, [storeSettings.business_type, storeBooks, storeProducts]);

  const filteredProducts = salesCatalogProducts.filter((p: Product) =>
    p.is_active &&
    (p.stock_shop > 0 || p.stock_warehouse > 0) &&
    (p.name.includes(productSearch) || p.barcode.includes(productSearch) || p.product_code.includes(productSearch))
  );
  const filteredCustomers = storeCustomers.filter((c: { status: string; name: string; phone: string }) =>
    c.status === 'active' && (c.name.includes(customerSearch) || c.phone.includes(customerSearch))
  );
  const customer = storeCustomers.find((c: { id: number }) => c.id === selectedCustomer);

  const addToCart = (product: Product) => {
    const preferShop = product.stock_shop > 0;
    const source: 'shop' | 'warehouse' = preferShop ? 'shop' : 'warehouse';
    const avail = source === 'shop' ? product.stock_shop : product.stock_warehouse;
    if (avail <= 0) { warning('اتمام موجودی', `${product.name} در دکان و گدام موجود نیست`); return; }
    const existing = cart.find(i => i.product_id === product.id && i.stock_source === source);
    if (existing) {
      if (existing.quantity >= existing.stock_available) { warning('موجودی ناکافی', `حداکثر ${existing.stock_available} عدد از این محل`); return; }
      setCart(cart.map(i =>
        i.product_id === product.id && i.stock_source === source
          ? {
              ...i,
              quantity: i.quantity + 1,
              total_price: (i.quantity + 1) * i.unit_price,
              image_url: i.image_url || product.image_url,
              currency_code: i.currency_code ?? product.currency_code,
            }
          : i
      ));
    } else {
      setCart([...cart, {
        id: Date.now(),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price,
        total_price: product.sale_price,
        stock_available: avail,
        stock_source: source,
        image_url: product.image_url,
        currency_code: product.currency_code,
      }]);
    }
  };

  const setCartLineSource = (productId: number, fromSource: 'shop' | 'warehouse', toSource: 'shop' | 'warehouse') => {
    if (fromSource === toSource) return;
    const p = storeProducts.find(x => x.id === productId);
    if (!p) return;
    const toAvail = toSource === 'shop' ? p.stock_shop : p.stock_warehouse;
    if (toAvail <= 0) {
      warning('موجودی', toSource === 'shop' ? 'در دکان موجودی نیست' : 'در گدام موجودی نیست');
      return;
    }
    const line = cart.find(i => i.product_id === productId && i.stock_source === fromSource);
    if (!line) return;
    const qty = line.quantity;
    const clash = cart.find(i => i.product_id === productId && i.stock_source === toSource);
    if (clash) {
      const mergedQty = clash.quantity + qty;
      if (mergedQty > toAvail) { warning('موجودی ناکافی', `حداکثر ${toAvail} عدد از ${toSource === 'shop' ? 'دکان' : 'گدام'}`); return; }
      setCart(
        cart
          .filter(i => !(i.product_id === productId && i.stock_source === fromSource))
          .map(i =>
            i.product_id === productId && i.stock_source === toSource
              ? { ...i, quantity: mergedQty, total_price: mergedQty * i.unit_price, stock_available: toAvail }
              : i
          )
      );
      return;
    }
    if (qty > toAvail) { warning('موجودی ناکافی', `حداکثر ${toAvail} عدد`); return; }
    setCart(
      cart.map(i =>
        i.product_id === productId && i.stock_source === fromSource
          ? { ...i, stock_source: toSource, stock_available: toAvail }
          : i
      )
    );
  };

  const updateQty = (productId: number, source: 'shop' | 'warehouse', qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(i => !(i.product_id === productId && i.stock_source === source)));
      return;
    }
    const item = cart.find(i => i.product_id === productId && i.stock_source === source);
    if (item && qty > item.stock_available) { warning('موجودی ناکافی', `حداکثر ${item.stock_available} عدد`); return; }
    setCart(
      cart.map(i =>
        i.product_id === productId && i.stock_source === source ? { ...i, quantity: qty, total_price: qty * i.unit_price } : i
      )
    );
  };

  const removeFromCart = (productId: number, source: 'shop' | 'warehouse') =>
    setCart(cart.filter(i => !(i.product_id === productId && i.stock_source === source)));

  const subtotal = cart.reduce((s, i) => s + i.total_price, 0);
  const total = Math.max(0, subtotal - discount);
  const due = paymentMethod === 'cash' ? Math.max(0, total - paidAmount) : total;
  const change = paymentMethod === 'cash' && paidAmount > total ? paidAmount - total : 0;

  const handleSendInvoiceNotify = () => {
    if (!lastInvoice || notifyTargetUserId === '') return;
    const target = storeUsers.find((u) => u.id === notifyTargetUserId);
    if (!target) return;
    addNotification({
      user_id: storeCurrentUser?.id ?? 1,
      recipient_user_id: Number(notifyTargetUserId),
      type: 'message',
      title: `فاکتور ${lastInvoice.invoice_number}`,
      message: `${storeCurrentUser?.full_name ?? 'مدیر'} فاکتور فروش ${lastInvoice.invoice_number} به مبلغ ${lastInvoice.total.toLocaleString()} ؋ ثبت کرد.`,
      link: '/invoices',
      is_read: false,
      is_heard: false,
    });
    success('ارسال شد', `اعلان برای ${target.full_name} ثبت شد`);
    setShowNotifyUserModal(false);
    setNotifyTargetUserId('');
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { error('سبد خالی', 'لطفاً محصولاتی به سبد اضافه کنید'); return; }
    if (paymentMethod === 'credit' && !selectedCustomer) { error('انتخاب مشتری', 'برای فروش نسیه مشتری انتخاب شود'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);

    const draftInvoice: Omit<Invoice, 'id' | 'invoice_number'> = {
      customer_id: selectedCustomer || 0,
      customer_name: customer?.name || 'مشتری نقدی',
      customer_phone: (customer as { phone?: string })?.phone || '',
      seller_id: storeCurrentUser?.id || 1,
      seller_name: storeCurrentUser?.full_name || storeSettings.seller_name,
      subtotal,
      discount,
      total,
      paid_amount: paymentMethod === 'cash' ? Math.min(paidAmount || total, total) : 0,
      due_amount: due,
      payment_method: paymentMethod,
      status: 'pending',
      approval_status: 'pending',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: paymentMethod === 'credit' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : '',
      notes,
      items: cart.map((c, i) => ({
        id: i + 1,
        product_id: c.product_id,
        product_name: c.product_name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        total_price: c.total_price,
        image_url: c.image_url,
        stock_source: c.stock_source,
      })),
      tenant_id: storeCurrentUser?.tenant_id ?? 1,
      currency: 'AFN',
    };

    try {
      if (authToken) {
        const res = await apiCreateSaleInvoice(authToken, draftInvoice as unknown as Record<string, unknown>);
        if (res.state) {
          hydrateFromServer(res.state);
        }
        const serverInvoice = res.invoice as unknown as Invoice;
        setLastInvoice(serverInvoice);
        success('فاکتور ثبت شد', `${serverInvoice.invoice_number} — ${formatPrice(total)}`);
      } else {
        const localInvoice = storeAddInvoice(draftInvoice);
        setLastInvoice(localInvoice);
        success('فاکتور ثبت شد', `${localInvoice.invoice_number} — ${formatPrice(total)}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ثبت فروش';
      error('ثبت فروش ناموفق', msg);
      setIsSubmitting(false);
      return;
    }

    // Reset
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setDiscount(0);
    setPaidAmount(0);
    setNotes('');
    setPaymentMethod('cash');

    // Show print prompt for 5 seconds
    setShowPrintPrompt(true);
    setPrintPromptTimer(5);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white gradient-text">{t('new_sale_pos')}</h1>
          <p className="text-slate-400 text-sm mt-1">ثبت فروش و صدور فاکتور</p>
        </div>
        {lastInvoice && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowPrintSizeModal(true)}
              className="flex items-center gap-2 px-4 py-2 glass border border-emerald-500/30 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/10 transition-all">
              <Printer size={15} /> چاپ آخرین فاکتور ({lastInvoice.invoice_number})
            </button>
            {canSendInvoiceNotify && (
              <button
                type="button"
                onClick={() => {
                  setNotifyTargetUserId(recipientUsers[0]?.id ?? '');
                  setShowNotifyUserModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 glass border border-indigo-500/35 text-indigo-300 rounded-xl text-sm hover:bg-indigo-500/10 transition-all"
              >
                <Send size={15} /> ارسال اعلان به کاربر
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Products Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="relative flex items-center">
              <Search size={16} className="absolute right-3 text-slate-400" />
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="جستجوی محصول (نام، بارکد، کد)..."
                className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 outline-none ${supportedProduct ? 'pl-10' : ''}`} />
              {supportedProduct && (
                <button
                  type="button"
                  onClick={isListeningProduct ? stopListeningProduct : startListeningProduct}
                  className={`absolute left-2 p-1.5 rounded-lg transition-all ${isListeningProduct ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                  title={isListeningProduct ? 'توقف جستجوی صوتی' : 'جستجوی صوتی محصول'}
                >
                  {isListeningProduct ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pl-1">
            {filteredProducts.map(p => {
              const low =
                p.is_active &&
                p.stock_shop > 0 &&
                p.stock_shop <= p.min_stock;
              const out = p.stock_shop <= 0 && p.stock_warehouse <= 0;
              return (
              <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                className={`glass rounded-xl p-3 text-right transition-all border ${
                  out
                    ? 'opacity-50 cursor-not-allowed border-transparent'
                    : low
                      ? 'border-rose-500/70 ring-2 ring-rose-500/40 bg-rose-950/20 hover:border-rose-400/80'
                      : 'border-transparent hover:border-emerald-500/50 card-hover'
                }`}>
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-2 mx-auto overflow-hidden ${
                  storeSettings.show_product_image_on_sales && p.image_url ? 'bg-slate-800/80' : 'bg-emerald-500/20'
                }`}>
                  {storeSettings.show_product_image_on_sales && p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} className="text-emerald-400" />
                  )}
                </div>
                <p className="text-white text-xs font-medium leading-tight mb-1 text-center truncate">{p.name}</p>
                <p className="text-emerald-400 font-bold text-sm text-center">{formatPrice(p.sale_price, p.currency_code ?? 'AFN')}</p>
                <p className={`text-xs text-center mt-1 font-medium ${out ? 'text-rose-400' : low ? 'text-rose-300' : 'text-slate-500'}`}>
                  دکان: {p.stock_shop} · گدام: {p.stock_warehouse}
                  {low && !out ? ' — زیر حد دکان' : ''}
                </p>
                {cart.some(c => c.product_id === p.id) && (
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mx-auto">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            );})}
            {filteredProducts.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-500">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">محصولی یافت نشد</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <div className="glass rounded-2xl p-4">
            <label className="text-emerald-400 text-xs mb-2 flex items-center gap-1 font-bold"><User size={12} /> مشتری</label>
            <div className="relative flex items-center">
              <input value={customer ? customer.name : customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="جستجو یا انتخاب مشتری..."
                className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-emerald-500 outline-none ${supportedCustomer ? 'pl-10' : ''}`} />
              {supportedCustomer && !selectedCustomer && (
                <button 
                  onClick={isListeningCustomer ? stopListeningCustomer : startListeningCustomer}
                  className={`absolute left-2 p-1.5 rounded-lg transition-all ${isListeningCustomer ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                  title={isListeningCustomer ? "توقف جستجوی صوتی" : "جستجوی صوتی مشتری"}
                >
                  {isListeningCustomer ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="absolute left-3 text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
              {showCustomerDropdown && !selectedCustomer && filteredCustomers.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-white/10 rounded-xl z-20 max-h-40 overflow-y-auto shadow-xl">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c.id); setShowCustomerDropdown(false); }}
                      className="w-full text-right px-3 py-2 hover:bg-emerald-500/20 text-white text-sm flex justify-between">
                      <span>{c.name}</span><span className="text-slate-500 text-xs">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {customer && customer.balance < 0 && (
              <p className="text-rose-400 text-xs mt-1.5">⚠️ بدهی موجود: {Math.abs(customer.balance).toLocaleString()} ؋</p>
            )}
          </div>

          {/* Cart */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                <ShoppingCart size={15} /> سبد خرید
                {cart.length > 0 && <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">{cart.length}</span>}
              </h3>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('سبد خرید پاک شود؟')) setCart([]); }} className="text-rose-400 text-xs hover:text-rose-300">پاک کردن</button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <ShoppingCart size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">محصولی انتخاب نشده</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                {cart.map(item => {
                  const prod = storeProducts.find(x => x.id === item.product_id);
                  const canShop = (prod?.stock_shop ?? 0) > 0;
                  const canWh = (prod?.stock_warehouse ?? 0) > 0;
                  return (
                  <div key={`${item.product_id}-${item.stock_source}`} className="flex flex-wrap items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 card-hover">
                    {storeSettings.show_product_image_on_sales && item.image_url ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-emerald-500/30 bg-slate-900/50">
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-emerald-50 text-xs font-bold truncate">{item.product_name}</p>
                      <p className="text-emerald-400/70 text-xs font-medium">{formatPrice(item.unit_price, item.currency_code ?? 'AFN')}</p>
                      {(canShop || canWh) && (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            disabled={!canShop}
                            onClick={() => setCartLineSource(item.product_id, item.stock_source, 'shop')}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${item.stock_source === 'shop' ? 'border-emerald-400 bg-emerald-500/30 text-white' : 'border-white/10 text-slate-400 hover:text-white'} disabled:opacity-40`}
                          >
                            دکان
                          </button>
                          <button
                            type="button"
                            disabled={!canWh}
                            onClick={() => setCartLineSource(item.product_id, item.stock_source, 'warehouse')}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${item.stock_source === 'warehouse' ? 'border-sky-400 bg-sky-500/25 text-sky-100' : 'border-white/10 text-slate-400 hover:text-white'} disabled:opacity-40`}
                          >
                            گدام
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900/40 rounded-lg p-1">
                      <button type="button" onClick={() => updateQty(item.product_id, item.stock_source, item.quantity - 1)} className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center transition-colors"><ChevronDown size={12} /></button>
                      <input type="number" value={item.quantity} min="1" max={item.stock_available}
                        onChange={e => updateQty(item.product_id, item.stock_source, +e.target.value)}
                        className="w-8 text-center bg-transparent text-emerald-400 text-xs font-bold outline-none" />
                      <button type="button" onClick={() => updateQty(item.product_id, item.stock_source, item.quantity + 1)} className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"><ChevronUp size={12} /></button>
                    </div>
                    <p className="text-emerald-400 text-xs font-bold w-20 text-left">{formatPrice(item.total_price, item.currency_code ?? 'AFN')}</p>
                    <button type="button" onClick={() => removeFromCart(item.product_id, item.stock_source)} className="text-rose-400/60 hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                  </div>
                );})}
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setPaymentMethod('cash')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600/40 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'border-emerald-600/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                <Banknote size={14} /> نقدی
              </button>
              <button onClick={() => setPaymentMethod('credit')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${paymentMethod === 'credit' ? 'bg-rose-600/40 border-rose-500 text-white shadow-lg shadow-rose-900/20' : 'border-rose-600/30 text-rose-400 hover:bg-rose-500/10'}`}>
                <CreditCard size={14} /> نسیه
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-emerald-400/60 text-xs mb-1 block font-medium">تخفیف (؋)</label>
                <input type="number" value={discount} onChange={e => setDiscount(+e.target.value)} min="0" max={subtotal}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
              </div>
              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-emerald-400/60 text-xs mb-1 block font-medium">دریافتی (؋)</label>
                  <input type="number" value={paidAmount} onChange={e => setPaidAmount(+e.target.value)} min="0"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />
                </div>
              )}
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400"><span>جمع کالاها</span><span className="font-medium">{subtotal.toLocaleString()} ؋</span></div>
              {discount > 0 && <div className="flex justify-between text-rose-400"><span>تخفیف</span><span className="font-medium">- {discount.toLocaleString()} ؋</span></div>}
              <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2 mt-1">
                <span>مبلغ کل</span><span className="text-emerald-400 text-xl font-black">{total.toLocaleString()} ؋</span>
              </div>
              {paymentMethod === 'cash' && change > 0 && <div className="flex justify-between text-emerald-400 text-xs font-medium"><span>باقی برگشت</span><span>{change.toLocaleString()} ؋</span></div>}
              {paymentMethod === 'cash' && due > 0 && paidAmount > 0 && <div className="flex justify-between text-amber-400 text-xs font-medium"><span>مانده</span><span>{due.toLocaleString()} ؋</span></div>}
              {paymentMethod === 'credit' && <div className="flex justify-between text-amber-400 text-xs font-medium"><span>بدهی نسیه</span><span>{total.toLocaleString()} ؋</span></div>}
            </div>

            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="یادداشت اختیاری..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" />

            <button onClick={handleSubmit} disabled={cart.length === 0 || isSubmitting}
              className="w-full btn-primary text-white font-black py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check size={20} className="stroke-[3px]" /> ثبت فاکتور</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Print Prompt - 5 second countdown after sale */}
      {showPrintPrompt && lastInvoice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl shadow-2xl p-5 flex items-center gap-4 min-w-[380px]">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/40">
              <Printer size={22} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">فاکتور {lastInvoice.invoice_number} ثبت شد ✓</p>
              <p className="text-slate-400 text-xs mt-0.5">آیا می‌خواهید فاکتور چاپ شود؟ ({printPromptTimer} ثانیه)</p>
              <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(printPromptTimer / 5) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => { setShowPrintPrompt(false); setShowPrintSizeModal(true); }}
                className="btn-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Printer size={13} /> چاپ
              </button>
              {canSendInvoiceNotify && (
                <button
                  type="button"
                  onClick={() => {
                    setNotifyTargetUserId(recipientUsers[0]?.id ?? '');
                    setShowNotifyUserModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/15 transition-colors"
                >
                  <Send size={13} /> ارسال به کاربر
                </button>
              )}
              <button onClick={() => setShowPrintPrompt(false)}
                className="glass text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs text-center font-medium">
                رد کردن
              </button>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showNotifyUserModal && !!lastInvoice}
        onClose={() => {
          setShowNotifyUserModal(false);
          setNotifyTargetUserId('');
        }}
        title="ارسال اعلان فاکتور به کاربر"
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={handleSendInvoiceNotify}
              disabled={notifyTargetUserId === ''}
              className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              ارسال
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNotifyUserModal(false);
                setNotifyTargetUserId('');
              }}
              className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm"
            >
              انصراف
            </button>
          </div>
        }
      >
        {lastInvoice ? (
          <div className="space-y-3 text-right">
            <p className="text-slate-400 text-xs">
              فاکتور <span className="text-white font-mono font-bold">{lastInvoice.invoice_number}</span> برای کاربر انتخاب‌شده در صفحه «اعلان‌ها» نمایش داده می‌شود.
            </p>
            <div>
              <label className="text-slate-400 text-xs block mb-1">کاربر گیرنده</label>
              <select
                value={notifyTargetUserId === '' ? '' : String(notifyTargetUserId)}
                onChange={(e) => setNotifyTargetUserId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm"
              >
                <option value="">انتخاب کنید</option>
                {recipientUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </FormModal>

      {/* Print Size Modal */}
      {showPrintSizeModal && lastInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl w-full max-w-sm shadow-2xl" style={{ animation: 'fadeIn 0.2s ease' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-bold flex items-center gap-2"><Printer size={18} className="text-emerald-400" /> انتخاب سایز چاپ</h2>
              <button onClick={() => setShowPrintSizeModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['A4', 'A5', 'Letter', '80mm', '72mm', '58mm'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPrintSize(size)}
                    className={`py-3 rounded-xl border-2 text-center transition-all ${printSize === size ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-emerald-500/50 glass'}`}
                  >
                    <p className="font-bold text-sm">{size}</p>
                    <p className="text-[10px] mt-0.5 opacity-60 font-medium">
                      {size === 'A4'
                        ? '۲۱۰×۲۹۷'
                        : size === 'A5'
                          ? '۱۴۸×۲۱۰'
                          : size === 'Letter'
                            ? '۲۱۶×۲۷۹'
                            : `حرارتی ${size}`}
                    </p>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2 font-bold">نسخه‌های فاکتور در هر بار چاپ</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['single', 'یک نسخه'],
                      ['duplicate', '۲ نسخه'],
                      ['triple', '۳ نسخه'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPrintCopyMode(val)}
                      className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${printCopyMode === val ? 'border-amber-500 bg-amber-500/15 text-amber-200' : 'border-slate-700 text-slate-400 glass'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-bold">تکرار کل چاپ (۱–۹)</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={printRunCopies}
                  onChange={(e) => setPrintRunCopies(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
                  className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
                />
              </div>
              {(['A4', 'A5', 'Letter'] as const).includes(printSize as 'A4' | 'A5' | 'Letter') && (
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={printIncludeProductImages}
                    onChange={(e) => setPrintIncludeProductImages(e.target.checked)}
                    className="rounded border-slate-500"
                  />
                  <span className="text-xs font-bold">عکس کالاها در پایان فاکتور</span>
                </label>
              )}
              <button
                type="button"
                onClick={() => {
                  printInvoice(lastInvoice, {
                    paper_size: printSize,
                    invoice_copy_mode: printCopyMode,
                    print_copies: printRunCopies,
                    shop_name: storeSettings.shop_name,
                    shop_address: storeSettings.shop_address,
                    shop_phone: storeSettings.shop_phone,
                    seller_name: storeSettings.seller_name,
                    logo_url: storeSettings.logo_url,
                    include_product_images: printIncludeProductImages,
                    products: storeProducts,
                  });
                  setShowPrintSizeModal(false);
                  setShowPrintPrompt(false);
                }}
                className="w-full btn-primary text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black text-sm"
              >
                <Printer size={18} /> چاپ ({printSize} — {printCopyMode})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
