import { useState, useRef, useEffect } from 'react';
import { Printer, Save, Eye, Upload, X, Store, Phone, MapPin, User } from 'lucide-react';
import { useStore, type ShopSettings } from '../store/useStore';
import { useToast } from './Toast';

export default function PrintSettingsPage() {
  const { success } = useToast();
  const shopSettings = useStore(s => s.shopSettings);
  const updateShopSettings = useStore(s => s.updateShopSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'print' | 'shop'>('print');
  const [logoDraft, setLogoDraft] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoDraft(shopSettings.logo_url || null);
  }, [shopSettings.logo_url]);

  const shopInfo = {
    name: shopSettings.shop_name,
    seller: shopSettings.seller_name,
    address: shopSettings.shop_address,
    phone: shopSettings.shop_phone,
    logo: logoDraft,
  };

  const setShopField = (key: keyof Pick<ShopSettings, 'shop_name' | 'seller_name' | 'shop_address' | 'shop_phone'>, value: string) => {
    updateShopSettings({ [key]: value });
  };

  const handleSave = () => {
    updateShopSettings({ logo_url: logoDraft || '' });
    setSaved(true);
    success('ذخیره شد', 'تنظیمات چاپ و فروشگاه در state فروشگاه ذخیره شد');
    setTimeout(() => setSaved(false), 2200);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDraft(reader.result as string);
    reader.readAsDataURL(file);
  };

  const paperSizes: ShopSettings['paper_size'][] = ['A4', 'A5', 'Letter', '80mm', '72mm', '58mm'];

  const getPreviewWidth = () => {
    switch (shopSettings.paper_size) {
      case '58mm':
        return 'max-w-[165px]';
      case '80mm':
      case '72mm':
        return 'max-w-[230px]';
      case 'A5':
        return 'max-w-xs';
      default:
        return 'max-w-sm';
    }
  };

  const printPreview = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const isThermal = shopSettings.paper_size === '58mm' || shopSettings.paper_size === '80mm' || shopSettings.paper_size === '72mm';
    const width =
      shopSettings.paper_size === '58mm'
        ? '58mm'
        : shopSettings.paper_size === '80mm' || shopSettings.paper_size === '72mm'
          ? '80mm'
          : shopSettings.paper_size === 'A5'
            ? '148mm'
            : '210mm';
    win.document.write(`
      <!DOCTYPE html><html dir="rtl"><head>
      <meta charset="UTF-8">
      <title>فاکتور نمونه</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Vazirmatn',Tahoma,Arial,sans-serif; font-size:${isThermal ? '10px' : '12px'}; direction:rtl; width:${width}; margin:auto; padding:${isThermal ? '6px' : '15px'}; }
        .center { text-align:center; }
        .bold { font-weight:700; }
        .sm { font-size:${isThermal ? '8px' : '10px'}; color:#666; }
        hr { border:none; border-top:1px dashed #ccc; margin:6px 0; }
        table { width:100%; border-collapse:collapse; font-size:${isThermal ? '9px' : '11px'}; }
        th { background:#f5f5f5; padding:4px; text-align:right; }
        td { padding:3px 4px; border-bottom:1px solid #eee; }
        .total-row { font-weight:700; font-size:${isThermal ? '11px' : '13px'}; }
        .logo { max-width:60px; max-height:60px; }
        @media print { body { width:${width}; } }
      </style>
      </head><body>
      <div class="center" style="margin-bottom:8px">
        ${shopInfo.logo ? `<img src="${shopInfo.logo}" class="logo" style="display:block;margin:0 auto 4px" />` : ''}
        ${shopSettings.show_shop_name ? `<p class="bold" style="font-size:${isThermal ? '12px' : '16px'}">${shopInfo.name}</p>` : ''}
        ${shopSettings.show_address ? `<p class="sm">${shopInfo.address}</p>` : ''}
        ${shopSettings.show_phone ? `<p class="sm">📞 ${shopInfo.phone}</p>` : ''}
      </div>
      <hr>
      <div style="font-size:${isThermal ? '9px' : '11px'}">
        <div style="display:flex;justify-content:space-between"><span>شماره فاکتور:</span><span class="bold">INV-2025-001</span></div>
        <div style="display:flex;justify-content:space-between"><span>تاریخ:</span><span>${new Date().toLocaleDateString('fa-AF')}</span></div>
        <div style="display:flex;justify-content:space-between"><span>مشتری:</span><span>نمونه</span></div>
        ${shopSettings.show_seller ? `<div style="display:flex;justify-content:space-between"><span>فروشنده:</span><span>${shopInfo.seller}</span></div>` : ''}
      </div>
      <hr>
      <table>
        <tr><th>محصول</th><th style="text-align:center">تعداد</th><th style="text-align:left">مجموع</th></tr>
        <tr><td>نمونه</td><td style="text-align:center">۱</td><td style="text-align:left">۱۰۰ ؋</td></tr>
      </table>
      <hr>
      <div class="total-row" style="display:flex;justify-content:space-between;margin-top:4px"><span>مجموع کل:</span><span>۱۰۰ ؋</span></div>
      ${shopSettings.show_barcode ? `<hr><div class="center"><p class="sm">بارکد نمونه</p></div>` : ''}
      ${shopSettings.footer_text ? `<hr><p class="center sm">${shopSettings.footer_text}</p>` : ''}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Printer size={24} /> تنظیمات چاپ و فروشگاه
          </h1>
          <p className="text-slate-400 text-sm mt-1">همگام با state فروشگاه (ذخیره سرور برای کاربران لاگین)</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={printPreview} className="flex items-center gap-2 glass text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm">
            <Eye size={16} /> چاپ آزمایشی
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-emerald-600' : 'btn-primary'}`}
          >
            <Save size={16} /> {saved ? '✓ ذخیره شد' : 'ذخیره لوگو'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 glass rounded-2xl p-1.5 w-fit">
        {[
          { key: 'shop' as const, label: 'اطلاعات فروشگاه', icon: <Store size={15} /> },
          { key: 'print' as const, label: 'تنظیمات چاپ', icon: <Printer size={15} /> },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'shop' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 space-y-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Store size={18} /> اطلاعات فروشگاه
            </h3>
            <div>
              <label className="text-slate-400 text-xs block mb-2">لوگوی فروشگاه</label>
              <div className="flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${shopInfo.logo ? 'border-indigo-500' : 'border-slate-600 hover:border-slate-500'}`}
                >
                  {shopInfo.logo ? (
                    <img src={shopInfo.logo} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload size={24} className="text-slate-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 glass text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm"
                  >
                    <Upload size={14} /> آپلود لوگو
                  </button>
                  {shopInfo.logo && (
                    <button
                      type="button"
                      onClick={() => setLogoDraft(null)}
                      className="flex items-center gap-2 text-rose-400 hover:text-rose-300 px-4 py-2 rounded-xl text-sm glass"
                    >
                      <X size={14} /> حذف لوگو
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
            {[
              { key: 'shop_name' as const, label: 'نام فروشگاه', icon: <Store size={14} />, value: shopSettings.shop_name },
              { key: 'seller_name' as const, label: 'نام فروشنده (فاکتور)', icon: <User size={14} />, value: shopSettings.seller_name },
              { key: 'shop_phone' as const, label: 'شماره تماس', icon: <Phone size={14} />, value: shopSettings.shop_phone },
            ].map(field => (
              <div key={field.key}>
                <label className="text-slate-400 text-xs flex items-center gap-1.5 mb-1.5">
                  {field.icon} {field.label}
                </label>
                <input
                  value={field.value}
                  onChange={e => setShopField(field.key, e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500"
                />
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-xs flex items-center gap-1.5 mb-1.5">
                <MapPin size={14} /> آدرس
              </label>
              <textarea
                value={shopSettings.shop_address}
                onChange={e => updateShopSettings({ shop_address: e.target.value })}
                rows={2}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">پیش‌نمایش هدر</h3>
            <div className="bg-white rounded-xl p-5 text-gray-800 shadow-xl">
              <div className="text-center border-b border-gray-200 pb-4 mb-4">
                {shopInfo.logo && <img src={shopInfo.logo} alt="logo" className="w-16 h-16 object-contain mx-auto mb-2" />}
                <p className="font-bold text-lg">{shopInfo.name || 'نام فروشگاه'}</p>
                <p className="text-xs text-gray-500 mt-1">{shopInfo.address}</p>
                <p className="text-xs text-gray-500">📞 {shopInfo.phone}</p>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>فروشنده:</span>
                  <span className="font-medium">{shopInfo.seller}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-semibold">اندازه کاغذ</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {paperSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateShopSettings({ paper_size: size })}
                    className={`py-3 rounded-xl text-xs font-medium transition-all border ${shopSettings.paper_size === size ? 'bg-indigo-600 text-white border-indigo-500' : 'glass text-slate-400 hover:text-white border-transparent'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-white font-semibold">نمایش در فاکتور</h3>
              {(
                [
                  ['show_shop_name', 'نام فروشگاه'],
                  ['show_address', 'آدرس'],
                  ['show_phone', 'تلفن'],
                  ['show_seller', 'فروشنده'],
                  ['show_barcode', 'بارکد'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{label}</span>
                  <button
                    type="button"
                    onClick={() => updateShopSettings({ [key]: !shopSettings[key] })}
                    className={`w-11 h-6 rounded-full transition-all relative ${shopSettings[key] ? 'bg-indigo-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${shopSettings[key] ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-white font-semibold">صفحه فروش (POS)</h3>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-300 text-sm">عکس کالا روی کارت انتخاب</p>
                  <p className="text-slate-500 text-xs mt-0.5">در سبد خرید هم در صورت وجود عکس نمایش داده می‌شود.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateShopSettings({ show_product_image_on_sales: !shopSettings.show_product_image_on_sales })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${shopSettings.show_product_image_on_sales ? 'bg-indigo-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${shopSettings.show_product_image_on_sales ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-white font-semibold">چاپ نیم‌رسمی و رسمی</h3>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-300 text-sm">پیش‌فرض: «عکس کالاها» در پایان فاکتور</p>
                  <p className="text-slate-500 text-xs mt-0.5">فقط برای سایزهای A4، A5 و Letter؛ هنگام چاپ می‌توانید تغییر دهید.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateShopSettings({ print_invoice_with_product_images: !shopSettings.print_invoice_with_product_images })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${shopSettings.print_invoice_with_product_images ? 'bg-indigo-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${shopSettings.print_invoice_with_product_images ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-semibold">متن و کپی</h3>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">پاورقی</label>
                <input
                  value={shopSettings.footer_text}
                  onChange={e => updateShopSettings({ footer_text: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">تعداد کپی</label>
                <select
                  value={shopSettings.print_copies}
                  onChange={e => updateShopSettings({ print_copies: +e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                >
                  {[1, 2, 3].map(n => (
                    <option key={n} value={n}>
                      {n} کپی
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">حالت نسخه فاکتور</label>
                <select
                  value={shopSettings.invoice_copy_mode}
                  onChange={e => updateShopSettings({ invoice_copy_mode: e.target.value as ShopSettings['invoice_copy_mode'] })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500"
                >
                  <option value="single">یک نسخه</option>
                  <option value="duplicate">دو نسخه</option>
                  <option value="triple">سه نسخه</option>
                </select>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">پیش‌نمایش</h3>
            <div className={`mx-auto bg-white rounded-xl p-4 text-gray-800 shadow-2xl text-right ${getPreviewWidth()}`}>
              <div className="text-center border-b border-gray-200 pb-3 mb-3">
                {shopInfo.logo && <img src={shopInfo.logo} alt="logo" className="w-12 h-12 object-contain mx-auto mb-1" />}
                {shopSettings.show_shop_name && <p className="font-bold text-sm">{shopInfo.name || '—'}</p>}
                {shopSettings.show_address && <p className="text-xs text-gray-500">{shopInfo.address}</p>}
                {shopSettings.show_phone && <p className="text-xs text-gray-500">📞 {shopInfo.phone}</p>}
              </div>
              {shopSettings.show_seller && (
                <p className="text-xs text-gray-600 mb-2">
                  فروشنده: {shopInfo.seller}
                </p>
              )}
              {shopSettings.footer_text && <p className="text-center text-xs text-gray-500 mt-2">{shopSettings.footer_text}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
