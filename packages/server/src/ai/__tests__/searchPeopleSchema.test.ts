// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { searchPeopleInput } from "../toolRegistry/peopleTools";

describe("searchPeople input schema", () => {
    it("requires at least one filter", () => {
        const result = searchPeopleInput.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]!.message).toMatch(/at least one filter/i);
        }
    });

    it("accepts a single query", () => {
        const result = searchPeopleInput.safeParse({ query: "alex" });
        expect(result.success).toBe(true);
    });

    it("accepts combined filters", () => {
        const result = searchPeopleInput.safeParse({
            jobTitle: "designer",
            city: "berlin",
            hasEmail: true,
            birthdayMonth: 2,
            limit: 25,
        });
        expect(result.success).toBe(true);
    });

    it("accepts presence filters without query", () => {
        const result = searchPeopleInput.safeParse({ hasOfficePhone: true });
        expect(result.success).toBe(true);
    });

    it("rejects birthdayMonth out of range", () => {
        const bad = searchPeopleInput.safeParse({ birthdayMonth: 13 });
        expect(bad.success).toBe(false);
    });

    it("rejects empty strings so 'no filter' cannot be smuggled through", () => {
        const bad = searchPeopleInput.safeParse({ query: "" });
        expect(bad.success).toBe(false);
    });

    it("caps limit at 200", () => {
        const bad = searchPeopleInput.safeParse({ query: "x", limit: 500 });
        expect(bad.success).toBe(false);
    });
});
