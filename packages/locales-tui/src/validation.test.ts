// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { isLocaleKeyWithinMaxLength, isValidLocaleKey, MAX_LOCALE_KEY_LENGTH } from "./validation.js";

describe("isLocaleKeyWithinMaxLength", () => {
    it("allows empty at boundary check (trim handled elsewhere)", () => {
        expect(isLocaleKeyWithinMaxLength("")).toBe(true);
    });
    it("allows key exactly at max length", () => {
        expect(isLocaleKeyWithinMaxLength("a".repeat(MAX_LOCALE_KEY_LENGTH))).toBe(true);
    });
    it("rejects key longer than max", () => {
        expect(isLocaleKeyWithinMaxLength("a".repeat(MAX_LOCALE_KEY_LENGTH + 1))).toBe(false);
    });
});

describe("isValidLocaleKey", () => {
    it("accepts simple keys", () => {
        expect(isValidLocaleKey("hello_world")).toBe(true);
        expect(isValidLocaleKey("Your name is")).toBe(true);
    });
});
