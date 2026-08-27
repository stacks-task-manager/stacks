// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * HTML registration page listing available tenants.
 */
import { TenantEntity, UserEntity } from "@stacks/db";
import { hash } from "bcryptjs";
import { Hono } from "hono";
import { translate } from "@stacks/translations";
import { EMAIL_TEMPLATES } from "@stacks/types";
import z from "zod/v4";
import { isRegistrationEnabled } from "../config/features";
import { EmailsLoader } from "../loaders";
import { createActivationToken } from "../services/accountTokens";
import { findPublicRegistrationRole } from "../services/registration";
import type { User } from "../types";
import { UserRegisterSchema } from "./schema/user";

const register = new Hono();

/** GET `/` — Renders the register template with tenant options. */
register.get("/", async c => {
    if (!isRegistrationEnabled()) {
        return c.text(translate("Registration is disabled by the administrator"), 403);
    }
    try {
        const tenantsEntities = await TenantEntity.findAll();
        const tenants = tenantsEntities.map(tenant => ({
            id: tenant.get("id"),
            title: tenant.get("title"),
        }));
        return c.replyHtml("register", { tenants });
    } catch (error) {
        return c.text("Register page not found", 404);
    }
});

/** POST `/` — Creates an account from the native HTML registration form. */
register.post("/", async c => {
    if (!isRegistrationEnabled()) {
        return c.text(translate("Registration is disabled by the administrator"), 403);
    }

    try {
        const form = await c.req.parseBody();
        const userData = UserRegisterSchema.parse(form);
        const [tenant, role, existingUser] = await Promise.all([
            TenantEntity.findOne({ where: { id: userData.tenant, disabled: false } }),
            findPublicRegistrationRole(userData.tenant),
            UserEntity.findOne({ where: { email: userData.email, tenant: userData.tenant } }),
        ]);

        if (!tenant || !role) {
            return c.text(translate("Registration details are invalid"), 400);
        }
        if (existingUser) {
            return c.text(translate("User already exists"), 409);
        }

        const activation = createActivationToken();
        const newUser = await UserEntity.create({
            ...userData,
            role: role.get("id"),
            password: await hash(userData.password, 10),
            real: true,
            disabled: true,
            token: activation.token,
            activationTokenExpiresAt: activation.expiresAt,
        });

        const queued = await EmailsLoader.queueEmail(
            String(newUser.get("id")),
            {
                userName: `${userData.firstName} ${userData.lastName}`,
                verificationLink: `/auth/activate/${activation.token}`,
                expirationTime: "24 hours",
            },
            EMAIL_TEMPLATES.REGISTRATION,
            c.get("locale") || "en",
            newUser.toJSON() as User
        );
        if (!queued) {
            await newUser.destroy({ force: true });
            return c.text(translate("Registration email could not be queued"), 503);
        }
        const message = Buffer.from("Check your email to activate your account.").toString("base64");
        return c.redirect(`/login?s=${encodeURIComponent(message)}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.text(error.issues.map(issue => issue.message).join("\n"), 400);
        }
        throw error;
    }
});

export default register;
