// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notepad read and partial update by id.
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { NotepadsLoader } from "../loaders/notepads";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { NotepadUpdateSchema } from "./schema/notepad";
import { parseUuidParam } from "./schema/common";

const notepads = new Hono();

/** GET `/:id` — Returns one notepad. */
notepads.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const notepad = await NotepadsLoader.getOne(id);

        return c.replySuccess(notepad);
    })
);

/** PATCH `/:id` — Updates notepad fields from validated JSON. */
notepads.patch(
    "/:id",
    validator(NotepadUpdateSchema),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const notepadData = c.req.valid("json");

        await NotepadsLoader.update(id, notepadData);

        return c.replySuccess();
    })
);

export default notepads;
