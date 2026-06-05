// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect } from "vitest";
import { parseEmailData } from "./emailData";

describe("parseEmailData", () => {
    it("parses valid JSON string", () => {
        const input = '{"name": "Alice", "code": 1234}';
        expect(parseEmailData(input)).toEqual({ name: "Alice", code: 1234 });
    });

    it("returns empty object for invalid JSON string", () => {
        expect(parseEmailData("{not valid json}")).toEqual({});
    });

    it("returns empty object for null", () => {
        expect(parseEmailData(null)).toEqual({});
    });

    it("returns empty object for undefined", () => {
        expect(parseEmailData(undefined)).toEqual({});
    });

    it("returns the object as-is when already an object", () => {
        const input = { key: "value", num: 42 };
        expect(parseEmailData(input)).toEqual(input);
    });

    it("returns the object as-is for empty object", () => {
        expect(parseEmailData({})).toEqual({});
    });

    it("handles JSON string with nested objects", () => {
        const input = '{"user": {"id": 1}, "tags": ["a", "b"]}';
        expect(parseEmailData(input)).toEqual({
            user: { id: 1 },
            tags: ["a", "b"],
        });
    });
});
