import { mergeAttributes } from "@tiptap/core";
import { describe, expect, it } from "vitest";

describe("mobile Tiptap merged attributes", () => {
    it("keeps an own __proto__ key from replacing the result prototype", () => {
        const untrustedAttributes = JSON.parse(
            '{"__proto__":{"data-inherited-canary":"present","onerror":"globalThis.__tiptapXss += 1"}}'
        );
        const attributes = mergeAttributes(untrustedAttributes);

        expect(Object.getPrototypeOf(attributes)).toBe(Object.prototype);
        expect(Object.keys(attributes)).toEqual(["__proto__"]);
        expect((attributes as Record<string, unknown>)["data-inherited-canary"]).toBeUndefined();
        expect((attributes as Record<string, unknown>).onerror).toBeUndefined();
    });
});
