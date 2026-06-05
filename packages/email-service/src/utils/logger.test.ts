// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect } from "vitest";
import { LEVELS, resolveLevel } from "./logger";

describe("logger", () => {
    describe("LEVELS", () => {
        it("has correct numeric ordering", () => {
            expect(LEVELS.debug).toBeLessThan(LEVELS.info);
            expect(LEVELS.info).toBeLessThan(LEVELS.warn);
            expect(LEVELS.warn).toBeLessThan(LEVELS.error);
        });

        it("has exactly four levels", () => {
            expect(Object.keys(LEVELS)).toHaveLength(4);
        });

        it("has the expected level names", () => {
            expect(Object.keys(LEVELS)).toEqual(["debug", "info", "warn", "error"]);
        });
    });

    describe("resolveLevel", () => {
        it("returns 'info' for an unknown value", () => {
            const original = process.env.LOG_LEVEL;
            process.env.LOG_LEVEL = "bogus";
            expect(resolveLevel()).toBe("info");
            if (original === undefined) {
                delete process.env.LOG_LEVEL;
            } else {
                process.env.LOG_LEVEL = original;
            }
        });

        it("accepts all valid levels", () => {
            for (const level of ["debug", "info", "warn", "error"] as const) {
                const original = process.env.LOG_LEVEL;
                process.env.LOG_LEVEL = level;
                expect(resolveLevel()).toBe(level);
                if (original === undefined) {
                    delete process.env.LOG_LEVEL;
                } else {
                    process.env.LOG_LEVEL = original;
                }
            }
        });

        it("treats empty string as info", () => {
            const original = process.env.LOG_LEVEL;
            process.env.LOG_LEVEL = "";
            expect(resolveLevel()).toBe("info");
            if (original === undefined) {
                delete process.env.LOG_LEVEL;
            } else {
                process.env.LOG_LEVEL = original;
            }
        });

        it("is case-insensitive", () => {
            const original = process.env.LOG_LEVEL;
            process.env.LOG_LEVEL = "DEBUG";
            expect(resolveLevel()).toBe("debug");
            if (original === undefined) {
                delete process.env.LOG_LEVEL;
            } else {
                process.env.LOG_LEVEL = original;
            }
        });
    });
});
