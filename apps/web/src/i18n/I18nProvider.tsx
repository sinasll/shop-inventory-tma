import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_LOCALE,
  createTranslator,
  isRtl,
  type InterpolationParams,
  type Locale,
  type TranslationKey,
} from '@inv/shared';
import { useAuthStore } from '@/store/auth.js';

interface I18nContextValue {
  locale: Locale;
  rtl: boolean;
  t: (key: TranslationKey, params?: InterpolationParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Locale is derived from the authenticated profile (stored server-side).
 * Changing the language updates the profile, which re-renders this
 * provider instantly — no reload required.
 */
export function I18nProvider({ children }: PropsWithChildren) {
  const locale = useAuthStore((s) => s.profile?.locale ?? DEFAULT_LOCALE);

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale);
    return { locale, rtl: isRtl(locale), t };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
