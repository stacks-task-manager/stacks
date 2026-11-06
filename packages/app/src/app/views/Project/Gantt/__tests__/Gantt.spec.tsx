import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Gantt } from "app/views/Project/Gantt/Gantt";

const mockNavigate = jest.fn();
let mockEmbedded = true;
const mockBackground = { pathname: "/project/project" };
jest.mock("react-router-dom", () => ({
    useLocation: () => mockBackground,
    useParams: () => ({ id: "project" }),
}));
jest.mock("app/components/common", () => ({ Grid: () => null, BlankSlate: () => null }));
jest.mock("app/components/common/GanttChart/GanttChart", () => ({
    GanttChart: ({ onActivate }: { onActivate: (id: string) => void }) => (
        <button data-testid="open-task" onClick={() => onActivate("task")} />
    ),
}));
jest.mock("app/hooks", () => ({
    useFilteredProjectTasks: () => [{ id: "task", title: "Task", project: "project", stack: "stack" }],
    useProjectStacks: () => [{ id: "stack", title: "Stack", tint: "red" }],
    useNav: () => mockNavigate,
}));
jest.mock("app/store/preferences", () => ({
    PreferencesStore: {
        use: (select: (state: { embeddedTask: boolean }) => boolean) =>
            select({ embeddedTask: mockEmbedded }),
    },
}));
jest.mock("app/store/actions/gantt", () => ({ rescheduleGanttTask: jest.fn() }));

beforeEach(() => mockNavigate.mockClear());
it("opens tasks in the project when the mockEmbedded preference is enabled", () => {
    mockEmbedded = true;
    render(<Gantt />);
    fireEvent.click(screen.getByTestId("open-task"));
    expect(mockNavigate).toHaveBeenCalledWith("/project/project/task");
});
it("opens an overlay with the mockBackground location when the mockEmbedded preference is disabled", () => {
    mockEmbedded = false;
    render(<Gantt />);
    fireEvent.click(screen.getByTestId("open-task"));
    expect(mockNavigate).toHaveBeenCalledWith("/task/task", {
        state: { backgroundLocation: mockBackground },
    });
});
