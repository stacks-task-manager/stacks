// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Generic render-prop tree with native HTML5 drag-and-drop, shaped after the
 * sidebar document tree (flat `parent` references, relative drop zones).
 * Drop mutations are never performed here; resolved drops are emitted through
 * `onDrop`.
 *
 * The drag handlers live on the root list: rows, nested lists and empty list
 * space all bubble to one place, and the hovered row is found with `closest`.
 * Every `dragover` inside the tree is accepted so the browser always delivers
 * `drop` - the browser does not re-issue `dragover` while the pointer is still,
 * so accepting only over a resolved target loses the drop as soon as the row
 * under the pointer changes after the last event. Where a drop lands is decided
 * by `resolveDropTarget` (row rects plus pointer offset) and the insertion line
 * is inert and out of flow, so it never moves or captures the row beneath it.
 */
import React, { FunctionComponent, useCallback, useMemo, useRef, useState } from "react";

import {
    buildRows,
    canDropRow,
    DropTarget,
    getInnerIndex,
    resolveDropTarget,
    TreeRect,
    TreeRow,
} from "./treeModel";
import { TreeDropOptions, TreeProps } from "./types";
import "./_Tree.scss";

const DRAG_MIME = "application/x-stack-tree-row";
const AUTO_OPEN_DELAY = 500;
const ROW_ID_ATTR = "data-tree-row-id";
const PLACEHOLDER_ATTR = "data-tree-placeholder";
const EDITABLE_SELECTOR = "input, textarea, [contenteditable]:not([contenteditable='false'])";

