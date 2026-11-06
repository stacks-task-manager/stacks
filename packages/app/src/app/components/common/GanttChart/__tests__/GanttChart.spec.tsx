import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GanttChart } from "app/components/common/GanttChart/GanttChart";
import { GanttRow } from "app/components/common/GanttChart/types";

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
    jest.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
});
afterAll(() => jest.restoreAllMocks());
const row = (id: string, children: GanttRow[] = []): GanttRow => ({
    id,
    name: id,
    startDate: null,
    endDate: null,
    children,
});

it("renders only a viewport of a thousand tasks and reaches later rows", () => {
    render(
        <GanttChart
            rows={Array.from({ length: 1000 }, (_, i) => row(`task-${i}`))}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );
    expect(screen.getAllByTestId(/^gantt-row-/).length).toBeLessThan(30);
    expect(screen.getByTestId("gantt-row-task-0")).toBeInTheDocument();
    const viewport = screen.getByTestId("gantt-viewport");
    fireEvent.scroll(viewport, { target: { scrollTop: 24000 } });
    expect(screen.getByTestId("gantt-row-task-500")).toBeInTheDocument();
    expect(screen.queryByTestId("gantt-row-task-0")).not.toBeInTheDocument();
});

it("preserves expansion state when refreshed task data arrives", () => {
    const props = { onActivate: jest.fn(), onDatesChange: jest.fn() };
    const { rerender } = render(<GanttChart rows={[row("parent", [row("child")])]} {...props} />);
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    rerender(<GanttChart rows={[row("parent", [row("child"), row("new-child")])]} {...props} />);
    expect(screen.queryByTestId("gantt-row-child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("gantt-expand-all"));
    expect(screen.getByTestId("gantt-row-new-child")).toBeInTheDocument();
});

it("leaves the editor open and restores the bar after a failed save", async () => {
    const dates = { ...row("task"), startDate: new Date(2026, 9, 27), endDate: new Date(2026, 9, 29) };
    render(
        <GanttChart
            rows={[dates]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn().mockRejectedValue(new Error("rejected"))}
        />
    );
    fireEvent.click(screen.getByTestId("gantt-edit-task"));
    fireEvent.change(screen.getByTestId("gantt-date-start"), { target: { value: "2026-10-28" } });
    fireEvent.click(screen.getByTestId("gantt-date-save"));
    await waitFor(() => expect(screen.getByTestId("gantt-date-save")).not.toHaveClass("bp6-loading"));
    expect(screen.getByTestId("gantt-date-editor")).toBeInTheDocument();
    expect(screen.getByTestId("gantt-bar-task")).toHaveAttribute("data-start", "2026-10-27");
});

it("preserves the visible calendar date when a distant task changes the timeline origin", () => {
    const props = { onActivate: jest.fn(), onDatesChange: jest.fn() };
    const { rerender } = render(<GanttChart rows={[row("task")]} {...props} />);
    const viewport = screen.getByTestId("gantt-viewport");
    const previous = viewport.scrollLeft;
    const distant = { ...row("distant"), startDate: new Date(1990, 0, 1), endDate: new Date(1990, 0, 2) };
    rerender(<GanttChart rows={[row("task"), distant]} {...props} />);
    expect(viewport.scrollLeft).toBeGreaterThan(previous);
    const expanded = viewport.scrollLeft;
    rerender(<GanttChart rows={[row("task")]} {...props} />);
    expect(viewport.scrollLeft).toBe(previous);
    expect(expanded).toBeGreaterThan(viewport.scrollLeft);
});

it("connects parent and child bars and removes their arrow on collapse", () => {
    const parent = {
        ...row("parent"),
        startDate: new Date(2026, 9, 27),
        endDate: new Date(2026, 9, 29),
        children: [{ ...row("child"), startDate: new Date(2026, 9, 28), endDate: new Date(2026, 9, 29) }],
    };
    render(<GanttChart rows={[parent]} onActivate={jest.fn()} onDatesChange={jest.fn()} />);
    expect(screen.getByTestId("gantt-tree-arrow-child")).toBeInTheDocument();
    expect(screen.getByTestId("gantt-link-parent-child")).toHaveAttribute("marker-end");
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    expect(screen.queryByTestId("gantt-link-parent-child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    expect(screen.getByTestId("gantt-link-parent-child")).toBeInTheDocument();
});
