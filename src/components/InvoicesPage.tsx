import { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Printer, Trash2, Edit2, X, Check, FileText, ShoppingCart, Package, Plus, ChevronDown, ChevronUp, Download, ChevronRight, ChevronLeft, ImagePlus, Copy, Layers, Send, Users, Mic, MicOff } from 'lucide-react';
import { Invoice } from '../data/mockData';
import { useToast } from './Toast';
import { ConfirmModal } from './Modal';
import { useApp } from '../context/AppContext';
import { PurchaseInvoice, useStore, type ShopSettings } from '../store/useStore';
import { buildProductImagesPrintSection } from '../utils/invoicePrintProductImages';
import type { Product, User } from '../data/mockData';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

function normalizeInvoicePaperSize(s: string): InvoicePaperSize {
  return (INVOICE_PAPER_SIZES as readonly string[]).includes(s) ? (s as InvoicePaperSize) : '80mm';
}

function buildInvoicePrintShop(ss: ShopSettings, logoOverride: string | null): InvoicePrintShop {
  return {
    name: ss.shop_name || 'فروشگاه',
    address: ss.shop_address || '',
    phone: ss.shop_phone || '',
    seller: ss.seller_name || '',
    logo: (logoOverride ?? ss.logo_url) || '',
    footer: ss.footer_text || '',
    showShopName: ss.show_shop_name,
    showAddress: ss.show_address,
    showPhone: ss.show_phone,
    showSeller: ss.show_seller,
    showBarcode: ss.show_barcode,
  };
}

const SIZE_HINTS: Record<InvoicePaperSize, string> = {
  A4: '۲۱۰×۲۹۷mm — رسمی',
  A5: '۱۴۸×۲۱۰mm — نیم‌برگ',
  Letter: '۲۱۶×۲۷۹mm — Letter',
  '80mm': 'حرارتی استاندارد',
  '72mm': 'حرارتی عریض',
  '58mm': 'حرارتی جیبی',
};

const ITEMS_PER_PAGE = 8;

