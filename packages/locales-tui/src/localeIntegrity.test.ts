// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL-3.0-only. See LICENSE.
import { mkdirSync, rmSync, writeFileSync } from "fs";
import type { TranslationValue } from "@stacks/translations";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { describe, expect, it, afterEach } from "vitest";
import {
    findDuplicateValues,
    findKeyMismatches,
    findNearDuplicates,
    checkLocaleIntegrity,
    type DuplicateValueEntry,
} from "./localeIntegrity.js";
import { listLocaleJsonFiles, readLocaleJson, enJsonPath, stringifyLocaleFile } from "./localeOps.js";
import { sectionLocalesAbsPath, TRANSLATION_SECTIONS } from "./sections.js";
import { repoRootFromModuleUrl } from "./repoRoot.js";

const tmpDir = join(dirname(fileURLToPath(import.meta.url)), "__tmp_integrity__");

function setupTempDir(): string {
    try { rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
    mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
}

afterEach(() => {
    try { rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
});

// ─── findDuplicateValues ───────────────────────────────────────────────

describe("findDuplicateValues", () => {
    it("returns empty for locale with all unique values", () => {
        const data = { "Hello": "Hello", "World": "World", "Foo": "Bar" };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toEqual([]);
    });

    it("detects duplicate string values", () => {
        const data = { "Hello": "Hola", "Greetings": "Hola" };
        const result = findDuplicateValues("es", "/es.json", data);
        expect(result).toHaveLength(1);
        expect(result[0]!.value).toBe("Hola");
        expect(result[0]!.keys).toEqual(["Hello", "Greetings"]);
    });

    it("detects duplicate plural forms", () => {
        const data = {
            "One item": { one: "% item", other: "% items" },
            "Single item": { one: "% item", other: "% items" },
        };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toHaveLength(1);
        expect(result[0]!.keys).toEqual(["One item", "Single item"]);
    });

    it("groups three or more keys with the same value", () => {
        const data = { "A": "Same", "B": "Same", "C": "Same" };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toHaveLength(1);
        expect(result[0]!.keys).toEqual(["A", "B", "C"]);
    });

    it("does not flag identical keys (single key)", () => {
        const data = { "Hello": "Hola" };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toEqual([]);
    });

    it("handles mixed string and plural forms correctly", () => {
        const data = {
            "Hello": "Hola",
            "One item": { one: "% item", other: "% items" },
        };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toEqual([]);
    });

    it("handles empty string duplicates", () => {
        const data = { "Hello": "", "World": "" };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toHaveLength(1);
        expect(result[0]!.value).toBe("");
    });

    it("handles empty plural form duplicates", () => {
        const data = {
            "One item": { one: "", other: "" },
            "Single item": { one: "", other: "" },
        };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toHaveLength(1);
    });

    it("finds multiple distinct duplicate groups", () => {
        const data = {
            "A": "X", "B": "X",
            "C": "Y", "D": "Y",
            "E": "Z",
        };
        const result = findDuplicateValues("en", "/en.json", data);
        expect(result).toHaveLength(2);
        const values = result.map(r => r.value);
        expect(values).toContain("X");
        expect(values).toContain("Y");
    });
});

// ─── findKeyMismatches ─────────────────────────────────────────────────

describe("findKeyMismatches", () => {
    it("returns empty when all locale files have matching keys", () => {
        const dir = setupTempDir();
        const en = { "Hello": "Hello", "World": "World" };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const es = { "Hello": "Hola", "World": "Mundo" };
        writeFileSync(join(dir, "es.json"), stringifyLocaleFile(es));
        const result = findKeyMismatches(dir);
        expect(result).toEqual([]);
    });

    it("detects missing keys in a locale file", () => {
        const dir = setupTempDir();
        const en = { "Hello": "Hello", "World": "World", "Foo": "Foo" };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const es = { "Hello": "Hola", "World": "Mundo" };
        writeFileSync(join(dir, "es.json"), stringifyLocaleFile(es));
        const result = findKeyMismatches(dir);
        expect(result).toHaveLength(1);
        expect(result[0]!.localeId).toBe("es");
        expect(result[0]!.missingKeys).toContain("Foo");
        expect(result[0]!.extraKeys).toEqual([]);
    });

    it("detects extra keys in a locale file", () => {
        const dir = setupTempDir();
        const en = { "Hello": "Hello" };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const es = { "Hello": "Hola", "Extra": "Extra" };
        writeFileSync(join(dir, "es.json"), stringifyLocaleFile(es));
        const result = findKeyMismatches(dir);
        expect(result).toHaveLength(1);
        expect(result[0]!.extraKeys).toContain("Extra");
    });

    it("detects both missing and extra keys", () => {
        const dir = setupTempDir();
        const en = { "A": "A", "B": "B" };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const es = { "A": "A", "C": "C" };
        writeFileSync(join(dir, "es.json"), stringifyLocaleFile(es));
        const result = findKeyMismatches(dir);
        expect(result).toHaveLength(1);
        expect(result[0]!.missingKeys).toContain("B");
        expect(result[0]!.extraKeys).toContain("C");
    });

    it("skips en.json itself", () => {
        const dir = setupTempDir();
        const en = { "A": "A" };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const result = findKeyMismatches(dir);
        expect(result).toEqual([]);
    });

    it("handles plural form values", () => {
        const dir = setupTempDir();
        const en = {
            "Item": { one: "% item", other: "% items" },
            "Other": "Other",
        };
        writeFileSync(enJsonPath(dir), stringifyLocaleFile(en));
        const es = {
            "Item": { one: "% artículo", other: "% artículos" },
            "Other": "Otro",
        };
        writeFileSync(join(dir, "es.json"), stringifyLocaleFile(es));
        const result = findKeyMismatches(dir);
        expect(result).toEqual([]);
    });
});

// ─── findNearDuplicates ────────────────────────────────────────────────

describe("findNearDuplicates", () => {
    it("returns empty for dissimilar values", () => {
        const data = { "Hello": "Hola", "World": "Mundo", "Foo": "Bar" };
        const result = findNearDuplicates("en", "/en.json", data, 85);
        expect(result).toEqual([]);
    });

    it("detects exact duplicate values", () => {
        const data = { "Hello": "Hello", "Greetings": "Hello" };
        const result = findNearDuplicates("en", "/en.json", data, 85);
        // Both directions: Hello finds Greetings and Greetings finds Hello
        expect(result).toHaveLength(2);
        expect(result[0]!.similarEntries).toHaveLength(1);
    });

    it("respects the threshold", () => {
        const data = { "A": "Hello", "B": "Helo" };
        // "Hello" vs "Helo": levenshtein=1, maxLen=5, similarity = round(100*(1-1/5)) = 80
        const resultHigh = findNearDuplicates("en", "/en.json", data, 85);
        expect(resultHigh).toEqual([]);
        const resultLow = findNearDuplicates("en", "/en.json", data, 70);
        // Both directions: A finds B and B finds A, so 2 entries
        expect(resultLow).toHaveLength(2);
    });

    it("handles plural forms compared as JSON strings", () => {
        const data = {
            "One": { one: "%", other: "%" },
            "Two": { one: "%", other: "%" },
        };
        const result = findNearDuplicates("en", "/en.json", data, 85);
        // Both directions: One finds Two and Two finds One
        expect(result).toHaveLength(2);
    });

    it("does not match a key against itself", () => {
        const data = { "Hello": "Hello" };
        const result = findNearDuplicates("en", "/en.json", data, 85);
        expect(result).toEqual([]);
    });

    it("reports similarity percentage", () => {
        const data = { "A": "Hello", "B": "Hello" };
        const result = findNearDuplicates("en", "/en.json", data, 85);
        // Both directions: A finds B and B finds A
        expect(result).toHaveLength(2);
        expect(result[0]!.similarEntries[0]!.similarity).toBe(100);
    });
});

// ─── Integration tests against real locale files ───────────────────────

const repoRoot = repoRootFromModuleUrl(import.meta.url);

function isValidTranslationValue(v: unknown): boolean {
    if (typeof v === "string") return true;
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    return Object.values(v as Record<string, unknown>).every(x => typeof x === "string");
}

function assertLocaleFileValid(path: string): void {
    const data = readLocaleJson(path) as unknown;
    expect(data).not.toBeNull();
    expect(typeof data).toBe("object");
    expect(Array.isArray(data)).toBe(false);

    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        expect(typeof k).toBe("string");
        expect(isValidTranslationValue(v)).toBe(true);
    }
}

function readSectionLocales(sectionId: string): {
    section: typeof TRANSLATION_SECTIONS[number];
    locales: { id: string; path: string; data: Record<string, unknown> }[];
} {
    const section = TRANSLATION_SECTIONS.find(s => s.id === sectionId);
    if (!section) throw new Error(`Unknown section: ${sectionId}`);
    const localesDir = sectionLocalesAbsPath(repoRoot, section);
    const enData = readLocaleJson(enJsonPath(localesDir));
    if (!enData) throw new Error(`Could not read en.json for ${sectionId}`);

    const locales: { id: string; path: string; data: Record<string, unknown> }[] = [];
    const files = ["en", "ar", "de", "es", "fi", "fr", "hi", "hu", "id", "it", "ja", "ko", "nl", "pl", "pt", "ro", "ru", "sv", "uk", "zh"];
    for (const id of files) {
        const path = join(localesDir, `${id}.json`);
        const data = readLocaleJson(path);
        if (data) {
            locales.push({ id, path, data });
        }
    }
    return { section, locales };
}

// ─── server section ────────────────────────────────────────────────────

describe("server section — integration", () => {
    const { section, locales } = readSectionLocales("server");

    it("parses all locale JSON files and validates translation value shapes", () => {
        const localesDir = sectionLocalesAbsPath(repoRoot, section);
        const files = listLocaleJsonFiles(localesDir);
        expect(files.length).toBeGreaterThan(0);
        for (const p of files) assertLocaleFileValid(p);
    });

    it("finds key mismatches with correct shape", () => {
        const mismatches = findKeyMismatches(sectionLocalesAbsPath(repoRoot, section));
        // Each entry has the expected fields
        for (const m of mismatches) {
            expect(m).toHaveProperty("localeId");
            expect(m).toHaveProperty("filePath");
            expect(m).toHaveProperty("missingKeys");
            expect(m).toHaveProperty("extraKeys");
            expect(Array.isArray(m.missingKeys)).toBe(true);
            expect(Array.isArray(m.extraKeys)).toBe(true);
        }
    });

    it("finds duplicate values with correct shape", () => {
        const allDuplicates: DuplicateValueEntry[] = [];
        for (const { id, path, data } of locales) {
            allDuplicates.push(...findDuplicateValues(id, path, data as Record<string, TranslationValue>));
        }
        // Each entry has the expected fields
        for (const d of allDuplicates) {
            expect(d).toHaveProperty("localeId");
            expect(d).toHaveProperty("filePath");
            expect(d).toHaveProperty("value");
            expect(d).toHaveProperty("keys");
            expect(Array.isArray(d.keys)).toBe(true);
            expect(d.keys.length).toBeGreaterThan(1);
        }
    });
});

// ─── app section ───────────────────────────────────────────────────────

describe("app section — integration", () => {
    const { section, locales } = readSectionLocales("app");

    it("parses all locale JSON files and validates translation value shapes", () => {
        const localesDir = sectionLocalesAbsPath(repoRoot, section);
        const files = listLocaleJsonFiles(localesDir);
        expect(files.length).toBeGreaterThan(0);
        for (const p of files) assertLocaleFileValid(p);
    });

    it("finds key mismatches with correct shape", () => {
        const mismatches = findKeyMismatches(sectionLocalesAbsPath(repoRoot, section));
        for (const m of mismatches) {
            expect(m).toHaveProperty("localeId");
            expect(m).toHaveProperty("filePath");
            expect(m).toHaveProperty("missingKeys");
            expect(m).toHaveProperty("extraKeys");
            expect(Array.isArray(m.missingKeys)).toBe(true);
            expect(Array.isArray(m.extraKeys)).toBe(true);
        }
    });

    it("finds duplicate values with correct shape", () => {
        const allDuplicates: DuplicateValueEntry[] = [];
        for (const { id, path, data } of locales) {
            allDuplicates.push(...findDuplicateValues(id, path, data as Record<string, TranslationValue>));
        }
        for (const d of allDuplicates) {
            expect(d).toHaveProperty("localeId");
            expect(d).toHaveProperty("filePath");
            expect(d).toHaveProperty("value");
            expect(d).toHaveProperty("keys");
            expect(Array.isArray(d.keys)).toBe(true);
            expect(d.keys.length).toBeGreaterThan(1);
        }
    });
});

// ─── checkLocaleIntegrity ──────────────────────────────────────────────

describe("checkLocaleIntegrity", () => {
    it("returns correct sectionId", () => {
        for (const section of TRANSLATION_SECTIONS) {
            const report = checkLocaleIntegrity(section, sectionLocalesAbsPath(repoRoot, section));
            expect(report.sectionId).toBe(section.id);
        }
    }, 30000);

    it("returns a report with all three fields", () => {
        for (const section of TRANSLATION_SECTIONS) {
            const report = checkLocaleIntegrity(section, sectionLocalesAbsPath(repoRoot, section));
            expect(report).toHaveProperty("sectionId");
            expect(report).toHaveProperty("duplicateValues");
            expect(report).toHaveProperty("keyMismatches");
            expect(report).toHaveProperty("nearDuplicates");
            expect(Array.isArray(report.duplicateValues)).toBe(true);
            expect(Array.isArray(report.keyMismatches)).toBe(true);
            expect(Array.isArray(report.nearDuplicates)).toBe(true);
        }
    }, 30000);
});
