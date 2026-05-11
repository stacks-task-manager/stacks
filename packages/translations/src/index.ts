// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Runtime i18n: `setTranslations` + `translate`, `%{name}` interpolation, plural objects.
 */
export {
  setTranslations,
  translate,
  getLocale,
  getTranslations,
  registerTranslationContext,
  isValidTranslationKey,
} from "./translate.js";
export type {
  TranslationValue,
  SetTranslationsOptions,
  ActiveTranslationContext,
} from "./translate.js";
export type { PluralForms, PluralCategory } from "./plural.js";
