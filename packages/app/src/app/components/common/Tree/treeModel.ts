// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TreeDropContext, TreeRowModel } from "./types";

/**
 * Pure drop-target model for the sidebar document Tree.
 *
 * Parity contract, measured against the pinned `@minoru/react-dnd-treeview`
 * 3.5.3 source (Tree.tsx, Node.tsx, useDropNode/useDropRoot/useDragOver,
 * getDropTarget, getDestIndex, getModifiedIndex, isDroppable) with
 * `sort={false}`, `insertDroppableFirst={false}`, `dropTargetOffset={10}` —
 * the exact props the sidebar used:
 *
 * 1. Hover zones of a row with rect [top, bottom] and offset 10:
 *    `upper` when pointerY < top + 10, `lower` when pointerY > bottom - 10,
 *    otherwise `middle` (offset 0 → always `middle`).
 * 2. Target resolution (`getDropTarget`):
 *    - row whose child list is rendered (droppable folder, open, has child):
 *      upper → `{ parent, outerIndex }` if the parent is droppable, else
 *      `{ row.id, 0 }`; middle/lower → `{ row.id, innerIndex }`.
 *    - row without a child list (document or closed folder):
 *      middle → `{ row.id, 0 }` ("into" inserts as FIRST child);
 *      upper and lower → `{ parent, outerIndex }` if the parent is droppable,
 *      else no target. Both bands insert as a sibling, so dropping on the top
 *      band lands before the row and dropping on the bottom band lands after it.
 *    - root container (pointer over the root `<ul>` itself): `{ rootId, innerIndex }`.
 *    - `innerIndex` over a row list: the count of rows whose vertical center is
 *      above the pointer, or the list length when the pointer is below the last
 *      row's center. `outerIndex` = `innerIndex` of the row's parent list.
 * 3. `canDrop` merge (`isDroppable`): a consumer callback returning a value
 *    other than `undefined` wins; otherwise the defaults apply: dragging onto
 *    itself is rejected, an external source may only land on root or a
 *    droppable row, a root target is always droppable for internal sources,
 *    a row whose parent is the target or that is not droppable is rejected,
 *    and a target that is a descendant of the source is rejected.
 * 4. Resolved drops are reported as a slot inside the drop target's rendered
 *    child list (`TreeDropOptions.destinationIndex`). Deliberately NOT the
 *    library's `getDestIndex`/`getModifiedIndex` value: that counts positions
 *    in the whole flat node array, so any row nested earlier in the tree pushes
 *    the drop past the point the user dropped on. Turning a rendered slot into
 *    a stored `order` needs the full sibling list (archived children are hidden
 *    from the tree but keep an `order`), so the consumer owns that mapping -
 *    see `RecordActions.setDocuments`.
 * 5. Root drop index: dropping over the root container uses the inner index
 *    among root-level rows (see 2 and 4).
 * 6. `canDrop` merge for the sidebar consumer: `dragSource.parent ===
 *    dropTargetId` → `true`, anything else falls through to the defaults.
 *
 * `app/utils/array.ts` `flattenTree`/`getParentAtIndex` operate on nested
 * `children` trees with their own index conventions; the documents store is a
 * flat `parent`/`order` list, so this model works directly on that shape.
 */

export interface TreeRow extends TreeRowModel {
    depth: number;
    isOpen: boolean;
    hasChild: boolean;
}

/**
 * Flattens the visible rows depth-first, preserving the input (order-sorted)
 * sequence of siblings. Only children of open folders are emitted.
 */
export const buildRows = (
    nodes: readonly TreeRowModel[],
    rootId: string | number,
    openIds: readonly (string | number)[]
): TreeRow[] => {
    const open = new Set(openIds);
    const rows: TreeRow[] = [];
    const visit = (parentId: string | number, depth: number) => {
        for (const node of nodes) {
            if (node.parent !== parentId) continue;
            const hasChild = nodes.some(child => child.parent === node.id);
            const isOpen = open.has(node.id);
            rows.push({ ...node, depth, isOpen, hasChild });
            if (isOpen) {
                visit(node.id, depth + 1);
            }
        }
    };
    visit(rootId, 0);
    return rows;
};

export type HoverZone = "lower" | "middle" | "upper";

/** Zone boundaries: upper `top + offset`, lower `bottom - offset`. */
export const getHoverZone = (pointerY: number, top: number, bottom: number, offset: number): HoverZone => {
    if (offset === 0) {
        return "middle";
    }
    if (pointerY > bottom - offset) {
        return "lower";
    }
    if (pointerY < top + offset) {
        return "upper";
    }
    return "middle";
};

