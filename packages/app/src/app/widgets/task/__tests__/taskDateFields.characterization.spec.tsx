import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { TaskDateField } from "../TaskDateField/TaskDateField";

const mockSetStartDate = jest.fn();
const mockSetDueDate = jest.fn();
const mockUseElementHotkey = jest.fn();

jest.mock("app/hooks", () => ({
    useElementHotkey: (...args: unknown[]) => mockUseElementHotkey(...args),
}));
jest.mock("app/store/actions", () => ({
    TasksActions: {
        setStartDate: (...args: unknown[]) => mockSetStartDate(...args),
        setDueDate: (...args: unknown[]) => mockSetDueDate(...args),
    },
}));
jest.mock("app/components/common", () => ({
    DatePickerButton: ({ id, testId, minDate, maxDate, onChange }: any) => (
        <button
            id={id}
            data-testid={testId}
            data-min={minDate?.toISOString()}
            data-max={maxDate?.toISOString()}
            onClick={() => onChange(new Date("2026-05-20T12:00:00.000Z"))}
        />
    ),
}));

describe("task detail date fields characterization", () => {
    beforeEach(() => {
        mockSetStartDate.mockClear();
        mockSetDueDate.mockClear();
        mockUseElementHotkey.mockClear();
    });

    it("updates start date with the start boundary and hotkey", () => {
        const maxDate = new Date("2026-06-01T00:00:00.000Z");
        render(<TaskDateField kind="start" taskId="task-1" value={null} maxDate={maxDate} />);

        expect(mockUseElementHotkey).toHaveBeenCalledWith("shift+g", "td-start-date");
        expect(screen.getByTestId("task-details-start-date")).toHaveAttribute(
            "data-max",
            maxDate.toISOString()
        );
        fireEvent.click(screen.getByTestId("task-details-start-date"));
        expect(mockSetStartDate).toHaveBeenCalledWith("task-1", new Date("2026-05-20T12:00:00.000Z"));
    });

    it("updates due date with the due boundary and hotkey", () => {
        const minDate = new Date("2026-05-01T00:00:00.000Z");
        render(<TaskDateField kind="due" taskId="task-1" value={null} minDate={minDate} />);

        expect(mockUseElementHotkey).toHaveBeenCalledWith("shift+d", "td-due-date");
        expect(screen.getByTestId("task-details-due-date")).toHaveAttribute(
            "data-min",
            minDate.toISOString()
        );
        fireEvent.click(screen.getByTestId("task-details-due-date"));
        expect(mockSetDueDate).toHaveBeenCalledWith("task-1", new Date("2026-05-20T12:00:00.000Z"));
    });
});
