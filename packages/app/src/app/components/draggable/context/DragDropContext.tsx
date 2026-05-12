// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { DragDirection, ReorderResult, ItemMoveResult } from "../types";
import "../Draggable.css";

// ============================================================================
// TYPES
// ============================================================================

interface ContainerConfig {
    id: string;
    acceptsTypes: string[];
    direction?: DragDirection;
    element: HTMLElement;
    onReorder?: (result: ReorderResult) => void;
    onItemMove?: (result: ItemMoveResult) => void;
}

interface DragState {
    isDragging: boolean;
    draggedId: string | null;
    draggedType: string | null;
    sourceContainerId: string | null;
}

interface DragData {
    id: string;
    type: string;
    sourceContainerId: string;
    sourceIndex: number;
    element: HTMLElement;
    rect: DOMRect;
    content: React.ReactNode;
    offsetX: number;
    offsetY: number;
    clientX: number;
    clientY: number;
}

interface DropTarget {
    containerId: string;
    index: number;
}

/** React-rendered gap for vertical lists — avoids imperative DOM that breaks React child order (remounts / state loss). */
export interface DragPlaceholderSlot {
    containerId: string;
    beforeChildIndex: number;
    width: string;
    height: string;
    margin: string;
}

interface DragDropContextValue {
    dragState: DragState;
    /** When set, matching vertical `Container` inserts this placeholder in the React tree (not raw DOM). */
    placeholderSlot: DragPlaceholderSlot | null;
    startDrag: (
        id: string,
        type: string,
        containerId: string,
        pointerDownEvent: React.MouseEvent,
        element: HTMLElement,
        content: React.ReactNode,
        placeholderTag?: keyof HTMLElementTagNameMap,
        /** If set (e.g. drag started after an activation threshold), cursor position for the floating preview; grab offset still uses pointerDownEvent. */
        activateAt?: { clientX: number; clientY: number }
    ) => void;
    registerContainer: (
        id: string,
        acceptsTypes: string[],
        direction: DragDirection | undefined,
        element: HTMLElement | null,
        onReorder?: (result: ReorderResult) => void,
        onItemMove?: (result: ItemMoveResult) => void
    ) => void;
    unregisterContainer: (id: string, element?: HTMLElement | null) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCROLL_THRESHOLD = 60; // Distance from edge to trigger scroll
const SCROLL_SPEED = 12; // Pixels per frame
export const DND_PLACEHOLDER_CLASS = "dnd-placeholder";
const SCROLLABLE_REGEX = /(auto|scroll)/;
/** Extra hit area (px) around vertical list containers — empty columns are often too thin for elementsFromPoint. */
const VERTICAL_DROP_HIT_PADDING = 32;

function dropIndexToBeforeChildIndex(
    k: number,
    sourceIndex: number,
    childCount: number,
    sameContainer: boolean
): number {
    if (!sameContainer) {
        if (k >= childCount) return childCount;
        return k;
    }
    const m = childCount - 1;
    if (k >= m) return childCount;
    return k < sourceIndex ? k : k + 1;
}

function placeholderStylesFromElement(rect: DOMRect, element: HTMLElement, isHorizontal: boolean) {
    const computedStyle = window.getComputedStyle(element);
    return {
        width: isHorizontal ? `${rect.width}px` : "100%",
        height: `${rect.height}px`,
        margin: computedStyle.margin,
    };
}

// ============================================================================
// CONTEXT
// ============================================================================

const DragDropContext = createContext<DragDropContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function DragDropProvider({ children }: { children: React.ReactNode }) {
    // State
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedId: null,
        draggedType: null,
        sourceContainerId: null,
    });
    const [dragData, setDragData] = useState<DragData | null>(null);
    const [placeholderSlot, setPlaceholderSlot] = useState<DragPlaceholderSlot | null>(null);

    // Refs
    const containersRef = useRef<Map<string, ContainerConfig>>(new Map());
    const placeholderRef = useRef<HTMLElement | null>(null);
    const dropTargetRef = useRef<DropTarget | null>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const mousePositionRef = useRef({ x: 0, y: 0 });
    const portalRef = useRef<HTMLDivElement | null>(null);
    const dragDataRef = useRef<DragData | null>(null);

    // ============================================================================
    // PLACEHOLDER MANAGEMENT
    // ============================================================================

    /**
     * Creates the placeholder element with styles matching the dragged element.
     * Base styles come from CSS (.dnd-placeholder), only dynamic dimensions set here.
     */
    const createPlaceholder = useCallback(
        (
            rect: DOMRect,
            element: HTMLElement,
            tagName: keyof HTMLElementTagNameMap = "div",
            isHorizontal = false
        ) => {
            const placeholder = document.createElement(tagName);
            placeholder.className = DND_PLACEHOLDER_CLASS;

            const computedStyle = window.getComputedStyle(element);

            // Only set dynamic properties - base styles are in Draggable.css
            // Vertical containers: width 100%, Horizontal containers: fixed width
            placeholder.style.width = isHorizontal ? `${rect.width}px` : "100%";
            placeholder.style.height = `${rect.height}px`;
            placeholder.style.margin = computedStyle.margin;

            return placeholder;
        },
        []
    );

    /**
     * Removes placeholder from DOM
     */
    const removePlaceholder = useCallback(() => {
        if (placeholderRef.current) {
            placeholderRef.current.remove();
            placeholderRef.current = null;
        }
        setPlaceholderSlot(null);
    }, []);

    /**
     * First direct child that is not a draggable row (no `data-id`), e.g. "add column" on the board.
     * Placeholder must insert before this so it never appears after trailing UI.
     */
    const getTrailingStaticBoundary = useCallback((container: HTMLElement, placeholder: HTMLElement) => {
        for (const child of Array.from(container.children)) {
            if (child === placeholder) continue;
            if (child instanceof HTMLElement && child.classList.contains(DND_PLACEHOLDER_CLASS)) continue;
            if (child instanceof HTMLElement && !child.hasAttribute("data-id")) {
                return child;
            }
        }
        return null;
    }, []);

    /**
     * Inserts placeholder at specified position in container
     */
    const insertPlaceholder = useCallback(
        (container: HTMLElement, index: number, draggables: HTMLElement[]) => {
            if (!placeholderRef.current) return;

            const placeholder = placeholderRef.current;
            const targetSibling = index < draggables.length ? draggables[index] : null;
            const endBoundary =
                targetSibling === null ? getTrailingStaticBoundary(container, placeholder) : null;
            const insertBeforeNode = targetSibling ?? endBoundary;

            // Skip if already in correct position (avoid unnecessary DOM operations)
            if (placeholder.parentElement === container) {
                if (insertBeforeNode === null) {
                    if (placeholder.nextElementSibling === null) {
                        return; // Already at end (no trailing UI)
                    }
                } else if (placeholder.nextElementSibling === insertBeforeNode) {
                    return; // Already before target / boundary
                }
            }

            if (insertBeforeNode) {
                container.insertBefore(placeholder, insertBeforeNode);
            } else {
                container.appendChild(placeholder);
            }
        },
        [getTrailingStaticBoundary]
    );

    // ============================================================================
    // CONTAINER REGISTRATION
    // ============================================================================

    const registerContainer = useCallback(
        (
            id: string,
            acceptsTypes: string[],
            direction: DragDirection | undefined,
            element: HTMLElement | null,
            onReorder?: (result: ReorderResult) => void,
            onItemMove?: (result: ItemMoveResult) => void
        ) => {
            if (!element) return;

            // Check if there's an existing registration with a different element still in the DOM.
            // This prevents portal-rendered containers from overwriting the original registration.
            const existing = containersRef.current.get(id);
            if (existing && existing.element !== element && existing.element.isConnected) {
                return;
            }

            containersRef.current.set(id, {
                id,
                acceptsTypes,
                direction,
                element,
                onReorder,
                onItemMove,
            });
        },
        []
    );

    const unregisterContainer = useCallback((id: string, element?: HTMLElement | null) => {
        // Only unregister if no element provided, or if the element matches the registered one.
        // This prevents portal-rendered containers from unregistering the original container.
        const registered = containersRef.current.get(id);
        if (!element || !registered || registered.element === element) {
            containersRef.current.delete(id);
        }
    }, []);

    // ============================================================================
    // DROP TARGET CALCULATION
    // ============================================================================

    /**
     * Finds the container under the cursor that accepts the dragged type
     */
    const findTargetContainer = useCallback((clientX: number, clientY: number, draggedType: string): ContainerConfig | null => {
        const elementsUnderCursor = document.elementsFromPoint(clientX, clientY);

        for (const el of elementsUnderCursor) {
            const containerEl = (el as HTMLElement).closest("[data-container-id]");
            if (containerEl) {
                const containerId = containerEl.getAttribute("data-container-id");
                if (containerId) {
                    const config = containersRef.current.get(containerId);
                    if (config && config.acceptsTypes.includes(draggedType)) {
                        return config;
                    }
                }
            }
        }

        // Empty (or very short) vertical lists: the task Container can have almost no paintable
        // area, so elementsFromPoint never hits it. Use an expanded bounding box; if several
        // columns overlap (padding zone), pick the one whose center is closest to the pointer.
        const pad = VERTICAL_DROP_HIT_PADDING;
        let best: ContainerConfig | null = null;
        let bestDist = Infinity;
        for (const config of containersRef.current.values()) {
            if (!config.acceptsTypes.includes(draggedType)) continue;
            if (config.direction !== "vertical") continue;
            const el = config.element;
            if (!el.isConnected) continue;
            const r = el.getBoundingClientRect();
            if (
                clientX < r.left - pad ||
                clientX > r.right + pad ||
                clientY < r.top - pad ||
                clientY > r.bottom + pad
            ) {
                continue;
            }
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
            if (dist < bestDist) {
                bestDist = dist;
                best = config;
            }
        }
        return best;
    }, []);

    /**
     * Gets all draggable children of a container (excluding the placeholder and dragged element)
     */
    const getDraggableChildren = useCallback(
        (container: HTMLElement, draggedId: string | null): HTMLElement[] => {
            return Array.from(
                container.querySelectorAll(`:scope > [data-id]:not(.${DND_PLACEHOLDER_CLASS})`)
            ).filter(el => {
                const id = el.getAttribute("data-id");
                return id !== draggedId;
            }) as HTMLElement[];
        },
        []
    );

    /**
     * Calculates the drop index based on cursor position and 50% threshold
     */
    const calculateDropIndex = useCallback(
        (clientX: number, clientY: number, container: ContainerConfig, draggables: HTMLElement[]): number => {
            const isHorizontal = container.direction === "horizontal";

            for (let i = 0; i < draggables.length; i++) {
                const rect = draggables[i].getBoundingClientRect();

                if (isHorizontal) {
                    // For horizontal: use X position and check 50% threshold
                    const midpoint = rect.left + rect.width / 2;
                    if (clientX < midpoint) {
                        return i;
                    }
                } else {
                    // For vertical: use Y position and check 50% threshold
                    const midpoint = rect.top + rect.height / 2;
                    if (clientY < midpoint) {
                        return i;
                    }
                }
            }

            // If we're past all elements, drop at the end
            return draggables.length;
        },
        []
    );

    /**
     * Updates the drop target and placeholder position
     */
    const updateDropTarget = useCallback(
        (clientX: number, clientY: number) => {
            if (!dragData) return;

            const targetContainer = findTargetContainer(clientX, clientY, dragData.type);

            if (!targetContainer) {
                // No valid container under cursor - remove placeholder
                removePlaceholder();
                dropTargetRef.current = null;
                return;
            }

            // Get draggable children (excluding the dragged element)
            const draggables = getDraggableChildren(targetContainer.element, dragData.id);

            // Calculate drop index based on 50% threshold
            const dropIndex = calculateDropIndex(clientX, clientY, targetContainer, draggables);

            // Check if target changed
            const currentTarget = dropTargetRef.current;
            const targetChanged =
                !currentTarget ||
                currentTarget.containerId !== targetContainer.id ||
                currentTarget.index !== dropIndex;

            if (targetChanged) {
                // Update drop target
                dropTargetRef.current = {
                    containerId: targetContainer.id,
                    index: dropIndex,
                };

                const isHorizontal = targetContainer.direction === "horizontal";
                const childCount = getDraggableChildren(targetContainer.element, null).length;
                const sameContainer = targetContainer.id === dragData.sourceContainerId;
                const beforeChildIndex = dropIndexToBeforeChildIndex(
                    dropIndex,
                    dragData.sourceIndex,
                    childCount,
                    sameContainer
                );

                if (isHorizontal) {
                    setPlaceholderSlot(null);
                    if (!placeholderRef.current) {
                        placeholderRef.current = createPlaceholder(
                            dragData.rect,
                            dragData.element,
                            "div",
                            true
                        );
                    } else {
                        placeholderRef.current.style.width = `${dragData.rect.width}px`;
                    }
                    insertPlaceholder(targetContainer.element, dropIndex, draggables);
                } else {
                    if (placeholderRef.current) {
                        placeholderRef.current.remove();
                        placeholderRef.current = null;
                    }
                    setPlaceholderSlot({
                        containerId: targetContainer.id,
                        beforeChildIndex,
                        ...placeholderStylesFromElement(dragData.rect, dragData.element, false),
                    });
                }
            }
        },
        [
            dragData,
            findTargetContainer,
            getDraggableChildren,
            calculateDropIndex,
            removePlaceholder,
            createPlaceholder,
            insertPlaceholder,
        ]
    );

    // ============================================================================
    // AUTO-SCROLL
    // ============================================================================

    /**
     * Finds scrollable containers under the cursor and scrolls them
     */
    const performAutoScroll = useCallback(() => {
        const { x, y } = mousePositionRef.current;
        const elementsUnderCursor = document.elementsFromPoint(x, y);
        let didScroll = false;

        for (const el of elementsUnderCursor) {
            if (!(el instanceof HTMLElement)) continue;

            const style = window.getComputedStyle(el);
            const isVerticallyScrollable = SCROLLABLE_REGEX.test(style.overflow + style.overflowY);
            const isHorizontallyScrollable = SCROLLABLE_REGEX.test(style.overflow + style.overflowX);

            if (!isVerticallyScrollable && !isHorizontallyScrollable) continue;

            const rect = el.getBoundingClientRect();

            // Check vertical edges
            if (isVerticallyScrollable) {
                const canScrollUp = el.scrollTop > 0;
                const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight;

                if (y < rect.top + SCROLL_THRESHOLD && canScrollUp) {
                    // Near top edge - scroll up
                    el.scrollTop -= SCROLL_SPEED;
                    didScroll = true;
                } else if (y > rect.bottom - SCROLL_THRESHOLD && canScrollDown) {
                    // Near bottom edge - scroll down
                    el.scrollTop += SCROLL_SPEED;
                    didScroll = true;
                }
            }

            // Check horizontal edges
            if (isHorizontallyScrollable) {
                const canScrollLeft = el.scrollLeft > 0;
                const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth;

                if (x < rect.left + SCROLL_THRESHOLD && canScrollLeft) {
                    // Near left edge - scroll left
                    el.scrollLeft -= SCROLL_SPEED;
                    didScroll = true;
                } else if (x > rect.right - SCROLL_THRESHOLD && canScrollRight) {
                    // Near right edge - scroll right
                    el.scrollLeft += SCROLL_SPEED;
                    didScroll = true;
                }
            }

            // Only scroll one container at a time
            if (didScroll) break;
        }

        // Update placeholder position after scroll
        if (didScroll) {
            updateDropTarget(x, y);
        }

        return didScroll;
    }, [updateDropTarget]);

    /**
     * Auto-scroll animation loop
     */
    const startAutoScrollLoop = useCallback(() => {
        const loop = () => {
            if (!dragState.isDragging) return;

            performAutoScroll();
            scrollAnimationRef.current = requestAnimationFrame(loop);
        };

        scrollAnimationRef.current = requestAnimationFrame(loop);
    }, [dragState.isDragging, performAutoScroll]);

    const stopAutoScrollLoop = useCallback(() => {
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }
    }, []);

    // ============================================================================
    // DRAG LIFECYCLE
    // ============================================================================

    /**
     * Starts the drag operation
     */
    const startDrag = useCallback(
        (
            id: string,
            type: string,
            containerId: string,
            pointerDownEvent: React.MouseEvent,
            element: HTMLElement,
            content: React.ReactNode,
            placeholderTag: keyof HTMLElementTagNameMap = "div",
            activateAt?: { clientX: number; clientY: number }
        ) => {
            const rect = element.getBoundingClientRect();
            const container = containersRef.current.get(containerId);

            const clientX = activateAt?.clientX ?? pointerDownEvent.clientX;
            const clientY = activateAt?.clientY ?? pointerDownEvent.clientY;

            // Calculate source index
            let sourceIndex = 0;
            if (container) {
                const siblings = getDraggableChildren(container.element, null);
                sourceIndex = siblings.findIndex(el => el.getAttribute("data-id") === id);
            }

            // Create drag data
            const newDragData: DragData = {
                id,
                type,
                sourceContainerId: containerId,
                sourceIndex,
                element,
                rect,
                content,
                offsetX: pointerDownEvent.clientX - rect.left,
                offsetY: pointerDownEvent.clientY - rect.top,
                clientX,
                clientY,
            };

            // Update state and ref
            dragDataRef.current = newDragData;
            setDragData(newDragData);
            setDragState({
                isDragging: true,
                draggedId: id,
                draggedType: type,
                sourceContainerId: containerId,
            });

            // Initialize mouse position
            mousePositionRef.current = { x: clientX, y: clientY };

            // Placeholder: horizontal board uses imperative DOM (columns + trailing UI); vertical lists use
            // React slot in Container so child order matches the fiber tree (avoids TaskCard remounts).
            if (container) {
                const draggables = getDraggableChildren(container.element, id);
                const isHorizontal = container.direction === "horizontal";
                const childCount = getDraggableChildren(container.element, null).length;

                if (isHorizontal) {
                    setPlaceholderSlot(null);
                    placeholderRef.current = createPlaceholder(rect, element, placeholderTag, true);
                    insertPlaceholder(container.element, sourceIndex, draggables);
                } else {
                    if (placeholderRef.current) {
                        placeholderRef.current.remove();
                        placeholderRef.current = null;
                    }
                    const beforeChildIndex = dropIndexToBeforeChildIndex(
                        sourceIndex,
                        sourceIndex,
                        childCount,
                        true
                    );
                    setPlaceholderSlot({
                        containerId,
                        beforeChildIndex,
                        ...placeholderStylesFromElement(rect, element, false),
                    });
                }
            }

            // Source visibility/layout: handled by `.draggable.draggable--placeholder` in Draggable.css
            // so it survives React commits (imperative styles here were cleared on re-render).

            // Set initial drop target
            dropTargetRef.current = {
                containerId,
                index: sourceIndex,
            };
        },
        [getDraggableChildren, createPlaceholder, insertPlaceholder]
    );

    /**
     * Handles mouse move during drag
     */
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            mousePositionRef.current = { x: e.clientX, y: e.clientY };

            // Update portal position directly via ref (avoids React re-render)
            if (portalRef.current && dragDataRef.current) {
                portalRef.current.style.left = `${e.clientX - dragDataRef.current.offsetX}px`;
                portalRef.current.style.top = `${e.clientY - dragDataRef.current.offsetY}px`;
            }

            // Update drop target and placeholder
            updateDropTarget(e.clientX, e.clientY);
        },
        [updateDropTarget]
    );

    /**
     * Handles mouse up - finishes the drag operation
     */
    const handleMouseUp = useCallback(() => {
        if (!dragData) return;

        const dropTarget = dropTargetRef.current;
        const targetContainer = dropTarget ? containersRef.current.get(dropTarget.containerId) : null;

        // Calculate final indices and trigger callbacks
        if (dropTarget && targetContainer) {
            if (dropTarget.containerId === dragData.sourceContainerId) {
                // Reorder within same container
                // Note: dropTarget.index is already calculated on the filtered array
                // (without the dragged item), so no adjustment is needed
                const fromIndex = dragData.sourceIndex;
                const toIndex = dropTarget.index;

                if (fromIndex !== toIndex) {
                    targetContainer.onReorder?.({
                        itemId: dragData.id,
                        fromIndex,
                        toIndex,
                    });
                }
            } else {
                // Move to different container
                targetContainer.onItemMove?.({
                    itemId: dragData.id,
                    fromContainerId: dragData.sourceContainerId,
                    toContainerId: dropTarget.containerId,
                    fromIndex: dragData.sourceIndex,
                    toIndex: dropTarget.index,
                });
            }
        }

        // Cleanup
        removePlaceholder();
        stopAutoScrollLoop();
        dropTargetRef.current = null;

        // Reset state and ref
        dragDataRef.current = null;
        setDragState({
            isDragging: false,
            draggedId: null,
            draggedType: null,
            sourceContainerId: null,
        });
        setDragData(null);
    }, [dragData, removePlaceholder, stopAutoScrollLoop]);

    // ============================================================================
    // EFFECT: Event Listeners
    // ============================================================================

    useEffect(() => {
        if (!dragState.isDragging) return;

        // Add event listeners
        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        window.addEventListener("mouseup", handleMouseUp);

        // Start auto-scroll loop
        startAutoScrollLoop();

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            stopAutoScrollLoop();
        };
    }, [dragState.isDragging, handleMouseMove, handleMouseUp, startAutoScrollLoop, stopAutoScrollLoop]);

    // ============================================================================
    // RENDER
    // ============================================================================

    // Memoize context value to prevent unnecessary re-renders of consumers
    const contextValue = useMemo<DragDropContextValue>(
        () => ({
            dragState,
            placeholderSlot,
            startDrag,
            registerContainer,
            unregisterContainer,
        }),
        [dragState, placeholderSlot, startDrag, registerContainer, unregisterContainer]
    );

    return (
        <DragDropContext.Provider value={contextValue}>
            {children}

            {/* Dragged element portal - position updated via ref in handleMouseMove */}
            {dragData &&
                createPortal(
                    <div
                        ref={portalRef}
                        style={{
                            position: "fixed",
                            pointerEvents: "none",
                            zIndex: 10000,
                            left: dragData.clientX - dragData.offsetX,
                            top: dragData.clientY - dragData.offsetY,
                            width: dragData.rect.width,
                            height: dragData.rect.height,
                            opacity: 0.95,
                        }}
                    >
                        {dragData.content}
                    </div>,
                    document.body
                )}
        </DragDropContext.Provider>
    );
}

// ============================================================================
// HOOK
// ============================================================================

export function useDragDrop(): DragDropContextValue {
    const context = useContext(DragDropContext);
    if (!context) {
        throw new Error("useDragDrop must be used within a DragDropProvider");
    }
    return context;
}
