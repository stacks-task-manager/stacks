import { searchParamsToTaskLoadParams } from "app/views/Tasks/Tasks";
jest.mock("@stacks/translations", () => ({ translate: (value: string) => value }));
jest.mock("app/components/common", () => ({}));
jest.mock("app/widgets", () => ({}));
jest.mock("app/store/actions", () => ({}));
jest.mock("app/api/tasks", () => ({}));

it("passes assignees and overdue from the task URL to the API", () => {
    expect(searchParamsToTaskLoadParams(new URLSearchParams("assignees=user-id&overdue=true"))).toEqual({
        assignees: ["user-id"],
        overdue: true,
    });
});
it("allows overdue alone and ignores disabled flags", () => {
    expect(searchParamsToTaskLoadParams(new URLSearchParams("overdue=true"))).toEqual({ overdue: true });
    expect(searchParamsToTaskLoadParams(new URLSearchParams("overdue=false"))).toBeNull();
});
it("passes comma-separated tags and statuses as lists", () => {
    expect(searchParamsToTaskLoadParams(new URLSearchParams("tags=tag-a,tag-b&status=status-a"))).toEqual({
        tags: ["tag-a", "tag-b"],
        status: ["status-a"],
    });
});
it("passes priority, progress operators and date windows", () => {
    expect(
        searchParamsToTaskLoadParams(
            new URLSearchParams(
                "priority=high&progress=gt:60&dueFrom=2026-10-12T00:00:00.000Z&dueTo=2026-10-18T00:00:00.000Z&startFrom=2026-10-01T00:00:00.000Z"
            )
        )
    ).toEqual({
        priority: "high",
        progress: "gt:60",
        dueFrom: new Date("2026-10-12T00:00:00.000Z"),
        dueTo: new Date("2026-10-18T00:00:00.000Z"),
        startFrom: new Date("2026-10-01T00:00:00.000Z"),
    });
});
it("ignores unknown priority and malformed progress values", () => {
    expect(searchParamsToTaskLoadParams(new URLSearchParams("priority=urgent&progress=above:60"))).toBeNull();
});
it("drops unparseable date bounds and reads bare dates as whole UTC days", () => {
    // An unparseable bound must never reach the query string as `Invalid Date`
    expect(searchParamsToTaskLoadParams(new URLSearchParams("dueFrom=invalid-date&startTo=nope"))).toBeNull();
    // Bare `YYYY-MM-DD` bounds are UTC midnight, so the requested day survives every browser timezone
    const bareBounds = searchParamsToTaskLoadParams(
        new URLSearchParams("dueFrom=2026-10-12&dueTo=2026-10-18")
    );
    expect(bareBounds?.dueFrom).toEqual(new Date("2026-10-12T00:00:00.000Z"));
    // Impossible calendar dates are dropped rather than rolling over into the next month
    expect(searchParamsToTaskLoadParams(new URLSearchParams("startFrom=2026-02-30"))).toBeNull();
    // A naive time is read as UTC, and only valid bounds survive
    const naiveBounds = searchParamsToTaskLoadParams(
        new URLSearchParams("from=2026-10-12T10:00&to=not-a-date")
    );
    expect(naiveBounds).toEqual({ from: new Date("2026-10-12T10:00:00.000Z") });
    // The surviving keys are the only ones the client serializes, so no Invalid Date can reach `qs`
    const survivingKeys = searchParamsToTaskLoadParams(
        new URLSearchParams("dueFrom=invalid-date&dueTo=2026-10-18T00:00:00.000Z")
    );
    expect(Object.keys(survivingKeys ?? {})).toEqual(["dueTo"]);
});
