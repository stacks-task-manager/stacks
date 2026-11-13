// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { render } from "@testing-library/react";
import React, { useEffect } from "react";
import { Container } from "../Container";
import { DragPlaceholderSlot } from "../context/DragDropContext";

const mockUseDragDrop = jest.fn();

jest.mock("../context/DragDropContext", () => ({
    DND_PLACEHOLDER_CLASS: "dnd-placeholder",
    useDragDrop: () => mockUseDragDrop(),
}));

const mounted = new Map<string, number>();

const Item = ({ id }: { id: string }) => {
    useEffect(() => {
        mounted.set(id, (mounted.get(id) ?? 0) + 1);
    }, [id]);
    return <div data-testid={`item-${id}`}>{id}</div>;
};

const contextValue = (placeholderSlot: DragPlaceholderSlot | null) => ({
    dragState: { isDragging: true, draggedId: "task-1", draggedType: "task", sourceContainerId: "stack" },
    placeholderSlot,
    registerContainer: jest.fn(),
    unregisterContainer: jest.fn(),
});

const items = [
    <Item key="task-1" id="task-1" />,
    <Item key="task-2" id="task-2" />,
    <Item key="task-3" id="task-3" />,
];

const placeholder: DragPlaceholderSlot = {
    containerId: "stack",
    beforeChildIndex: 1,
    width: "100%",
    height: "100px",
    margin: "0px",
};

describe("Container drag placeholder", () => {
    beforeEach(() => {
        mounted.clear();
        mockUseDragDrop.mockReturnValue(contextValue(null));
    });

    it("preserves child instances when inserting and moving the placeholder", () => {
        const { rerender } = render(
            <Container id="stack" type="task" direction="vertical">
                {items}
            </Container>
        );

        mockUseDragDrop.mockReturnValue(contextValue(placeholder));
        rerender(
            <Container id="stack" type="task" direction="vertical">
                {items}
            </Container>
        );

        mockUseDragDrop.mockReturnValue(contextValue({ ...placeholder, beforeChildIndex: 2 }));
        rerender(
            <Container id="stack" type="task" direction="vertical">
                {items}
            </Container>
        );

        expect(Object.fromEntries(mounted)).toEqual({ "task-1": 1, "task-2": 1, "task-3": 1 });
    });
});
