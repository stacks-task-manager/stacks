// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Filtered task routes, exercised in-process with mocked loaders.
 *
 * These tests pin route dispatch (`/count` must reach the count handler, never the `/:id` handler),
 * query validation (malformed filters are 400 before any loader runs), and the rule that the count
 * route counts the same filtered set the list route returns (`/api/tasks`, the path the app client
 * uses). Nothing here touches a database.
 */
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { errorHandler } from "../../utils/errorHandler";
import { TasksFilteredSchema } from "../schema/task";
import { registerResponseHelpers } from "../../services/response";
import tasksRoutes from "../tasks";

const mocks = vi.hoisted(() => ({ getAll: vi.fn(), countAll: vi.fn(), getOne: vi.fn(), segment: vi.fn() }));
vi.mock("../../loaders/tasks", () => ({
    TasksLoader: {
        getAll: mocks.getAll,
        countAll: mocks.countAll,
        getOne: mocks.getOne,
        segment: mocks.segment,
    },
}));
vi.mock("../../utils/cache", () => ({
    // Pass through the caching middleware so route dispatch and validation stay observable
    cacheMiddleware: (_options: { ttl: number }) => async (_ctx: Context, next: () => unknown) => {
        await next();
    },
    invalidateApiCacheForCurrentRequest: vi.fn(),
}));

/** Clears recorded calls so each `it` block observes only its own requests. */
const resetMocks = (): void => {
    vi.clearAllMocks();
};

const mountTasks = (): Hono => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    const guarded = new Hono();
    guarded.route("/", tasksRoutes);
    app.route("/api/tasks", guarded);
    return app;
};

const TAG_IDS = ["00000000-0000-4000-8000-0000000000ab", "00000000-0000-4000-8000-0000000000ef"];
const STATUS_IDS = ["00000000-0000-4000-8000-0000000000cd", "00000000-0000-4000-8000-0000000000aa"];
const FILTERS = {
    tags: TAG_IDS,
    status: STATUS_IDS,
    priority: "high",
    progress: "eq:0",
    dueFrom: "2026-10-12T00:00:00.000Z",
    dueTo: "2026-10-18T23:59:59.999Z",
    startFrom: "2026-10-12T00:00:00.000Z",
    startTo: "2026-10-18T23:59:59.999Z",
};

const filteredQuery = (): string => {
    const params = new URLSearchParams();
    Object.entries(FILTERS).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
        } else {
            params.set(key, value);
        }
    });
    return params.toString();
};

function mockCountAllCalls(): unknown[][] {
    return mocks.countAll.mock.calls;
}

function mockGetAllCalls(): unknown[][] {
    return mocks.getAll.mock.calls;
}

function mockGetOneCalls(): unknown[][] {
    return mocks.getOne.mock.calls;
}

it("counts the filtered set through the count route, not the task-by-id route", async () => {
    resetMocks();
    mocks.getAll.mockResolvedValue([{ id: "task-1" }]);
    mocks.countAll.mockResolvedValue(7);
    mocks.getOne.mockResolvedValue({ id: "task-1" });

    const res = await mountTasks().request(`/api/tasks/count?${filteredQuery()}`, {
        headers: { Locale: "en" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBe(7);
    expect(mockCountAllCalls()).toHaveLength(1);
    const filters = mockCountAllCalls()[0][0] as Record<string, unknown>;
    expect(filters.tags).toEqual(TAG_IDS);
    expect(filters.status).toEqual(STATUS_IDS);
    expect(filters.priority).toBe("high");
    expect(filters.progress).toBe("eq:0");
    expect(filters.dueFrom).toBe("2026-10-12T00:00:00.000Z");
    expect(filters.startTo).toBe("2026-10-18T23:59:59.999Z");
    // `/count` is a static path: it must never reach the `/:id` handler
    expect(mockGetOneCalls()).toHaveLength(0);
});

it("lists and counts the same filters with the same values", async () => {
    resetMocks();
    mocks.getAll.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
    mocks.countAll.mockResolvedValue(2);

    const app = mountTasks();
    const list = await app.request(`/api/tasks?${filteredQuery()}`, { headers: { Locale: "en" } });
    const count = await app.request(`/api/tasks/count?${filteredQuery()}`, { headers: { Locale: "en" } });
    expect(list.status).toBe(200);
    expect(count.status).toBe(200);
    const listBody = await list.json();
    const countBody = await count.json();
    expect(countBody.data).toBe(listBody.data.length);
    expect(mockCountAllCalls()[0][0]).toEqual(mockGetAllCalls()[0][0]);
    expect(TasksFilteredSchema.safeParse(FILTERS).success).toBe(true);
});

it("rejects malformed filters before any loader runs", async () => {
    resetMocks();
    // Both loaders would answer 200 if a malformed filter reached them, so the call counts below
    // are the real evidence that validation runs first
    mocks.getAll.mockResolvedValue([{ id: "task-1" }]);
    mocks.countAll.mockResolvedValue(1);

    const app = mountTasks();
    const queries = ["progress=above:60", "progress=gt:150", "dueTo=2026-02-30", "priority=urgent"];
    for (const query of queries) {
        const count = await app.request(`/api/tasks/count?${query}`, { headers: { Locale: "en" } });
        expect(count.status).toBe(400);
        const list = await app.request(`/api/tasks?${query}`, { headers: { Locale: "en" } });
        expect(list.status).toBe(400);
    }
    expect(mockCountAllCalls()).toHaveLength(0);
    expect(mockGetAllCalls()).toHaveLength(0);
});

it("rejects an unknown task id format on the id route", async () => {
    resetMocks();
    mocks.getOne.mockResolvedValue({ id: "task-1" });

    const res = await mountTasks().request("/api/tasks/not-a-uuid", { headers: { Locale: "en" } });
    expect(res.status).toBe(400);
    expect(mockGetOneCalls()).toHaveLength(0);
});
