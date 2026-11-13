import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { addDays, format, startOfDay } from "date-fns";
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

it("shows the today button only while today's column is outside the viewport", async () => {
    render(
        <GanttChart title="Tasks" rows={[row("task")]} onActivate={jest.fn()} onDatesChange={jest.fn()} />
    );

    const viewport = screen.getByTestId("gantt-viewport");
    expect(screen.queryByTestId("gantt-today")).not.toBeInTheDocument();

    fireEvent.scroll(viewport, { target: { scrollLeft: 0 } });

    const today = await screen.findByTestId("gantt-today");
    expect(today.closest(".stacks-gantt-header")).not.toBeNull();
    expect(today.closest(".stacks-gantt-header-controls")).not.toBeNull();
    expect(today).toHaveClass("bp6-intent-primary");

    fireEvent.click(today);

    expect(viewport.scrollLeft).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByTestId("gantt-today")).not.toBeInTheDocument());
});

it("shows the translated selected scale in the header picker", async () => {
    render(
        <GanttChart title="Tasks" rows={[row("task")]} onActivate={jest.fn()} onDatesChange={jest.fn()} />
    );

    const picker = screen.getByTestId("gantt-scale-picker");
    expect(picker).toHaveTextContent("Day");

    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Week" }));

    await waitFor(() => expect(picker).toHaveTextContent("Week"));
});

it("toggles the task pane from the floating divider button", async () => {
    render(
        <GanttChart title="Tasks" rows={[row("task")]} onActivate={jest.fn()} onDatesChange={jest.fn()} />
    );

    const divider = screen.getByTestId("gantt-divider");
    const toggle = screen.getByTestId("gantt-pane-toggle");
    expect(divider).toContainElement(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("separator", { name: "Task pane" })).toBeInTheDocument();
    expect(toggle.querySelector(".icon-chevron-left")).toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => {
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(toggle.querySelector(".icon-chevron-right")).toBeInTheDocument();
        expect(screen.queryByRole("separator", { name: "Task pane" })).not.toBeInTheDocument();
        expect(screen.getByTestId("gantt-divider")).toContainElement(toggle);
    });

    fireEvent.click(toggle);

    await waitFor(() => {
        expect(toggle).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("separator", { name: "Task pane" })).toBeInTheDocument();
        expect(toggle.querySelector(".icon-chevron-left")).toBeInTheDocument();
    });
});

it("renders the task heading title supplied by its consumer", () => {
    render(
        <GanttChart title="Tasks" rows={[row("task")]} onActivate={jest.fn()} onDatesChange={jest.fn()} />
    );

    expect(screen.getByText("Tasks")).toBeInTheDocument();
});

it("does not append child counts to task names", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    expect(screen.getByTestId("gantt-task-parent")).not.toHaveTextContent("(1)");
});

it("uses a default gray marker when a task column has no tint", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[{ ...row("task"), secondaryLabel: "No tint" }]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    expect(screen.getByTestId("gantt-task-color-task")).toHaveClass("stacks-gantt-default-tint");
});

it("draws ancestor guides through descendants of siblings with later siblings", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("root-a", [row("sibling-a", [row("grandchild")]), row("sibling-b")]), row("root-b")]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    expect(screen.getByTestId("gantt-tree-guide-grandchild-1")).toHaveStyle({ left: "15px" });
    expect(screen.queryByTestId("gantt-tree-guide-grandchild-0")).not.toBeInTheDocument();
});

it("uses a compact custom toggle for subtasks", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const toggle = screen.getByTestId("gantt-toggle-parent");
    expect(toggle).toHaveClass("stacks-gantt-tree-toggle");
    expect(toggle).not.toHaveClass("bp6-button");
});

it("only adds the lower tree connector segment for subtasks with children", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const arrow = screen.getByTestId("gantt-tree-arrow-child");
    expect(arrow).toHaveStyle({ left: "15px" });
    expect(arrow.querySelector("path")).toHaveAttribute("d", "M 0.5 0 V 24.5 M 0.5 24.5 H 10");
    expect(screen.queryByTestId("gantt-tree-child-line-child")).not.toBeInTheDocument();
});

it("adds the lower tree connector segment for level 0 task parents", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const childLine = screen.getByTestId("gantt-tree-child-line-parent");
    expect(childLine).toHaveStyle({ left: "15px" });
    expect(childLine.querySelector("path")).toHaveAttribute("d", "M 0.5 38 V 48");
});

it("adds the lower tree connector segment below subtasks with children", () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child", [row("grandchild")])])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const childLine = screen.getByTestId("gantt-tree-child-line-child");
    expect(childLine).toHaveStyle({ left: "35px" });
    expect(childLine.querySelector("path")).toHaveAttribute("d", "M 0.5 38 V 48");
});

