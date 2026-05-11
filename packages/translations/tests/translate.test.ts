// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AsyncLocalStorage } from "async_hooks";
import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import {
  setTranslations,
  translate,
  getLocale,
  registerTranslationContext,
  type TranslationValue,
} from "../src/translate.js";

const testScope = new AsyncLocalStorage<{
  locale: string;
  translations: Record<string, TranslationValue>;
}>();

function withScopedContext<T>(
  locale: string,
  map: Record<string, TranslationValue>,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return testScope.run({ locale, translations: map }, fn);
}

beforeAll(() => {
  registerTranslationContext(() => testScope.getStore());
});

describe("translate", () => {
  beforeEach(() => {
    setTranslations({}, { locale: "en" });
  });

  it("returns UPPERCASE key when missing", () => {
    setTranslations({ hello: "Hi %{name}" });
    expect(translate("missing_key")).toBe("MISSING_KEY");
    expect(translate("other")).toBe("OTHER");
  });

  it("interpolates %{name}", () => {
    setTranslations({ greeting: "Hello %{name}" });
    expect(translate("greeting", { name: "Ada" })).toBe("Hello Ada");
  });

  it("uses empty string for missing param", () => {
    setTranslations({ a: "x%{y}z" });
    expect(translate("a", {})).toBe("xz");
  });

  it("warns and returns marker for invalid lookup key", () => {
    setTranslations({ ok: "x" });
    expect(translate("bad-key")).toBe("❌ BAD-KEY");
  });

  it("warns on invalid keys in setTranslations but still applies map", () => {
    setTranslations({ "bad.key": "x" });
    expect(translate("bad.key")).toBe("❌ BAD.KEY");
  });

  it("accepts valid keys with digits and underscore", () => {
    setTranslations({ key_1: "v%{n}" });
    expect(translate("key_1", { n: 2 })).toBe("v2");
  });

  it("accepts sentence-style keys with spaces", () => {
    setTranslations({ "Your name is": "Your name is: %{name}" });
    expect(translate("Your name is", { name: "Ada" })).toBe("Your name is: Ada");
  });

  it("warns on keys with leading or trailing spaces", () => {
    setTranslations({ " nope": "x" });
    expect(translate(" nope")).toBe("❌  NOPE");
    setTranslations({ "nope ": "x" });
    expect(translate("nope ")).toBe("❌ NOPE ");
  });
});

describe("plurals", () => {
  beforeEach(() => {
    setTranslations(
      {
        item_count: {
          zero: "No items",
          one: "One item",
          other: "%{count} items",
        },
      },
      { locale: "en" },
    );
  });

  it("selects one/other for English", () => {
    expect(translate("item_count", { count: 1 })).toBe("One item");
    expect(translate("item_count", { count: 5 })).toBe("5 items");
    expect(translate("item_count", { count: 0 })).toBe("No items");
  });

  it("uses locale from setTranslations", () => {
    expect(getLocale()).toBe("en");
  });
});

describe("plurals (Arabic locale, six categories)", () => {
  const pluralForms = {
    zero: "zero",
    one: "singular",
    two: "two",
    few: "few",
    many: "many",
    other: "other",
  };

  beforeEach(() => {
    setTranslations({ key: pluralForms }, { locale: "ar" });
  });

  it("maps counts to Intl.PluralRules(ar) categories", () => {
    expect(translate("key", { count: 0 })).toBe("zero");
    expect(translate("key", { count: 1 })).toBe("singular");
    expect(translate("key", { count: 2 })).toBe("two");
    expect(translate("key", { count: 3 })).toBe("few");
    expect(translate("key", { count: 4 })).toBe("few");
    expect(translate("key", { count: 5 })).toBe("few");
    expect(translate("key", { count: 11 })).toBe("many");
    expect(translate("key", { count: 99 })).toBe("many");
    expect(translate("key", { count: 100 })).toBe("other");
  });
});

describe("memoization", () => {
  it("returns same string for repeated t with same args", () => {
    setTranslations({ a: "n%{x}" });
    const s1 = translate("a", { x: 1 });
    const s2 = translate("a", { x: 1 });
    expect(s1).toBe("n1");
    expect(s2).toBe(s1);
  });
});

describe("scoped context (AsyncLocalStorage, same pattern as the server)", () => {
  beforeEach(() => {
    setTranslations({ g: "global" }, { locale: "en" });
  });

  it("uses scoped map inside run, global outside", () => {
    expect(translate("g")).toBe("global");
    withScopedContext("fr", { g: "demande" }, () => {
      expect(getLocale()).toBe("fr");
      expect(translate("g")).toBe("demande");
    });
    expect(getLocale()).toBe("en");
    expect(translate("g")).toBe("global");
  });

  it("nested runs restore outer scope", () => {
    withScopedContext("de", { g: "de" }, () => {
      expect(translate("g")).toBe("de");
      withScopedContext("fr", { g: "fr" }, () => {
        expect(translate("g")).toBe("fr");
      });
      expect(translate("g")).toBe("de");
    });
  });

  it("concurrent async chains stay isolated", async () => {
    const results: string[] = [];
    await Promise.all([
      Promise.resolve(
        withScopedContext("a", { g: "A" }, async () => {
          await new Promise(r => setTimeout(r, 5));
          results.push(translate("g"));
        }),
      ),
      Promise.resolve(
        withScopedContext("b", { g: "B" }, async () => {
          await new Promise(r => setTimeout(r, 1));
          results.push(translate("g"));
        }),
      ),
    ]);
    expect(results.sort()).toEqual(["A", "B"]);
  });
});
