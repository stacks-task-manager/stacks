import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskTemplate } from "@stacks/types";
import type { ITask } from "@stacks/types";
import { useNav, useStack, useStackTasks } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { TaskDetailsNavigation } from "../TaskDetailsNavigation";

jest.mock("app/hooks", () => ({
    useNav: jest.fn(),
    useStack: jest.fn(),
    useStackTasks: jest.fn(),
    useElementHotkey: jest.fn(),
}));
jest.mock("app/components/common", () => ({
    HotkeyTooltip: ({ children }: any) => children,
    Icon: () => null,
}));
jest.mock("app/hooks/router", () => ({ getTaskModalListBackgroundFromHistory: () => null }));
jest.mock("app/store/actions", () => ({ TasksActions: { getTask: jest.fn() } }));
jest.mock("app/store/navigation", () => ({ setSelection: jest.fn() }));
jest.mock("app/store/preferences", () => ({ PreferencesStore: { get: () => ({ embeddedTask: true }) } }));
jest.mock("app/utils/dom", () => ({ scrollIntoView: jest.fn() }));

it("navigates in saved stack order when store order interleaves a child", async () => {
    const navigate = jest.fn();
    const parent = { ...TaskTemplate, id: "parent", project: "project", stack: "stack" } as ITask;
    const child = { ...parent, id: "child", parent: parent.id };
    const sibling = { ...parent, id: "sibling" };
    const tasks = [parent, child, sibling];
    jest.mocked(useNav).mockReturnValue(navigate);
    jest.mocked(useStackTasks).mockReturnValue(tasks);
    jest.mocked(useStack).mockReturnValue({
        id: "stack",
        title: "Stack",
        tasksOrder: [parent.id, sibling.id],
    } as ReturnType<typeof useStack>);
    jest.mocked(TasksActions.getTask).mockImplementation(async id => tasks.find(task => task.id === id)!);

    const { rerender } = render(<TaskDetailsNavigation taskId={parent.id} stackId="stack" />);
    fireEvent.click(screen.getByTestId("task-details-next-task"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/project/project/sibling"));

    navigate.mockClear();
    rerender(<TaskDetailsNavigation taskId={sibling.id} stackId="stack" />);
    fireEvent.click(screen.getByTestId("task-details-previous-task"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/project/project/parent"));
});
