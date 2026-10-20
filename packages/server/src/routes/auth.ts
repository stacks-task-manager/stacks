// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * JSON API auth: registration, login, activation, password flows, and session helpers.
 */
import { sequelize, TenantEntity, UserEntity } from "@stacks/db";
import { Op } from "sequelize";
import { EMAIL_TEMPLATES } from "@stacks/types";
import * as bcrypt from "bcryptjs";
import { compare } from "bcryptjs";
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import z from "zod/v4";
import { getCookieSecret } from "../config/secrets";
import { HINT_COOKIE_OPTS } from "../config/session";
import { isRegistrationEnabled } from "../config/features";
import { EmailsLoader, TenantsLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import {
    browserMutationAllowed,
    browserOriginAllowed,
    browserRequestToken,
    resolveAuthenticatedIdentity,
    rotateBrowserNonce,
} from "../middleware/auth";
import { asyncHandler } from "../utils/errorHandler";
import { getClientIP } from "../utils/clientIp";
import { enforceAuthAttemptLimit } from "../utils/authRateLimit";
import { toPublicPerson } from "../utils/publicPerson";
import { Logger } from "../utils/logger";
import { privateResponse } from "../middleware/privateResponse";
import { issueSession, revokeAllUserSessions, revokeSession } from "../services/sessions";
import { createActivationToken, hashAccountToken } from "../services/accountTokens";
import { findPublicRegistrationRole } from "../services/registration";
import type { User } from "../types";
import { AccountTokenSchema, UserActivationSchema, UserLoginSchema, UserRegisterSchema } from "./schema/user";

const auth = new Hono();
auth.use("*", privateResponse);

const ACTIVATION_ERROR_PAGE = "activation-error";
const ACTIVATION_SUCCESS_PAGE = "activation-success";

const ACTIVATION_FLASH_COOKIE = "activation_flash";
const ACTIVATION_FLASH_OPTS = { path: "/", maxAge: 120, httpOnly: true, sameSite: "Lax" as const };

/** Stores activation error messages for the next HTML redirect. */
async function setActivationFlash(c: Context, errors: string[]) {
    await setSignedCookie(
        c,
        ACTIVATION_FLASH_COOKIE,
        JSON.stringify({ errors }),
        getCookieSecret(),
        ACTIVATION_FLASH_OPTS
    );
}

/** Reads and clears the signed activation flash cookie. */
async function takeActivationFlash(c: Context): Promise<string[]> {
    const raw = await getSignedCookie(c, getCookieSecret(), ACTIVATION_FLASH_COOKIE);
    deleteCookie(c, ACTIVATION_FLASH_COOKIE, { path: "/" });
    if (!raw) {
        return [];
    }
    try {
        const p = JSON.parse(raw) as { errors?: string[] };
        return p.errors ?? [];
    } catch {
        return [];
    }
}

/**
 * Register a new user account.
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password
 * @param {string} userData.tenant - Tenant ID
 * @returns {Promise<IUser>} Created user object
 */
/**
 * Hands a browser the one token it may present on a state-changing request.
 *
 * The signed nonce cookie is HttpOnly, so a cross-site form cannot read it; the
 * response is never cacheable because the token is only valid for this browser.
 */
auth.get("/csrf", async c => {
    if (!browserOriginAllowed(c)) {
        throw Errors.forbidden(translate("Cross site request rejected"));
    }

    const token = await browserRequestToken(c);
    c.header("Cache-Control", "no-store");
    return c.replySuccess({ token });
});

auth.post(
    "/register",
    async (c, next) => {
        if (!isRegistrationEnabled()) {
            throw Errors.forbidden(translate("Registration is disabled by the administrator"));
        }
        if (!(await browserMutationAllowed(c, "none"))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }
        await next();
    },
    validator(UserRegisterSchema),
    async (c, next) => {
        const userData = c.req.valid("json");
        const limited = await enforceAuthAttemptLimit(c, "registration", userData.email, userData.tenant);
        if (limited) return limited;
        await next();
    },
    asyncHandler(async (c: Context) => {
        const userData = c.req.valid("json");
        const clientIp = getClientIP(c);

        Logger.info("User registration attempt", {
            email: userData.email,
            tenant: userData.tenant,
            clientIp,
        });

        // Check if user already exists
        const existingUser = await UserEntity.findOne({
            where: { email: userData.email, tenant: userData.tenant },
        });
        if (existingUser) {
            Logger.security(
                "Registration attempt with existing email",
                "medium",
                {
                    email: userData.email,
                    clientIp,
                },
                c
            );
            throw Errors.conflict(translate("User already exists"));
        }

        // Validate tenant exists
        const tenant = await TenantsLoader.getOne(userData.tenant);
        if (!tenant) {
            Logger.error(
                "Registration with invalid tenant",
                undefined,
                {
                    email: userData.email,
                    tenant: userData.tenant,
                    clientIp,
                },
                c
            );
            throw Errors.notFound(translate("Tenant not found"));
        }
        const role = await findPublicRegistrationRole(userData.tenant);
        if (!role) {
            throw Errors.badRequest(translate("Registration details are invalid"));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Create new user
        const activation = createActivationToken();
        const newUser = await UserEntity.create({
            ...userData,
            role: role.get("id"),
            password: hashedPassword,
            real: true,
            disabled: true,
            activationTokenHash: activation.hash,
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
            throw Errors.internal(translate("Registration email could not be queued"));
        }

        Logger.info("User registered successfully", {
            userId: newUser.get("id"),
            email: userData.email,
            tenant: userData.tenant,
            clientIp,
        });

        return c.replySuccess(toPublicPerson(newUser.toJSON()));
    })
);

/**
 * Authenticate user login.
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email address
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} JWT token and user data
 */
auth.post(
    "/login",
    async (c, next) => {
        if (!(await browserMutationAllowed(c, "none"))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }
        await next();
    },
    validator(UserLoginSchema),
    async (c, next) => {
        const { email } = c.req.valid("json");
        const limited = await enforceAuthAttemptLimit(c, "login", email);
        if (limited) return limited;
        await next();
    },
    asyncHandler(async (c: Context) => {
        const { email, password } = c.req.valid("json");
        const clientIp = getClientIP(c);
        const requestId = c.req.header("x-request-id") || "unknown";

        Logger.info("Login attempt", {
            email,
            clientIp,
            requestId,
        });

        const user = await UserEntity.findOne({ where: { email, real: true } });
        if (!user) {
            Logger.security(
                "Login attempt with non-existent email",
                "medium",
                {
                    email,
                    clientIp,
                    requestId,
                },
                c
            );
            throw Errors.unauthorized(translate("Invalid credentials"));
        }

        const passwordMatch = await compare(password, user.get("password"));
        if (!passwordMatch) {
            Logger.security(
                "Login attempt with incorrect password",
                "medium",
                {
                    email,
                    userId: user.get("id"),
                    clientIp,
                    requestId,
                },
                c
            );
            throw Errors.unauthorized(translate("Invalid credentials"));
        }

        if (user.get("disabled")) {
            Logger.security(
                "Login attempt for disabled user",
                "high",
                {
                    email,
                    userId: user.get("id"),
                    clientIp,
                    requestId,
                },
                c
            );
            throw Errors.forbidden(translate("User disabled"));
        }

        const tenant = await TenantEntity.findByPk(user.get("tenant"));
        if (!tenant) {
            Logger.error(
                "Login failed - tenant not found",
                undefined,
                {
                    email,
                    userId: user.get("id"),
                    tenantId: user.get("tenant"),
                    clientIp,
                    requestId,
                },
                c
            );
            throw Errors.notFound(translate("Tenant not found"));
        }
        if (tenant.get("disabled")) {
            Logger.security(
                "Login attempt for disabled tenant",
                "high",
                {
                    email,
                    userId: user.get("id"),
                    tenantId: user.get("tenant"),
                    clientIp,
                    requestId,
                },
                c
            );
            throw Errors.forbidden(translate("Tenant disabled"));
        }

        const { token } = await issueSession(String(user.get("id")), String(user.get("tenant")));

        Logger.info("User logged in successfully", {
            userId: user.get("id"),
            email,
            tenantId: user.get("tenant"),
            clientIp,
            requestId,
        });

        return c.replySuccess({ token, user: user.get("id"), id: user.get("company") });
    })
);

auth.get(
    "/activate/:token",
    asyncHandler(async (c: Context) => {
        const token = c.req.param("token");
        const clientIp = getClientIP(c);
        const requestId = c.req.header("x-request-id") || "unknown";
        const errors = await takeActivationFlash(c);

        Logger.info("Account activation page requested", {
            token,
            clientIp,
            requestId,
        });

        const tokenParse = AccountTokenSchema.safeParse(token);
        if (!tokenParse.success) {
            Logger.security(
                "Invalid activation token format",
                "medium",
                {
                    token,
                    clientIp,
                    requestId,
                },
                c
            );
            return c.replyHtml(ACTIVATION_ERROR_PAGE);
        }

        const user = await UserEntity.findOne({
            where: {
                activationTokenHash: hashAccountToken(tokenParse.data),
            },
        });
        if (!user) {
            Logger.security(
                "Activation attempt with non-existent token",
                "medium",
                {
                    token,
                    clientIp,
                    requestId,
                },
                c
            );
            return c.replyHtml(ACTIVATION_ERROR_PAGE);
        }

        const activationExpiresAt = user.get("activationTokenExpiresAt") as Date | null;
        if (!activationExpiresAt || activationExpiresAt.getTime() <= Date.now()) {
            return c.replyHtml(ACTIVATION_ERROR_PAGE);
        }

        if (user.get("deleted")) {
            Logger.security(
                "Activation attempt for deleted user",
                "high",
                {
                    token,
                    userId: user.get("id"),
                    email: user.get("email"),
                    clientIp,
                    requestId,
                },
                c
            );
            return c.replyHtml(ACTIVATION_ERROR_PAGE);
        }

        Logger.info("Valid activation token accessed", {
            token,
            userId: user.get("id"),
            email: user.get("email"),
            clientIp,
            requestId,
        });

        const csrf = await browserRequestToken(c);
        return c.replyHtml("activation", {
            firstName: user.get("firstName"),
            token,
            csrf,
            errors,
        });
    })
);

auth.get("/email-change/:token", async c => {
    const parsed = AccountTokenSchema.safeParse(c.req.param("token"));
    if (!parsed.success) return c.replyHtml("email-change-error");

    const user = await UserEntity.findOne({
        where: {
            emailChangeTokenHash: hashAccountToken(parsed.data),
            emailChangeTokenExpiresAt: { [Op.gt]: new Date() },
        },
    });
    if (!user || user.get("disabled") || user.get("deleted")) return c.replyHtml("email-change-error");

    const csrf = await browserRequestToken(c);
    return c.replyHtml("email-change", { token: parsed.data, csrf });
});

auth.post(
    "/email-change/confirm",
    async (c, next) => {
        if (!(await browserMutationAllowed(c, "none"))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }
        await next();
    },
    asyncHandler(async (c: Context) => {
        const form = await c.req.parseBody();
        const parsed = AccountTokenSchema.safeParse(form.token);
        if (!parsed.success) return c.replyHtml("email-change-error");

        const tokenHash = hashAccountToken(parsed.data);
        const transaction = await sequelize.transaction();
        try {
            const user = await UserEntity.findOne({
                where: {
                    emailChangeTokenHash: tokenHash,
                    emailChangeTokenExpiresAt: { [Op.gt]: new Date() },
                    disabled: false,
                    deleted: null,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            const pendingEmail = user?.get("pendingEmail");
            if (!user || typeof pendingEmail !== "string") {
                await transaction.rollback();
                return c.replyHtml("email-change-error");
            }

            const tenant = await TenantEntity.findOne({
                where: { id: user.get("tenant"), disabled: false },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!tenant) {
                await transaction.rollback();
                return c.replyHtml("email-change-error");
            }

            const emailAlreadyUsed = await UserEntity.findOne({
                where: {
                    email: pendingEmail,
                    tenant: user.get("tenant"),
                    id: { [Op.ne]: user.get("id") },
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (emailAlreadyUsed) {
                await transaction.rollback();
                return c.replyHtml("email-change-error");
            }

            const [claimed] = await UserEntity.update(
                {
                    email: pendingEmail,
                    pendingEmail: null,
                    emailChangeTokenHash: null,
                    emailChangeTokenExpiresAt: null,
                },
                {
                    where: {
                        id: user.get("id"),
                        emailChangeTokenHash: tokenHash,
                        emailChangeTokenExpiresAt: { [Op.gt]: new Date() },
                    },
                    transaction,
                }
            );
            if (claimed !== 1) {
                await transaction.rollback();
                return c.replyHtml("email-change-error");
            }
            await revokeAllUserSessions(String(user.get("id")), transaction);
            await transaction.commit();
            return c.replyHtml("email-change-success");
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    })
);

auth.post(
    "/activate",
    async (c, next) => {
        if (!(await browserMutationAllowed(c, "none"))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }
        await next();
    },
    asyncHandler(async (c: Context) => {
        const activationData = await c.req.parseBody();
        const clientIp = getClientIP(c);
        const requestId = c.req.header("x-request-id") || "unknown";

        Logger.info("Account activation attempt", {
            token: activationData.token,
            clientIp,
            requestId,
        });

        try {
            UserActivationSchema.parse(activationData);

            const tokenHash = hashAccountToken(activationData.token as string);
            const user = await UserEntity.findOne({
                where: {
                    activationTokenHash: tokenHash,
                },
            });

            if (!user) {
                Logger.security(
                    "Activation attempt with invalid token",
                    "high",
                    {
                        token: activationData.token,
                        clientIp,
                        requestId,
                    },
                    c
                );
                return c.replyHtml(ACTIVATION_ERROR_PAGE);
            }

            const activationExpiresAt = user.get("activationTokenExpiresAt") as Date | null;
            if (!activationExpiresAt || activationExpiresAt.getTime() <= Date.now()) {
                return c.replyHtml(ACTIVATION_ERROR_PAGE);
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(activationData.password1 as string, salt);

            const transaction = await sequelize.transaction();
            try {
                // Conditional claim: the credential is only consumed while its hash and
                // future expiry still match, so a second concurrent replay changes nothing.
                const [claimed] = await UserEntity.update(
                    {
                        password: hashedPassword,
                        token: null,
                        activationTokenHash: null,
                        activationTokenExpiresAt: null,
                        disabled: false,
                    },
                    {
                        where: {
                            id: user.get("id"),
                            activationTokenHash: tokenHash,
                            activationTokenExpiresAt: { [Op.gt]: new Date() },
                        },
                        returning: false,
                        transaction,
                    }
                );
                if (claimed !== 1) {
                    await transaction.rollback();
                    Logger.security(
                        "Activation replay for an already-consumed token",
                        "medium",
                        {
                            token: activationData.token,
                            userId: user.get("id"),
                            clientIp,
                            requestId,
                        },
                        c
                    );
                    return c.replyHtml(ACTIVATION_ERROR_PAGE);
                }
                await revokeAllUserSessions(String(user.get("id")), transaction);
                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            Logger.info("Account activated successfully", {
                userId: user.get("id"),
                email: user.get("email"),
                clientIp,
                requestId,
            });

            return c.replyHtml(ACTIVATION_SUCCESS_PAGE);
        } catch (e) {
            if (e instanceof z.ZodError) {
                Logger.security(
                    "Activation validation failed",
                    "low",
                    {
                        token: activationData.token,
                        errors: e.issues.map(error => error.message),
                        clientIp,
                        requestId,
                    },
                    c
                );
                await setActivationFlash(
                    c,
                    e.issues.map(issue => issue.message)
                );
            } else {
                Logger.error(
                    "Activation process failed",
                    e as Error,
                    {
                        token: activationData.token,
                        clientIp,
                        requestId,
                    },
                    c
                );
                await setActivationFlash(c, ["An unexpected error occurred"]);
            }

            return c.redirect(`/auth/activate/${activationData.token}`);
        }
    })
);

/** Clears the session cookie and the non-authoritative hints together. */
async function clearSessionCookies(c: Context): Promise<void> {
    await deleteCookie(c, "auth_token", { path: "/" });
    await deleteCookie(c, "uid", HINT_COOKIE_OPTS);
    await deleteCookie(c, "tenant", HINT_COOKIE_OPTS);
}

auth.post(
    "/logout",
    asyncHandler(async (c: Context) => {
        const identity = await resolveAuthenticatedIdentity(c);
        if (!identity.ok) {
            throw Errors.unauthorized(translate("Authentication failed"));
        }

        if (!(await browserMutationAllowed(c, identity.source))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }

        const revoked = await revokeSession(String(identity.payload.sid));
        await clearSessionCookies(c);
        await rotateBrowserNonce(c);
        return c.replySuccess({ revoked });
    })
);

auth.post(
    "/logout-all",
    asyncHandler(async (c: Context) => {
        const identity = await resolveAuthenticatedIdentity(c);
        if (!identity.ok) {
            throw Errors.unauthorized(translate("Authentication failed"));
        }

        if (!(await browserMutationAllowed(c, identity.source))) {
            throw Errors.forbidden(translate("Cross site request rejected"));
        }

        const revoked = await revokeAllUserSessions(String(identity.user.get("id")));
        await clearSessionCookies(c);
        await rotateBrowserNonce(c);
        return c.replySuccess({ revoked });
    })
);

export default auth;
