import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Mic, MicOff, Camera, ScanBarcode, Image as ImageIcon, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useVoiceSearch, type VoiceSttPreference } from '../hooks/useVoiceSearch';
import type { Product, Customer } from '../data/mockData';
import { bookToProductForSale } from '../utils/bookInventory';
import { PAGE_TO_PATH } from '../config/pageRoutes';
import { decodeBarcodeFromImageFile } from '../utils/barcodeDecode';

const LS_VOICE = 'dokanyar_search_voice';
const LS_IMG = 'dokanyar_search_image_btn';
const LS_BARCODE = 'dokanyar_search_barcode_btn';
const LS_STT = 'dokanyar_voice_stt_pref';

function readSttPref(): VoiceSttPreference {
  try {
    const v = localStorage.getItem(LS_STT);
    if (v === 'multi' || v === 'dari' || v === 'farsi' || v === 'pashto' || v === 'english' || v === 'app') return v;
  } catch {
    /* ignore */
  }
  return 'app';
}

interface SearchResult {
  type: 'product' | 'customer' | 'page';
  title: string;
  subtitle: string;
  page: string;
  icon: string;
}

function readLs(key: string, def: boolean) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === '1';
  } catch {
    return def;
  }
}

export default function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => readLs(LS_VOICE, true));
  const [imgBtnOn, setImgBtnOn] = useState(() => readLs(LS_IMG, true));
  const [barcodeBtnOn, setBarcodeBtnOn] = useState(() => readLs(LS_BARCODE, true));
  const [voiceSttPref, setVoiceSttPref] = useState<VoiceSttPreference>(() => readSttPref());
  const [voiceErr, setVoiceErr] = useState('');

  const persist = (key: string, val: boolean) => {
    try {
      localStorage.setItem(key, val ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const persistSttPref = (p: VoiceSttPreference) => {
    try {
      localStorage.setItem(LS_STT, p);
    } catch {
      /* ignore */
    }
    setVoiceSttPref(p);
  };

  const storeProducts = useStore((s) => s.products);
  const storeBooks = useStore((s) => s.books);
  const businessType = useStore((s) => s.shopSettings.business_type);
  const storeCustomers = useStore((s) => s.customers);

  const typeLabel = (type: SearchResult['type']) =>
    type === 'product' ? t('result_type_product') : type === 'customer' ? t('result_type_customer') : t('result_type_page');

  const results: SearchResult[] = [];
  const q = query.trim();
  if (q.length >= 1) {
    const qq = q.toLowerCase();
    const inventoryAsProducts: Product[] =
      businessType === 'bookstore'
        ? storeBooks.map(bookToProductForSale)
        : storeProducts;
    inventoryAsProducts
      .filter(
        (p: Product) =>
          p.name.includes(q) ||
          String(p.barcode || '').includes(q) ||
          String(p.product_code || '').toLowerCase().includes(qq)
      )
      .slice(0, 5)
      .forEach((p: Product) => {
        results.push({
          type: 'product',
          title: p.name,
          subtitle: `${t('quantity')}: ${p.stock_shop} | ${t('price')}: ${Number(p.sale_price).toLocaleString()} ؋`,
          page: 'products',
          icon: businessType === 'bookstore' ? '📚' : '📦',
        });
      });
    storeCustomers
      .filter((c: Customer) => c.name.includes(q) || c.phone.includes(q))
      .slice(0, 4)
      .forEach((c: Customer) => {
        results.push({
          type: 'customer',
          title: c.name,
          subtitle: `${t('phone')}: ${c.phone}`,
          page: 'customers',
          icon: '👤',
        });
      });
    const pages = [
      { title: t('products'), page: 'products', icon: '📦' },
      { title: t('customers'), page: 'customers', icon: '👥' },
      { title: t('sales'), page: 'sales', icon: '🛒' },
      { title: t('debts'), page: 'debts', icon: '💰' },
      { title: t('reports'), page: 'reports', icon: '📊' },
      { title: t('product_sales_ranking'), page: 'product-sales-ranking', icon: '📈' },
      { title: t('reorder_list_title'), page: 'reorder-list', icon: '📋' },
      { title: t('image_search'), page: 'image-search', icon: '🖼️' },
    ].filter((p) => p.title.toLowerCase().includes(qq) || p.page.includes(qq));
    pages.forEach((p) => results.push({ ...p, type: 'page', subtitle: '' }));
  }

  const go = useCallback(
    (page: string) => {
      const path = PAGE_TO_PATH[page] || '/dashboard';
      navigate(path);
      onClose();
    },
    [navigate, onClose]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onVoiceText = useCallback((text: string) => {
    setVoiceErr('');
    setQuery(text.trim());
  }, []);

  const onVoiceErrorCb = useCallback((_code: string, msg: string) => {
    setVoiceErr(msg);
    window.setTimeout(() => setVoiceErr(''), 5000);
  }, []);

  const { isListening, startListening, stopListening, supported: voiceSupported } = useVoiceSearch(onVoiceText, {
    sttPreference: voiceSttPref,
    onError: onVoiceErrorCb,
  });

  const tryDecodeBarcodeFile = async (file: File) => {
    const code = await decodeBarcodeFromImageFile(file);
    if (code) setQuery(code);
    else setQuery(file.name.replace(/\.[^.]+$/, ''));
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 pb-24 md:pb-8"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-dark max-h-[min(85vh,640px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeIn 0.2s ease' }}
      >
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-white/10 flex-shrink-0">
          <Search size={18} className="text-slate-300 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_products_customers_pages')}
            className="flex-1 min-w-0 bg-transparent text-white text-sm placeholder-slate-400 outline-none"
            dir={language === 'english' ? 'ltr' : 'rtl'}
          />
          {voiceOn && voiceSupported && (
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`p-2 rounded-xl transition-all flex-shrink-0 ${isListening ? 'bg-rose-500/30 text-rose-300 animate-pulse' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
              title="جستجوی صوتی — دری، فارسی، پشتو، انگلیسی (Chrome/Edge)"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/5 flex flex-wrap gap-2 flex-shrink-0">
          {imgBtnOn && (
            <button
              type="button"
              onClick={() => {
                go('image-search');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-200 text-xs font-bold hover:bg-violet-500/25"
            >
              <ImageIcon size={14} /> تصویر
            </button>
          )}
          {barcodeBtnOn && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void tryDecodeBarcodeFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-bold hover:bg-amber-500/25"
              >
                <ScanBarcode size={14} />
                <Camera size={14} className="opacity-80" />
                بارکد / دوربین
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-slate-500 hover:text-slate-300 text-xs mr-auto"
          >
            <Settings2 size={14} />
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {voiceErr && (
          <div className="px-4 py-2 text-amber-300 text-xs border-b border-white/10 bg-amber-500/10 flex-shrink-0">{voiceErr}</div>
        )}

        {showSettings && (
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 text-xs space-y-3 flex-shrink-0">
            <p className="text-slate-500 font-bold uppercase tracking-wide">تنظیمات نوار جستجو</p>
            <div>
              <p className="text-slate-400 font-bold text-[10px] mb-1.5">زبان تشخیص گفتار (Web Speech API)</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['app', 'هم‌زبان رابط'] as const,
                    ['multi', 'همه (دری→فارسی→پشتو→انگلیسی)'] as const,
                    ['dari', 'دری'] as const,
                    ['farsi', 'فارسی'] as const,
                    ['pashto', 'پشتو'] as const,
                    ['english', 'English'] as const,
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => persistSttPref(key)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      voiceSttPref === key
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'border-white/15 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-[10px] mt-1 leading-relaxed">
                پشتو با کد ps-AF در مرورگرهای جدید؛ در صورت خطا نسخهٔ جدید Chrome یا Edge را امتحان کنید.
              </p>
            </div>
            {(
              [
                {
                  key: 'voice',
                  label: 'دکمهٔ جستجوی صوتی',
                  on: voiceOn,
                  setOn: (v: boolean) => {
                    setVoiceOn(v);
                    persist(LS_VOICE, v);
                  },
                },
                {
                  key: 'img',
                  label: 'میانبر جستجوی تصویر',
                  on: imgBtnOn,
                  setOn: (v: boolean) => {
                    setImgBtnOn(v);
                    persist(LS_IMG, v);
                  },
                },
                {
                  key: 'barcode',
                  label: 'ابزار بارکد / دوربین',
                  on: barcodeBtnOn,
                  setOn: (v: boolean) => {
                    setBarcodeBtnOn(v);
                    persist(LS_BARCODE, v);
                  },
                },
              ] as const
            ).map((row) => (
              <label key={row.key} className="flex items-center justify-between gap-3 text-slate-300 cursor-pointer">
                <span>{row.label}</span>
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(e) => row.setOn(e.target.checked)}
                  className="accent-emerald-500"
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {results.length > 0 ? (
            <div className="divide-y divide-white/5">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${i}-${r.title}`}
                  type="button"
                  onClick={() => go(r.page)}
                  className="w-full text-right px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl shrink-0">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.title}</p>
                    <p className="text-slate-300 text-xs truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-slate-400 text-[10px] shrink-0">{typeLabel(r.type)}</span>
                </button>
              ))}
            </div>
          ) : q.length >= 1 ? (
            <div className="text-center py-8 text-slate-300 text-sm">{t('no_results_found')}</div>
          ) : (
            <div className="px-4 py-4">
              <p className="text-slate-300 text-xs mb-2">{t('quick_access')}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['📦', t('products'), 'products'],
                  ['👥', t('customers'), 'customers'],
                  ['🛒', t('sales'), 'sales'],
                  ['💰', t('debts'), 'debts'],
                  ['📊', t('reports'), 'reports'],
                  ['🔔', t('notifications'), 'notifications'],
                ].map(([icon, label, page]) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => go(page)}
                    className="flex items-center gap-2 px-3 py-2 glass rounded-xl text-slate-200 text-xs hover:text-white hover:border-emerald-500/50 border border-transparent transition-all"
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 text-slate-400 text-[10px] sm:text-xs flex flex-wrap gap-2 flex-shrink-0">
          <span>↵ {t('select')}</span>
          <span>Esc {t('close')}</span>
          <span>Ctrl+K {t('search')}</span>
        </div>
      </div>
    </div>
  );
}
