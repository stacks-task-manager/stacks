// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { Children, useEffect, useMemo, useRef, ElementType } from "react";
import { DND_PLACEHOLDER_CLASS, useDragDrop } from "./context/DragDropContext";
import { DragDirection, ReorderResult, ItemMoveResult } from "./types";

interface ContainerProps {
    /** HTML element or component to render as (default: 'div') */
    as?: ElementType;
    /** Unique identifier for this container */
    id: string;
    /** Type identifier - draggables must match this type */
    type: string;
    /** Optional array of accepted types (defaults to [type]) */
    acceptsTypes?: string[];
    /** Optional direction constraint: 'horizontal' or 'vertical' */
    direction?: DragDirection;
    /** Callback when items are reordered within this container (called on drop) */
    onReorder?: (result: ReorderResult) => void;
    /** Callback when an item moves from another container into this one (called on drop) */
    onItemMove?: (result: ItemMoveResult) => void;
    /** Additional CSS class names */
    className?: string;
    /** Content to render (typically Draggable components) */
    children: React.ReactNode;
    /** Any additional props to pass to the element */
    [key: string]: unknown;
}

export function Container({
    as: Component = "div",
    id,
    type,
    acceptsTypes,
    direction,
    onReorder,
    onItemMove,
    className = "",
    children,
    ...rest
}: ContainerProps) {
    const { dragState, placeholderSlot, registerContainer, unregisterContainer } = useDragDrop();
    const containerRef = useRef<HTMLElement | null>(null);

    const acceptedTypes = acceptsTypes || [type];

    useEffect(() => {
        registerContainer(id, acceptedTypes, direction, containerRef.current, onReorder, onItemMove);
    }, [id, acceptedTypes, direction, onReorder, onItemMove, registerContainer]);

    useEffect(() => {
        const element = containerRef.current;
        return () => unregisterContainer(id, element);
    }, [id, unregisterContainer]);

    const isValidDropTarget =
        dragState.isDragging && dragState.draggedType && acceptedTypes.includes(dragState.draggedType);

    const directionClass = direction ? `container--${direction}` : "";

    const renderedChildren = useMemo(() => {
        const slot =
            direction !== "horizontal" && placeholderSlot?.containerId === id ? placeholderSlot : null;
        if (!slot) return children;

        const childArray = Children.toArray(children);
        const phStyle = {
            width: slot.width,
            height: slot.height,
            margin: slot.margin,
        };
        const ph = (
            <div key="__dnd-placeholder" className={DND_PLACEHOLDER_CLASS} style={phStyle} />
        );

        const withLeading = childArray.flatMap((child, i) => {
            if (slot.beforeChildIndex === i) {
                return [ph, child];
            }
            return [child];
        });

        if (slot.beforeChildIndex === childArray.length) {
            return [...withLeading, <div key="__dnd-placeholder-end" className={DND_PLACEHOLDER_CLASS} style={phStyle} />];
        }

        return withLeading;
    }, [children, direction, id, placeholderSlot]);

    return (
        <Component
            ref={containerRef}
            id={id}
            className={`container ${directionClass} ${
                isValidDropTarget ? "container--active" : ""
            } ${className}`}
            data-container-id={id}
            data-type={type}
            data-direction={direction}
            {...rest}
        >
            {renderedChildren}
        </Component>
    );
}
