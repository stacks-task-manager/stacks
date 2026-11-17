// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Hono } from "hono";
import type { Context } from "hono";

import { WorkbooksLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { WorkbookCreateSchema, WorkbookUpdateSchema } from "./schema/workbook";

const workbooks = new Hono();

workbooks.get(
    "/",
    asyncHandler(async (c: Context) => c.replySuccess(await WorkbooksLoader.getAll()))
);

workbooks.post(
    "/",
    validator(WorkbookCreateSchema),
    asyncHandler(async (c: Context) => {
        const data = c.req.valid("json");
        return c.replySuccess(await WorkbooksLoader.create(data));
    })
);

workbooks.get(
    "/:id/tasks",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        return c.replySuccess(await WorkbooksLoader.getTasks(id));
    })
);

workbooks.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        return c.replySuccess(await WorkbooksLoader.getOne(id));
    })
);

workbooks.patch(
    "/:id",
    validator(WorkbookUpdateSchema),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const data = c.req.valid("json");
        return c.replySuccess(await WorkbooksLoader.update(id, data));
    })
);

workbooks.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        await WorkbooksLoader.remove(id);
        return c.replySuccess({ success: true });
    })
);

export default workbooks;
