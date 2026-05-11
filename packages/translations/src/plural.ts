// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Plural category strings supported by Intl.PluralRules */
export type PluralCategory =
  | "zero"
  | "one"
  | "two"
  | "few"
  | "many"
  | "other";

export type PluralForms = Record<string, string>;

export function pickPluralTemplate(
  forms: PluralForms,
  count: number,
  locale: string,
): string {
  // Many locales (e.g. en) classify 0 as "other"; optional `zero` handles "No items" style copy.
  if (count === 0 && forms.zero !== undefined) return forms.zero;

  const rules = new Intl.PluralRules(locale);
  const category = rules.select(count) as PluralCategory;
  if (forms[category] !== undefined) return forms[category];
  if (forms.other !== undefined) return forms.other;
  const first = Object.values(forms)[0];
  return first ?? "";
}
