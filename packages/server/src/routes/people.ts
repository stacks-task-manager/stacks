// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People directory: list, birthdays, CRUD.
 */
import { randomUUID } from "crypto";
import type { Context } from "hono";
import { Hono } from "hono";

import { EMAIL_TEMPLATES } from "@stacks/types";
import { PeopleLoader } from "../loaders";
import { validator } from "../middleware/validator";
import type { User } from "../types";
import { cacheMiddleware } from "../utils/cache";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { BirthdaysFilteredSchema, PeopleUpdateSchema } from "./schema/people";
import { NewPersonSchema } from "./schema/user";

const people = new Hono();

/** GET `/` — Lists people for the workspace (cached ~5 minutes). */
people.get(
    "/",
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const people = await PeopleLoader.getAll({});
        return c.replySuccess(people);
    })
);

/** GET `/birthdays/:count?` — Birthdays filtered by query; optional `count` returns length only. */
people.get(
    "/birthdays/:count?",
    validator(BirthdaysFilteredSchema, "query"),
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const { count } = c.req.param();
        console.log("Getting birthdays", filters);


        const people: User[] = await PeopleLoader.getAll(filters);
        return c.replySuccess(count === "count" ? people.length : people);
    })
);

/** GET `/:id` — Returns one person by id. */
people.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const person = await PeopleLoader.getOne(id);
        return c.replySuccess(person);
    })
);

/** POST `/` — Creates a person; sends welcome email when `real` is true. */
people.post(
    "/",
    validator(NewPersonSchema),
    asyncHandler(async (c: Context) => {
        const { real = false, ...userData } = c.req.valid("json");
        const user = c.get("user") as User;

        const newUser = await PeopleLoader.create({
            ...userData,
            id: randomUUID(),
            tenant: user.tenant,
            company: user.company,
            real,
        });

        if (real) {
            await c.sendEmail(newUser.id, EMAIL_TEMPLATES.WELCOME, {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                activationLink: `/auth/activate/${newUser.token}`,
            });
        }

        return c.replySuccess(newUser);
    })
);

/** PATCH `/:id` — Partially updates a person. */
people.patch(
    "/:id",
    validator(PeopleUpdateSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const userData = c.req.valid("json");
        parseUuidParam(id);

        const updated = await PeopleLoader.update(id, userData);
        return c.replySuccess(updated);
    })
);

export default people;