export interface TreeRect {
    top: number;
    bottom: number;
}

/**
 * Relative placeholder index for a pointer over a row list: the number of
 * rows whose center is above the pointer, or the list length below the last
 * row's center.
 */
export const getInnerIndex = (rows: readonly TreeRect[], pointerY: number): number => {
    let pos = "";
    let index = 0;
    rows.forEach((row, key) => {
        const flag = pointerY > row.top + (row.bottom - row.top) / 2 ? "down" : "up";
        if (pos === "") {
            pos = flag;
        } else if (pos !== flag) {
            pos = flag;
            index = key;
        }
        if (key === rows.length - 1 && flag === "down") {
            index = key + 1;
        }
    });
    return index;
};

export interface DropTarget {
    targetId: string | number;
    index: number;
}

/**
 * Resolves where a drop on a row lands (parity rule 2). The caller passes the
 * already-resolved droppability of the row's parent and the rects of the
 * relevant row lists.
 */
export const resolveDropTarget = (args: {
    row: TreeRow;
    pointerY: number;
    rowRect: TreeRect;
    dropTargetOffset: number;
    childRowRects: readonly TreeRect[];
    parentRowRects: readonly TreeRect[];
    canDropParent: boolean;
}): DropTarget | null => {
    const { row, pointerY, rowRect, dropTargetOffset, childRowRects, parentRowRects, canDropParent } = args;
    const hasList = row.hasChild && row.isOpen;
    const zone = getHoverZone(pointerY, rowRect.top, rowRect.bottom, dropTargetOffset);

    if (!hasList) {
        if (zone === "middle") {
            return { targetId: row.id, index: 0 };
        }
        return canDropParent
            ? { targetId: row.parent, index: getInnerIndex(parentRowRects, pointerY) }
            : null;
    }

    if (zone === "upper") {
        return canDropParent
            ? { targetId: row.parent, index: getInnerIndex(parentRowRects, pointerY) }
            : { targetId: row.id, index: 0 };
    }
    return { targetId: row.id, index: getInnerIndex(childRowRects, pointerY) };
};

/** True when `targetId` is a strict descendant of `sourceId` (or the source itself). */
export const isAncestorOf = (
    nodes: readonly TreeRowModel[],
    sourceId: string | number,
    targetId: string | number
): boolean => {
    if (targetId === 0) {
        return false;
    }
    const targetNode = nodes.find(node => node.id === targetId);
    if (targetNode === undefined) {
        return false;
    }
    if (targetNode.parent === sourceId) {
        return true;
    }
    return isAncestorOf(nodes, sourceId, targetNode.parent);
};

/**
 * Dropability of a resolved target for a drag source (parity rule 3).
 * `dragSource` is `null` outside of an active in-tree drag.
 */
export const canDropRow = (
    nodes: readonly TreeRowModel[],
    rootId: string | number,
    dragSource: null | string | TreeRowModel,
    dropTargetId: string | number,
    canDrop?: (nodes: readonly TreeRowModel[], context: TreeDropContext) => boolean | undefined
): boolean => {
    if (dragSource === null) {
        if (dropTargetId === rootId) {
            return true;
        }
        const dropTargetNode = nodes.find(node => node.id === dropTargetId);
        return Boolean(dropTargetNode?.droppable);
    }

    const dragSourceId = typeof dragSource === "object" ? dragSource.id : null;
    if (canDrop) {
        const result = canDrop(nodes, {
            dragSourceId: dragSourceId ?? undefined,
            dropTargetId,
            dragSource: typeof dragSource === "object" ? dragSource : null,
            dropTarget: nodes.find(node => node.id === dropTargetId) ?? null,
        });
        if (result !== undefined) {
            return result;
        }
    }

    if (dragSourceId === dropTargetId) {
        return false;
    }
    const dragSourceNode = dragSourceId === null ? undefined : nodes.find(node => node.id === dragSourceId);
    const dropTargetNode = nodes.find(node => node.id === dropTargetId);
    if (dragSourceNode === undefined || dragSourceId === null) {
        return dropTargetId === rootId || Boolean(dropTargetNode?.droppable);
    }
    if (dropTargetNode === undefined) {
        return dragSourceNode.parent !== 0;
    }
    if (dragSourceNode.parent === dropTargetId || !dropTargetNode.droppable) {
        return false;
    }
    return !isAncestorOf(nodes, dragSourceId, dropTargetId);
};
