/**
 * Canonical translation key contract.
 *
 * Every translatable string in the entire system (UI + backend
 * notifications) is declared here. Each language dictionary must
 * satisfy `TranslationDict`, so a missing key is a TYPE ERROR — this
 * guarantees no string is ever left untranslated.
 *
 * To add a new language: create a dictionary implementing
 * `TranslationDict`, register it in `index.ts`, and add the locale to
 * `LOCALES` in `types`. Nothing else needs to change.
 */
import { english } from './dictionaries/english.js';

/**
 * The English dictionary is the source of truth for the SET of keys, but
 * we widen the value type to `string`. Otherwise `as const` would make
 * every value a string literal and force other languages to be identical
 * to English — defeating the purpose of localization.
 */
export type TranslationKey = keyof typeof english;
export type TranslationDict = Record<TranslationKey, string>;

/** Keys whose values accept interpolation params (documented for clarity). */
export type InterpolationParams = Record<string, string | number>;
