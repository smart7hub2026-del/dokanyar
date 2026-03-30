import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { LangCode, CurrencyCode, translations, mockCurrencies, Currency } from '../data/mockData';
import { useStore } from '../store/useStore';

/** روشن (سفید) | آبی تاریک مایل به سرمه‌ای — تم مشکی خالص حذف شده */
export type Theme = 'light' | 'deep_blue';

interface AppContextType {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  t: (key: string) => string;
  convertPrice: (amount: number, from?: CurrencyCode) => number;
  formatPrice: (amount: number, from?: CurrencyCode) => string;
  currencySymbol: string;
  currencies: Currency[];
  updateExchangeRate: (code: CurrencyCode, rate: number) => void;
  isOnline: boolean;
  isRTL: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const currencyRates = useStore(s => s.currencyRates);
  const setStoreCurrencyRate = useStore(s => s.updateCurrencyRate);

  const currencies = useMemo(
    () =>
      mockCurrencies.map(c =>
        c.code === 'AFN' ? c : { ...c, exchange_rate: currencyRates[c.code] ?? c.exchange_rate }
      ),
    [currencyRates]
  );

  const updateExchangeRate = useCallback(
    (code: CurrencyCode, rate: number) => {
      if (code === 'AFN') return;
      if (!Number.isFinite(rate) || rate <= 0) return;
      setStoreCurrencyRate(code, rate);
    },
    [setStoreCurrencyRate]
  );

  const [language, setLanguageState] = useState<LangCode>(() => {
    const raw = localStorage.getItem('crm_language') as LangCode | null;
    if (raw === 'dari' || !raw) return 'farsi';
    const ui: LangCode[] = ['pashto', 'farsi', 'english'];
    return ui.includes(raw) ? raw : 'farsi';
  });
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('crm_currency') as CurrencyCode) || 'AFN';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const raw = localStorage.getItem('crm_theme');
    if (raw === 'light') return 'light';
    if (raw === 'deep_blue') return 'deep_blue';
    if (raw === 'dark') return 'deep_blue';
    return 'light';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const raw = localStorage.getItem('crm_language');
    if (raw === 'dari' || !raw) {
      localStorage.setItem('crm_language', 'farsi');
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('deep-blue-theme', theme === 'deep_blue');
  }, [theme]);

  // Apply direction on mount
  useEffect(() => {
    const dir = language === 'english' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.body.style.direction = dir;
  }, [language]);

  const setLanguage = (lang: LangCode) => {
    const effective: LangCode = lang === 'dari' ? 'farsi' : lang;
    const ui: LangCode[] = ['pashto', 'farsi', 'english'];
    if (!ui.includes(effective)) return;
    setLanguageState(effective);
    localStorage.setItem('crm_language', effective);
    const dir = effective === 'english' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.body.style.direction = dir;
  };

  const setCurrency = (curr: CurrencyCode) => {
    setCurrencyState(curr);
    localStorage.setItem('crm_currency', curr);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('crm_theme', t);
  };

  const t = (key: string): string => {
    const chain: LangCode[] =
      language === 'pashto'
        ? ['pashto', 'farsi', 'english', 'dari']
        : language === 'farsi'
          ? ['farsi', 'dari', 'pashto', 'english']
          : language === 'dari'
            ? ['dari', 'farsi', 'pashto', 'english']
            : ['english', 'farsi', 'pashto', 'dari'];
    for (const lang of chain) {
      const v = translations[lang]?.[key];
      if (v != null && String(v).trim() !== '') return v;
    }
    return key;
  };

  const currentCurrencyData = currencies.find(c => c.code === currency);
  const currencySymbol = currentCurrencyData?.symbol || '؋';

  const convertPrice = (amount: number, from: CurrencyCode = 'AFN'): number => {
    if (from === currency) return amount;
    const fromCurr = currencies.find(c => c.code === from);
    const toCurr = currencies.find(c => c.code === currency);
    if (!fromCurr || !toCurr) return amount;
    const inAFN = amount / fromCurr.exchange_rate;
    return inAFN * toCurr.exchange_rate;
  };

  const formatPrice = (amount: number, from: CurrencyCode = 'AFN'): string => {
    const converted = convertPrice(amount, from);
    return `${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const isRTL = language !== 'english';
  const isDark = theme === 'deep_blue';

  return (
    <AppContext.Provider value={{
      language, setLanguage,
      currency, setCurrency,
      t, convertPrice, formatPrice, currencySymbol,
      currencies,
      updateExchangeRate,
      isOnline,
      isRTL,
      theme, setTheme,
      isDark,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
