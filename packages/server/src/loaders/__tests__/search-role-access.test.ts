// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    canRead: vi.fn(),
    getCurrentUser: vi.fn(),
    getPeople: vi.fn(),
    getTasks: vi.fn(),
    getNotepads: vi.fn(),
}));

vi.mock("../context", () => ({ canRead: mocks.canRead, getCurrentUser: mocks.getCurrentUser }));
vi.mock("../people", () => ({ PeopleLoader: { getAll: mocks.getPeople } }));
vi.mock("../tasks", () => ({ TasksLoader: { getAll: mocks.getTasks } }));
vi.mock("../notepads", () => ({ NotepadsLoader: { getAll: mocks.getNotepads } }));

import { SearchLoader } from "../search";

it("omits people from global search results when the role lacks people read access", async () => {
    vi.clearAllMocks();
    mocks.canRead.mockReturnValue(false);
    mocks.getCurrentUser.mockReturnValue({ id: "viewer-id", tenant: "tenant-a" });
    mocks.getPeople.mockResolvedValue([{ id: "person-1", firstName: "Ada", lastName: "Lid", avatar: null }]);
    mocks.getTasks.mockResolvedValue([
        { id: "task-1", title: "Ada task", project: "project-1", projectInfo: { title: "Project" } },
    ]);
    mocks.getNotepads.mockResolvedValue([]);

    const results = await SearchLoader.query("Ada");

    expect(results.map(result => result.type)).toEqual(["task"]);
    expect(results[0].title).toBe("Ada task");
    expect(mocks.getPeople).not.toHaveBeenCalled();
});

it("includes people in global search results when the role has people read access", async () => {
    vi.clearAllMocks();
    mocks.canRead.mockReturnValue(true);
    mocks.getCurrentUser.mockReturnValue({ id: "viewer-id", tenant: "tenant-a" });
    mocks.getPeople.mockResolvedValue([{ id: "person-1", firstName: "Ada", lastName: "Lid", avatar: null }]);
    mocks.getTasks.mockResolvedValue([]);
    mocks.getNotepads.mockResolvedValue([]);

    const results = await SearchLoader.query("Ada");

    expect(results.map(result => result.type)).toEqual(["person"]);
    expect(mocks.getPeople).toHaveBeenCalledWith({ query: "Ada" });
});
