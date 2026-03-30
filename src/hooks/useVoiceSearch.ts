import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { LangCode } from '../data/mockData';

declare global {
  interface Window {
    SpeechRecognition: new () => AnyRecognition;
    webkitSpeechRecognition: new () => AnyRecognition;
  }
}

type AnyRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type VoiceSttPreference = 'app' | 'multi' | 'dari' | 'farsi' | 'pashto' | 'english';

/** زنجیره BCP-47 برای تشخیص: دری، فارسی، پشتو، انگلیسی */
export function speechLocalesForPreference(pref: VoiceSttPreference, appLang: LangCode): string[] {
  const multi = ['fa-AF', 'fa-IR', 'ps-AF', 'en-US', 'en-GB'] as const;
  const appChains: Record<LangCode, string[]> = {
    dari: ['fa-AF', 'fa-IR', 'ps-AF', 'en-US'],
    farsi: ['fa-IR', 'fa-AF', 'ps-AF', 'en-US'],
    pashto: ['ps-AF', 'fa-IR', 'fa-AF', 'en-US'],
    english: ['en-US', 'en-GB', 'fa-IR', 'ps-AF'],
  };
  const byPref: Record<VoiceSttPreference, string[]> = {
    multi: [...multi],
    dari: ['fa-AF', 'fa-IR', 'en-US', 'ps-AF'],
    farsi: ['fa-IR', 'fa-AF', 'en-US', 'ps-AF'],
    pashto: ['ps-AF', 'ps', 'fa-IR', 'en-US'],
    english: ['en-US', 'en-GB', 'fa-IR'],
    app: appChains[appLang] ?? appChains.dari,
  };
  return [...new Set(byPref[pref])];
}

export type UseVoiceSearchOptions = {
  /** اگر ست شود از زبان رابط عبور می‌کند */
  locales?: string[];
  sttPreference?: VoiceSttPreference;
  onError?: (code: string, message: string) => void;
};

export function useVoiceSearch(onResult: (text: string) => void, options?: UseVoiceSearchOptions) {
  const { language } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<AnyRecognition | null>(null);
  const locales = useMemo(() => {
    if (options?.locales?.length) return options.locales;
    return speechLocalesForPreference(options?.sttPreference ?? 'app', language);
  }, [options?.locales, options?.sttPreference, language]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    try {
      r?.stop();
    } catch {
      /* ignore */
    }
    try {
      r?.abort();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!supported) {
      options?.onError?.('unsupported', 'مرورگر از تشخیص گفتار پشتیبانی نمی‌کند (Chrome/Edge پیشنهادی).');
      return;
    }

    stopListening();

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    /** موبایل و iPad: بدون فعال‌سازی میکروفن (getUserMedia) گاهی Web Speech API شروع نمی‌شود */
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        (navigator.maxTouchPoints ?? 0) > 1);
    const likelyMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || isIOS;
    if (likelyMobile && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        stream.getTracks().forEach(track => track.stop());
      } catch {
        /* بدون میکروفن باز هم ممکن است Web Speech API کار کند */
      }
    }

    const tryLocale = (idx: number) => {
      if (idx >= locales.length) {
        setIsListening(false);
        options?.onError?.('locale', 'هیچ‌کدام از زبان‌های انتخاب‌شده روی این مرورگر فعال نشد.');
        return;
      }

      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = locales[idx];
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) onResult(transcript);
      };

      recognition.onerror = event => {
        const err = event.error;
        if (err === 'aborted' || err === 'not-allowed') {
          setIsListening(false);
          recognitionRef.current = null;
          if (err === 'not-allowed') {
            options?.onError?.(err, 'اجازه میکروفن داده نشد.');
          }
          return;
        }
        if (err === 'language-not-supported') {
          try {
            recognition.abort();
          } catch {
            /* ignore */
          }
          recognitionRef.current = null;
          tryLocale(idx + 1);
          return;
        }
        if (err === 'no-speech') {
          setIsListening(false);
          recognitionRef.current = null;
          options?.onError?.(err, 'صدایی شنیده نشد؛ دوباره امتحان کنید.');
          return;
        }
        setIsListening(false);
        recognitionRef.current = null;
        options?.onError?.(err, `خطای تشخیص گفتار: ${err}`);
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (e) {
        console.error(e);
        tryLocale(idx + 1);
      }
    };

    tryLocale(0);
  }, [supported, onResult, locales, options?.onError, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    supported,
    locales,
  };
}
