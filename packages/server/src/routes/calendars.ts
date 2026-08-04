// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local calendar CRUD routes.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { translate } from "@stacks/translations";

import { CalendarsLoader } from "../loaders";
import { CalendarCreateSchema, CalendarUpdateSchema } from "./schema/calendar";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";

const calendars = new Hono();

/** GET `/` — Lists all local calendars for the current tenant. */
calendars.get(
    "/",
    asyncHandler(async (c: Context) => {
        const loadedCalendars = await CalendarsLoader.getAll();
        return c.replySuccess(loadedCalendars);
    })
);

/** POST `/` — Creates a new local calendar. */
calendars.post(
    "/",
    validator(CalendarCreateSchema),
    asyncHandler(async (c: Context) => {
        const calendarData = c.req.valid("json");
        const newCalendar = await CalendarsLoader.create(calendarData);
        return c.replySuccess(newCalendar);
    })
);

/** GET `/:id` — Gets a specific calendar by ID. */
calendars.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const calendar = await CalendarsLoader.getOne(id);
        return c.replySuccess(calendar);
    })
);

/** PATCH `/:id` — Updates a calendar. */
calendars.patch(
    "/:id",
    validator(CalendarUpdateSchema),
    asyncHandler(async (c: Context) => {
        const calendarData = c.req.valid("json");
        const { id } = c.req.param();
        const updated = await CalendarsLoader.update(id, calendarData);
        return c.replySuccess(updated);
    })
);

/** DELETE `/:id` — Deletes a calendar. */
calendars.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const deleted = await CalendarsLoader.remove(id);
        if (!deleted) {
            throw Errors.notFound(translate("Calendar not found"));
        }
        return c.replySuccess({ success: true });
    })
);

export default calendars;
