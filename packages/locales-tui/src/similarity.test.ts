// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { findSimilarEntries, levenshtein, similarityPercent } from "./similarity.js";

describe("levenshtein", () => {
    it("matches identical strings", () => {
        expect(levenshtein("a", "a")).toBe(0);
        expect(levenshtein("", "")).toBe(0);
    });
    it("counts edits", () => {
        expect(levenshtein("kitten", "sitting")).toBe(3);
    });
});

describe("similarityPercent", () => {
    it("is 100 for equal strings", () => {
        expect(similarityPercent("hello", "hello")).toBe(100);
    });
});

describe("findSimilarEntries", () => {
    it("flags high similarity vs keys and values", () => {
        const en = { Hello: "Hello", Other: "World" };
        const hits = findSimilarEntries(en, "Hell", "Hallo", 70);
        expect(hits.length).toBeGreaterThan(0);
    });
});
