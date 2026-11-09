// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { render, screen } from "@testing-library/react";
import type { ITask } from "@stacks/types";
import { TaskTemplate } from "@stacks/types";
import { useSubtasks } from "app/hooks";
import { Subtasks } from "../Subtasks";

jest.mock("app/hooks", () => ({ useSubtasks: jest.fn() }));
jest.mock("app/store/actions", () => ({ TasksActions: { add: jest.fn() } }));
jest.mock("app/store/preferences", () => ({
    PreferencesStore: { get: () => ({ taskDetailsShowCompletedSubtasks: false }) },
}));
jest.mock("../Subtask", () => ({ Subtask: () => null }));
jest.mock("app/components/draggable", () => ({
    Container: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("app/components/project/Task", () => ({
    TaskDetailsSection: ({ title, children }: any) => (
        <section>
            {title}
            {children}
        </section>
    ),
}));
jest.mock("app/components/common", () => {
    const Layout = ({ children }: any) => <div>{children}</div>;
    return {
        Grid: Layout,
        Row: Layout,
        Col: Layout,
        BlankSlate: () => null,
        RoundButton: () => null,
        Icon: () => null,
        HotkeyChip: ({ keys }: { keys: string[] }) => <span>{keys.join(" ")}</span>,
    };
});

describe("subtask completion progress", () => {
    it("recalculates when incomplete children are added or removed while completed count stays fixed", () => {
        const parent = { ...TaskTemplate, id: "parent" } as ITask;
        const completed = { ...TaskTemplate, id: "completed", done: true } as ITask;
        const incomplete = { ...TaskTemplate, id: "incomplete", done: false } as ITask;
        const hook = jest.mocked(useSubtasks);
        hook.mockReturnValue({ subtasks: [completed, incomplete], isLoading: false });
        const { rerender } = render(<Subtasks parent={parent} disabled />);
        expect(screen.getByTestId("subtasks-progress-value").textContent).toBe("50%");

        hook.mockReturnValue({ subtasks: [completed], isLoading: false });
        rerender(<Subtasks parent={parent} disabled />);
        expect(screen.getByTestId("subtasks-progress-value").textContent).toBe("100%");

        hook.mockReturnValue({
            subtasks: [completed, incomplete, { ...incomplete, id: "another" }],
            isLoading: false,
        });
        rerender(<Subtasks parent={parent} disabled />);
        expect(screen.getByTestId("subtasks-progress-value").textContent).toBe("33%");

        hook.mockReturnValue({ subtasks: [], isLoading: false });
        rerender(<Subtasks parent={parent} disabled />);
        expect(screen.queryByTestId("subtasks-progress-value")).toBeNull();
    });
});
