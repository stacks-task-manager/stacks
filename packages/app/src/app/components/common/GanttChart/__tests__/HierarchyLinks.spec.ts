import { flattenRows } from "app/components/common/GanttChart/geometry";
import { parentConnections } from "app/components/common/GanttChart/HierarchyLinks";
import { GanttRow } from "app/components/common/GanttChart/types";

const origin = new Date(2026, 9, 27);
const row = (id: string, children: GanttRow[] = []): GanttRow => ({
    id,
    name: id,
    startDate: origin,
    endDate: origin,
    children,
});

it("connects each nested task to its immediate parent", () => {
    const rows = flattenRows([row("parent", [row("child", [row("grandchild")])])], new Set());
    expect(parentConnections(rows, origin, 36, 0, 3).map(link => [link.parent, link.child])).toEqual([
        ["parent", "child"],
        ["child", "grandchild"],
    ]);
    expect(
        parentConnections(flattenRows([row("parent", [row("child")])], new Set(["parent"])), origin, 36, 0, 2)
    ).toEqual([]);
});
it("keeps a visible child's connector when its parent is above the viewport", () => {
    const rows = flattenRows([row("parent", [row("child")])], new Set());
    const links = parentConnections(rows, origin, 36, 1, 2);
    expect(links).toHaveLength(1);
    expect(links[0].path).toContain("M 36 18");
    expect(links[0].path).toMatch(/V 66 H 0$/);
});
it("updates connector positions for pending date edits", () => {
    const rows = flattenRows([row("parent", [row("child")])], new Set());
    const before = parentConnections(rows, origin, 36, 0, 2)[0].path;
    const after = parentConnections(rows, origin, 36, 0, 2, {
        child: { startDate: new Date(2026, 9, 28), endDate: new Date(2026, 9, 29) },
    })[0].path;
    expect(after).not.toBe(before);
});
it("leaves undated relationships to the task-pane arrows", () => {
    const parent = { ...row("parent", [row("child")]), startDate: null, endDate: null };
    expect(parentConnections(flattenRows([parent], new Set()), origin, 36, 0, 2)).toEqual([]);
});
it("bounds connector rendering to visible child rows in a large hierarchy", () => {
    const rows = flattenRows(
        [
            row(
                "parent",
                Array.from({ length: 1000 }, (_, index) => row(`child-${index}`))
            ),
        ],
        new Set()
    );
    expect(parentConnections(rows, origin, 36, 500, 520)).toHaveLength(20);
});

it("enters the left side horizontally when the child starts after the parent ends", () => {
    const child = { ...row("child"), startDate: new Date(2026, 10, 6), endDate: new Date(2026, 10, 7) };
    const rows = flattenRows([row("parent", [child])], new Set());
    expect(parentConnections(rows, origin, 36, 0, 2)[0].path).toMatch(/V 66 H 360$/);
});
