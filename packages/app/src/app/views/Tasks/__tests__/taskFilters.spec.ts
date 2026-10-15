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
