// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task CRUD, filtering, segmentation, archive/unarchive, and move.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";

import { TasksLoader } from "../loaders/tasks";
import { validator } from "../middleware/validator";
import { cacheMiddleware } from "../utils/cache";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import {
    MoveTaskSchema,
    NewTaskSchema,
    TasksFilteredSchema,
    TasksSegmentSchema,
    TaskUpdateSchema,
    UnarchiveTaskSchema,
} from "./schema/task";
import { parseUuidParam } from "./schema/common";

const tasks = new Hono();

/** GET `/segment` — Tasks grouped for segment view from a list of ids. */
tasks.get(
    "/segment",
    validator(TasksSegmentSchema, "query"),
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");

        if (!filters.tasks || filters.tasks.length === 0) {
            throw Errors.badRequest(translate("Task IDs are required"));
        }

        const tasks = await TasksLoader.getAll({ ids: filters.tasks });
        return c.replySuccess(tasks);
    })
);

/** GET `/:id` — One task by id. */
tasks.get(
    "/:id",
    cacheMiddleware({ ttl: 600 }),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const task = await TasksLoader.getOne(id);
        return c.replySuccess(task);
    })
);

/** GET `/` — Filtered tasks with optional client-side limit. */
tasks.get(
    "/",
    validator(TasksFilteredSchema, "query"),
    cacheMiddleware({ ttl: 120 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        let tasks = await TasksLoader.getAll(filters);

        if (filters.limit != null && Number.isFinite(filters.limit)) {
            tasks = tasks.slice(0, filters.limit);
        }

        return c.replySuccess(tasks);
    })
);

/** GET `/count` — Count of tasks matching filters. */
tasks.get(
    "/count",
    validator(TasksFilteredSchema, "query"),
    cacheMiddleware({ ttl: 60 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const count = await TasksLoader.countAll(filters);
        return c.replySuccess(count);
    })
);

/** POST `/move` — Reorder a task into another stack/position. */
tasks.post(
    "/move",
    validator(MoveTaskSchema),
    asyncHandler(async (c: Context) => {
        const { task, after, stack } = c.req.valid("json");
        await TasksLoader.move(task, stack, after);
        return c.replySuccess();
    })
);

/** POST `/` — Creates a task at the given position. */
tasks.post(
    "/",
    validator(NewTaskSchema),
    asyncHandler(async (c: Context) => {
        const { task, position } = c.req.valid("json");
        const newTask = await TasksLoader.create(task, position);
        return c.replySuccess(newTask);
    })
);

/** PATCH `/:id/archive` — Archives a task. */
tasks.patch(
    "/:id/archive",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        await TasksLoader.archive(id);
        return c.replySuccess();
    })
);

/** PATCH `/:id/unarchive` — Restores a task into a stack. */
tasks.patch(
    "/:id/unarchive",
    validator(UnarchiveTaskSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const { stack } = c.req.valid("json");
        parseUuidParam(id);

        await TasksLoader.unarchive(id, stack);
        return c.replySuccess();
    })
);

/** PATCH `/:id` — Partially updates a task. */
tasks.patch(
    "/:id",
    validator(TaskUpdateSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const taskData = c.req.valid("json");
        parseUuidParam(id);

        await TasksLoader.update(id, taskData);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Deletes a task. */
tasks.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        await TasksLoader.removeById(id);
        return c.replySuccess();
    })
);

export default tasks;
