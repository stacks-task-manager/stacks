// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * New-password policy (S14): pure bounds over synthetic candidates.
 */
import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_BYTES, MIN_NEW_PASSWORD_CHARACTERS, isAcceptableNewPassword } from "../passwordPolicy";

describe("new password policy", () => {
    it("accepts a twelve-character candidate", () => {
        expect(isAcceptableNewPassword("a".repeat(MIN_NEW_PASSWORD_CHARACTERS))).toBe(true);
    });

    it("rejects a candidate one character short", () => {
        expect(isAcceptableNewPassword("a".repeat(MIN_NEW_PASSWORD_CHARACTERS - 1))).toBe(false);
        expect(isAcceptableNewPassword("")).toBe(false);
    });

    it("measures the byte limit in UTF-8 bytes, not characters", () => {
        const accent = "\u00e9";
        const atLimit = accent.repeat(MAX_PASSWORD_BYTES / 2);
        const overLimit = atLimit + accent;
        expect(Buffer.byteLength(atLimit, "utf8")).toBe(MAX_PASSWORD_BYTES);
        expect(isAcceptableNewPassword(atLimit)).toBe(true);
        expect(Buffer.byteLength(overLimit, "utf8")).toBeGreaterThan(MAX_PASSWORD_BYTES);
        expect(isAcceptableNewPassword(overLimit)).toBe(false);
    });

    it("counts astral characters as one character each", () => {
        const emoji = "\u{1f600}";
        const atLimit = emoji.repeat(MIN_NEW_PASSWORD_CHARACTERS);
        expect([...atLimit].length).toBe(MIN_NEW_PASSWORD_CHARACTERS);
        expect(Buffer.byteLength(atLimit, "utf8")).toBeLessThanOrEqual(MAX_PASSWORD_BYTES);
        expect(isAcceptableNewPassword(atLimit)).toBe(true);
        expect(isAcceptableNewPassword(emoji.repeat(MIN_NEW_PASSWORD_CHARACTERS - 1))).toBe(false);
    });

    it("never truncates an over-length candidate into an accepted one", () => {
        const long = "a".repeat(MAX_PASSWORD_BYTES + 1);
        expect(isAcceptableNewPassword(long)).toBe(false);
        expect(isAcceptableNewPassword(long.slice(0, MAX_PASSWORD_BYTES))).toBe(true);
    });
});
