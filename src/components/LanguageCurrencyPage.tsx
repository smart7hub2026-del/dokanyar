import { useState } from 'react';
import { Globe, DollarSign, Save, RefreshCw, Moon, Sun, Monitor, Check, Sparkles, Languages, ArrowLeftRight } from 'lucide-react';
import { mockLanguages, CurrencyCode, LangCode } from '../data/mockData';
import { useApp, Theme } from '../context/AppContext';
import { useToast } from './Toast';

const LANG_BADGE: Record<string, string> = {
  farsi: 'فا',
  pashto: 'پش',
  english: 'EN',
  dari: 'د',
};

export default function LanguageCurrencyPage() {
  const { language, setLanguage, currency, setCurrency, theme, setTheme, t, currencies, updateExchangeRate } = useApp();
  const { success } = useToast();
  const [languages] = useState(() => mockLanguages.filter((l) => l.is_active));
  const [converterAmount, setConverterAmount] = useState('1000');
  const [converterFrom, setConverterFrom] = useState<CurrencyCode>('AFN');
  const [converterTo, setConverterTo] = useState<CurrencyCode>('USD');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    success(t('settings') || 'تنظیمات', 'نرخ‌ها در state فروشگاه ذخیره شد و با سرور همگام می‌شود.');
    setTimeout(() => setSaved(false), 2200);
  };

  const updateRate = (code: CurrencyCode, rate: string) => {
    if (code === 'AFN') return;
    const n = parseFloat(rate);
    const cur = currencies.find(c => c.code === code)?.exchange_rate ?? 1;
    updateExchangeRate(code, Number.isFinite(n) && n > 0 ? n : cur);
  };

  const getConverted = () => {
    const amount = parseFloat(converterAmount) || 0;
    const fromCurr = currencies.find(c => c.code === converterFrom);
    const toCurr = currencies.find(c => c.code === converterTo);
    if (!fromCurr || !toCurr) return '0';
    const inAFN = amount / fromCurr.exchange_rate;
    return (inAFN * toCurr.exchange_rate).toFixed(2);
  };

  const swapCurrencies = () => {
    const tmp = converterFrom;
    setConverterFrom(converterTo);
    setConverterTo(tmp);
  };

  const themeOptions: { value: Theme; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'light', label: 'روشن', icon: Sun, desc: 'پس‌زمینه روشن؛ مناسب فضای اداری و نور روز' },
    { value: 'deep_blue', label: 'آبی تاریک', icon: Moon, desc: 'سرمه‌ای مایل به آبی با متن روشن (Vazirmatn)؛ کنتراست آرام برای چشم' },
  ];

  return (
    <div className="space-y-8 fade-in max-w-5xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 shadow-2xl">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300/90 text-xs font-medium mb-3">
              <Sparkles size={14} />
              تجربه چندزبانه و چندارزی
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">زبان، ارز و ظاهر</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
              زبان رابط، جهت متن، تم کلی و واحد پول را از یک مرکز مدیریت کنید. تبدیل ارز بر اساس نرخ‌هایی است که اینجا تعریف می‌کنید.
            </p>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-xs shrink-0">
            <Globe size={36} className="text-emerald-500/40" strokeWidth={1.25} />
          </div>
        </div>
      </div>

      {/* Theme */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-600/20 border border-indigo-400/20">
            <Monitor size={22} className="text-indigo-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">تم ظاهری</h2>
            <p className="text-slate-500 text-sm mt-0.5">رنگ‌بندی کلی پنل — بلافاصله اعمال می‌شود</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {themeOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`group relative flex items-center gap-4 p-5 rounded-2xl border text-right transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/[0.08] shadow-lg shadow-emerald-900/20'
                    : 'border-slate-700/80 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'
                }`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>{opt.label}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{opt.desc}</p>
                </div>
                {isSelected && (
                  <div className="absolute top-3 left-3 sm:left-auto sm:right-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/30 to-cyan-600/20 border border-teal-400/20">
            <Languages size={22} className="text-teal-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">زبان رابط کاربری</h2>
            <p className="text-slate-500 text-sm mt-0.5">برچسب‌ها و منوها به زبان انتخابی نمایش داده می‌شوند</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.map(lang => {
            const isSelected = language === lang.code;
            const badge = LANG_BADGE[lang.code] || lang.code.toUpperCase();
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as LangCode)}
                className={`relative flex flex-col items-stretch p-5 rounded-2xl border text-right transition-all duration-200 ${
                  isSelected
                    ? 'border-teal-500/50 bg-gradient-to-br from-teal-500/10 to-cyan-900/10 ring-1 ring-teal-500/20'
                    : 'border-slate-700/80 bg-slate-800/25 hover:border-slate-600 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                    isSelected ? 'bg-teal-500/25 text-teal-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {badge}
                  </span>
                  {isSelected && <Check size={18} className="text-teal-400 shrink-0" />}
                </div>
                <p className={`font-semibold text-base ${isSelected ? 'text-teal-200' : 'text-white'}`}>{lang.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-950/50 text-slate-500 border border-white/5">
                    {lang.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/50 text-slate-500 border border-white/5">
                    {lang.direction === 'rtl' ? 'راست‌به‌چپ' : 'چپ‌به‌راست'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Currency */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 to-emerald-600/20 border border-amber-400/15">
              <DollarSign size={22} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">ارز پیش‌فرض و نرخ‌ها</h2>
              <p className="text-slate-500 text-sm mt-0.5">ارز فعال را انتخاب کنید و نرخ برابری نسبت به افغانی را ویرایش کنید</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              saved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
            }`}
          >
            {saved ? <Check size={17} /> : <Save size={17} />}
            {saved ? 'ذخیره شد' : 'ذخیره نرخ‌ها'}
          </button>
        </div>

        <div className="space-y-3 mb-8">
          {currencies.map(c => (
            <div
              key={c.code}
              role="button"
              tabIndex={0}
              onClick={() => setCurrency(c.code)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrency(c.code); } }}
              className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                currency === c.code
                  ? 'border-emerald-500/45 bg-emerald-500/[0.07] ring-1 ring-emerald-500/15'
                  : 'border-slate-700/70 bg-slate-800/20 hover:border-slate-600'
              }`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                currency === c.code ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }`}>
                {c.symbol}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${currency === c.code ? 'text-emerald-300' : 'text-white'}`}>
                  {c.name}
                  <span className="text-slate-500 font-normal text-sm mr-2">({c.code})</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">۱ {c.code} معادل {c.exchange_rate} افغانی (پایه محاسبه)</p>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <label className="text-slate-500 text-xs whitespace-nowrap">نرخ (؋)</label>
                <input
                  type="number"
                  value={c.exchange_rate}
                  onChange={e => updateRate(c.code, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  step="0.01"
                  disabled={c.code === 'AFN'}
                  className="w-28 sm:w-32 bg-slate-950/60 border border-slate-600/80 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none text-center disabled:opacity-50"
                />
                {currency === c.code && <Check size={18} className="text-emerald-400 shrink-0 hidden sm:block" />}
              </div>
            </div>
          ))}
        </div>

        {/* Converter */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-slate-950/80 to-slate-900/50 p-6 sm:p-7">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2 relative">
            <RefreshCw size={17} className="text-emerald-400" />
            تبدیل سریع ارز
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end relative">
            <div>
              <label className="text-slate-500 text-xs block mb-2">مقدار</label>
              <input
                type="number"
                value={converterAmount}
                onChange={e => setConverterAmount(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={swapCurrencies}
                className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-emerald-400 hover:bg-slate-700 hover:border-emerald-500/40 transition-colors"
                title="جابه‌جایی از و به"
              >
                <ArrowLeftRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:contents gap-3">
              <div>
                <label className="text-slate-500 text-xs block mb-2">از</label>
                <select
                  value={converterFrom}
                  onChange={e => setConverterFrom(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:border-emerald-500 outline-none"
                >
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
              </div>
              <div className="sm:col-start-3">
                <label className="text-slate-500 text-xs block mb-2">به</label>
                <select
                  value={converterTo}
                  onChange={e => setConverterTo(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:border-emerald-500 outline-none"
                >
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 p-5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10">
            <p className="text-slate-500 text-xs mb-1">نتیجه</p>
            <p className="text-white text-xl sm:text-2xl font-bold tracking-tight">
              {parseFloat(converterAmount || '0').toLocaleString()} {converterFrom}
              <span className="text-slate-600 mx-2 sm:mx-3 font-normal">=</span>
              <span className="text-emerald-400">{getConverted()} {converterTo}</span>
            </p>
            <p className="text-slate-600 text-xs mt-2">
              نرخ تقریبی: ۱ {converterFrom} ={' '}
              {(() => {
                const f = currencies.find(c => c.code === converterFrom);
                const t = currencies.find(c => c.code === converterTo);
                if (!f || !t) return '—';
                return ((1 / f.exchange_rate) * t.exchange_rate).toFixed(4);
              })()}{' '}
              {converterTo}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
