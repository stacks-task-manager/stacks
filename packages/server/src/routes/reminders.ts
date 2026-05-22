// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reminders tied to records: list by record, create, and delete.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { RemindersLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { NewReminderSchema } from "./schema/reminders";
import { parseUuidParam } from "./schema/common";

const reminders = new Hono();

/** GET `/:recordId` — Lists reminders for the given record. */
reminders.get(
    "/:recordId",
    asyncHandler(async (c: Context) => {
        const recordId = parseUuidParam(c.req.param("recordId")!);

        const list = await RemindersLoader.getAll(recordId);
        return c.replySuccess(list);
    })
);

/** POST `/` — Creates a reminder from validated JSON. */
reminders.post(
    "/",
    validator(NewReminderSchema),
    asyncHandler(async (c: Context) => {
        const notificationData = c.req.valid("json");

        const newNotification = await RemindersLoader.create(notificationData);

        return c.replySuccess(newNotification);
    })
);

/** DELETE `/:id` — Deletes a reminder by id. */
reminders.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);

        await RemindersLoader.remove(id);

        return c.replySuccess();
    })
);

export default reminders;
