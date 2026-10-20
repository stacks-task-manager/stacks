// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People directory: list, birthdays, CRUD.
 */
import { randomUUID } from "crypto";
import type { Context } from "hono";
import { Hono } from "hono";

import { EMAIL_TEMPLATES, IPerson, ROLE_SECTIONS } from "@stacks/types";
import { sequelize, UserEntity } from "@stacks/db";
import { Errors } from "../errors";
import { EmailsLoader, PeopleLoader } from "../loaders";
import { createActivationToken, createEmailChangeToken, hashAccountToken } from "../services/accountTokens";
import { validator } from "../middleware/validator";
import type { User } from "../types";
import { cacheMiddleware } from "../utils/cache";
import { asyncHandler } from "../utils/errorHandler";
import { enforceAuthAttemptLimit } from "../utils/authRateLimit";
import { requireRoleAccess } from "../middleware/roleAccess";
import { parseUuidParam } from "./schema/common";
import { BirthdaysFilteredSchema, EmailChangeRequestSchema, PeopleUpdateSchema } from "./schema/people";
import { NewPersonSchema } from "./schema/user";
import { translate } from "@stacks/translations";

const people = new Hono();
const requirePeopleReadOrSelf = async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user") as User;
    if (c.req.param("id") === String(user.id)) {
        await next();
        return;
    }
    await requireRoleAccess(ROLE_SECTIONS.PEOPLE)(c, next);
};

/** GET `/` — Lists people for the workspace (cached ~5 minutes). */
people.get(
    "/",
    requireRoleAccess(ROLE_SECTIONS.PEOPLE),
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const people = await PeopleLoader.getAll({});
        return c.replySuccess(people);
    })
);

/** GET `/birthdays/:count?` — Birthdays filtered by query; optional `count` returns length only. */
people.get(
    "/birthdays/:count?",
    requireRoleAccess(ROLE_SECTIONS.PEOPLE),
    validator(BirthdaysFilteredSchema, "query"),
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const filters = c.req.valid("query");
        const { count } = c.req.param();
        console.log("Getting birthdays", filters);

        const people: IPerson[] = await PeopleLoader.getAll(filters);
        return c.replySuccess(count === "count" ? people.length : people);
    })
);

/** GET `/:id` — Returns one person by id. */
people.get(
    "/:id",
    requirePeopleReadOrSelf,
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

        const { person, activationToken } = await PeopleLoader.create({
            ...userData,
            id: randomUUID(),
            tenant: user.tenant,
            company: user.company,
            real,
        });

        if (real) {
            if (!activationToken) {
                throw Errors.internal(translate("Registration email could not be queued"));
            }
            const clearUnqueuedActivation = async () =>
                UserEntity.update(
                    { activationTokenHash: null, activationTokenExpiresAt: null },
                    {
                        where: {
                            id: person.id,
                            tenant: user.tenant,
                            activationTokenHash: hashAccountToken(activationToken),
                        },
                    }
                );
            let queued: boolean;
            try {
                queued = await c.sendEmail(person.id, EMAIL_TEMPLATES.WELCOME, {
                    firstName: person.firstName ?? "",
                    lastName: person.lastName ?? "",
                    activationLink: `/auth/activate/${activationToken}`,
                });
            } catch {
                await clearUnqueuedActivation();
                throw Errors.internal(translate("Registration email could not be queued"));
            }
            if (!queued) {
                await clearUnqueuedActivation();
                throw Errors.internal(translate("Registration email could not be queued"));
            }
        }

        return c.replySuccess(person);
    })
);

/** POST `/:id/resend-activation` — Admin issues a fresh activation link for a person. */
people.post(
    "/:id/resend-activation",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const user = c.get("user") as User;
        if (!user.admin) {
            throw Errors.forbidden(translate("User not authorized"));
        }

        const target = await UserEntity.findOne({ where: { id, tenant: user.tenant } });
        if (!target) {
            throw Errors.notFound(translate("User not found or deactivated"));
        }

        const activation = createActivationToken();
        target.set("activationTokenHash", activation.hash);
        target.set("activationTokenExpiresAt", activation.expiresAt);
        await target.save();

        const queued = await c.sendEmail(id, EMAIL_TEMPLATES.REGISTRATION, {
            userName: `${target.get("firstName")} ${target.get("lastName")}`,
            verificationLink: `/auth/activate/${activation.token}`,
            expirationTime: "24 hours",
        });
        if (!queued) {
            target.set("activationTokenHash", null);
            target.set("activationTokenExpiresAt", null);
            await target.save();
            throw Errors.internal(translate("Registration email could not be queued"));
        }

        return c.replySuccess(await PeopleLoader.getOne(id));
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

/** POST `/:id/email-change` — requests ownership verification for a login email change. */
people.post(
    "/:id/email-change",
    validator(EmailChangeRequestSchema),
    async (c, next) => {
        const user = c.get("user") as User;
        const limited = await enforceAuthAttemptLimit(c, "email-change", user.id, user.tenant);
        if (limited) return limited;
        await next();
    },
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);
        const user = c.get("user") as User;
        if (id !== user.id) throw Errors.forbidden(translate("User not authorized"));

        const email = c.req.valid("json").email.trim();
        const transaction = await sequelize.transaction();
        let transactionCommitted = false;
        try {
            const target = await UserEntity.findOne({
                where: { id, tenant: user.tenant, real: true, disabled: false, deleted: null },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!target) throw Errors.notFound(translate("User not found or deactivated"));
            if (email === target.get("email")) {
                await transaction.commit();
                return c.replySuccess({ pending: false });
            }

            const existing = await UserEntity.findOne({
                where: { email, tenant: user.tenant },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (existing) throw Errors.badRequest(translate("Invalid request format"));

            const verification = createEmailChangeToken();
            target.set("pendingEmail", email);
            target.set("emailChangeTokenHash", verification.hash);
            target.set("emailChangeTokenExpiresAt", verification.expiresAt);
            await target.save({ transaction });

            const queued = await EmailsLoader.queueEmail(
                id,
                {
                    userName: `${target.get("firstName")} ${target.get("lastName")}`,
                    verificationLink: `/auth/email-change/${verification.token}`,
                    expirationTime: "1 hour",
                },
                EMAIL_TEMPLATES.EMAIL_CHANGE,
                c.req.header("Locale") || "en",
                user,
                undefined,
                transaction,
                email
            );
            if (!queued) throw Errors.internal(translate("Registration email could not be queued"));
            await transaction.commit();
            transactionCommitted = true;
        } catch (error) {
            if (!transactionCommitted) await transaction.rollback();
            throw error;
        }
        return c.replySuccess({ pending: true }, undefined, undefined, 202);
    })
);

export default people;
