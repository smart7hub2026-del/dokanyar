import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Package, AlertTriangle, Barcode, Hash, Calendar, Printer, RefreshCw, Camera, Mic, MicOff, Download, ChevronRight, ChevronLeft } from 'lucide-react';
import { Product, type CurrencyCode } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { BrowserMultiFormatReader } from '@zxing/library';
import FormModal from './ui/FormModal';
import { compressImageToDataUrl } from '../utils/compressImage';

const ITEMS_PER_PAGE = 10;

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

type Tab = 'products' | 'serials' | 'expiry';
type PrintSize = 'A4' | 'A5' | '80mm' | '58mm';

function generateBarcode(): string {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

function PrintLabelModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { formatPrice } = useApp();
  const [size, setSize] = useState<PrintSize>('80mm');
  const [step, setStep] = useState<'preview' | 'size'>('preview');
  const priceLabel = formatPrice(product.sale_price, product.currency_code ?? 'AFN');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const sizeMap = {
    'A4': { w: '210mm', h: '297mm', fontSize: '14px', padding: '20mm' },
    'A5': { w: '148mm', h: '210mm', fontSize: '12px', padding: '15mm' },
    '80mm': { w: '80mm', h: '50mm', fontSize: '10px', padding: '3mm' },
    '58mm': { w: '58mm', h: '40mm', fontSize: '8px', padding: '2mm' },
  };

  const handlePrint = () => {
    const s = sizeMap[size];
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>لیبل محصول</title>
      <style>
        @page { size: ${s.w} ${s.h}; margin: 0; }
        body { font-family: 'Tahoma', sans-serif; margin: 0; padding: ${s.padding}; width: ${s.w}; box-sizing: border-box; }
        .label { border: 1px solid #333; padding: 4mm; text-align: center; }
        .name { font-size: calc(${s.fontSize} + 2px); font-weight: bold; margin-bottom: 2mm; }
        .barcode-text { font-family: monospace; font-size: ${s.fontSize}; background: #f0f0f0; padding: 1mm 3mm; border-radius: 3mm; margin: 2mm 0; letter-spacing: 2px; }
        .price { font-size: calc(${s.fontSize} + 4px); font-weight: bold; color: #1a56db; margin: 2mm 0; }
        .code { font-size: calc(${s.fontSize} - 1px); color: #666; }
        .barcode-lines { display: flex; justify-content: center; gap: 1px; height: 8mm; margin: 2mm 0; }
        .bar { background: #000; width: 1px; }
        .bar.wide { width: 2px; }
        .bar.space { background: white; }
      </style></head><body>
      <div class="label">
        <div class="name">${product.name}</div>
        <div class="barcode-lines">${Array.from({length:40}, (_,i) => `<div class="bar ${i%3===0?'wide':i%5===0?'space':''}" style="height:${8+Math.sin(i)*2}mm"></div>`).join('')}</div>
        <div class="barcode-text">${product.barcode}</div>
        <div class="price">${priceLabel.replace(/</g, '&lt;')}</div>
        <div class="code">کد: ${product.product_code} | دسته: ${product.category_name}</div>
      </div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" style={{ overscrollBehavior: 'contain' }}>
      <div className="glass-dark relative z-[1] w-full max-w-md rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold flex items-center gap-2"><Printer size={18} className="text-indigo-400" /> چاپ لیبل محصول</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-white font-bold text-lg">{product.name}</p>
            <p className="text-slate-400 text-sm font-mono mt-1">{product.barcode}</p>
            <p className="text-emerald-400 font-bold mt-2">{priceLabel}</p>
          </div>
          {step === 'preview' ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep('size')}
                className="w-full btn-primary text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Printer size={16} /> ادامه — انتخاب سایز چاپ
              </button>
              <button type="button" onClick={onClose} className="w-full glass text-slate-300 py-2.5 rounded-xl hover:text-white">
                انصراف
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-slate-400 text-xs mb-2 block font-medium">سایز کاغذ لیبل</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['58mm', '80mm', 'A5', 'A4'] as PrintSize[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${size === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('preview')} className="px-4 glass text-slate-300 py-2.5 rounded-xl hover:text-white text-sm">
                  بازگشت
                </button>
                <button type="button" onClick={handlePrint} className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <Printer size={16} /> چاپ ({size})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" style={{ overscrollBehavior: 'contain' }}>
      <div className="glass-dark rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">آیا مطمئنید؟</h3>
        <p className="text-slate-400 text-sm mb-1">می‌خواهید <span className="text-white font-medium">"{name}"</span> را حذف کنید؟</p>
        <p className="text-rose-400 text-xs mb-6">این عمل قابل بازگشت نیست.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors">بله، حذف شود</button>
          <button onClick={onClose} className="flex-1 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { isDark, t, currencies, formatPrice } = useApp();
  const products = useStore(s => s.products);
  const categories = useStore(s => s.categories);
  const serials = useStore(s => s.serialNumbers);
  const expiryRecords = useStore(s => s.expiryRecords);
  const currentUser = useStore(s => s.currentUser);
  const addProduct = useStore(s => s.addProduct);
  const updateProduct = useStore(s => s.updateProduct);
  const deleteProduct = useStore(s => s.deleteProduct);
  const addCategoryStore = useStore(s => s.addCategory);
  const addExpiry = useStore(s => s.addExpiry);
  const storeAddSerial = useStore(s => s.addSerial);

  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialProductId, setSerialProductId] = useState<number | null>(null);
  const [newSerial, setNewSerial] = useState({ serial_number: '', warranty_months: 12 });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'barcode' | 'image'>('barcode');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannerError, setScannerError] = useState('');

  type NumField = number | '';
  const parseFormNum = (v: NumField) => (v === '' ? 0 : Number(v) || 0);

  const [form, setForm] = useState({
    product_code: '', barcode: '', name: '', category_id: 1,
    purchase_price: '' as NumField, sale_price: '' as NumField, stock_shop: '' as NumField, stock_warehouse: '' as NumField,
    min_stock: '' as NumField, has_expiry: false, has_serial: false,
    expiry_date: '', batch_number: '', image_url: '',
    currency_code: 'AFN' as CurrencyCode,
  });
  const imageRef = useRef<HTMLInputElement>(null);

  const { isListening, startListening, stopListening, supported } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat = addCategoryStore(newCategoryName.trim());
    setForm(f => ({ ...f, category_id: newCat.id }));
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, {
        force: true,
        minFileSizeToCompress: 0,
        maxEdge: 720,
        maxBytes: 100_000,
      });
      setForm((f) => ({ ...f, image_url: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };


  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const filtered = useMemo(() => products.filter(p => {
    const q = search.trim();
    const matchSearch =
      p.name.includes(q) ||
      p.product_code.includes(q) ||
      p.barcode.includes(q);
    const matchCat = catFilter === 0 || p.category_id === catFilter;
    return matchSearch && matchCat;
  }), [products, search, catFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExport = () => {
    const exportData = filtered.map(p => ({
      'کد': p.product_code,
      'بارکد': p.barcode,
      'نام محصول': p.name,
      'دسته‌بندی': p.category_name,
      'قیمت خرید': p.purchase_price,
      'قیمت فروش': p.sale_price,
      'موجودی فروشگاه': p.stock_shop,
      'موجودی انبار': p.stock_warehouse,
      'وضعیت': p.is_active ? 'فعال' : 'غیرفعال'
    }));
    exportToCSV(exportData, 'products_list');
  };

  const openAdd = () => {
    setEditItem(null);
    const nextNum = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const defaultCatId = categories[0]?.id ?? 1;
    setForm({
      product_code: `P${String(nextNum).padStart(3, '0')}`,
      barcode: '', name: '', category_id: defaultCatId,
      purchase_price: '', sale_price: '', stock_shop: '', stock_warehouse: '',
      min_stock: '', has_expiry: false, has_serial: false,
      expiry_date: '', batch_number: '', image_url: '',
      currency_code: 'AFN',
    });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({
      product_code: p.product_code, barcode: p.barcode, name: p.name,
      category_id: p.category_id, purchase_price: p.purchase_price,
      sale_price: p.sale_price, stock_shop: p.stock_shop,
      stock_warehouse: p.stock_warehouse, min_stock: p.min_stock,
      has_expiry: p.has_expiry || false, has_serial: p.has_serial || false,
      expiry_date: '', batch_number: '', image_url: p.image_url || '',
      currency_code: p.currency_code ?? 'AFN',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.barcode) { alert('بارکد اجباری است'); return; }
    const cat = categories.find(c => c.id === form.category_id);
    const tenantId = currentUser?.tenant_id ?? 1;
    const purchase_price = parseFormNum(form.purchase_price);
    const sale_price = parseFormNum(form.sale_price);
    const stock_shop = parseFormNum(form.stock_shop);
    const stock_warehouse = parseFormNum(form.stock_warehouse);
    const min_stock = parseFormNum(form.min_stock);
    if (editItem) {
      updateProduct({
        ...editItem,
        product_code: form.product_code,
        barcode: form.barcode,
        name: form.name,
        category_id: form.category_id,
        category_name: cat?.name || '',
        purchase_price,
        sale_price,
        stock_shop,
        stock_warehouse,
        min_stock,
        has_expiry: form.has_expiry,
        has_serial: form.has_serial,
        image_url: form.image_url || undefined,
        currency_code: form.currency_code,
      });
    } else {
      const np = addProduct({
        product_code: form.product_code,
        barcode: form.barcode,
        name: form.name,
        category_id: form.category_id,
        category_name: cat?.name || '',
        purchase_price,
        sale_price,
        stock_shop,
        stock_warehouse,
        min_stock,
        is_active: true,
        tenant_id: tenantId,
        has_expiry: form.has_expiry,
        has_serial: form.has_serial,
        image_url: form.image_url || undefined,
        currency_code: form.currency_code,
      });
      if (form.has_expiry && form.expiry_date) {
        addExpiry({
          product_id: np.id,
          product_name: np.name,
          batch_number: form.batch_number || 'B-AUTO',
          expiry_date: form.expiry_date,
          quantity: stock_shop,
        });
      }
    }
    setShowModal(false);
  };

  const confirmDelete = (p: Product) => setDeleteItem(p);

  const doDelete = () => {
    if (deleteItem) {
      deleteProduct(deleteItem.id);
      setDeleteItem(null);
    }
  };

  // Scan removed from products list - use global search instead

  const openSerialManager = (productId: number) => {
    setSerialProductId(productId);
    setNewSerial({ serial_number: '', warranty_months: 12 });
    setShowSerialModal(true);
  };

  const submitNewSerial = () => {
    if (!newSerial.serial_number || !serialProductId) return;
    const product = products.find(p => p.id === serialProductId);
    if (!product) return;
    storeAddSerial({
      product_id: serialProductId,
      product_name: product.name,
      serial_number: newSerial.serial_number,
      warranty_months: newSerial.warranty_months,
      status: 'available',
    });
    setNewSerial({ serial_number: '', warranty_months: 12 });
  };

  const productSerialsForModal = serialProductId ? serials.filter(s => s.product_id === serialProductId) : [];
  const productForSerial = serialProductId ? products.find(p => p.id === serialProductId) : null;

  // Expiry status
  const today = new Date();
  const getExpiryStatus = (date: string) => {
    const d = new Date(date);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'منقضی', color: 'text-rose-400 bg-rose-500/10', days: diff };
    if (diff <= 30) return { label: `${diff} روز مانده`, color: 'text-amber-400 bg-amber-500/10', days: diff };
    return { label: `${diff} روز مانده`, color: 'text-emerald-400 bg-emerald-500/10', days: diff };
  };

  // Camera Scanner Logic
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    let stream: MediaStream | null = null;

    if (showScanner && videoRef.current) {
      if (scanMode === 'barcode') {
        codeReader = new BrowserMultiFormatReader();
        codeReader.decodeFromVideoDevice(null, videoRef.current, (result: any, err: any) => {
          if (result) {
            setSearch(result.getText());
            setShowScanner(false);
          }
          if (err && !(err.name === 'NotFoundException')) {
            // ignore continuous not found errors
            console.error(err);
          }
        }).catch((err: any) => {
          setScannerError('خطا در دسترسی به دوربین برای بارکد');
          console.error(err);
        });
      } else {
        // Image match mode (mock visual search)
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then(s => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch((err: any) => {
            setScannerError('خطا در دسترسی به دوربین');
            console.error(err);
          });
      }
    }

    return () => {
      if (codeReader) codeReader.reset();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [showScanner, scanMode]);

  const captureImageMatch = () => {
    // In a real app, you would capture a frame from videoRef, send it to an AI API, and get the product.
    // For now, we'll simulate finding a random product.
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    if (randomProduct) {
      setSearch(randomProduct.name);
      setShowScanner(false);
      alert(`تشخیص تصویر: ${randomProduct.name} پیدا شد!`);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textColor}`}>{t('manage_products')}</h1>
          <p className={`${subText} text-sm mt-1`}>{products.length} محصول ثبت‌شده</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="glass flex items-center gap-2 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium hover:text-white transition-all">
            <Download size={18} /> خروجی Excel
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            <Plus size={18} /> محصول جدید
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'products', label: 'محصولات', icon: <Package size={15}/> },
          { id: 'serials', label: 'سریال نامبر', icon: <Hash size={15}/> },
          { id: 'expiry', label: 'تاریخ انقضا', icon: <Calendar size={15}/> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 flex items-center">
              <Search size={16} className="absolute right-3 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="جستجو (نام، کد، بارکد)..."
                className={`${inputClass} pr-10 pl-24`} />
              
              <div className="absolute left-2 flex items-center gap-1">
                {supported && (
                  <button 
                    onClick={isListening ? stopListening : startListening}
                    className={`p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                    title={isListening ? "توقف جستجوی صوتی" : "جستجوی صوتی (فارسی، پشتو، انگلیسی)"}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
                <button
                  onClick={() => { setScanMode('barcode'); setShowScanner(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                  title="اسکن بارکد با دوربین"
                >
                  <Barcode size={16} />
                </button>
                <button
                  onClick={() => { setScanMode('image'); setShowScanner(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                  title="جستجو با عکس محصول"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCatFilter(0)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${catFilter === 0 ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>همه</button>
              {categories.filter(c => !c.parent_id).map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${catFilter === c.id ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'کل محصولات', value: products.length, color: textColor },
              { label: 'فعال', value: products.filter(p => p.is_active).length, color: 'text-emerald-400' },
              { label: 'کم‌موجودی', value: products.filter(p => p.stock_shop <= p.min_stock && p.stock_shop > 0).length, color: 'text-amber-400' },
              { label: 'اتمام موجودی', value: products.filter(p => p.stock_shop === 0).length, color: 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className={`${cardBg} p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`${subText} text-xs mt-1`}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className={`${cardBg} overflow-hidden`}>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                    {['کد', 'بارکد', 'نام محصول', 'دسته', 'قیمت خرید', 'قیمت فروش', 'موجودی', 'انبار', 'وضعیت', 'عملیات'].map(h => (
                      <th key={h} className={`text-right ${subText} font-medium py-3 px-4 whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {paginated.map(p => (
                    <tr
                      key={p.id}
                      className={`${isDark ? 'table-row-hover' : 'hover:bg-slate-50 transition-colors'} ${
                        p.is_active && p.stock_shop > 0 && p.stock_shop <= p.min_stock
                          ? isDark
                            ? 'bg-rose-500/5'
                            : 'bg-rose-50/80'
                          : ''
                      }`}
                    >
                      <td className={`py-3 px-4 ${subText} text-xs font-mono`}>{p.product_code}</td>
                      <td className={`py-3 px-4 ${subText} text-xs font-mono`}>{p.barcode}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              : <Package size={12} className="text-indigo-400" />
                            }
                          </div>
                          <div>
                            <span className={`${textColor} font-medium`}>{p.name}</span>
                            <div className="flex gap-1 mt-0.5">
                              {p.has_expiry && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">انقضا</span>}
                              {p.has_serial && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">سریال</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${subText} text-xs`}>{p.category_name}</td>
                      <td className="py-3 px-4 text-amber-400 font-medium">{formatPrice(p.purchase_price, p.currency_code ?? 'AFN')}</td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">{formatPrice(p.sale_price, p.currency_code ?? 'AFN')}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className={`font-bold ${p.stock_shop === 0 ? 'text-rose-400' : p.stock_shop <= p.min_stock ? 'text-amber-400' : textColor}`}>{p.stock_shop}</span>
                          {p.stock_shop <= p.min_stock && p.stock_shop > 0 && <AlertTriangle size={12} className="text-amber-400" />}
                          {p.stock_shop === 0 && <AlertTriangle size={12} className="text-rose-400" />}
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{p.stock_warehouse}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? 'badge-green' : 'badge-red'}`}>
                          {p.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} title="ویرایش" className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setPrintProduct(p)} title="چاپ لیبل" className="p-1.5 rounded-lg glass text-slate-400 hover:text-indigo-400 transition-colors"><Printer size={14} /></button>
                          {p.has_serial && (
                            <button onClick={() => openSerialManager(p.id)} title="سریال‌ها" className="p-1.5 rounded-lg glass text-slate-400 hover:text-emerald-400 transition-colors"><Hash size={14} /></button>
                          )}
                          <button onClick={() => confirmDelete(p)} title="حذف" className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-3 space-y-3">
              {paginated.map(p => (
                <div
                  key={p.id}
                  className={`rounded-2xl p-4 border ${
                    p.is_active && p.stock_shop > 0 && p.stock_shop <= p.min_stock
                      ? isDark
                        ? 'border-rose-500/50 bg-rose-950/25 ring-1 ring-rose-500/30'
                        : 'border-rose-300 bg-rose-50/90 ring-1 ring-rose-200'
                      : isDark
                        ? 'bg-slate-800/70 border-white/10'
                        : 'bg-slate-50/90 border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-indigo-500/15 flex items-center justify-center overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={22} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[15px] leading-snug ${textColor}`}>{p.name}</p>
                      <p className={`text-xs ${subText} font-mono mt-0.5`}>
                        {p.product_code} · {p.barcode || '—'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border border-slate-200'} ${subText}`}>
                          {p.category_name}
                        </span>
                        {p.has_expiry && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/15 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}
                          >
                            انقضا
                          </span>
                        )}
                        {p.has_serial && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-lg bg-blue-500/15 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}
                          >
                            سریال
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            p.stock_shop === 0
                              ? 'text-rose-500'
                              : p.stock_shop <= p.min_stock
                                ? 'text-amber-600'
                                : isDark
                                  ? 'text-emerald-400'
                                  : 'text-emerald-700'
                          }`}
                        >
                          موجودی {p.stock_shop} (انبار {p.stock_warehouse})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 flex-wrap ${isDark ? 'border-white/10' : 'border-slate-200'}`}
                  >
                    <div>
                      <p className={`text-[10px] ${subText}`}>فروش</p>
                      <p className={`text-sm font-bold tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {formatPrice(p.sale_price, p.currency_code ?? 'AFN')}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${subText}`}>خرید</p>
                      <p className={`text-sm font-medium tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        {formatPrice(p.purchase_price, p.currency_code ?? 'AFN')}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${p.is_active ? 'badge-green' : 'badge-red'}`}>
                      {p.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-3 justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      title="ویرایش"
                      className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500 hover:text-blue-500`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintProduct(p)}
                      title="چاپ"
                      className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500 hover:text-indigo-500`}
                    >
                      <Printer size={16} />
                    </button>
                    {p.has_serial && (
                      <button
                        type="button"
                        onClick={() => openSerialManager(p.id)}
                        title="سریال"
                        className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500 hover:text-emerald-500`}
                      >
                        <Hash size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => confirmDelete(p)}
                      title="حذف"
                      className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-rose-500`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'bg-slate-800/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`text-xs ${subText}`}>
                  نمایش {(currentPage - 1) * ITEMS_PER_PAGE + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} از {filtered.length} محصول
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg glass ${subText} disabled:opacity-30 hover:text-indigo-400 transition-all`}><ChevronRight size={16} /></button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : `glass ${subText} hover:text-indigo-400`}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg glass ${subText} disabled:opacity-30 hover:text-indigo-400 transition-all`}><ChevronLeft size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* SERIALS TAB */}
      {activeTab === 'serials' && (
        <div className={`${cardBg} overflow-hidden`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className={`${textColor} font-semibold flex items-center gap-2`}><Hash size={16} className="text-blue-400" /> مدیریت سریال نامبر</h3>
            <div className="flex gap-2 text-xs">
              <span className="badge-green px-3 py-1 rounded-full">موجود: {serials.filter(s => s.status === 'available').length}</span>
              <span className="badge-red px-3 py-1 rounded-full">فروخته: {serials.filter(s => s.status === 'sold').length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                  {['#', 'محصول', 'سریال نامبر', 'ضمانت (ماه)', 'وضعیت', 'فاکتور'].map(h => (
                    <th key={h} className={`text-right ${subText} font-medium py-3 px-4`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {serials.map(s => (
                  <tr key={s.id} className={isDark ? 'table-row-hover' : 'hover:bg-slate-50'}>
                    <td className={`py-3 px-4 ${subText}`}>{s.id}</td>
                    <td className={`py-3 px-4 ${textColor} font-medium`}>{s.product_name}</td>
                    <td className="py-3 px-4 font-mono text-blue-400 text-xs">{s.serial_number}</td>
                    <td className={`py-3 px-4 ${subText}`}>{s.warranty_months} ماه</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'available' ? 'badge-green' : 'badge-red'}`}>
                        {s.status === 'available' ? 'موجود' : 'فروخته شده'}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${subText} text-xs`}>{s.sold_invoice_id ? `INV-00${s.sold_invoice_id}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/10">
            <p className={`${subText} text-xs`}>برای افزودن سریال جدید، روی آیکون # در ردیف محصول کلیک کنید.</p>
          </div>
        </div>
      )}

      {/* EXPIRY TAB */}
      {activeTab === 'expiry' && (
        <div className={`${cardBg} overflow-hidden`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className={`${textColor} font-semibold flex items-center gap-2`}><Calendar size={16} className="text-amber-400" /> تاریخ انقضای محصولات</h3>
            <div className="flex gap-2 text-xs">
              <span className="text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">منقضی: {expiryRecords.filter(e => new Date(e.expiry_date) < today).length}</span>
              <span className="text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">زیر ۳۰ روز: {expiryRecords.filter(e => { const d = Math.ceil((new Date(e.expiry_date).getTime() - today.getTime()) / 86400000); return d >= 0 && d <= 30; }).length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                  {['محصول', 'شماره بچ', 'تاریخ انقضا', 'مقدار', 'وضعیت'].map(h => (
                    <th key={h} className={`text-right ${subText} font-medium py-3 px-4`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {expiryRecords.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()).map(e => {
                  const st = getExpiryStatus(e.expiry_date);
                  return (
                    <tr key={e.id} className={isDark ? 'table-row-hover' : 'hover:bg-slate-50'}>
                      <td className={`py-3 px-4 ${textColor} font-medium`}>{e.product_name}</td>
                      <td className={`py-3 px-4 ${subText} font-mono text-xs`}>{e.batch_number}</td>
                      <td className={`py-3 px-4 ${subText}`}>{e.expiry_date}</td>
                      <td className={`py-3 px-4 ${textColor}`}>{e.quantity}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full border ${st.color} ${st.days < 0 ? 'border-rose-500/30' : st.days <= 30 ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <Package size={18} className="text-indigo-400 shrink-0" />
            {editItem ? 'ویرایش محصول' : 'افزودن محصول جدید'}
          </span>
        }
        footer={
          <div className="flex gap-3">
            <button type="submit" form="product-add-edit-form" className="flex-1 btn-primary text-white font-semibold py-2.5 rounded-xl text-sm">
              {editItem ? 'ذخیره تغییرات' : 'ثبت محصول'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="px-5 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="product-add-edit-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">کد محصول</label>
                  <input value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block flex items-center gap-1">
                    <Barcode size={11} /> بارکد
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                      placeholder="بارکد را وارد کنید"
                      className={`flex-1 min-w-0 ${inputClass}`} required />
                    <button type="button" title="ایجاد بارکد خودکار"
                      onClick={() => setForm({ ...form, barcode: generateBarcode() })}
                      className="shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 transition-all text-sm whitespace-nowrap flex items-center justify-center gap-1.5">
                      <RefreshCw size={14} /> ایجاد بارکد
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">بارکد اجباری است. می‌توانید از دکمه "ایجاد" استفاده کنید.</p>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">نام محصول</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className={inputClass} required placeholder="نام محصول را وارد کنید" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">دسته‌بندی</label>
                  <div className="flex gap-2">
                    <select value={form.category_id} onChange={e => setForm({ ...form, category_id: +e.target.value })}
                      className={`flex-1 ${inputClass}`}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      title="افزودن دسته‌بندی جدید"
                      className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 transition-all text-xs whitespace-nowrap flex items-center gap-1">
                      <Plus size={12} /> دسته
                    </button>
                  </div>
                  {showAddCategory && (
                    <div className="mt-2 flex gap-2 fade-in">
                      <input
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                        placeholder="نام دسته‌بندی جدید..."
                        className={`flex-1 ${inputClass}`}
                        autoFocus
                      />
                      <button type="button" onClick={handleAddCategory}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs transition-colors">
                        افزودن
                      </button>
                      <button type="button" onClick={() => setShowAddCategory(false)}
                        className="px-3 py-2 rounded-xl glass text-slate-400 hover:text-white text-xs">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">حداقل موجودی هشدار</label>
                  <input type="number" value={form.min_stock === '' ? '' : form.min_stock} onChange={e => {
                    const v = e.target.value;
                    setForm({ ...form, min_stock: v === '' ? '' : Number(v) });
                  }}
                    className={inputClass} min="0" />
                </div>
              </div>

              {/* Prices & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">واحد پول قیمت خرید و فروش</label>
                  <select
                    value={form.currency_code}
                    onChange={(e) => setForm({ ...form, currency_code: e.target.value as CurrencyCode })}
                    className={inputClass}
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} — {c.code}
                      </option>
                    ))}
                  </select>
                </div>
                {([
                  ['قیمت خرید', 'purchase_price'],
                  ['قیمت فروش', 'sale_price'],
                  ['موجودی فروشگاه', 'stock_shop'],
                  ['موجودی انبار', 'stock_warehouse'],
                ] as const).map(([label, field]) => (
                  <div key={field}>
                    <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                    <input type="number" value={form[field] === '' ? '' : form[field]}
                      onChange={e => {
                        const v = e.target.value;
                        setForm({ ...form, [field]: v === '' ? '' : Number(v) });
                      }}
                      className={inputClass} min="0" />
                  </div>
                ))}
              </div>

              {/* Special Features */}
              <div className="space-y-3 border border-white/10 rounded-xl p-4">
                <h3 className="text-slate-300 text-sm font-medium">ویژگی‌های اضافی (اختیاری)</h3>

                {/* Expiry */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-sm flex items-center gap-2">
                      <Calendar size={14} className="text-amber-400" /> تاریخ انقضا
                    </label>
                    <button type="button" onClick={() => setForm({ ...form, has_expiry: !form.has_expiry })}
                      className={`w-10 h-5 rounded-full transition-all relative ${form.has_expiry ? 'bg-amber-500' : 'bg-slate-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.has_expiry ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {form.has_expiry && !editItem && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">تاریخ انقضا</label>
                        <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                          className={inputClass} />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">شماره بچ</label>
                        <input value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })}
                          className={inputClass} placeholder="مثال: B2025-01" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Serial */}
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-sm flex items-center gap-2">
                    <Hash size={14} className="text-blue-400" /> سریال نامبر
                  </label>
                  <button type="button" onClick={() => setForm({ ...form, has_serial: !form.has_serial })}
                    className={`w-10 h-5 rounded-full transition-all relative ${form.has_serial ? 'bg-blue-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.has_serial ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Image Upload */}
              <div className="border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                  <Camera size={14} className="text-indigo-400" /> عکس کالا — اختیاری؛ بدون عکس هم می‌توانید ثبت کنید
                </h3>
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer ${form.image_url ? 'border-indigo-500' : 'border-slate-600 hover:border-slate-500'}`}
                    onClick={() => imageRef.current?.click()}>
                    {form.image_url
                      ? <img src={form.image_url} alt="product" className="w-full h-full object-cover" />
                      : <Camera size={24} className="text-slate-500" />
                    }
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => imageRef.current?.click()}
                      className="flex items-center gap-2 glass text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs">
                      <Camera size={12} /> آپلود عکس
                    </button>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl text-xs glass">
                        <X size={12} /> حذف عکس
                      </button>
                    )}
                    <p className="text-slate-500 text-xs">PNG, JPG — حداکثر ۲MB</p>
                  </div>
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

            </form>
      </FormModal>

      {/* Scan removed - use Ctrl+K global search for barcode search */}

      <FormModal
        open={showSerialModal && !!productForSerial}
        onClose={() => setShowSerialModal(false)}
        size="lg"
        title={
          <span className="flex min-w-0 items-center gap-2">
            <Hash size={18} className="shrink-0 text-blue-400" />
            <span className="truncate">سریال‌ها: {productForSerial?.name}</span>
          </span>
        }
        footer={
          <button type="button" onClick={() => setShowSerialModal(false)} className="w-full glass py-2.5 text-slate-300 rounded-xl hover:text-white">
            بستن
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newSerial.serial_number} onChange={e => setNewSerial({ ...newSerial, serial_number: e.target.value })}
              placeholder="شماره سریال جدید" className={`flex-1 ${inputClass}`} />
            <input type="number" value={newSerial.warranty_months} onChange={e => setNewSerial({ ...newSerial, warranty_months: +e.target.value })}
              placeholder="ضمانت (ماه)" className={`w-28 ${inputClass}`} min="0" />
            <button type="button" onClick={submitNewSerial} className="rounded-xl bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700">
              <Plus size={16} />
            </button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {productSerialsForModal.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">سریالی ثبت نشده</p>
            ) : productSerialsForModal.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-800/30 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === 'available' ? 'badge-green' : 'badge-red'}`}>
                    {s.status === 'available' ? 'موجود' : 'فروخته'}
                  </span>
                  <span className="font-mono text-sm text-white">{s.serial_number}</span>
                </div>
                <span className="text-xs text-slate-400">{s.warranty_months} ماه ضمانت</span>
              </div>
            ))}
          </div>
        </div>
      </FormModal>

      {/* PRINT LABEL MODAL */}
      {printProduct && <PrintLabelModal product={printProduct} onClose={() => setPrintProduct(null)} />}

      {/* DELETE CONFIRM MODAL */}
      {deleteItem && <DeleteConfirmModal name={deleteItem.name} onConfirm={doDelete} onClose={() => setDeleteItem(null)} />}

      {/* CAMERA SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/90 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h2 className="text-white font-semibold flex items-center gap-2">
              {scanMode === 'barcode' ? <><Barcode size={18} className="text-indigo-400" /> اسکن بارکد</> : <><Camera size={18} className="text-blue-400" /> جستجوی تصویری</>}
            </h2>
            <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-white p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
            {scannerError ? (
              <div className="text-center">
                <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                <p className="text-white">{scannerError}</p>
                <button onClick={() => setShowScanner(false)} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl">بستن</button>
              </div>
            ) : (
              <div className="relative w-full max-w-md aspect-[3/4] sm:aspect-square bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover" />
                
                {/* Overlay guides */}
                <div className="absolute inset-0 pointer-events-none">
                  {scanMode === 'barcode' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3/4 h-32 border-2 border-indigo-500 rounded-xl relative">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 animate-[scan_2s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2/3 aspect-square border-2 border-dashed border-blue-500 rounded-2xl relative" />
                    </div>
                  )}
                </div>

                {/* Capture button for image mode */}
                {scanMode === 'image' && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center pb-safe">
                    <button 
                      onClick={captureImageMatch}
                      className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-4 border-white flex items-center justify-center hover:bg-white/30 transition-all active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-white" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-6 text-center text-slate-400 text-sm bg-black/50 pb-safe">
            {scanMode === 'barcode' ? 'بارکد را در کادر قرار دهید' : 'محصول را در کادر قرار داده و عکس بگیرید'}
          </div>
        </div>
      )}
    </div>
  );
}
