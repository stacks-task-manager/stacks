// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    buildRows,
    canDropRow,
    getHoverZone,
    getInnerIndex,
    isAncestorOf,
    resolveDropTarget,
    TreeRow,
} from "../treeModel";
import { TreeDropContext, TreeRowModel } from "../types";

const ROOT = "00000000-0000-0000-0000-000000000000";
const node = (id: string, parent: string, droppable = false) => ({ id, parent, droppable });

// F1{D1,D2}, root[F1,D3,F2,D5] — flat order-sorted shape of `documents`
const documents = [
    node("F1", ROOT, true),
    node("D1", "F1"),
    node("D2", "F1"),
    node("D3", ROOT),
    node("F2", ROOT, true),
    node("D5", ROOT),
];

// Sidebar canDrop: true when the drag source is a sibling of the target,
// undefined otherwise (library defaults then apply).
const sidebarCanDrop = (_nodes: readonly TreeRowModel[], { dragSource, dropTargetId }: TreeDropContext) => {
    if (dragSource?.parent === dropTargetId) return true;
};

describe("buildRows", () => {
    it("flattens open folders depth-first preserving input sibling order", () => {
        const rows = buildRows(documents, ROOT, ["F1", "F2"]);
        expect(rows.map(row => row.id)).toEqual(["F1", "D1", "D2", "D3", "F2", "D5"]);
        expect(rows[0].depth).toBe(0);
        expect(rows[1].depth).toBe(1);
    });

    it("hides children of closed folders but keeps the folder row", () => {
        const rows = buildRows(documents, ROOT, ["F2"]);
        expect(rows.map(row => row.id)).toEqual(["F1", "D3", "F2", "D5"]);
    });

    it("reports hasChild and isOpen per row", () => {
        const rows = buildRows(documents, ROOT, ["F1"]);
        const f1 = rows.find(row => row.id === "F1")!;
        const d1 = rows.find(row => row.id === "D1")!;
        expect(f1).toMatchObject({ hasChild: true, isOpen: true });
        expect(d1).toMatchObject({ hasChild: false, isOpen: false });
    });
});

describe("getHoverZone", () => {
    it("splits a 36px row into 10px upper and lower bands", () => {
        expect(getHoverZone(9, 0, 36, 10)).toBe("upper");
        expect(getHoverZone(10, 0, 36, 10)).toBe("middle");
        expect(getHoverZone(26, 0, 36, 10)).toBe("middle");
        expect(getHoverZone(27, 0, 36, 10)).toBe("lower");
    });

    it("is always middle with a zero offset", () => {
        expect(getHoverZone(0, 0, 36, 0)).toBe("middle");
        expect(getHoverZone(36, 0, 36, 0)).toBe("middle");
    });
});

describe("getInnerIndex", () => {
    const rows = [
        { top: 0, bottom: 36 },
        { top: 36, bottom: 72 },
        { top: 72, bottom: 108 },
    ];

    it("counts rows whose center is above the pointer", () => {
        expect(getInnerIndex(rows, 5)).toBe(0);
        expect(getInnerIndex(rows, 18)).toBe(0); // center itself counts as "up"
        expect(getInnerIndex(rows, 20)).toBe(1);
        expect(getInnerIndex(rows, 60)).toBe(2);
    });

    it("returns the list length below the last row's center", () => {
        expect(getInnerIndex(rows, 95)).toBe(3);
    });

    it("returns 0 for an empty list", () => {
        expect(getInnerIndex([], 50)).toBe(0);
    });
});

