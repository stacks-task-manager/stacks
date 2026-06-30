// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { pgStringLiteral } from "../sqlLiteral";

describe("pgStringLiteral", () => {
    it("wraps values in single quotes", () => {
        expect(pgStringLiteral("hello")).toBe("'hello'");
    });

    it("escapes embedded single quotes for PostgreSQL literals", () => {
        expect(pgStringLiteral("O'Brien")).toBe("'O''Brien'");
    });

    it("stringifies non-string values before quoting them", () => {
        expect(pgStringLiteral(42)).toBe("'42'");
    });
});
