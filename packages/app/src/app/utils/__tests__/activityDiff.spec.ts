// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { diffActivitySegments } from "app/utils/activityDiff";

describe("diffActivitySegments", () => {
    it("marks a title without a previous value as one inserted segment", () => {
        expect(diffActivitySegments({ field: "title", after: "Ship notes" })).toEqual([
            { kind: "inserted", text: "Ship notes" },
        ]);
    });

    it("keeps the shared prefix plain and marks only the removed middle", () => {
        expect(
            diffActivitySegments({
                field: "title",
                before: "quarterly report v1",
                after: "quarterly report v2",
            })
        ).toEqual([
            { kind: "plain", text: "quarterly report v" },
            { kind: "removed", text: "1" },
            { kind: "plain", text: "2" },
        ]);
    });

    it("keeps the shared prefix plain when the title only grows", () => {
        expect(
            diffActivitySegments({ field: "title", before: "weekly report", after: "weekly reports" })
        ).toEqual([
            { kind: "plain", text: "weekly report" },
            { kind: "plain", text: "s" },
        ]);
    });

    it("keeps the shared suffix plain when the title only shrinks", () => {
        expect(
            diffActivitySegments({ field: "title", before: "release notes draft", after: "release notes" })
        ).toEqual([
            { kind: "plain", text: "release notes" },
            { kind: "removed", text: " draft" },
        ]);
    });

    it("treats hostile title text as literal text", () => {
        const hostile = '</del><img src=x onerror="window.__securityProbe=1">';

        expect(diffActivitySegments({ field: "title", before: "plan", after: hostile })).toEqual([
            { kind: "removed", text: "plan" },
            { kind: "plain", text: hostile },
        ]);
    });

    it("returns one plain segment when the title is unchanged", () => {
        expect(diffActivitySegments({ field: "title", before: "same", after: "same" })).toEqual([
            { kind: "plain", text: "same" },
        ]);
    });

    it("never returns empty segments", () => {
        expect(diffActivitySegments({ field: "title", before: "", after: "first" })).toEqual([
            { kind: "inserted", text: "first" },
        ]);
    });
});
