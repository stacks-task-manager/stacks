import { beforeEach, describe, expect, it, vi } from "vitest";

const { stackFindAllMock, taskFindAllMock, timelogFindAllMock, currentUserMock } = vi.hoisted(() => ({
    stackFindAllMock: vi.fn(),
    taskFindAllMock: vi.fn(),
    timelogFindAllMock: vi.fn(),
    currentUserMock: vi.fn(() => ({ id: "user-a", tenant: "tenant-a" })),
}));

vi.mock("@stacks/db", () => ({
    StackEntity: { findAll: stackFindAllMock },
    TaskEntity: { findAll: taskFindAllMock },
    TimelogEntity: { findAll: timelogFindAllMock },
}));

vi.mock("../loaders/projects", () => ({ ProjectsLoader: { getAll: vi.fn() } }));
vi.mock("../loaders/context", () => ({ getCurrentUser: currentUserMock }));

import { fetchTasksByProjects, fetchTasksWithAssignees, fetchTimelogs, getStacks } from "./data";

const visibleProjectId = "11111111-1111-4111-8111-111111111111";

describe("report task query tenant and project scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentUserMock.mockReturnValue({ id: "user-a", tenant: "tenant-a" });
        taskFindAllMock.mockResolvedValue([]);
        stackFindAllMock.mockResolvedValue([]);
        timelogFindAllMock.mockResolvedValue([]);
    });

    it("loads assigned tasks only from the current tenant and supplied visible projects", async () => {
        await fetchTasksWithAssignees([visibleProjectId]);

        const query = taskFindAllMock.mock.calls[0][0];
        expect(query.where).toMatchObject({
            tenant: "tenant-a",
            project: [visibleProjectId],
            assignees: expect.anything(),
        });
    });

    it("tenant-scopes task queries even when project IDs are ACL-filtered", async () => {
        await fetchTasksByProjects([visibleProjectId]);

        expect(taskFindAllMock).toHaveBeenCalledWith({
            where: { project: [visibleProjectId], tenant: "tenant-a" },
        });
    });

    it("requires visible project IDs and tenant-scopes time-log queries", async () => {
        await fetchTimelogs({ projectIds: [visibleProjectId] });

        expect(timelogFindAllMock).toHaveBeenCalledWith({
            where: { project: [visibleProjectId], tenant: "tenant-a" },
        });
    });

    it("tenant-scopes stack queries", async () => {
        await getStacks([visibleProjectId]);

        expect(stackFindAllMock).toHaveBeenCalledWith({
            where: { project: [visibleProjectId], tenant: "tenant-a" },
        });
    });
});