describe("resolveDropTarget", () => {
    const rowRect = { top: 0, bottom: 36 };

    const row = (over: Partial<TreeRow> & { id: string; parent: string }): TreeRow => ({
        droppable: false,
        depth: 0,
        isOpen: false,
        hasChild: false,
        ...over,
    });

    it("inserts as first child when hovering the middle of a closed droppable row", () => {
        const closedFolder = row({ id: "F2", parent: ROOT, droppable: true, hasChild: true });
        expect(
            resolveDropTarget({
                row: closedFolder,
                pointerY: 18,
                rowRect,
                dropTargetOffset: 10,
                childRowRects: [],
                parentRowRects: [{ top: 36, bottom: 72 }],
                canDropParent: true,
            })
        ).toEqual({ targetId: "F2", index: 0 });
    });

    it("inserts after the row when hovering its lower zone", () => {
        const document = row({ id: "D5", parent: ROOT });
        // Parent list: D3 (the previous sibling) and the hovered row itself.
        expect(
            resolveDropTarget({
                row: document,
                pointerY: 31,
                rowRect,
                dropTargetOffset: 10,
                childRowRects: [],
                parentRowRects: [
                    { top: -36, bottom: 0 },
                    { top: 0, bottom: 36 },
                ],
                canDropParent: true,
            })
        ).toEqual({ targetId: ROOT, index: 2 });
    });

    it("returns null in either sibling zone when the parent is not droppable", () => {
        const document = row({ id: "D1", parent: "F1" });
        const base = {
            row: document,
            rowRect,
            dropTargetOffset: 10,
            childRowRects: [],
            parentRowRects: [{ top: 36, bottom: 72 }],
            canDropParent: false,
        };
        expect(resolveDropTarget({ ...base, pointerY: 5 })).toBeNull();
        expect(resolveDropTarget({ ...base, pointerY: 31 })).toBeNull();
    });

    it("falls back to the parent upper zone with the outer index", () => {
        const document = row({ id: "D5", parent: ROOT });
        // Parent list rows above and below the hovered row's upper band; pointer at y=5
        // sits below two of their centers → outer index 2.
        const parentRowRects = [
            { top: -72, bottom: -36 },
            { top: -36, bottom: 0 },
            { top: 36, bottom: 72 },
        ];
        expect(
            resolveDropTarget({
                row: document,
                pointerY: 5,
                rowRect,
                dropTargetOffset: 10,
                childRowRects: [],
                parentRowRects,
                canDropParent: true,
            })
        ).toEqual({ targetId: ROOT, index: 2 });
    });

    it("uses the inner index among child rows for an open folder", () => {
        const openFolder = row({ id: "F1", parent: ROOT, droppable: true, hasChild: true, isOpen: true });
        // Children D1 [36,72], D2 [72,108]; pointer below D2's center → index 2.
        expect(
            resolveDropTarget({
                row: openFolder,
                pointerY: 100,
                rowRect,
                dropTargetOffset: 10,
                childRowRects: [
                    { top: 36, bottom: 72 },
                    { top: 72, bottom: 108 },
                ],
                parentRowRects: [],
                canDropParent: true,
            })
        ).toEqual({ targetId: "F1", index: 2 });
    });

    it("targets the parent in the upper zone of an open folder, or itself when the parent rejects", () => {
        const openFolder = row({ id: "F1", parent: ROOT, droppable: true, hasChild: true, isOpen: true });
        const base = {
            row: openFolder,
            pointerY: 5,
            rowRect,
            dropTargetOffset: 10,
            childRowRects: [{ top: 36, bottom: 72 }] as { top: number; bottom: number }[],
            parentRowRects: [{ top: 36, bottom: 72 }] as { top: number; bottom: number }[],
        };
        expect(resolveDropTarget({ ...base, canDropParent: true })).toEqual({ targetId: ROOT, index: 0 });
        expect(resolveDropTarget({ ...base, canDropParent: false })).toEqual({ targetId: "F1", index: 0 });
    });
});

describe("canDropRow", () => {
    it("honours a consumer canDrop result other than undefined", () => {
        expect(canDropRow(documents, ROOT, documents[1], "F1", sidebarCanDrop)).toBe(true); // target is the drag source's parent
        expect(canDropRow(documents, ROOT, documents[3], "F2", sidebarCanDrop)).toBe(true); // falls through to defaults
        expect(canDropRow(documents, ROOT, documents[3], "F2", () => false)).toBe(false); // consumer false wins
        expect(canDropRow(documents, ROOT, documents[1], "D2")).toBe(false); // sibling row: not droppable by default
    });

    it("rejects dropping a row onto itself", () => {
        expect(canDropRow(documents, ROOT, documents[3], "D3")).toBe(false);
    });

    it("rejects non-droppable rows and allows droppable folders", () => {
        expect(canDropRow(documents, ROOT, documents[3], "D5")).toBe(false);
        expect(canDropRow(documents, ROOT, documents[3], "F2")).toBe(true);
    });

    it("rejects a target that is a droppable descendant of the drag source", () => {
        const nested = [...documents, node("S1", "F1", true)];
        expect(canDropRow(nested, ROOT, nested[0], "S1")).toBe(false);
        expect(isAncestorOf(documents, "F1", "D2")).toBe(true);
    });

    it("allows the root for any internal source", () => {
        expect(canDropRow(documents, ROOT, documents[1], ROOT)).toBe(true);
        expect(canDropRow(documents, ROOT, documents[3], ROOT)).toBe(true);
    });

    it("outside of a drag, only root and droppable rows accept", () => {
        expect(canDropRow(documents, ROOT, null, ROOT)).toBe(true);
        expect(canDropRow(documents, ROOT, null, "F1")).toBe(true);
        expect(canDropRow(documents, ROOT, null, "D1")).toBe(false);
    });
});
