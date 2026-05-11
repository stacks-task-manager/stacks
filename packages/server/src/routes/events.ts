// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar/event CRUD with optional list filters.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { translate } from "@stacks/translations";

import { EventsLoader } from "../loaders";
import { EventSchema, EventsFilteredSchema, EventUpdateSchema } from "./schema/event";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";

const events = new Hono();

/** GET `/` — Lists events matching validated query filters. */
events.get(
    "/",
    validator(EventsFilteredSchema, "query"),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const loadedEvents = await EventsLoader.getAll(filters);
        return c.replySuccess(loadedEvents);
    })
);

/** POST `/` — Creates an event from validated JSON. */
events.post(
    "/",
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
    validator(EventUpdateSchema),
    asyncHandler(async (c: Context) => {
        const eventData = c.req.valid("json");
        const { id } = c.req.param();

        const updated = await EventsLoader.update(id, eventData);
        if (!updated) {
            throw Errors.notFound(translate("Event not found"));
        }

        return c.replySuccess({ success: true });
    })
);

/** DELETE `/:id` — Deletes an event; 404 if missing. */
events.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const eventId = c.req.param("id");

        const deleted = await EventsLoader.remove(eventId!);
        if (!deleted) {
            throw Errors.notFound(translate("Event not found"));
        }

        return c.replySuccess({ success: true });
    })
);

export default events;
