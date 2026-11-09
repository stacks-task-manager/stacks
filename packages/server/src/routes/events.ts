// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar/event CRUD with optional list filters.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { translate } from "@stacks/translations";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";

import { EventsLoader } from "../loaders";
import {
    EventDeleteSchema,
    EventMoveSchema,
    EventSchema,
    EventsCountSchema,
    EventsFilteredSchema,
    EventUpdateSchema,
} from "./schema/event";
import { validator } from "../middleware/validator";
import { cacheMiddleware } from "../utils/cache";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { requireRoleAccess } from "../middleware/roleAccess";
import { parseEventIdParam } from "./schema/common";

const events = new Hono();

/** GET `/` — Lists events matching validated query filters. */
events.get(
    "/",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR),
    validator(EventsFilteredSchema, "query"),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const loadedEvents = await EventsLoader.getAll(filters);
        return c.replySuccess(loadedEvents);
    })
);

/** GET `/count` — Count of events matching validated query filters. */
events.get(
    "/count",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR),
    validator(EventsCountSchema, "query"),
    cacheMiddleware({ ttl: 60 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const count = await EventsLoader.countAll(filters);
        return c.replySuccess(count);
    })
);

/** POST `/` — Creates an event from validated JSON. */
events.post(
    "/",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    validator(EventSchema),
    asyncHandler(async (c: Context) => {
        const eventData = c.req.valid("json");
        const newEvent = await EventsLoader.create(eventData);
        return c.replySuccess(newEvent);
    })
);

/** PATCH `/:id` — Updates an event; 404 if missing. */
events.patch(
    "/:id",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    validator(EventUpdateSchema),
    asyncHandler(async (c: Context) => {
        const eventData = c.req.valid("json");
        const id = parseEventIdParam(c.req.param("id")!);

        const updated = await EventsLoader.update(id, eventData);
        if (!updated) {
            throw Errors.notFound(translate("Event not found"));
        }

        return c.replySuccess({ success: true });
    })
);

/** PATCH `/:id/move` — Moves an event within its existing calendar source. */
events.patch(
    "/:id/move",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    validator(EventMoveSchema),
    asyncHandler(async (c: Context) => {
        const moveData = c.req.valid("json");
        const id = parseEventIdParam(c.req.param("id")!);

        const moved = await EventsLoader.move(id, moveData.calendar, moveData.source);
        if (!moved) {
            throw Errors.notFound(translate("Event not found"));
        }

        return c.replySuccess({ success: true });
    })
);

/** DELETE `/:id` — Deletes an event; 404 if missing. */
events.delete(
    "/:id",
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    validator(EventDeleteSchema, "query"),
    asyncHandler(async (c: Context) => {
        const eventId = parseEventIdParam(c.req.param("id")!);
        const deleteOptions = c.req.valid("query");

        const deleted = await EventsLoader.remove(eventId!, deleteOptions);
        if (!deleted) {
            throw Errors.notFound(translate("Event not found"));
        }

        return c.replySuccess({ success: true });
    })
);

export default events;
