import { fireEvent, render, screen } from "@testing-library/react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React from "react";

import { TaskStatus } from "../TaskStatus";

const mockSetStatus = jest.fn();
const mockUseElementHotkey = jest.fn();
const mockStatus: ITag = {
    id: "status-2",
    title: "Review",
    color: "#ff9900",
    section: TAGSECTION.PROJECTS,
    type: TAGTYPE.STATUS,
    parent: null,
};

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("app/hooks", () => ({
    getTag: () => mockStatus,
    useElementHotkey: (...args: unknown[]) => mockUseElementHotkey(...args),
}));
jest.mock("app/store/actions", () => ({
    TasksActions: { setStatus: (...args: unknown[]) => mockSetStatus(...args) },
}));
jest.mock("app/widgets/common", () => ({
    TagsPickerPopup: ({ children, onToggle }: any) => (
        <>
            {children}
            <button data-testid="pick-status" onClick={() => onToggle(mockStatus)} />
        </>
    ),
}));
jest.mock("app/components/common", () => ({
    RoundButton: ({ title, testId, onClick, id }: any) => (
        <button id={id} data-testid={testId ?? "round-button"} onClick={onClick}>
            {title}
        </button>
    ),
}));
jest.mock("app/widgets/project", () => ({
    ProjectStatus: ({ status: value, testId, id, onRemove }: any) => (
        <button id={id} data-testid={testId ?? "project-status"} onClick={onRemove}>
            {value}
        </button>
    ),
}));

describe("task status characterization", () => {
    beforeEach(() => {
        mockSetStatus.mockClear();
        mockUseElementHotkey.mockClear();
    });

    it("updates task status through the task action", () => {
        render(<TaskStatus taskId="task-1" value={null} />);

        fireEvent.click(screen.getByTestId("pick-status"));
        expect(mockSetStatus).toHaveBeenCalledWith("task-1", "status-2");
    });

    it("supports controlled callback mode", () => {
        const onToggle = jest.fn();
        render(<TaskStatus value={null} onToggle={onToggle} />);

        fireEvent.click(screen.getByTestId("pick-status"));
        expect(onToggle).toHaveBeenCalledWith("status-2");
    });

    it("preserves detail-mode hotkey, IDs, and clear behavior", () => {
        render(
            <TaskStatus variant="detail" taskId="task-1" value="status-2" canClear testId="status-field" />
        );

        expect(mockUseElementHotkey).toHaveBeenCalledWith("shift+y", "td-status");
        expect(screen.getByTestId("status-field")).toBeInTheDocument();
        expect(screen.queryByTestId("status-field-clear")).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId("status-field-value"));
        expect(mockSetStatus).toHaveBeenCalledWith("task-1", undefined);
    });
});
