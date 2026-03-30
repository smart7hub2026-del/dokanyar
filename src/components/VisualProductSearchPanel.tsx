import { useState, useRef, useMemo, useCallback } from 'react';
import { Camera, Upload, Search, X, Package, Star, Zap, Image } from 'lucide-react';
import type { Product } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { bookToProductForSale } from '../utils/bookInventory';
import { hashFromImageSource, hammingSimilarityPercent } from '../utils/imagePhash';

const MIN_SIMILARITY = 72;

interface SearchResult {
  product: Product;
  similarity: number;
}

export type VisualProductSearchPanelProps = {
  /** حالت صفحهٔ کامل یا بلوک داخل POS */
  variant?: 'page' | 'embedded';
  /** با انتخاب ردیف، محصول برگردانده می‌شود (مثلاً افزودن به سبد) */
  onSelectProduct?: (product: Product) => void;
};

export default function VisualProductSearchPanel({
  variant = 'page',
  onSelectProduct,
}: VisualProductSearchPanelProps) {
  const { formatPrice } = useApp();
  const products = useStore((s) => s.products);
  const books = useStore((s) => s.books);
  const businessType = useStore((s) => s.shopSettings.business_type);
  const embedded = variant === 'embedded';

  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResults([]);
    setSearched(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const activePool = useMemo(() => {
    if (businessType === 'bookstore') {
      return books.filter((b) => b.is_active).map(bookToProductForSale);
    }
    return products.filter((p) => p.is_active);
  }, [businessType, books, products]);

  const runVisualSearch = useCallback(async () => {
    if (!previewUrl) return;
    setSearching(true);
    setResults([]);
    try {
      const queryHash = await hashFromImageSource(previewUrl);
      if (!queryHash) {
        setSearched(true);
        return;
      }
      const pool = activePool.length > 0 ? activePool : [];
      const scored: SearchResult[] = [];
      for (const p of pool) {
        const url = p.image_url?.trim();
        if (!url) continue;
        const ph = await hashFromImageSource(url);
        if (!ph) continue;
        const similarity = hammingSimilarityPercent(queryHash, ph);
        if (similarity >= MIN_SIMILARITY) {
          scored.push({ product: p, similarity });
        }
      }
      scored.sort((a, b) => b.similarity - a.similarity);
      setResults(scored.slice(0, embedded ? 6 : 8));
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }, [previewUrl, activePool, embedded]);

  const clearSearch = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResults([]);
    setSearched(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSimilarityColor = (sim: number) => {
    if (sim >= 85) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (sim >= 70) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
  };

  const uploadBlock = (
    <div className={`glass rounded-2xl space-y-4 ${embedded ? 'p-4' : 'p-6'}`}>
      <h2 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
        <Image size={embedded ? 16 : 18} className="text-indigo-400 shrink-0" />
        آپلود یا اسکن تصویر
      </h2>

      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
            embedded ? 'p-6' : 'p-10'
          } ${
            dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={embedded ? 28 : 40} className={`mx-auto mb-2 ${dragOver ? 'text-indigo-400' : 'text-slate-500'}`} />
          <p className="text-slate-300 font-medium text-sm mb-0.5">رها کنید یا کلیک — دوربین زیر</p>
          <p className="text-slate-500 text-xs">JPG, PNG, WEBP</p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={previewUrl}
            alt=""
            className={`w-full object-cover rounded-xl border border-slate-700 ${embedded ? 'h-36' : 'h-56'}`}
          />
          <button
            type="button"
            onClick={clearSearch}
            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white hover:bg-rose-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 glass border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white py-2 rounded-xl text-xs sm:text-sm transition-all"
        >
          <Upload size={14} /> گالری
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 glass border border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-white py-2 rounded-xl text-xs sm:text-sm transition-all"
        >
          <Camera size={14} /> دوربین
        </button>
      </div>

      {previewUrl && (
        <button
          type="button"
          onClick={() => void runVisualSearch()}
          disabled={searching}
          className="w-full btn-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {searching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              در حال جستجو...
            </>
          ) : (
            <>
              <Search size={16} /> جستجوی مشابه
            </>
          )}
        </button>
      )}
    </div>
  );

  const howItWorks =
    !embedded ? (
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap size={16} className="text-amber-400" /> نحوه کار
        </h3>
        <div className="space-y-3">
          {[
            { step: '۱', text: 'عکس محصول را آپلود کنید', color: 'bg-indigo-500' },
            { step: '۲', text: 'الگوی تصویر با عکس کالاهای ثبت‌شده مقایسه می‌شود', color: 'bg-purple-500' },
            { step: '۳', text: `فقط کالاها با شبایه حداقل ${MIN_SIMILARITY}٪`, color: 'bg-emerald-500' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
              >
                {item.step}
              </span>
              <p className="text-slate-300 text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const resultsBlock = (
    <div className={`glass rounded-2xl ${embedded ? 'p-4' : 'p-6'}`}>
      <h2 className="text-white font-semibold flex items-center gap-2 mb-3 text-sm sm:text-base">
        <Star size={16} className="text-amber-400 shrink-0" />
        نتایج
        {results.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full badge-blue mr-auto">{results.length}</span>
        )}
      </h2>

      {!searched && !searching && (
        <div className={`flex flex-col items-center justify-center text-center ${embedded ? 'py-8' : 'h-64'}`}>
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3">
            <Search size={22} className="text-slate-600" />
          </div>
          <p className="text-slate-500 text-sm">تصویر بگذارید و جستجو کنید</p>
        </div>
      )}

      {searching && (
        <div className={`flex flex-col items-center justify-center ${embedded ? 'py-10' : 'h-64'}`}>
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-white text-sm font-medium">در حال تحلیل...</p>
        </div>
      )}

      {searched && results.length === 0 && !searching && (
        <div className={`text-center px-2 ${embedded ? 'py-8' : 'py-16'}`}>
          <Package size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">محصولی با عکس نزدیک پیدا نشد.</p>
        </div>
      )}

      {searched && results.length > 0 && (
        <div className="space-y-2 max-h-[min(360px,50vh)] overflow-y-auto custom-scrollbar">
          {results.map((result, idx) => {
            const row = (
              <div
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  idx === 0 ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700/50 bg-slate-800/30'
                } ${onSelectProduct ? 'cursor-pointer hover:border-emerald-500/50' : ''}`}
              >
                <div className="relative shrink-0">
                  {result.product.image_url ? (
                    <img
                      src={result.product.image_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-slate-600 bg-slate-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <Package size={18} className="text-indigo-400" />
                    </div>
                  )}
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Star size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-medium text-xs sm:text-sm truncate">{result.product.name}</p>
                  <p className="text-slate-500 text-[10px] sm:text-xs truncate">{result.product.category_name}</p>
                  <p className="text-emerald-400 text-xs font-bold mt-0.5">
                    {formatPrice(result.product.sale_price, result.product.currency_code ?? 'AFN')}
                  </p>
                </div>
                <div className="text-center shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getSimilarityColor(result.similarity)}`}>
                    {result.similarity}%
                  </span>
                </div>
              </div>
            );
            if (onSelectProduct) {
              return (
                <button
                  key={result.product.id}
                  type="button"
                  onClick={() => onSelectProduct(result.product)}
                  className="w-full text-right block"
                >
                  {row}
                </button>
              );
            }
            return <div key={result.product.id}>{row}</div>;
          })}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {uploadBlock}
        {resultsBlock}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {uploadBlock}
        {howItWorks}
      </div>
      {resultsBlock}
    </div>
  );
}
