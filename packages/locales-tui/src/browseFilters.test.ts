// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { filterBrowseKeys, isUntranslatedValue } from "./browseFilters.js";

describe("isUntranslatedValue", () => {
    it("detects empty strings", () => {
        expect(isUntranslatedValue("")).toBe(true);
        expect(isUntranslatedValue("  ")).toBe(true);
        expect(isUntranslatedValue("x")).toBe(false);
    });
    it("treats sync placeholders as untranslated", () => {
        expect(isUntranslatedValue("*Hello*")).toBe(true);
        expect(isUntranslatedValue("(*) legacy")).toBe(true);
        expect(isUntranslatedValue("Real text")).toBe(false);
    });
    it("detects empty plural shapes", () => {
        expect(isUntranslatedValue({ one: "", other: "" })).toBe(true);
        expect(isUntranslatedValue({ one: "a", other: "" })).toBe(false);
    });
});

describe("filterBrowseKeys", () => {
    const keys = ["a", "b", "hello"];
    const map = {
        a: "",
        b: "done",
        hello: "world",
    };

    it("filters by untranslated only", () => {
        expect(filterBrowseKeys(keys, map, "", true)).toEqual(["a"]);
        const m2 = { ...map, c: "*sync*" };
        expect(filterBrowseKeys([...keys, "c"], m2, "", true)).toEqual(["a", "c"]);
    });

    it("filters by search substring on key or value", () => {
        expect(filterBrowseKeys(keys, map, "ell", false)).toEqual(["hello"]);
        expect(filterBrowseKeys(keys, map, "done", false)).toEqual(["b"]);
        expect(filterBrowseKeys(keys, map, "wor", false)).toEqual(["hello"]);
    });

    it("combines search and untranslated", () => {
        const m = { ...map, hello: "" };
        expect(filterBrowseKeys(keys, m, "hell", true)).toEqual(["hello"]);
    });
});
