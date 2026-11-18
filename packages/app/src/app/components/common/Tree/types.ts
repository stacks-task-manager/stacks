// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

/**
 * Structural row model consumed by the Tree. Any node list with flat
 * `parent` references (e.g. `TreeNode` documents) satisfies it.
 */
export interface TreeRowModel {
    id: string | number;
    parent: string | number;
    droppable?: boolean;
}

export interface TreeRenderOptions {
    depth: number;
    isOpen: boolean;
    hasChild: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    onToggle: () => void;
}

export interface TreeDropContext {
    dragSourceId?: string | number;
    dropTargetId: string | number;
    dragSource?: TreeRowModel | null;
    dropTarget?: TreeRowModel | null;
}

export interface TreeDropOptions {
    dragSourceId: string | number;
    dragSource: TreeRowModel | null;
    dropTargetId: string | number;
    dropTarget: TreeRowModel | null;
    /**
     * Slot inside the drop target's rendered child list, `0` being the first child and the list
     * length meaning "after the last one". The consumer resolves it against the full sibling list:
     * the tree only renders children that are visible, while a stored sibling position also counts
     * the ones it hides.
     */
    destinationIndex: number;
}

export interface TreeProps {
    nodes: readonly TreeRowModel[];
    rootId: string | number;
    openIds: readonly (string | number)[];
    onOpenChange: (openIds: (string | number)[]) => void;
    onDragStart?: (id: string | number, node: TreeRowModel) => void;
    onDrop?: (options: TreeDropOptions) => void;
    canDrop?: (nodes: readonly TreeRowModel[], context: TreeDropContext) => boolean | undefined;
    dropTargetOffset?: number;
    placeholderRender?: (node: TreeRowModel, options: { depth: number }) => React.ReactNode;
    render: (node: TreeRowModel, options: TreeRenderOptions) => React.ReactNode;
}
