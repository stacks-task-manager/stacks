// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import {
    addLanguageFile,
    deleteKeyAcrossLocales,
    enJsonPath,
    readLocaleJson,
    renameKeyAcrossLocales,
    syncMissingKeysFromEn,
} from "./localeOps.js";

const tmp = join(dirname(fileURLToPath(import.meta.url)), "__tmp_locale__");

afterEach(() => {
    try {
        rmSync(tmp, { recursive: true });
    } catch {
        /* ignore */
    }
});

describe("syncMissingKeysFromEn", () => {
    it("fills missing keys with prefixed English without overwriting non-empty", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(
            join(tmp, "en.json"),
            JSON.stringify({ A: "a", B: "b" }, null, 2),
            "utf8",
        );
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ A: "de-a" }, null, 2), "utf8");

        const { results, errors } = syncMissingKeysFromEn(tmp);
        expect(errors.length).toBe(0);
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.A).toBe("de-a");
        expect(de.B).toBe("*b*");
    });

    it("fills empty string keys with prefixed English", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ greet: "Hey how are you" }, null, 2), "utf8");
        writeFileSync(join(tmp, "it.json"), JSON.stringify({ greet: "" }, null, 2), "utf8");

        const { errors } = syncMissingKeysFromEn(tmp);
        expect(errors.length).toBe(0);
        const it = readLocaleJson(join(tmp, "it.json"))!;
        expect(it.greet).toBe("*Hey how are you*");
    });

    it("overwrites *…* placeholders when English source text changes", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ x: "New English" }, null, 2), "utf8");
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ x: "*Old English*" }, null, 2), "utf8");

        const { errors } = syncMissingKeysFromEn(tmp);
        expect(errors.length).toBe(0);
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.x).toBe("*New English*");
    });

    it("still overwrites legacy (*) placeholders on sync", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ x: "Updated" }, null, 2), "utf8");
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ x: "(*) Old" }, null, 2), "utf8");

        syncMissingKeysFromEn(tmp);
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.x).toBe("*Updated*");
    });

    it("does not overwrite real translations", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ x: "English" }, null, 2), "utf8");
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ x: "Echt Deutsch" }, null, 2), "utf8");

        syncMissingKeysFromEn(tmp);
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.x).toBe("Echt Deutsch");
    });
});

describe("addLanguageFile", () => {
    it("creates empty values from English keys", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ X: "x", Y: "y" }, null, 2), "utf8");

        const r = addLanguageFile(tmp, "fr");
        expect("path" in r).toBe(true);
        const fr = readLocaleJson(join(tmp, "fr.json"))!;
        expect(fr.X).toBe("");
        expect(fr.Y).toBe("");
    });
});

describe("renameKeyAcrossLocales", () => {
    it("renames key in en and locale files", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ Old: "v" }, null, 2), "utf8");
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ Old: "alt" }, null, 2), "utf8");

        const { warnings } = renameKeyAcrossLocales(tmp, "Old", "New", "v");
        expect(warnings.length).toBe(0);
        const en = readLocaleJson(enJsonPath(tmp))!;
        expect(en.New).toBe("v");
        expect(en.Old).toBeUndefined();
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.New).toBe("alt");
        expect(de.Old).toBeUndefined();
    });
});

describe("deleteKeyAcrossLocales", () => {
    it("removes key from en and other locale files", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ Keep: "k", Drop: "d" }, null, 2), "utf8");
        writeFileSync(join(tmp, "de.json"), JSON.stringify({ Keep: "k", Drop: "d-de" }, null, 2), "utf8");

        const { removedFromOtherLocaleFiles } = deleteKeyAcrossLocales(tmp, "Drop");
        expect(removedFromOtherLocaleFiles).toBe(1);

        const en = readLocaleJson(enJsonPath(tmp))!;
        expect(en.Keep).toBe("k");
        expect(en.Drop).toBeUndefined();
        const de = readLocaleJson(join(tmp, "de.json"))!;
        expect(de.Keep).toBe("k");
        expect(de.Drop).toBeUndefined();
    });

    it("throws if key missing in English", () => {
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, "en.json"), JSON.stringify({ A: "a" }, null, 2), "utf8");
        expect(() => deleteKeyAcrossLocales(tmp, "Missing")).toThrow(/Missing key in English/);
    });
});
