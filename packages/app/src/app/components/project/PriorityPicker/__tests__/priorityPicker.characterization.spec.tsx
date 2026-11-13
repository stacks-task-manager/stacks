import { fireEvent, render, screen } from "@testing-library/react";
import { PRIORITY } from "@stacks/types";
import React from "react";

import { PriorityPicker } from "../PriorityPicker";

const mockSetPriority = jest.fn();
const mockUseElementHotkey = jest.fn();

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("@blueprintjs/core", () => ({
    Popover: ({ children, content }: any) => (
        <>
            {children}
            {content}
        </>
    ),
}));
jest.mock("app/hooks", () => ({
    useElementHotkey: (...args: unknown[]) => mockUseElementHotkey(...args),
}));
jest.mock("app/store/actions", () => ({
    TasksActions: { setPriority: (...args: unknown[]) => mockSetPriority(...args) },
}));
jest.mock("app/components/common", () => ({
    RoundButton: ({ tooltip, testId, onClick, ...props }: any) => (
        <button data-testid={testId ?? "priority-button"} onClick={onClick} {...props}>
            {tooltip ?? "priority"}
        </button>
    ),
}));
jest.mock("app/components/project/PriorityChip/PriorityChip", () => ({
    PriorityChip: ({ priority, onRemove, id, testId }: any) => (
        <button id={id} data-testid={testId ?? "priority-chip"} onClick={onRemove}>
            {priority}
        </button>
    ),
}));
jest.mock("app/components/project/PriorityMenu/PriorityMenu", () => {
    const { PRIORITY } = jest.requireActual("@stacks/types");
    return {
        PriorityMenu: ({ onChange }: any) => (
            <button data-testid="select-high" onClick={event => onChange(PRIORITY.HIGH, event)}>
                High
            </button>
        ),
    };
});

describe("priority picker characterization", () => {
    beforeEach(() => {
        mockSetPriority.mockClear();
        mockUseElementHotkey.mockClear();
    });

    it("updates a task priority through PriorityPicker", () => {
        render(<PriorityPicker taskId="task-1" value={PRIORITY.LOW} showEmpty />);

        fireEvent.click(screen.getByTestId("priority-button"));
        fireEvent.click(screen.getByTestId("select-high"));

        expect(mockSetPriority).toHaveBeenCalledWith("task-1", PRIORITY.HIGH);
    });

    it("supports callback mode without a task id", () => {
        const onChange = jest.fn();
        render(<PriorityPicker value={null} showEmpty onChange={onChange} />);

        fireEvent.click(screen.getByTestId("priority-button"));
        fireEvent.click(screen.getByTestId("select-high"));

        expect(onChange).toHaveBeenCalledWith(PRIORITY.HIGH);
    });

    it("hides an empty priority unless showEmpty is set", () => {
        const { rerender } = render(<PriorityPicker value={PRIORITY.NONE} />);
        expect(screen.queryByTestId("priority-button")).not.toBeInTheDocument();

        rerender(<PriorityPicker value={PRIORITY.NONE} showEmpty />);
        expect(screen.getByTestId("priority-button")).toBeInTheDocument();
    });

    it("preserves task-details hotkey and stable IDs", () => {
        render(
            <PriorityPicker
                taskId="task-1"
                value={PRIORITY.MEDIUM}
                canClear
                id="td-priority"
                testId="task-details-priority"
                hotkey="shift+p"
            />
        );

        expect(mockUseElementHotkey).toHaveBeenCalledWith("shift+p", "td-priority");
        expect(screen.getByTestId("task-details-priority")).toHaveAttribute("id", "td-priority");
    });
});
