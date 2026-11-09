// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IActivityChange } from "@stacks/types";

interface IActivityDiffSegment {
    kind: "plain" | "removed" | "inserted";
    text: string;
}

/** Split a before/after activity change into literal text segments. */
export function diffActivitySegments(change: IActivityChange): IActivityDiffSegment[] {
    const after = typeof change.after === "string" ? change.after : "";
    const before = typeof change.before === "string" ? change.before : "";

    if (!after.length) return [];
    if (!before.length) return [{ kind: "inserted", text: after }];

    let shared = 0;
    while (shared < before.length && shared < after.length && before[shared] === after[shared]) {
        shared++;
    }

    let trailing = 0;
    while (
        trailing < before.length - shared &&
        trailing < after.length - shared &&
        before[before.length - 1 - trailing] === after[after.length - 1 - trailing]
    ) {
        trailing++;
    }

    const segments: IActivityDiffSegment[] = [];
    const push = (text: string, kind: IActivityDiffSegment["kind"]) => {
        if (text.length) segments.push({ kind, text });
    };

    push(before.slice(0, shared), "plain");
    push(before.slice(shared, before.length - trailing), "removed");
    push(after.slice(shared, after.length - trailing), "plain");
    push(before.slice(before.length - trailing), "plain");

    return segments;
}
