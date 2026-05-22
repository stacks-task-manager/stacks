// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog CRUD, filtering, approvals, and review workflow.
 */
import { TIMELOG_STATUS } from "@stacks/types";
import { Context, Hono } from "hono";
import z from "zod/v4";

import { TimelogsLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { cacheMiddleware } from "../utils/cache";
import { asyncHandler } from "../utils/errorHandler";
import {
    ApproveTimelogSchema,
    NewTimelogSchema,
    ReviewTimelogSchema,
    TimelogFilterSchema,
    UpdateTimelogSchema,
} from "./schema/timelogs";

const timelogs = new Hono();

/** POST `/` — Creates a timelog and refreshes task totals. */
timelogs.post(
    "/",
    validator(NewTimelogSchema),
    asyncHandler(async (c: Context) => {
        const timelogData = c.req.valid("json");
        const timelog = await TimelogsLoader.create(timelogData);
        return c.replySuccess(timelog);
    })
);

/** GET `/` — Lists timelogs matching validated filters (cached ~5 minutes). */
timelogs.get(
    "/",
    validator(TimelogFilterSchema, "query"),
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const timelogs = await TimelogsLoader.getAll(filters);
        return c.replySuccess(timelogs);
    })
);

/** PATCH `/review` — Transitions in-range timelogs to in-review. */
timelogs.patch(
    "/review",
    validator(ReviewTimelogSchema),
    asyncHandler(async (c: Context) => {
        const { start, end } = c.req.valid("json");
        const success = await TimelogsLoader.review(start, end);
        return c.replySuccess(success);
    })
);

/** POST `/:action` — Applies a {@link TIMELOG_STATUS} transition to filtered timelogs. */
timelogs.post(
    "/:action",
    validator(ApproveTimelogSchema),
    asyncHandler(async (c: Context) => {
        const action: TIMELOG_STATUS = c.req.param("action") as TIMELOG_STATUS;
        const { reason, ...filters } = c.req.valid("json");

        z.enum(TIMELOG_STATUS).parse(action);

        const timelogs = await TimelogsLoader.updateStatus(action, filters, reason);
        return c.replySuccess(timelogs);
    })
);

/** PATCH `/:id` — Partially updates a timelog and refreshes task totals. */
timelogs.patch(
    "/:id",
    validator(UpdateTimelogSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const timelogData = c.req.valid("json");
        await TimelogsLoader.update(id, timelogData);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Removes a timelog and refreshes task totals. */
timelogs.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        await TimelogsLoader.remove(id);
        return c.replySuccess();
    })
);

export default timelogs;