export const Tree: FunctionComponent<TreeProps> = ({
    nodes,
    rootId,
    openIds,
    onOpenChange,
    onDragStart,
    onDrop,
    canDrop,
    dropTargetOffset = 10,
    placeholderRender,
    render,
}) => {
    const [dragSourceId, setDragSourceId] = useState<string | number | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const containerRef = useRef<HTMLUListElement | null>(null);
    const rowEls = useRef(new Map<string | number, HTMLLIElement>());
    // Synchronous mirror of the `openIds` prop: the auto-open timeout must read the list that is
    // current when it fires, not the one captured when the timer was scheduled.
    const openIdsRef = useRef(openIds);
    openIdsRef.current = openIds;
    // Synchronous mirror of `dropTarget`: `drop` must not depend on a state flush.
    const resolvedTarget = useRef<DropTarget | null>(null);
    const pointerDownEl = useRef<HTMLElement | null>(null);
    const openTimer = useRef<number | null>(null);
    const openTimerRow = useRef<string | number | null>(null);

    const rows = useMemo(() => buildRows(nodes, rootId, openIds), [nodes, rootId, openIds]);
    const dragSource = dragSourceId === null ? null : (nodes.find(node => node.id === dragSourceId) ?? null);

    const setRowEl = useCallback(
        (id: string | number) => (el: HTMLLIElement | null) => {
            if (el) {
                rowEls.current.set(id, el);
            } else {
                rowEls.current.delete(id);
            }
        },
        []
    );

    const rectOf = (id: string | number): TreeRect | null => {
        const el = rowEls.current.get(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
    };

    /** Rendered rects of the rows of one list, in row order. */
    const listRects = (parentId: string | number): TreeRect[] =>
        rows
            .filter(row => row.parent === parentId)
            .map(row => rectOf(row.id))
            .filter((rect): rect is TreeRect => rect !== null);

    const rowFromElement = (el: HTMLElement | null): TreeRow | undefined => {
        const rowEl = el?.closest<HTMLLIElement>(`li[${ROW_ID_ATTR}]`);
        const id = rowEl?.getAttribute(ROW_ID_ATTR);
        return id === null || id === undefined ? undefined : rows.find(row => String(row.id) === id);
    };

    const clearOpenTimer = useCallback(() => {
        if (openTimer.current !== null) {
            window.clearTimeout(openTimer.current);
            openTimer.current = null;
        }
        openTimerRow.current = null;
    }, []);

    const setTarget = (next: DropTarget | null) => {
        resolvedTarget.current = next;
        setDropTarget(prev =>
            prev && next && prev.targetId === next.targetId && prev.index === next.index ? prev : next
        );
    };

    const endDrag = useCallback(() => {
        resolvedTarget.current = null;
        clearOpenTimer();
        setDragSourceId(null);
        setDropTarget(null);
    }, [clearOpenTimer]);

    /** Keeps the drop accepted, so the browser delivers it. */
    const acceptDrop = (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    };

    const applyTarget = (next: DropTarget | null) => {
        if (!next || !canDropRow(nodes, rootId, dragSource, next.targetId, canDrop)) {
            setTarget(null);
            return;
        }
        setTarget(next);
    };

    /** Opens a closed droppable row after ~500 ms of hover (old `useDragOver`). */
    const scheduleOpen = (id: string | number) => {
        if (openTimerRow.current === id && openTimer.current !== null) return;
        clearOpenTimer();
        openTimerRow.current = id;
        openTimer.current = window.setTimeout(() => {
            openTimer.current = null;
            openTimerRow.current = null;
            const currentOpenIds = openIdsRef.current;
            if (!currentOpenIds.includes(id)) {
                onOpenChange([...currentOpenIds, id]);
            }
        }, AUTO_OPEN_DELAY);
    };

    const handleToggle = (id: string | number) => {
        const next = openIds.includes(id) ? openIds.filter(openId => openId !== id) : [...openIds, id];
        onOpenChange(next);
    };

    const handlePointerDown = (event: React.MouseEvent<HTMLUListElement>) => {
        // Chromium reports the row as the `dragstart` target even when the press started in an
        // inline rename input, so remember the pressed element and check it on drag start.
        pointerDownEl.current = event.target as HTMLElement;
    };

    const handleDragStart = (event: React.DragEvent<HTMLUListElement>) => {
        const pressed = event.target as HTMLElement;
        if (pressed.closest(EDITABLE_SELECTOR) || pointerDownEl.current?.closest(EDITABLE_SELECTOR)) {
            // Keep text selection working in inline rename inputs.
            event.preventDefault();
            return;
        }
        const row = rowFromElement(pressed);
        if (!row) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(DRAG_MIME, String(row.id));
        setDragSourceId(row.id);
        onDragStart?.(row.id, row);
    };

    const handleDragOver = (event: React.DragEvent<HTMLUListElement>) => {
        if (dragSourceId === null) return;
        // Accept every `dragover` over the tree, not only ones over a resolved target (react-dnd's
        // HTML5Backend accepted the whole page). Resolution below only decides where a drop lands;
        // accepting conditionally loses the drop whenever the row under the pointer changes.
        acceptDrop(event);

        const over = event.target as HTMLElement;
        const row = rowFromElement(over);
        if (!row) {
            applyTarget({ targetId: rootId, index: getInnerIndex(listRects(rootId), event.clientY) });
            return;
        }

        const rect = rowEls.current.get(row.id)?.getBoundingClientRect();
        if (!rect) return;
        const hasList = row.hasChild && row.isOpen;
        applyTarget(
            resolveDropTarget({
                row,
                pointerY: event.clientY,
                rowRect: { top: rect.top, bottom: rect.bottom },
                dropTargetOffset,
                childRowRects: hasList ? listRects(row.id) : [],
                parentRowRects: listRects(row.parent),
                canDropParent: canDropRow(nodes, rootId, dragSource, row.parent, canDrop),
            })
        );

        if (row.droppable && !row.isOpen) {
            scheduleOpen(row.id);
        } else {
            clearOpenTimer();
        }
    };

    const handleDragLeave = (event: React.DragEvent<HTMLUListElement>) => {
        const related = event.relatedTarget as Node | null;
        if (related && containerRef.current?.contains(related)) return;
        // Only the insertion point is dropped here: `dragend` always ends the session.
        setTarget(null);
    };

    const handleDrop = (event: React.DragEvent<HTMLUListElement>) => {
        const target = resolvedTarget.current;
        if (dragSourceId === null || target === null) {
            endDrag();
            return;
        }
        event.preventDefault();
        const options: TreeDropOptions = {
            dragSourceId,
            dragSource: nodes.find(node => node.id === dragSourceId) ?? null,
            dropTargetId: target.targetId,
            dropTarget: nodes.find(node => node.id === target.targetId) ?? null,
            destinationIndex: target.index,
        };
        onDrop?.(options);
        endDrag();
    };

    const showPlaceholder = (parentId: string | number, index: number) =>
        dragSourceId !== null &&
        dropTarget !== null &&
        dropTarget.targetId === parentId &&
        dropTarget.index === index;

    const placeholderRow = (parentId: string | number, index: number, depth: number) => (
        <li
            key={`placeholder-${String(parentId)}-${index}`}
            role="presentation"
            aria-hidden
            {...{ [PLACEHOLDER_ATTR]: "" }}
        >
            {placeholderRender && dragSource ? placeholderRender(dragSource, { depth }) : null}
        </li>
    );

    const renderRows = (parentId: string | number, depth: number) => {
        const children = rows.filter(row => row.parent === parentId);
        const elements: React.ReactNode[] = [];
        children.forEach((row, index) => {
            if (showPlaceholder(row.parent, index)) {
                elements.push(placeholderRow(row.parent, index, depth));
            }
            elements.push(
                <li
                    key={String(row.id)}
                    role="listitem"
                    draggable
                    ref={setRowEl(row.id)}
                    {...{ [ROW_ID_ATTR]: String(row.id) }}
                >
                    {render(row, {
                        depth: row.depth,
                        isOpen: row.isOpen,
                        hasChild: row.hasChild,
                        isDragging: dragSourceId === row.id,
                        isDropTarget: dropTarget?.targetId === row.id,
                        onToggle: () => handleToggle(row.id),
                    })}
                    {row.hasChild && row.isOpen ? (
                        <ul role="list">{renderRows(row.id, row.depth + 1)}</ul>
                    ) : null}
                </li>
            );
        });
        if (showPlaceholder(parentId, children.length)) {
            elements.push(placeholderRow(parentId, children.length, depth));
        }
        return elements;
    };

    return (
        <ul
            ref={containerRef}
            className="tree"
            role="list"
            onMouseDownCapture={handlePointerDown}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={endDrag}
        >
            {renderRows(rootId, 0)}
        </ul>
    );
};
