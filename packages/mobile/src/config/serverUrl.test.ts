import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "./serverUrl";

describe("normalizeBaseUrl", () => {
    it("accepts HTTPS URLs and removes trailing path slashes", () => {
        expect(normalizeBaseUrl(" https://stacks.example/api/// ")).toBe("https://stacks.example/api");
    });

    it("rejects remote cleartext HTTP", () => {
        expect(() => normalizeBaseUrl("http://stacks.example")).toThrow("HTTPS");
    });

    it("allows cleartext only for loopback during explicit development use", () => {
        expect(() => normalizeBaseUrl("http://localhost:3000", true)).not.toThrow();
        expect(() => normalizeBaseUrl("http://127.0.0.1:3000", true)).not.toThrow();
        expect(() => normalizeBaseUrl("http://stacks.example", true)).toThrow("HTTPS");
        expect(() => normalizeBaseUrl("http://localhost:3000")).toThrow("HTTPS");
    });

    it("rejects credentials, query strings, fragments and non-web schemes", () => {
        for (const url of [
            "https://user:password@stacks.example",
            "https://stacks.example?token=secret",
            "https://stacks.example#fragment",
            "file:///tmp/stacks",
        ]) {
            expect(() => normalizeBaseUrl(url)).toThrow();
        }
    });
});
