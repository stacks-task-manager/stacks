// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { Children, cloneElement, isValidElement, useEffect, useRef, ElementType } from "react";
import { useDragDrop } from "./context/DragDropContext";
import "./Draggable.css";

/** Pixels the pointer must move before a drag starts; below this, the gesture stays a click. */
const DEFAULT_ACTIVATION_DISTANCE_PX = 5;

interface DraggableProps {
    /** HTML element or component to render as (default: 'div') */
    as?: ElementType;
    /** HTML element type for the placeholder (default: 'div') */
    placeholderAs?: keyof HTMLElementTagNameMap;
    /** Unique identifier for this draggable item */
    id: string;
    /** Type identifier - must match Container's type or acceptsTypes */
    type: string;
    /** ID of the parent Container */
    containerId: string;
    /** Content to render */
    children: React.ReactNode;
    /** Additional CSS class names */
    className?: string;
    /** Optional class name of the drag handle element. If provided, only that element initiates drag. */
    handleClassName?: string;
    /** Minimum pointer movement (px) before drag starts. Use `0` to start on mousedown. Default: 5 */
    activationDistance?: number;
    /** Any additional props to pass to the element */
    [key: string]: unknown;
}

export function Draggable({
    as: Component = "div",
    placeholderAs = "div",
    id,
    type,
    containerId,
    children,
    className = "",
    handleClassName,
    activationDistance = DEFAULT_ACTIVATION_DISTANCE_PX,
    ...rest
}: DraggableProps) {
    const { dragState, startDrag } = useDragDrop();
    const elementRef = useRef<HTMLElement | null>(null);
    const pendingPointerCleanupRef = useRef<(() => void) | null>(null);

    const isBeingDragged =
        dragState.isDragging && dragState.draggedId === id && dragState.sourceContainerId === containerId;

    useEffect(() => {
        return () => {
            pendingPointerCleanupRef.current?.();
            pendingPointerCleanupRef.current = null;
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!elementRef.current || e.button !== 0) return;

        // If handleClassName is specified, only start drag if clicking on the handle
        if (handleClassName) {
            const target = e.target as HTMLElement;
            const isHandle =
                target.classList.contains(handleClassName) || target.closest(`.${handleClassName}`) !== null;
            if (!isHandle) return;
        }

        const el = elementRef.current;
        // Unique keys so the portal preview is a separate subtree — sharing the same React
        // element references as the source would let React move fibers and remount UI (e.g. Collapse).
        const portalContent = (
            <Component className={`draggable draggable--dragging ${className}`}>
                {Children.map(children, (child, index) =>
                    isValidElement(child)
                        ? cloneElement(child, {
                              key: `dnd-preview-${id}-${String(child.key ?? index)}`,
                          })
                        : child
                )}
            </Component>
        );

        if (activationDistance <= 0) {
            startDrag(id, type, containerId, e, el, portalContent, placeholderAs);
            return;
        }

        pendingPointerCleanupRef.current?.();

        const downX = e.clientX;
        const downY = e.clientY;
        const thresholdSq = activationDistance * activationDistance;

        const cleanup = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (pendingPointerCleanupRef.current === cleanup) {
                pendingPointerCleanupRef.current = null;
            }
        };

        const onUp = () => {
            cleanup();
        };

        const onMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - downX;
            const dy = moveEvent.clientY - downY;
            if (dx * dx + dy * dy < thresholdSq) return;

            cleanup();
            startDrag(id, type, containerId, e, el, portalContent, placeholderAs, {
                clientX: moveEvent.clientX,
                clientY: moveEvent.clientY,
            });
        };

        pendingPointerCleanupRef.current = cleanup;
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <Component
            ref={elementRef}
            className={`draggable ${isBeingDragged ? "draggable--placeholder" : ""} ${className}`}
            onMouseDown={handleMouseDown}
            data-id={id}
            data-type={type}
            data-container-id={containerId}
            {...rest}
        >
            {children}
        </Component>
    );
}
