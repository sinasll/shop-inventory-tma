import { DEFAULT_LOCALE, type Locale } from '../types/index.js';
import { english } from './dictionaries/english.js';
import { arabic } from './dictionaries/arabic.js';
import { sorani } from './dictionaries/sorani.js';
import { badini } from './dictionaries/badini.js';
import type { InterpolationParams, TranslationDict, TranslationKey } from './keys.js';

export type { TranslationDict, TranslationKey, InterpolationParams };

/**
 * Registry of all locales. Adding a language = add it here + to LOCALES.
 * Every dictionary is type-checked against the English key contract.
 */
export const dictionaries: Record<Locale, TranslationDict> = {
  english,
  arabic,
  sorani,
  badini,
};

/**
 * Pure translation function used on BOTH the client and the server
 * (the notification engine reuses it to build localized messages).
 *
 * - Falls back to English, then to the raw key, so it never throws.
 * - Interpolates {placeholder} tokens from `params`.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: InterpolationParams,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const template = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? (key as string);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
}

/** Build a translator bound to a single locale. */
export function createTranslator(locale: Locale) {
  return (key: TranslationKey, params?: InterpolationParams) => translate(locale, key, params);
}
