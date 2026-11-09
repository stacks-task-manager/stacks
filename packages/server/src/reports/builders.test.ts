import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProjectsMock, fetchTasksWithAssigneesMock, fetchTimelogsMock, getAllPeopleMock } = vi.hoisted(
    () => ({
        getProjectsMock: vi.fn(),
        fetchTasksWithAssigneesMock: vi.fn(),
        fetchTimelogsMock: vi.fn(),
        getAllPeopleMock: vi.fn(),
    })
);

vi.mock("./data", () => ({
    fetchTasksByProjects: vi.fn(),
    fetchTasksGrouped: vi.fn(),
    fetchTasksWithAssignees: fetchTasksWithAssigneesMock,
    fetchTimelogs: fetchTimelogsMock,
    fetchTimelogsByTask: vi.fn(),
    getProjects: getProjectsMock,
    getStacks: vi.fn(),
}));

vi.mock("../loaders/people", () => ({ PeopleLoader: { getAll: getAllPeopleMock } }));
vi.mock("../loaders/tasks", () => ({ TasksLoader: {} }));

import {
    buildLoggedTimeProjectReport,
    buildLoggedTimeUserReport,
    buildUserWorkloadDistributionReport,
} from "./builders";

const visibleProjectId = "11111111-1111-4111-8111-111111111111";

describe("user workload report project scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getProjectsMock.mockResolvedValue([{ id: visibleProjectId, title: "Visible project" }]);
        getAllPeopleMock.mockResolvedValue([]);
        fetchTasksWithAssigneesMock.mockResolvedValue([]);
        fetchTimelogsMock.mockResolvedValue([]);
    });

    it("passes only ACL-visible project IDs to the task query", async () => {
        await buildUserWorkloadDistributionReport({});

        expect(fetchTasksWithAssigneesMock).toHaveBeenCalledWith([visibleProjectId], undefined);
    });

    it("limits the logged-time user report to ACL-visible project IDs", async () => {
        await buildLoggedTimeUserReport({});

        expect(fetchTimelogsMock).toHaveBeenCalledWith({
            projectIds: [visibleProjectId],
            dateRange: undefined,
        });
    });

    it("limits the logged-time project report to ACL-visible project IDs", async () => {
        await buildLoggedTimeProjectReport({});

        expect(fetchTimelogsMock).toHaveBeenCalledWith({
            projectIds: [visibleProjectId],
            dateRange: undefined,
        });
    });
});
