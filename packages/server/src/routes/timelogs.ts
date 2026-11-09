// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog CRUD, filtering, approvals, and review workflow.
 */
import { ROLE_ACTIONS, ROLE_SECTIONS, TIMELOG_STATUS } from "@stacks/types";
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
import { parseUuidParam } from "./schema/common";
import { requireRoleAccess } from "../middleware/roleAccess";

const timelogs = new Hono();
const requireTimelogReadForTimesheet = async (c: Context, next: () => Promise<void>) => {
    // Task/project time views are covered by their existing parent ACLs. The
    // unscoped person timesheet and approval views require the TIMESLOGS role.
    if (!c.req.query("task") && !c.req.query("project")) {
        return requireRoleAccess(ROLE_SECTIONS.TIMELOGS)(c, next);
    }
    await next();
};

/** POST `/` — Creates a timelog and refreshes task totals. */
timelogs.post(
    "/",
    requireRoleAccess(ROLE_SECTIONS.TIMELOGS, ROLE_ACTIONS.WRITE),
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
    requireTimelogReadForTimesheet,
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
    requireRoleAccess(ROLE_SECTIONS.TIMELOGS, ROLE_ACTIONS.WRITE),
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
    requireRoleAccess(ROLE_SECTIONS.TIMELOGS, ROLE_ACTIONS.WRITE),
    validator(ApproveTimelogSchema),
    asyncHandler(async (c: Context) => {
        const action: TIMELOG_STATUS = c.req.param("action") as TIMELOG_STATUS;
        const { reason, ...filters } = c.req.valid("json");

        z.enum([TIMELOG_STATUS.APPROVED, TIMELOG_STATUS.REJECTED]).parse(action);

        const timelogs = await TimelogsLoader.updateStatus(action, filters, reason);
        return c.replySuccess(timelogs);
    })
);

/** PATCH `/:id` — Partially updates a timelog and refreshes task totals. */
timelogs.patch(
    "/:id",
    requireRoleAccess(ROLE_SECTIONS.TIMELOGS, ROLE_ACTIONS.WRITE),
    validator(UpdateTimelogSchema),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const timelogData = c.req.valid("json");
        await TimelogsLoader.update(id, timelogData);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Removes a timelog and refreshes task totals. */
timelogs.delete(
    "/:id",
    requireRoleAccess(ROLE_SECTIONS.TIMELOGS, ROLE_ACTIONS.WRITE),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        await TimelogsLoader.remove(id);
        return c.replySuccess();
    })
);

export default timelogs;
