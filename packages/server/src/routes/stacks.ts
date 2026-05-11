// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Kanban stack CRUD, reordering, and deletion (optionally with tasks).
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";

import { ProjectsLoader, StacksLoader, TasksLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { MoveStackSchema, StackDeleteSchema, StackSchema, StackUpdateSchema } from "./schema/stack";

const stacks = new Hono();

/** POST `/` — Creates a stack; optional `index` controls ordering. */
stacks.post(
    "/",
    validator(StackSchema),
    asyncHandler(async (c: Context) => {
        const { index, ...stackData } = c.req.valid("json");
        const newStack = await StacksLoader.create(stackData, index);
        return c.replySuccess(newStack);
    })
);

/** POST `/move` — Reorders a stack relative to another (`after`). */
stacks.post(
    "/move",
    validator(MoveStackSchema),
    asyncHandler(async (c: Context) => {
        const { after, stack } = c.req.valid("json");
        await StacksLoader.move(stack, after);
        return c.replySuccess();
    })
);

/** PATCH `/:id` — Partially updates stack fields. */
stacks.patch(
    "/:id",
    validator(StackUpdateSchema),
    asyncHandler(async (c: Context) => {
        const stacksData = c.req.valid("json");
        const { id } = c.req.param();
        await StacksLoader.update(id, stacksData);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Deletes the stack or, when `tasks=true` query, removes tasks in the stack. */
stacks.delete(
    "/:id",
    validator(StackDeleteSchema, "query"),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const { tasks = false } = c.req.valid("query");
        parseUuidParam(id);

        if (tasks === "true") {
            await TasksLoader.removeByStack(id);
            return c.replySuccess();
        }

        const deletedStack = await StacksLoader.remove(id);
        if (deletedStack) {
            await ProjectsLoader.removeStackOrder(deletedStack.project, deletedStack.id);
            return c.replySuccess();
        }

        return c.replyError(Errors.internal(translate("Stack delete failed")));
    })
);

/** GET `/:id` — Returns one stack by id. */
stacks.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const stack = await StacksLoader.getOne(id);
        return c.replySuccess(stack);
    })
);

/** POST `/:id/copy` — Placeholder; not implemented. */
stacks.post(
    "/:id/copy",
    asyncHandler(async () => {
        throw Errors.notImplemented(translate("Stack copy not implemented"));
    })
);

/** POST `/:id/move` — Placeholder; not implemented. */
stacks.post(
    "/:id/move",
    asyncHandler(async () => {
        throw Errors.notImplemented(translate("Stack move not implemented"));
    })
);

export default stacks;