it("places a single expand and collapse toggle in the task heading", async () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const toggle = screen.getByTestId("gantt-toggle-all");
    expect(toggle.closest(".stacks-gantt-task-heading")).not.toBeNull();
    expect(screen.queryByTestId("gantt-expand-all")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gantt-collapse-all")).not.toBeInTheDocument();
    expect(toggle).toHaveClass("bp6-minimal");
    expect(toggle).toHaveTextContent("−");

    fireEvent.click(toggle);
    await waitFor(() => {
        expect(screen.queryByTestId("gantt-row-child")).not.toBeInTheDocument();
        expect(toggle).toHaveAttribute("aria-label", "Expand all");
        expect(toggle).toHaveTextContent("+");
    });

    fireEvent.click(toggle);
    await waitFor(() => {
        expect(screen.getByTestId("gantt-row-child")).toBeInTheDocument();
        expect(toggle).toHaveAttribute("aria-label", "Collapse all");
        expect(toggle).toHaveTextContent("−");
    });
});

it("keeps the scroll-to-top button available while vertically scrolled", async () => {
    render(
        <GanttChart
            title="Tasks"
            rows={[row("parent", [row("child")])]}
            onActivate={jest.fn()}
            onDatesChange={jest.fn()}
        />
    );

    const viewport = screen.getByTestId("gantt-viewport");
    expect(screen.queryByTestId("gantt-scroll-top")).not.toBeInTheDocument();

    fireEvent.scroll(viewport, { target: { scrollTop: 100 } });

    expect(screen.getByTestId("gantt-scroll-top").closest(".stacks-gantt-header-controls")).not.toBeNull();

    fireEvent.click(screen.getByTestId("gantt-pane-toggle"));
    await waitFor(() =>
        expect(screen.getByTestId("gantt-pane-toggle")).toHaveAttribute("aria-pressed", "false")
    );
    expect(screen.getByTestId("gantt-scroll-top")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("gantt-scroll-top"));

    expect(viewport.scrollTop).toBe(0);
    await waitFor(() => expect(screen.queryByTestId("gantt-scroll-top")).not.toBeInTheDocument());
});

it("renders only a viewport of a thousand tasks and reaches later rows", () => {
    render(
        <GanttChart
            title="Tasks"
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
    const { rerender } = render(
        <GanttChart title="Tasks" rows={[row("parent", [row("child")])]} {...props} />
    );
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    rerender(
        <GanttChart title="Tasks" rows={[row("parent", [row("child"), row("new-child")])]} {...props} />
    );
    expect(screen.queryByTestId("gantt-row-child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("gantt-toggle-all"));
    expect(screen.getByTestId("gantt-row-new-child")).toBeInTheDocument();
});

it("leaves the editor open and restores the bar after a failed save", async () => {
    const startDate = startOfDay(addDays(new Date(), -1));
    const endDate = addDays(startDate, 2);
    const dates = { ...row("task"), startDate, endDate };
    render(
        <GanttChart
            title="Tasks"
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
    expect(screen.getByTestId("gantt-bar-task")).toHaveAttribute(
        "data-start",
        format(startDate, "yyyy-MM-dd")
    );
});

it("preserves the visible calendar date when a distant task changes the timeline origin", () => {
    const props = { onActivate: jest.fn(), onDatesChange: jest.fn() };
    const { rerender } = render(<GanttChart title="Tasks" rows={[row("task")]} {...props} />);
    const viewport = screen.getByTestId("gantt-viewport");
    const previous = viewport.scrollLeft;
    const distant = { ...row("distant"), startDate: new Date(1990, 0, 1), endDate: new Date(1990, 0, 2) };
    rerender(<GanttChart title="Tasks" rows={[row("task"), distant]} {...props} />);
    expect(viewport.scrollLeft).toBeGreaterThan(previous);
    const expanded = viewport.scrollLeft;
    rerender(<GanttChart title="Tasks" rows={[row("task")]} {...props} />);
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
    render(<GanttChart title="Tasks" rows={[parent]} onActivate={jest.fn()} onDatesChange={jest.fn()} />);
    expect(screen.getByTestId("gantt-tree-arrow-child")).toBeInTheDocument();
    expect(screen.getByTestId("gantt-link-parent-child")).toHaveAttribute("marker-end");
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    expect(screen.queryByTestId("gantt-link-parent-child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("gantt-toggle-parent"));
    expect(screen.getByTestId("gantt-link-parent-child")).toBeInTheDocument();
});
