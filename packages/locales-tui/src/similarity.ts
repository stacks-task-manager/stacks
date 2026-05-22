// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { TranslationValue } from "@stacks/translations";
import { flattenEnStringValues } from "./localeOps.js";

/** Normalized similarity 0–100 using Levenshtein ratio vs max string length. */

export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const row = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) row[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let prev = i - 1;
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
            prev = tmp;
        }
    }
    return row[b.length]!;
}

export function similarityPercent(a: string, b: string): number {
    if (a === b) return 100;
    const d = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length, 1);
    return Math.round(100 * (1 - d / maxLen));
}

export type SimilarityHit = {
    /** Existing English key in JSON */
    entryKey: string;
    /** Which part of the entry matched */
    matched: "key" | "value";
    similarity: number;
    /** Which candidate string produced this hit */
    candidate: "key" | "value";
};

const DEFAULT_THRESHOLD = 85;

/**
 * Compares new key/value against every existing key and value in `en` (≥ threshold %).
 */
export function findSimilarEntries(
    en: Record<string, TranslationValue>,
    candidateKey: string,
    candidateValue: string,
    threshold: number = DEFAULT_THRESHOLD,
): SimilarityHit[] {
    const flat = flattenEnStringValues(en);
    const hits: SimilarityHit[] = [];
    const seen = new Set<string>();

    for (const [k, v] of Object.entries(flat)) {
        const candidates: { label: "key" | "value"; text: string }[] = [
            { label: "key", text: candidateKey },
            { label: "value", text: candidateValue },
        ];
        for (const c of candidates) {
            const sk = similarityPercent(c.text, k);
            if (sk >= threshold) {
                const id = `${k}|key|${c.label}|${sk}`;
                if (!seen.has(id)) {
                    seen.add(id);
                    hits.push({ entryKey: k, matched: "key", candidate: c.label, similarity: sk });
                }
            }
            const sv = similarityPercent(c.text, v);
            if (sv >= threshold) {
                const id = `${k}|value|${c.label}|${sv}`;
                if (!seen.has(id)) {
                    seen.add(id);
                    hits.push({ entryKey: k, matched: "value", candidate: c.label, similarity: sv });
                }
            }
        }
    }
    return hits;
}
