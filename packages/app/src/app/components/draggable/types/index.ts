// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export type DragDirection = 'horizontal' | 'vertical';

export interface Position {
    x: number;
    y: number;
}

/** Result passed to onReorder when an item is reordered within the same container */
export interface ReorderResult {
    /** ID of the dragged item */
    itemId: string;
    /** Original index before drag */
    fromIndex: number;
    /** New index after drop */
    toIndex: number;
}

/** Result passed to onItemMove when an item moves to a different container */
export interface ItemMoveResult {
    /** ID of the dragged item */
    itemId: string;
    /** Source container ID */
    fromContainerId: string;
    /** Target container ID */
    toContainerId: string;
    /** Original index in source container */
    fromIndex: number;
    /** New index in target container */
    toIndex: number;
}
