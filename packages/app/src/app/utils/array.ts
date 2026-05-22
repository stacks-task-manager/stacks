// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Sort array of objects based on another array
 */

export const mapOrder = <T>(array: T[], order: Array<string | unknown>, key: string): T[] => {
    array.sort(function (a: T, b: T) {
        const A = a[key as keyof T];
        const B = b[key as keyof T];

        if (order.indexOf(A) > order.indexOf(B)) {
            return 1;
        } else {
            return -1;
        }
    });

    return array;
};

export const objectOrder = <T extends Record<string, any>>(
    object: T,
    keyOrder: Array<keyof T>,
    includeMissing?: boolean
): T => {
    const orderedObject: Partial<T> = {};

    keyOrder.forEach(key => {
        if (object.hasOwnProperty(key)) {
            orderedObject[key] = object[key];
        }
    });

    if (includeMissing) {
        for (const key of Object.keys(object)) {
            if (!orderedObject.hasOwnProperty(key)) {
                orderedObject[key as keyof T] = object[key];
            }
        }
    }

    return orderedObject as T;
};

export const reorderWithAfter = (
    order: string[],
    itemId: string,
    sourceIndex: number,
    targetIndex: number
): { order: string[]; after: string | null } => {
    const nextOrder = [...order];
    const fromIndex = sourceIndex >= 0 ? sourceIndex : nextOrder.indexOf(itemId);
    if (fromIndex < 0 || fromIndex >= nextOrder.length) return { order: nextOrder, after: null };

    const removedItems = nextOrder.splice(fromIndex, 1);
    const moved = removedItems[0];
    if (moved == null) return { order: nextOrder, after: null };

    const insertIndex = Math.min(Math.max(targetIndex, 0), nextOrder.length);
    nextOrder.splice(insertIndex, 0, moved);

    const after = insertIndex > 0 ? nextOrder[insertIndex - 1] : null;
    return { order: nextOrder, after };
};

// Generic tree types used by flatten helpers (renamed to avoid clashing with @stacks/types TreeNode)
export type GenericTreeNode<T> = T & { id: string; children?: GenericTreeNode<T>[] };
/** @deprecated Use {@link GenericTreeNode} */
export type TreeNode<T> = GenericTreeNode<T>;
export interface FlattenedItem<T> {
    id: string;
    data: GenericTreeNode<T>;
    level: number;
    parentId?: string;
    isLast: boolean;
}

// Flattens a tree (depth-first) and annotates each item with level, parentId, and last-child flag
export const flattenTree = <T>(nodes: GenericTreeNode<T>[]): FlattenedItem<T>[] => {
    const result: FlattenedItem<T>[] = [];

    const walk = (arr: GenericTreeNode<T>[], level: number, parentId?: string) => {
        arr.forEach((node, idx) => {
            result.push({
                id: node.id,
                data: node,
                level,
                parentId,
                isLast: idx === arr.length - 1,
            });

            if (node.children && node.children.length) {
                walk(node.children, level + 1, node.id);
            }
        });
    };

    walk(nodes, 0);
    return result;
};

// Returns the inferred parent id for an insertion at a given flat index
// The rule: if index falls within a parent's contiguous children range, return that parent; otherwise return undefined (root)
export const getParentAtIndex = <T>(flat: FlattenedItem<T>[], index: number): string | undefined => {
    if (index <= 0 || !flat.length) return undefined;

    // Build ranges for each parent by scanning the flat list
    // A parent's children range starts right after the parent and continues until encountering an item with level <= parent's level
    const parentRanges: { [parentId: string]: { start: number; end: number } } = {};
    for (let i = 0; i < flat.length; i++) {
        const node = flat[i];
        const hasChildren = Boolean(node.data.children && node.data.children.length);
        if (!hasChildren) continue;

        const start = i + 1;
        let end = start - 1;
        for (let j = start; j < flat.length; j++) {
            if (flat[j].level <= node.level) {
                end = j - 1;
                break;
            }
            end = j;
        }
        if (end >= start) {
            parentRanges[node.id] = { start, end };
        }
    }

    // Find the nearest parent whose range contains the index
    for (let k = index; k >= 0; k--) {
        const candidate = flat[k];
        if (!candidate) break;
        // Check if any parent range contains index
        for (const parentId of Object.keys(parentRanges)) {
            const r = parentRanges[parentId];
            if (index >= r.start && index <= r.end) return parentId;
        }
    }

    return undefined;
};