function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const INVOICE_PAPER_SIZES = ['A4', 'A5', 'Letter', '80mm', '72mm', '58mm'] as const;
type InvoicePaperSize = (typeof INVOICE_PAPER_SIZES)[number];

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** فقط برای داخل attribute مثل src — بدون تبدیل & تا data URL خراب نشود */
function safeAttr(s: string) {
  return s.replace(/"/g, '&quot;').replace(/</g, '');
}

type InvoicePrintShop = {
  name: string;
  address: string;
  phone: string;
  seller: string;
  logo: string;
  footer: string;
  showShopName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showSeller: boolean;
  showBarcode: boolean;
};

function printLayoutMaps(size: InvoicePaperSize) {
  const widthMap: Record<InvoicePaperSize, string> = {
    A4: '210mm', A5: '148mm', Letter: '216mm', '80mm': '80mm', '72mm': '72mm', '58mm': '58mm',
  };
  const heightMap: Record<InvoicePaperSize, string> = {
    A4: '297mm', A5: '210mm', Letter: '279mm', '80mm': 'auto', '72mm': 'auto', '58mm': 'auto',
  };
  const fontMap: Record<InvoicePaperSize, string> = {
    A4: '13px', A5: '11px', Letter: '12px', '80mm': '10px', '72mm': '9.5px', '58mm': '9px',
  };
  const padMap: Record<InvoicePaperSize, string> = {
    A4: '18mm', A5: '14mm', Letter: '16mm', '80mm': '4mm', '72mm': '3.5mm', '58mm': '3mm',
  };
  const isThermal = size === '80mm' || size === '58mm' || size === '72mm';
  return { widthMap, heightMap, fontMap, padMap, isThermal, w: widthMap[size], h: heightMap[size] };
}

function copyLabels(mode: 'single' | 'duplicate' | 'triple'): string[] {
  if (mode === 'single') return [''];
  if (mode === 'duplicate') return ['نسخه مشتری', 'نسخه فروشگاه / بایگانی'];
  return ['نسخه مشتری', 'نسخه فروشگاه', 'نسخه حسابداری'];
}

function saleInvoiceSheetHtml(
  inv: Invoice,
  shop: InvoicePrintShop,
  _size: InvoicePaperSize,
  copyLabel: string,
  photosAppend: string
) {
  const logo = shop.logo ? `<img src="${safeAttr(shop.logo)}" class="logo" alt="">` : '';
  const shopTitle = shop.showShopName && shop.name ? `<div class="sn">${escapeHtml(shop.name)}</div>` : '';
  const addr = shop.showAddress && shop.address ? `<div class="ss">${escapeHtml(shop.address)}</div>` : '';
  const ph = shop.showPhone && shop.phone ? `<div class="ss">📞 ${escapeHtml(shop.phone)}</div>` : '';
  const sellerRow = shop.showSeller
    ? `<div><span class="il">فروشنده: </span><span class="iv">${escapeHtml(inv.seller_name)}</span></div>`
    : '';
  const barcodeBlock = shop.showBarcode
    ? `<div class="bc-wrap"><span class="bc-label">شناسه فاکتور</span><div class="bc">${escapeHtml(inv.invoice_number)}</div></div>`
    : '';
  const ribbon = copyLabel
    ? `<div class="copy-ribbon">${escapeHtml(copyLabel)}</div>`
    : '';
  const footerLine = shop.footer
    ? escapeHtml(shop.footer)
    : `ممنون از خرید شما${shop.showShopName && shop.name ? ` — ${escapeHtml(shop.name)}` : ''}`;

  return `<div class="sheet">
${ribbon}
<div class="hdr">
  ${logo}
  ${shopTitle}
  ${addr}
  ${ph}
  <div class="in">فاکتور: ${escapeHtml(inv.invoice_number)}</div>
  ${barcodeBlock}
</div>
<div class="ig">
  <div><span class="il">مشتری: </span><span class="iv">${escapeHtml(inv.customer_name)}</span></div>
  <div><span class="il">تاریخ: </span><span class="iv">${escapeHtml(inv.invoice_date)}</span></div>
  <div><span class="il">موبایل: </span><span class="iv">${escapeHtml(inv.customer_phone || '—')}</span></div>
  ${sellerRow}
  <div><span class="il">پرداخت: </span><span class="iv">${inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}</span></div>
  ${inv.due_date ? `<div><span class="il">سررسید: </span><span class="iv">${escapeHtml(inv.due_date)}</span></div>` : ''}
</div>
<hr>
<table>
  <thead><tr><th>محصول</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead>
  <tbody>${inv.items.map(i => `<tr>
    <td>${escapeHtml(i.product_name)}</td>
    <td style="text-align:center">${i.quantity}</td>
    <td style="text-align:left">${i.unit_price.toLocaleString()} ؋</td>
    <td style="text-align:left">${i.total_price.toLocaleString()} ؋</td>
  </tr>`).join('')}</tbody>
</table>
<hr>
<div class="tr"><span>جمع:</span><span>${inv.subtotal.toLocaleString()} ؋</span></div>
${inv.discount > 0 ? `<div class="tr" style="color:red"><span>تخفیف:</span><span>-${inv.discount.toLocaleString()} ؋</span></div>` : ''}
<div class="tr gt"><span>مبلغ کل:</span><span>${inv.total.toLocaleString()} ؋</span></div>
${inv.paid_amount > 0 ? `<div class="tr" style="color:green"><span>پرداخت شده:</span><span>${inv.paid_amount.toLocaleString()} ؋</span></div>` : ''}
${inv.due_amount > 0 ? `<div class="tr" style="color:red"><span>مانده:</span><span>${inv.due_amount.toLocaleString()} ؋</span></div>` : ''}
${inv.notes ? `<div class="ft">یادداشت: ${escapeHtml(inv.notes)}</div>` : ''}
${photosAppend}
<div class="ft">🌸 ${footerLine}</div>
</div>`;
}

function printSaleInvoice(
  inv: Invoice,
  size: InvoicePaperSize,
  shop: InvoicePrintShop,
  copyMode: 'single' | 'duplicate' | 'triple',
  options?: { includeProductImages?: boolean; products?: Product[] }
) {
  const { w, h, fontMap, padMap, isThermal } = printLayoutMaps(size);
  const labels = copyLabels(copyMode);
  const canPhoto = !isThermal && (size === 'A4' || size === 'A5' || size === 'Letter');
  const photoTitle = size === 'A4' ? '12px' : '11px';
  const photosAppend =
    canPhoto && options?.includeProductImages && options.products?.length
      ? buildProductImagesPrintSection(inv, options.products, photoTitle)
      : '';
  const sheets = labels
    .map((lb) => saleInvoiceSheetHtml(inv, shop, size, lb, photosAppend))
    .join('<div class="page-break"></div>');

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="UTF-8"><title>فاکتور ${escapeHtml(inv.invoice_number)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
  @page { size: ${w} ${h}; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Vazirmatn','Tahoma',sans-serif; }
  body { width:${w}; font-size:${fontMap[size]}; direction:rtl; padding:${padMap[size]}; background:#fff; color:#000; }
  .page-break { page-break-after: always; height: 1px; }
  .sheet { padding-bottom: 8mm; }
  .copy-ribbon { text-align:center; font-weight:700; font-size:${isThermal ? '9px' : '11px'}; color:#fff; background:linear-gradient(90deg,#1e3a5f,#2563eb); padding:6px 10px; border-radius:6px; margin-bottom:${isThermal ? '6px' : '10px'}; letter-spacing:0.5px; }
  .hdr { text-align:center; border-bottom:${isThermal ? '1px dashed #000' : '2px solid #333'}; padding-bottom:${isThermal ? '4px' : '10px'}; margin-bottom:${isThermal ? '4px' : '10px'}; }
  .logo { max-width:${isThermal ? '40px' : '64px'}; max-height:${isThermal ? '40px' : '64px'}; object-fit:contain; display:block; margin:0 auto ${isThermal ? '4px' : '6px'}; }
  .sn { font-size:${isThermal ? '13px' : '19px'}; font-weight:700; }
  .ss { font-size:${isThermal ? '8px' : '10px'}; color:#666; }
  .in { font-size:${isThermal ? '9px' : '12px'}; font-weight:600; margin-top:3px; }
  .bc-wrap { margin-top:6px; }
  .bc-label { font-size:${isThermal ? '7px' : '9px'}; color:#888; display:block; }
  .bc { font-family: ui-monospace, monospace; font-size:${isThermal ? '11px' : '14px'}; font-weight:700; letter-spacing:2px; margin-top:2px; }
  .ig { display:grid; grid-template-columns:1fr 1fr; gap:2px; margin-bottom:${isThermal ? '4px' : '8px'}; font-size:${isThermal ? '8px' : '10px'}; }
  .il { color:#777; }
  .iv { font-weight:600; }
  hr { border:none; border-top:${isThermal ? '1px dashed #aaa' : '1px solid #ccc'}; margin:${isThermal ? '3px' : '7px'} 0; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f5f5f5; padding:${isThermal ? '2px 3px' : '4px 6px'}; font-size:${isThermal ? '8px' : '10px'}; border:1px solid #ccc; text-align:right; }
  td { padding:${isThermal ? '2px 3px' : '3px 6px'}; font-size:${isThermal ? '8px' : '10px'}; border:1px solid #ddd; }
  .tr { display:flex; justify-content:space-between; padding:1px 0; font-size:${isThermal ? '8px' : '10px'}; }
  .gt { font-weight:700; font-size:${isThermal ? '12px' : '14px'}; border-top:${isThermal ? '1px dashed #000' : '2px solid #333'}; padding-top:3px; margin-top:3px; }
  .ft { text-align:center; margin-top:${isThermal ? '5px' : '12px'}; font-size:${isThermal ? '7px' : '9px'}; color:#777; border-top:1px dashed #ccc; padding-top:${isThermal ? '3px' : '6px'}; }
  @media print { body { margin:0; } .page-break { page-break-after: always; } }
</style></head><body>
${sheets}
<script>window.onload=function(){ window.print(); setTimeout(function(){ window.close(); }, 1500); };<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function purchaseInvoiceSheetHtml(inv: PurchaseInvoice, shop: InvoicePrintShop, size: InvoicePaperSize, copyLabel: string) {
  const { isThermal } = printLayoutMaps(size);
  const logo = shop.logo ? `<img src="${safeAttr(shop.logo)}" style="max-width:${isThermal ? '36px' : '52px'};max-height:${isThermal ? '36px' : '52px'};object-fit:contain;margin:0 auto 6px;display:block;" alt="">` : '';
  const title = shop.showShopName && shop.name ? escapeHtml(shop.name) : 'فاکتور خرید';
  const ribbon = copyLabel ? `<div style="text-align:center;font-weight:700;font-size:${isThermal ? '9px' : '11px'};color:#fff;background:linear-gradient(90deg,#14532d,#16a34a);padding:6px 10px;border-radius:6px;margin-bottom:8px;">${escapeHtml(copyLabel)}</div>` : '';

  return `<div class="psheet">
${ribbon}
<div class="hdr">
  ${logo}
  <b style="font-size:${isThermal ? '13px' : '18px'}">${title}</b><br>
  <span style="font-size:${isThermal ? '8px' : '10px'}; color:#666">فاکتور خرید: ${escapeHtml(inv.invoice_number)}</span>
</div>
<div style="font-size:${isThermal ? '8px' : '10px'}; margin-bottom:8px">
  <div style="display:flex;justify-content:space-between"><span>تامین‌کننده:</span><b>${escapeHtml(inv.supplier_name)}</b></div>
  <div style="display:flex;justify-content:space-between"><span>تاریخ:</span><span>${escapeHtml(inv.invoice_date)}</span></div>
  <div style="display:flex;justify-content:space-between"><span>پرداخت:</span><span>${inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}</span></div>
</div>
<table>
  <thead><tr><th>کالا</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead>
  <tbody>${inv.items.map(i => `<tr><td>${escapeHtml(i.product_name)}</td><td style="text-align:center">${i.quantity}</td><td>${i.unit_price.toLocaleString()} ؋</td><td>${i.total_price.toLocaleString()} ؋</td></tr>`).join('')}</tbody>
</table>
<div class="tr"><span>جمع:</span><span>${inv.subtotal.toLocaleString()} ؋</span></div>
${inv.discount > 0 ? `<div class="tr" style="color:red"><span>تخفیف:</span><span>-${inv.discount.toLocaleString()} ؋</span></div>` : ''}
<div class="tr gt"><span>مبلغ کل:</span><span>${inv.total.toLocaleString()} ؋</span></div>
${inv.due_amount > 0 ? `<div class="tr" style="color:red"><span>مانده:</span><span>${inv.due_amount.toLocaleString()} ؋</span></div>` : ''}
${inv.notes ? `<p style="font-size:${isThermal ? '8px' : '10px'};color:#666;margin-top:6px">یادداشت: ${escapeHtml(inv.notes)}</p>` : ''}
</div>`;
}

function printPurchaseInvoice(
  inv: PurchaseInvoice,
  size: InvoicePaperSize,
  shop: InvoicePrintShop,
  copyMode: 'single' | 'duplicate' | 'triple'
) {
  const { w, fontMap, isThermal } = printLayoutMaps(size);
  const labels = copyLabels(copyMode);
  const inner = labels.map(lb => purchaseInvoiceSheetHtml(inv, shop, size, lb)).join('<div class="page-break"></div>');
  const pad = isThermal ? '4mm' : '18mm';

  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاکتور خرید ${escapeHtml(inv.invoice_number)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
  @page { size: ${w} auto; margin:0; }
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Vazirmatn','Tahoma',sans-serif; }
  body { width:${w}; font-size:${fontMap[size]}; direction:rtl; padding:${pad}; background:#fff; }
  .page-break { page-break-after: always; height:1px; }
  .hdr { text-align:center; border-bottom:2px solid #333; padding-bottom:8px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin:8px 0; }
  th { background:#f5f5f5; padding:4px 6px; border:1px solid #ccc; text-align:right; font-size:${isThermal ? '8px' : '10px'}; }
  td { padding:3px 6px; border:1px solid #ddd; font-size:${isThermal ? '8px' : '10px'}; }
  .tr { display:flex; justify-content:space-between; font-size:${isThermal ? '9px' : '11px'}; padding:2px 0; }
  .gt { font-weight:700; font-size:${isThermal ? '12px' : '14px'}; border-top:2px solid #333; padding-top:4px; margin-top:3px; }
  @media print { .page-break { page-break-after: always; } }
</style></head><body>
${inner}
<script>window.onload=function(){ window.print(); setTimeout(function(){ window.close(); }, 1500); };<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function InvoicesPage() {
  const { formatPrice, t } = useApp();
  const { success, error } = useToast();

  const [tab, setTab] = useState<'sales' | 'purchase'>('sales');
  const [currentPage, setCurrentPage] = useState(1);

  // Sales invoices from Zustand store (persistent)
  const storeInvoices = useStore(s => s.invoices);
  const storeUpdateInvoice = useStore(s => s.updateInvoice);
  const storeDeleteInvoice = useStore(s => s.deleteInvoice);
  const storeAddInvoice = useStore(s => s.addInvoice);
  const storePurchaseInvoices = useStore(s => s.purchaseInvoices);
  const storeAddPurchaseInvoice = useStore(s => s.addPurchaseInvoice);
  const storeUpdatePurchaseInvoice = useStore(s => s.updatePurchaseInvoice);
  const storeDeletePurchaseInvoice = useStore(s => s.deletePurchaseInvoice);
  const storeCustomers = useStore(s => s.customers);
  const storeProducts = useStore(s => s.products);
  const storeSuppliers = useStore(s => s.suppliers);
  const storeCurrentUser = useStore(s => s.currentUser);
  const storeUsers = useStore(s => s.users);
  const addPurchaseListShare = useStore(s => s.addPurchaseListShare);
  const storeSettings = useStore(s => s.shopSettings);
  const updateShopSettings = useStore(s => s.updateShopSettings);

  const invoices = storeInvoices;

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // Default to show all dates
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [printSize, setPrintSize] = useState<InvoicePaperSize>('80mm');
  const [printCopyMode, setPrintCopyMode] = useState<'single' | 'duplicate' | 'triple'>('single');
  const [printLogoOverride, setPrintLogoOverride] = useState<string | null>(null);
  const [saveSalePrintDefaults, setSaveSalePrintDefaults] = useState(false);
  const [printIncludeProductImages, setPrintIncludeProductImages] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<Invoice | null>(null);

  // New Sale Invoice Modal
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({
    customer_id: 0, customerSearch: '', discount: 0, payment_method: 'cash' as 'cash' | 'credit',
    paid_amount: 0, due_date: '', notes: '',
  });
  const [saleCart, setSaleCart] = useState<{ product_id: number; name: string; qty: number; price: number }[]>([]);
  const [saleProductSearch, setSaleProductSearch] = useState('');

  const { isListening: voiceListListening, startListening: startVoiceList, stopListening: stopVoiceList, supported: voiceListOk } = useVoiceSearch((text) => {
    setSearch(text);
  });
  const { isListening: voiceSaleProdListening, startListening: startVoiceSaleProd, stopListening: stopVoiceSaleProd, supported: voiceSaleProdOk } = useVoiceSearch((text) => {
    setSaleProductSearch(text);
  });

  // Purchase invoices state
  const purchaseInvoices = storePurchaseInvoices;
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: 1, date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'credit', paid: 0, discount: 0, notes: '',
  });
  const [purchaseItems, setPurchaseItems] = useState<{ name: string; qty: number; price: number }[]>([
    { name: '', qty: 1, price: 0 }
  ]);
  const [showPurchasePrintModal, setShowPurchasePrintModal] = useState<PurchaseInvoice | null>(null);
  const [purchaseShareAssigneeId, setPurchaseShareAssigneeId] = useState<string>('');
  const [purchasePrintSize, setPurchasePrintSize] = useState<InvoicePaperSize>('A4');
  const [purchasePrintCopyMode, setPurchasePrintCopyMode] = useState<'single' | 'duplicate' | 'triple'>('single');
  const [purchaseLogoOverride, setPurchaseLogoOverride] = useState<string | null>(null);
  const [savePurchasePrintDefaults, setSavePurchasePrintDefaults] = useState(false);
  const [deletePurchaseId, setDeletePurchaseId] = useState<number | null>(null);
  const [editPurchaseInvoice, setEditPurchaseInvoice] = useState<PurchaseInvoice | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!showPrintModal) return;
    setPrintSize(normalizeInvoicePaperSize(storeSettings.paper_size));
    setPrintCopyMode(storeSettings.invoice_copy_mode ?? 'single');
    setPrintLogoOverride(null);
    setSaveSalePrintDefaults(false);
    setPrintIncludeProductImages(Boolean(storeSettings.print_invoice_with_product_images));
  }, [showPrintModal, storeSettings.paper_size, storeSettings.invoice_copy_mode, storeSettings.print_invoice_with_product_images]);

  useEffect(() => {
    if (!showPurchasePrintModal) return;
    setPurchasePrintSize(normalizeInvoicePaperSize(storeSettings.paper_size));
    setPurchasePrintCopyMode(storeSettings.invoice_copy_mode ?? 'single');
    setPurchaseLogoOverride(null);
    setSavePurchasePrintDefaults(false);
    setPurchaseShareAssigneeId('');
  }, [showPurchasePrintModal, storeSettings.paper_size, storeSettings.invoice_copy_mode]);

  const purchaseShareCandidates = useMemo(() => {
    const roles = new Set(['seller', 'stock_keeper', 'accountant']);
    return storeUsers.filter(
      (u: User) => u.status === 'active' && roles.has(u.role)
    );
  }, [storeUsers]);

  const handleSharePurchaseList = () => {
    const inv = showPurchasePrintModal;
    if (!inv) return;
    if (storeCurrentUser?.role !== 'admin') {
      error('دسترسی', 'فقط مدیر دکان می‌تواند لیست را به همکار بفرستد.');
      return;
    }
    if (!purchaseShareAssigneeId) {
      error('انتخاب کاربر', 'یک همکار (فروشنده، انباردار یا حسابدار) را انتخاب کنید.');
      return;
    }
    const assignee = storeUsers.find(u => u.id === Number(purchaseShareAssigneeId));
    if (!assignee) return;
    const lines = inv.items.filter(i => i.product_name?.trim());
    if (lines.length === 0) {
      error('فاکتور خالی', 'حداقل یک قلم کالا در فاکتور باشد.');
      return;
    }
    addPurchaseListShare({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      supplierName: inv.supplier_name,
      assignee,
      items: lines.map(i => ({ product_name: i.product_name, quantity: i.quantity })),
      managerName: storeCurrentUser.full_name,
      managerId: storeCurrentUser.id,
    });
    success('لیست ارسال شد', `${assignee.full_name} از صفحهٔ «تأیید فروش» لیست را می‌بیند.`);
    setPurchaseShareAssigneeId('');
  };

  const onSaleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => setPrintLogoOverride(String(r.result));
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const onPurchaseLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => setPurchaseLogoOverride(String(r.result));
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const filteredSales = useMemo(() => invoices.filter(inv => {
    const matchSearch = inv.invoice_number.includes(search) || inv.customer_name.includes(search);
    const matchDate = !dateFilter || inv.invoice_date === dateFilter;
    return matchSearch && matchDate;
  }), [invoices, search, dateFilter]);

  const filteredPurchase = useMemo(() => purchaseInvoices.filter(inv => {
    const matchSearch = inv.invoice_number.includes(search) || inv.supplier_name.includes(search);
    const matchDate = !dateFilter || inv.invoice_date === dateFilter;
    return matchSearch && matchDate;
  }), [purchaseInvoices, search, dateFilter]);

  const totalPages = Math.ceil((tab === 'sales' ? filteredSales.length : filteredPurchase.length) / ITEMS_PER_PAGE);
  const paginatedSales = filteredSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedPurchase = filteredPurchase.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExport = () => {
    const data = tab === 'sales' ? filteredSales : filteredPurchase;
    const filename = tab === 'sales' ? 'sales_invoices' : 'purchase_invoices';
    
    // Flatten data for export
    const exportData = data.map(inv => ({
      'شماره فاکتور': inv.invoice_number,
      'نام مشتری/تامین‌کننده': 'customer_name' in inv ? inv.customer_name : inv.supplier_name,
      'مبلغ کل': inv.total,
      'تخفیف': inv.discount,
      'روش پرداخت': inv.payment_method === 'cash' ? 'نقدی' : 'نسیه',
      'تاریخ': inv.invoice_date,
      'وضعیت': inv.status
    }));
    
    exportToCSV(exportData, filename);
    success('فایل با موفقیت صادر شد');
  };

  const handleDeleteSale = (id: number) => {
    storeDeleteInvoice(id);
    success('فاکتور فروش حذف شد');
    setDeleteId(null);
  };

  const handleSaveEdit = () => {
    if (!editInvoice) return;
    storeUpdateInvoice(editInvoice);
    success('فاکتور ویرایش شد');
    setEditInvoice(null);
  };

  const handleDeletePurchase = (id: number) => {
    storeDeletePurchaseInvoice(id);
    success('فاکتور خرید حذف شد');
    setDeletePurchaseId(null);
  };

  // New Sale Invoice submit
  const handleNewSaleSubmit = () => {
    if (saleCart.length === 0) { alert('هیچ کالایی اضافه نشده'); return; }
    const customer = storeCustomers.find((c: { id: number }) => c.id === saleForm.customer_id) as { name: string; phone: string; id: number } | undefined;
    const subtotal = saleCart.reduce((s, i) => s + i.qty * i.price, 0);
    const total = Math.max(0, subtotal - saleForm.discount);
    const due = saleForm.payment_method === 'credit' ? total : Math.max(0, total - saleForm.paid_amount);
    const newInv = storeAddInvoice({
      customer_id: saleForm.customer_id,
      customer_name: customer?.name || 'مشتری نقدی',
      customer_phone: customer?.phone || '',
      seller_id: storeCurrentUser?.id || 1,
      seller_name: storeCurrentUser?.full_name || storeSettings.seller_name,
      subtotal,
      discount: saleForm.discount,
      total,
      paid_amount: saleForm.payment_method === 'cash' ? Math.min(saleForm.paid_amount, total) : 0,
      due_amount: due,
      payment_method: saleForm.payment_method,
      status: 'pending',
      approval_status: 'pending',
      invoice_date: today,
      due_date: saleForm.due_date || (saleForm.payment_method === 'credit' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : ''),
      notes: saleForm.notes,
      items: saleCart.map((c, i) => ({ id: i + 1, product_id: c.product_id, product_name: c.name, quantity: c.qty, unit_price: c.price, total_price: c.qty * c.price })),
      tenant_id: storeCurrentUser?.tenant_id ?? 1,
      currency: 'AFN',
    });
    success(`فاکتور ${newInv.invoice_number} ثبت شد`);
    setShowNewSaleModal(false);
    setSaleCart([]);
    setSaleForm({ customer_id: 0, customerSearch: '', discount: 0, payment_method: 'cash', paid_amount: 0, due_date: '', notes: '' });
  };

  // New Purchase Invoice submit
  const handleNewPurchaseSubmit = () => {
    const validItems = purchaseItems.filter(i => i.name && i.qty > 0 && i.price > 0);
    if (validItems.length === 0) { alert('حداقل یک کالا وارد کنید'); return; }
    const supplier = storeSuppliers.find((s: { id: number }) => s.id === purchaseForm.supplier_id) as { company_name: string; id: number } | undefined;
    const subtotal = validItems.reduce((s, i) => s + i.qty * i.price, 0);
    const total = Math.max(0, subtotal - purchaseForm.discount);
    const paid = purchaseForm.payment_method === 'cash' ? purchaseForm.paid : 0;
    const newP = storeAddPurchaseInvoice({
      supplier_id: purchaseForm.supplier_id,
      supplier_name: supplier?.company_name || 'تامین‌کننده',
      invoice_date: purchaseForm.date,
      items: validItems.map((i, idx) => ({ id: idx + 1, product_id: 0, product_name: i.name, quantity: i.qty, unit_price: i.price, total_price: i.qty * i.price })),
      subtotal, discount: purchaseForm.discount, total,
      paid_amount: paid, due_amount: total - paid,
      payment_method: purchaseForm.payment_method,
      due_date: purchaseForm.payment_method === 'credit' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : undefined,
      notes: purchaseForm.notes,
      status: paid >= total ? 'completed' : 'pending',
    });
    success(`فاکتور خرید ${newP.invoice_number} ثبت شد`);
    setShowNewPurchaseModal(false);
    setPurchaseItems([{ name: '', qty: 1, price: 0 }]);
    setPurchaseForm({ supplier_id: 1, date: today, payment_method: 'cash', paid: 0, discount: 0, notes: '' });
  };

  const statusColors: Record<string, string> = {
    pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', completed: 'badge-blue',
  };
  const statusLabels: Record<string, string> = {
    pending: 'در انتظار', approved: 'تأیید', rejected: 'رد شده', completed: 'تکمیل',
  };

  const saleSubtotal = saleCart.reduce((s, i) => s + i.qty * i.price, 0);
  const saleTotal = Math.max(0, saleSubtotal - saleForm.discount);

  const purchaseSubtotal = purchaseItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const purchaseTotal = Math.max(0, purchaseSubtotal - purchaseForm.discount);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('invoices')}</h1>
          <p className="text-slate-400 text-sm mt-1">مدیریت فاکتورهای فروش و خرید</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleExport}
            className="flex items-center gap-2 glass text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium hover:text-white hover:border-emerald-500/50 transition-all">
            <Download size={16} /> خروجی Excel
          </button>
          {tab === 'sales' && (
            <button onClick={() => setShowNewSaleModal(true)}
              className="btn-primary flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> فاکتور فروش جدید
            </button>
          )}
          {tab === 'purchase' && (
            <button onClick={() => setShowNewPurchaseModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Plus size={16} /> فاکتور خرید جدید
            </button>
          )}
          <div className="flex gap-1 glass rounded-xl p-1">
            <button onClick={() => setTab('sales')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'sales' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <ShoppingCart size={15} /> فروش
            </button>
            <button onClick={() => setTab('purchase')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'purchase' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Package size={15} /> خرید
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="جستجو در فاکتورها..."
            className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 pr-9 text-white text-sm focus:border-indigo-500 outline-none ${voiceListOk ? 'pl-11' : ''}`} />
          {voiceListOk && (
            <button
              type="button"
              onClick={voiceListListening ? stopVoiceList : startVoiceList}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${voiceListListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`}
              title="جستجوی صوتی"
            >
              {voiceListListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-slate-400 text-sm">تاریخ:</label>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none" />
          <button onClick={() => setDateFilter('')} className="text-slate-400 hover:text-white text-xs px-3 py-2 glass rounded-xl">همه تاریخ‌ها</button>
          <button onClick={() => setDateFilter(today)} className="text-indigo-400 hover:text-indigo-300 text-xs px-3 py-2 glass rounded-xl">امروز</button>
        </div>
      </div>

      {/* Stats */}
      {tab === 'sales' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'کل فاکتورها', value: filteredSales.length, color: 'text-white' },
            { label: 'تأیید شده', value: filteredSales.filter(i => i.status === 'approved' || i.status === 'completed').length, color: 'text-emerald-400' },
            { label: 'در انتظار', value: filteredSales.filter(i => i.status === 'pending').length, color: 'text-amber-400' },
            { label: 'مجموع فروش', value: formatPrice(filteredSales.reduce((s, i) => s + i.total, 0)), color: 'text-indigo-400' },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'purchase' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'کل فاکتورهای خرید', value: filteredPurchase.length, color: 'text-white' },
            { label: 'تکمیل شده', value: filteredPurchase.filter(i => i.status === 'completed').length, color: 'text-emerald-400' },
            { label: 'در انتظار پرداخت', value: filteredPurchase.filter(i => i.status === 'pending').length, color: 'text-amber-400' },
            { label: 'مجموع خرید', value: formatPrice(filteredPurchase.reduce((s, i) => s + i.total, 0)), color: 'text-indigo-400' },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales Invoices Table */}
      {tab === 'sales' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  {['شماره', 'مشتری', 'مبلغ کل', 'پرداخت', 'مانده', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                    <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedSales.map(inv => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="py-3 px-4 text-indigo-400 font-mono text-xs font-bold">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <p className="text-white text-xs font-medium">{inv.customer_name}</p>
                      <p className="text-slate-500 text-xs">{inv.customer_phone}</p>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold text-xs">{inv.total.toLocaleString()} ؋</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.payment_method === 'cash' ? 'badge-green' : 'badge-yellow'}`}>
                        {inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inv.due_amount > 0
                        ? <span className="text-rose-400 text-xs font-bold">{inv.due_amount.toLocaleString()} ؋</span>
                        : <span className="text-emerald-400 text-xs">تسویه ✓</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{inv.invoice_date}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>{statusLabels[inv.status]}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => setViewInvoice(inv)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors" title="مشاهده"><Eye size={13} /></button>
                        <button onClick={() => setEditInvoice({ ...inv })} className="p-1.5 rounded-lg glass text-slate-400 hover:text-amber-400 transition-colors" title="ویرایش"><Edit2 size={13} /></button>
                        <button onClick={() => setShowPrintModal(inv)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-emerald-400 transition-colors" title="چاپ"><Printer size={13} /></button>
                        <button onClick={() => setDeleteId(inv.id)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors" title="حذف"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">فاکتوری برای این تاریخ یافت نشد</p>
                <button onClick={() => setShowNewSaleModal(true)} className="mt-3 btn-primary text-white px-4 py-2 rounded-xl text-sm flex items-center gap-1 mx-auto">
                  <Plus size={14} /> فاکتور جدید
                </button>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-t border-white/5">
              <div className="text-xs text-slate-500">
                نمایش {(currentPage - 1) * ITEMS_PER_PAGE + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, filteredSales.length)} از {filteredSales.length} مورد
              </div>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg glass text-slate-400 disabled:opacity-30 hover:text-white transition-all"><ChevronRight size={16} /></button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg glass text-slate-400 disabled:opacity-30 hover:text-white transition-all"><ChevronLeft size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Invoices Table */}
      {tab === 'purchase' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  {['شماره', 'تامین‌کننده', 'مبلغ کل', 'پرداخت شده', 'مانده', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                    <th key={h} className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedPurchase.map(inv => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="py-3 px-4 text-emerald-400 font-mono text-xs font-bold">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-white text-xs font-medium">{inv.supplier_name}</td>
                    <td className="py-3 px-4 text-white font-bold text-xs">{inv.total.toLocaleString()} ؋</td>
                    <td className="py-3 px-4 text-emerald-400 text-xs">{inv.paid_amount.toLocaleString()} ؋</td>
                    <td className="py-3 px-4">
                      {inv.due_amount > 0
                        ? <span className="text-rose-400 text-xs font-bold">{inv.due_amount.toLocaleString()} ؋</span>
                        : <span className="text-emerald-400 text-xs">تسویه ✓</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{inv.invoice_date}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>
                        {inv.status === 'completed' ? 'تکمیل' : 'در انتظار'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => setEditPurchaseInvoice({ ...inv })} className="p-1.5 rounded-lg glass text-slate-400 hover:text-amber-400 transition-colors" title="ویرایش"><Edit2 size={13} /></button>
                        <button onClick={() => setShowPurchasePrintModal(inv)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-emerald-400 transition-colors" title="چاپ"><Printer size={13} /></button>
                        <button onClick={() => setDeletePurchaseId(inv.id)} className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors" title="حذف"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPurchase.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Package size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">فاکتور خریدی برای این تاریخ یافت نشد</p>
                <button onClick={() => setShowNewPurchaseModal(true)} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-1 mx-auto transition-colors">
                  <Plus size={14} /> فاکتور خرید جدید
                </button>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-t border-white/5">
              <div className="text-xs text-slate-500">
                نمایش {(currentPage - 1) * ITEMS_PER_PAGE + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, filteredPurchase.length)} از {filteredPurchase.length} مورد
              </div>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg glass text-slate-400 disabled:opacity-30 hover:text-white transition-all"><ChevronRight size={16} /></button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg glass text-slate-400 disabled:opacity-30 hover:text-white transition-all"><ChevronLeft size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Sale Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900">
              <h2 className="text-white font-bold text-lg">فاکتور {viewInvoice.invoice_number}</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowPrintModal(viewInvoice)} className="flex items-center gap-1 px-3 py-1.5 btn-primary text-white rounded-lg text-xs">
                  <Printer size={12} /> چاپ
                </button>
                <button onClick={() => setViewInvoice(null)} className="p-1.5 text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['مشتری', viewInvoice.customer_name], ['موبایل', viewInvoice.customer_phone || '—'], ['فروشنده', viewInvoice.seller_name], ['تاریخ', viewInvoice.invoice_date], ['نوع پرداخت', viewInvoice.payment_method === 'cash' ? 'نقدی' : 'نسیه'], ['تاریخ سررسید', viewInvoice.due_date || '—']].map(([k, v]) => (
                  <div key={k}><p className="text-slate-400 text-xs">{k}</p><p className="text-white text-sm font-medium">{v}</p></div>
                ))}
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-800/50">{['محصول', 'تعداد', 'قیمت', 'جمع'].map(h => <th key={h} className="text-right text-slate-400 text-xs py-2.5 px-4">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {viewInvoice.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 text-white text-xs">{item.product_name}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-xs text-center">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-xs">{item.unit_price.toLocaleString()} ؋</td>
                        <td className="py-2.5 px-4 text-emerald-400 font-bold text-xs">{item.total_price.toLocaleString()} ؋</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-slate-400 text-sm"><span>جمع فرعی</span><span>{viewInvoice.subtotal.toLocaleString()} ؋</span></div>
                {viewInvoice.discount > 0 && <div className="flex justify-between text-rose-400 text-sm"><span>تخفیف</span><span>- {viewInvoice.discount.toLocaleString()} ؋</span></div>}
                <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2 text-base"><span>مبلغ کل</span><span className="text-emerald-400">{viewInvoice.total.toLocaleString()} ؋</span></div>
                {viewInvoice.due_amount > 0 && <div className="flex justify-between text-amber-400 text-sm"><span>مانده</span><span>{viewInvoice.due_amount.toLocaleString()} ؋</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Invoice Modal */}
      {editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">ویرایش فاکتور {editInvoice.invoice_number}</h2>
              <button onClick={() => setEditInvoice(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 text-xs block mb-1">نام مشتری</label><input value={editInvoice.customer_name} onChange={e => setEditInvoice({ ...editInvoice, customer_name: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                <div><label className="text-slate-400 text-xs block mb-1">موبایل مشتری</label><input value={editInvoice.customer_phone} onChange={e => setEditInvoice({ ...editInvoice, customer_phone: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                <div><label className="text-slate-400 text-xs block mb-1">تخفیف (؋)</label><input type="number" value={editInvoice.discount} onChange={e => { const d = +e.target.value; setEditInvoice({ ...editInvoice, discount: d, total: editInvoice.subtotal - d, due_amount: Math.max(0, editInvoice.subtotal - d - editInvoice.paid_amount) }); }} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                <div><label className="text-slate-400 text-xs block mb-1">تاریخ سررسید</label><input type="date" value={editInvoice.due_date} onChange={e => setEditInvoice({ ...editInvoice, due_date: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              </div>
              <div><label className="text-slate-400 text-xs block mb-1">یادداشت</label><textarea value={editInvoice.notes} onChange={e => setEditInvoice({ ...editInvoice, notes: e.target.value })} rows={2} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 resize-none outline-none" /></div>
              <div className="bg-slate-800/40 rounded-xl p-3 flex justify-between text-sm text-white font-bold"><span>مبلغ کل:</span><span className="text-emerald-400">{editInvoice.total.toLocaleString()} ؋</span></div>
              <div className="flex gap-3">
                <button onClick={handleSaveEdit} className="flex-1 btn-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"><Check size={15} /> ذخیره تغییرات</button>
                <button onClick={() => setEditInvoice(null)} className="px-5 py-2.5 rounded-xl glass text-slate-300 text-sm">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Invoice Modal */}
      {editPurchaseInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">ویرایش فاکتور خرید {editPurchaseInvoice.invoice_number}</h2>
              <button onClick={() => setEditPurchaseInvoice(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-slate-400 text-xs block mb-1">تامین‌کننده</label><input value={editPurchaseInvoice.supplier_name} onChange={e => setEditPurchaseInvoice({ ...editPurchaseInvoice, supplier_name: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 text-xs block mb-1">تاریخ</label><input type="date" value={editPurchaseInvoice.invoice_date} onChange={e => setEditPurchaseInvoice({ ...editPurchaseInvoice, invoice_date: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                <div><label className="text-slate-400 text-xs block mb-1">تخفیف (؋)</label><input type="number" value={editPurchaseInvoice.discount} onChange={e => setEditPurchaseInvoice({ ...editPurchaseInvoice, discount: +e.target.value, total: editPurchaseInvoice.subtotal - +e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              </div>
              <div><label className="text-slate-400 text-xs block mb-1">یادداشت</label><input value={editPurchaseInvoice.notes} onChange={e => setEditPurchaseInvoice({ ...editPurchaseInvoice, notes: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              <div className="flex gap-3">
                <button onClick={() => { storeUpdatePurchaseInvoice(editPurchaseInvoice); success('فاکتور خرید ویرایش شد'); setEditPurchaseInvoice(null); }} className="flex-1 btn-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm"><Check size={15} /> ذخیره</button>
                <button onClick={() => setEditPurchaseInvoice(null)} className="px-5 py-2.5 rounded-xl glass text-slate-300 text-sm">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Sale Invoice Modal */}
      {showNewSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><ShoppingCart size={18} /> فاکتور فروش جدید</h2>
              <button onClick={() => setShowNewSaleModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Customer */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">مشتری</label>
                <select value={saleForm.customer_id} onChange={e => setSaleForm({ ...saleForm, customer_id: +e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                  <option value={0}>مشتری نقدی (بدون انتخاب)</option>
                  {storeCustomers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              {/* Product Search & Add */}
              <div>
                <label className="text-slate-400 text-xs block mb-1">جستجو و افزودن محصول</label>
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={saleProductSearch} onChange={e => setSaleProductSearch(e.target.value)} placeholder="نام یا بارکد محصول..." className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 pr-9 text-white text-sm focus:border-indigo-500 outline-none ${voiceSaleProdOk ? 'pl-11' : ''}`} />
                  {voiceSaleProdOk && (
                    <button
                      type="button"
                      onClick={voiceSaleProdListening ? stopVoiceSaleProd : startVoiceSaleProd}
                      className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${voiceSaleProdListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`}
                      title="جستجوی صوتی محصول"
                    >
                      {voiceSaleProdListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
                {saleProductSearch && (
                  <div className="mt-1 bg-slate-800 border border-white/10 rounded-xl max-h-40 overflow-y-auto">
                    {storeProducts.filter(p => p.is_active && (p.name.includes(saleProductSearch) || p.barcode.includes(saleProductSearch))).map(p => (
                      <button key={p.id} onClick={() => {
                        const existing = saleCart.find(i => i.product_id === p.id);
                        if (existing) setSaleCart(saleCart.map(i => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i));
                        else setSaleCart([...saleCart, { product_id: p.id, name: p.name, qty: 1, price: p.sale_price }]);
                        setSaleProductSearch('');
                      }} className="w-full text-right px-3 py-2 hover:bg-indigo-500/20 text-sm flex justify-between items-center">
                        <span className="text-white">{p.name}</span>
                        <span className="text-emerald-400 text-xs">{p.sale_price.toLocaleString()} ؋</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Cart Items */}
              {saleCart.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {saleCart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-800/40 rounded-xl p-2">
                      <span className="text-white text-xs flex-1">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSaleCart(saleCart.map((i, ii) => ii === idx ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="w-6 h-6 rounded bg-slate-700 text-white flex items-center justify-center"><ChevronDown size={11} /></button>
                        <span className="text-white text-xs w-8 text-center font-bold">{item.qty}</span>
                        <button onClick={() => setSaleCart(saleCart.map((i, ii) => ii === idx ? { ...i, qty: i.qty + 1 } : i))} className="w-6 h-6 rounded bg-slate-700 text-white flex items-center justify-center"><ChevronUp size={11} /></button>
                      </div>
                      <input type="number" value={item.price} onChange={e => setSaleCart(saleCart.map((i, ii) => ii === idx ? { ...i, price: +e.target.value } : i))} className="w-24 bg-slate-700 rounded px-2 py-1 text-white text-xs outline-none" />
                      <span className="text-emerald-400 text-xs w-20 text-left">{(item.qty * item.price).toLocaleString()} ؋</span>
                      <button onClick={() => setSaleCart(saleCart.filter((_, ii) => ii !== idx))} className="text-rose-400 hover:text-rose-300"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 text-xs block mb-1">روش پرداخت</label>
                  <select value={saleForm.payment_method} onChange={e => setSaleForm({ ...saleForm, payment_method: e.target.value as 'cash' | 'credit' })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    <option value="cash">نقدی</option><option value="credit">نسیه</option>
                  </select>
                </div>
                <div><label className="text-slate-400 text-xs block mb-1">تخفیف (؋)</label><input type="number" value={saleForm.discount} onChange={e => setSaleForm({ ...saleForm, discount: +e.target.value })} min="0" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                {saleForm.payment_method === 'cash' && <div><label className="text-slate-400 text-xs block mb-1">مبلغ دریافتی (؋)</label><input type="number" value={saleForm.paid_amount} onChange={e => setSaleForm({ ...saleForm, paid_amount: +e.target.value })} min="0" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>}
                {saleForm.payment_method === 'credit' && <div><label className="text-slate-400 text-xs block mb-1">تاریخ سررسید</label><input type="date" value={saleForm.due_date} onChange={e => setSaleForm({ ...saleForm, due_date: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>}
              </div>
              <div><label className="text-slate-400 text-xs block mb-1">یادداشت</label><input value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              {saleCart.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-400"><span>جمع کالاها:</span><span>{saleSubtotal.toLocaleString()} ؋</span></div>
                  {saleForm.discount > 0 && <div className="flex justify-between text-rose-400"><span>تخفیف:</span><span>- {saleForm.discount.toLocaleString()} ؋</span></div>}
                  <div className="flex justify-between text-white font-bold text-base border-t border-white/10 pt-2"><span>مبلغ کل:</span><span className="text-emerald-400">{saleTotal.toLocaleString()} ؋</span></div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleNewSaleSubmit} className="flex-1 btn-primary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold"><Check size={16} /> ثبت فاکتور فروش</button>
                <button onClick={() => setShowNewSaleModal(false)} className="px-5 py-3 rounded-xl glass text-slate-300 text-sm">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Invoice Modal */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><Package size={18} className="text-emerald-400" /> فاکتور خرید جدید</h2>
              <button onClick={() => setShowNewPurchaseModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 text-xs block mb-1">تامین‌کننده <span className="text-rose-400">*</span></label>
                  <select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_id: +e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    {storeSuppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div><label className="text-slate-400 text-xs block mb-1">تاریخ</label><input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              </div>
              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400 text-xs">اقلام خریداری شده</label>
                  <button onClick={() => setPurchaseItems([...purchaseItems, { name: '', qty: 1, price: 0 }])} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Plus size={12} /> افزودن ردیف</button>
                </div>
                <div className="space-y-2">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input value={item.name} onChange={e => setPurchaseItems(purchaseItems.map((i, ii) => ii === idx ? { ...i, name: e.target.value } : i))} placeholder="نام کالا" className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 outline-none" />
                      <input type="number" value={item.qty} onChange={e => setPurchaseItems(purchaseItems.map((i, ii) => ii === idx ? { ...i, qty: +e.target.value } : i))} placeholder="تعداد" className="w-16 bg-slate-800/50 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs text-center focus:border-indigo-500 outline-none" />
                      <input type="number" value={item.price} onChange={e => setPurchaseItems(purchaseItems.map((i, ii) => ii === idx ? { ...i, price: +e.target.value } : i))} placeholder="قیمت (؋)" className="w-24 bg-slate-800/50 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs focus:border-indigo-500 outline-none" />
                      <span className="text-emerald-400 text-xs w-20 text-left">{(item.qty * item.price).toLocaleString()} ؋</span>
                      {purchaseItems.length > 1 && <button onClick={() => setPurchaseItems(purchaseItems.filter((_, ii) => ii !== idx))} className="text-rose-400 hover:text-rose-300"><X size={13} /></button>}
                    </div>
                  ))}
                </div>
              </div>
              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 text-xs block mb-1">روش پرداخت</label>
                  <select value={purchaseForm.payment_method} onChange={e => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value as 'cash' | 'credit' })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
                    <option value="cash">نقدی</option><option value="credit">نسیه</option>
                  </select>
                </div>
                <div><label className="text-slate-400 text-xs block mb-1">تخفیف (؋)</label><input type="number" value={purchaseForm.discount} onChange={e => setPurchaseForm({ ...purchaseForm, discount: +e.target.value })} min="0" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
                {purchaseForm.payment_method === 'cash' && <div><label className="text-slate-400 text-xs block mb-1">مبلغ پرداخت شده (؋)</label><input type="number" value={purchaseForm.paid} onChange={e => setPurchaseForm({ ...purchaseForm, paid: +e.target.value })} min="0" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>}
              </div>
              <div><label className="text-slate-400 text-xs block mb-1">یادداشت</label><input value={purchaseForm.notes} onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" /></div>
              <div className="bg-slate-800/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-400"><span>جمع اقلام:</span><span>{purchaseSubtotal.toLocaleString()} ؋</span></div>
                {purchaseForm.discount > 0 && <div className="flex justify-between text-rose-400"><span>تخفیف:</span><span>- {purchaseForm.discount.toLocaleString()} ؋</span></div>}
                <div className="flex justify-between text-white font-bold text-base border-t border-white/10 pt-2"><span>مبلغ کل:</span><span className="text-emerald-400">{purchaseTotal.toLocaleString()} ؋</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleNewPurchaseSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors"><Check size={16} /> ثبت فاکتور خرید</button>
                <button onClick={() => setShowNewPurchaseModal(false)} className="px-5 py-3 rounded-xl glass text-slate-300 text-sm">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print modal — فروش */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <h2 className="text-white font-bold flex items-center gap-2"><Printer size={18} /> چاپ پیشرفته فاکتور فروش</h2>
              <button type="button" onClick={() => setShowPrintModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-slate-400 text-xs mb-2 font-medium">سایز کاغذ / رول</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INVOICE_PAPER_SIZES.map(size => (
                    <button key={size} type="button" onClick={() => setPrintSize(size)}
                      className={`py-3 px-2 rounded-xl border text-center transition-all ${printSize === size ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400 hover:border-slate-600 glass'}`}>
                      <p className="font-bold text-sm">{size}</p>
                      <p className="text-[10px] mt-1 opacity-75 leading-tight">{SIZE_HINTS[size]}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-2 font-medium">تعداد نسخه در یک چاپ</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'single' as const, label: 'یک نسخه', icon: FileText },
                    { id: 'duplicate' as const, label: 'دو نسخه', icon: Copy },
                    { id: 'triple' as const, label: 'سه نسخه', icon: Layers },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setPrintCopyMode(id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${printCopyMode === id ? 'border-violet-500 bg-violet-500/10 text-violet-200' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-center px-1">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">
                  دو نسخه: مشتری + فروشگاه. سه نسخه: مشتری + فروشگاه + حسابداری — هر نسخه در صفحه جدا با برچسب مشخص چاپ می‌شود.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4 space-y-3">
                <p className="text-white text-sm font-medium flex items-center gap-2"><ImagePlus size={16} className="text-emerald-400" /> لوگو روی فاکتور</p>
                <p className="text-slate-500 text-[11px]">در صورت خالی بودن، از لوگوی ذخیره‌شده در تنظیمات فروشگاه استفاده می‌شود.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-xs hover:border-emerald-500/50 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={onSaleLogoFile} />
                    بارگذاری تصویر
                  </label>
                  {(printLogoOverride || storeSettings.logo_url) && (
                    <img src={printLogoOverride ?? storeSettings.logo_url} alt="" className="h-12 w-12 object-contain rounded-lg border border-white/10 bg-white/5" />
                  )}
                  {printLogoOverride && (
                    <button type="button" onClick={() => setPrintLogoOverride(null)} className="text-xs text-rose-400 hover:text-rose-300">حذف لوگوی موقت</button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                <input type="checkbox" checked={saveSalePrintDefaults} onChange={e => setSaveSalePrintDefaults(e.target.checked)} className="rounded border-slate-600" />
                ذخیره سایز، حالت نسخه و لوگو به‌عنوان پیش‌فرض فروشگاه
              </label>

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

              <button type="button"
                onClick={() => {
                  printSaleInvoice(
                    showPrintModal,
                    printSize,
                    buildInvoicePrintShop(storeSettings, printLogoOverride),
                    printCopyMode,
                    {
                      includeProductImages: printIncludeProductImages,
                      products: storeProducts,
                    }
                  );
                  if (saveSalePrintDefaults) {
                    updateShopSettings({
                      paper_size: printSize,
                      invoice_copy_mode: printCopyMode,
                      print_invoice_with_product_images: printIncludeProductImages,
                      ...(printLogoOverride ? { logo_url: printLogoOverride } : {}),
                    });
                  }
                  setShowPrintModal(null);
                }}
                className="w-full btn-primary text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                <Printer size={18} /> چاپ — {printSize} / {printCopyMode === 'single' ? '۱ نسخه' : printCopyMode === 'duplicate' ? '۲ نسخه' : '۳ نسخه'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print modal — خرید */}
      {showPurchasePrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <h2 className="text-white font-bold flex items-center gap-2"><Printer size={18} /> چاپ پیشرفته فاکتور خرید</h2>
              <button type="button" onClick={() => setShowPurchasePrintModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-slate-400 text-xs mb-2 font-medium">سایز کاغذ / رول</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INVOICE_PAPER_SIZES.map(size => (
                    <button key={size} type="button" onClick={() => setPurchasePrintSize(size)}
                      className={`py-3 px-2 rounded-xl border text-center transition-all ${purchasePrintSize === size ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:border-slate-600 glass'}`}>
                      <p className="font-bold text-sm">{size}</p>
                      <p className="text-[10px] mt-1 opacity-75 leading-tight">{SIZE_HINTS[size]}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-2 font-medium">نسخه‌های چاپ</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'single' as const, label: 'یک نسخه', icon: FileText },
                    { id: 'duplicate' as const, label: 'دو نسخه', icon: Copy },
                    { id: 'triple' as const, label: 'سه نسخه', icon: Layers },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setPurchasePrintCopyMode(id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${purchasePrintCopyMode === id ? 'border-teal-500 bg-teal-500/10 text-teal-200' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-center px-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4 space-y-3">
                <p className="text-white text-sm font-medium flex items-center gap-2"><ImagePlus size={16} className="text-emerald-400" /> لوگو</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-xs hover:border-emerald-500/50 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={onPurchaseLogoFile} />
                    بارگذاری تصویر
                  </label>
                  {(purchaseLogoOverride || storeSettings.logo_url) && (
                    <img src={purchaseLogoOverride ?? storeSettings.logo_url} alt="" className="h-12 w-12 object-contain rounded-lg border border-white/10 bg-white/5" />
                  )}
                  {purchaseLogoOverride && (
                    <button type="button" onClick={() => setPurchaseLogoOverride(null)} className="text-xs text-rose-400 hover:text-rose-300">حذف لوگوی موقت</button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                <input type="checkbox" checked={savePurchasePrintDefaults} onChange={e => setSavePurchasePrintDefaults(e.target.checked)} className="rounded border-slate-600" />
                ذخیره به‌عنوان پیش‌فرض فروشگاه
              </label>

              {storeCurrentUser?.role === 'admin' && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-950/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-violet-200">
                    <Users size={16} className="shrink-0 text-violet-400" />
                    <p className="text-xs font-black">اشتراک‌گذاری لیست خرید با همکار</p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    قبل یا بعد از چاپ، لیست اقلام را برای فروشنده یا انباردار بفرستید تا کالاها را جمع کند؛ سپس از «تأیید فروش» بدون دردسر تأیید کنید. برای مدیر اعلان و همان صفحه به‌روز می‌شود.
                  </p>
                  <select
                    value={purchaseShareAssigneeId}
                    onChange={e => setPurchaseShareAssigneeId(e.target.value)}
                    className="w-full bg-slate-900/80 border border-violet-500/25 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400"
                  >
                    <option value="">— انتخاب کاربر فعال —</option>
                    {purchaseShareCandidates.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role === 'seller' ? 'فروشنده' : u.role === 'stock_keeper' ? 'انباردار' : 'حسابدار'})
                      </option>
                    ))}
                  </select>
                  {purchaseShareCandidates.length === 0 && (
                    <p className="text-[10px] text-amber-300/90">
                      کاربری با نقش فروشنده/انباردار/حسابدار فعال نیست — از تنظیمات → کاربران فروشگاه اضافه کنید.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSharePurchaseList}
                    disabled={!purchaseShareAssigneeId || purchaseShareCandidates.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-violet-400/50 bg-violet-600/30 text-violet-100 text-sm font-bold hover:bg-violet-600/45 disabled:opacity-40 transition-colors"
                  >
                    <Send size={16} /> ارسال لیست به همکار
                  </button>
                </div>
              )}

              <button type="button"
                onClick={() => {
                  printPurchaseInvoice(
                    showPurchasePrintModal,
                    purchasePrintSize,
                    buildInvoicePrintShop(storeSettings, purchaseLogoOverride),
                    purchasePrintCopyMode
                  );
                  if (savePurchasePrintDefaults) {
                    updateShopSettings({
                      paper_size: purchasePrintSize,
                      invoice_copy_mode: purchasePrintCopyMode,
                      ...(purchaseLogoOverride ? { logo_url: purchaseLogoOverride } : {}),
                    });
                  }
                  setShowPurchasePrintModal(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors">
                <Printer size={18} /> چاپ فاکتور خرید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Sale */}
      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteSale(deleteId)}
        title="حذف فاکتور فروش"
        message="آیا مطمئن هستید؟ این فاکتور برای همیشه حذف می‌شود."
      />

      {/* Confirm Delete Purchase */}
      <ConfirmModal
        open={deletePurchaseId !== null}
        onClose={() => setDeletePurchaseId(null)}
        onConfirm={() => deletePurchaseId && handleDeletePurchase(deletePurchaseId)}
        title="حذف فاکتور خرید"
        message="آیا مطمئن هستید؟ این فاکتور خرید برای همیشه حذف می‌شود."
      />
    </div>
  );
}
