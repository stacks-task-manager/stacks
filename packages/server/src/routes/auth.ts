// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * JSON API auth: registration, login, activation, password flows, and session helpers.
 */
import { TenantEntity, UserEntity } from "@stacks/db";
import * as bcrypt from "bcryptjs";
import { compare } from "bcryptjs";
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import z from "zod/v4";
import { getCookieSecret, getJwtSecret } from "../config/secrets";
import { TenantsLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { getClientIP } from "../utils/clientIp";
import { Logger } from "../utils/logger";
import { uuidStringSchema } from "./schema/common";
import { UserActivationSchema, UserLoginSchema, UserRegisterSchema } from "./schema/user";

const auth = new Hono();

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
auth.post(
    "/register",
    validator(UserRegisterSchema),
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

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Create new user
        const newUser = await UserEntity.create({ ...userData, password: hashedPassword });

        Logger.info("User registered successfully", {
            userId: newUser.get("id"),
            email: userData.email,
            tenant: userData.tenant,
            clientIp,
        });

        // Remove sensitive data from response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        return c.replySuccess(userResponse);
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
    validator(UserLoginSchema),
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

        const payload = {
            uid: user.get("id"),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10, // 10 years
        };
        const token = await sign(payload, getJwtSecret());

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

        const tokenParse = uuidStringSchema.safeParse(token);
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
                token,
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

        if (user.get("disabled")) {
            Logger.security(
                "Activation attempt for disabled user",
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

        return c.replyHtml("activation", { ...user.toJSON(), errors });
    })
);

auth.post(
    "/activate",
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

            const user = await UserEntity.findOne({
                where: {
                    token: activationData.token,
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

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(activationData.password1 as string, salt);

            user.set("password", hashedPassword);
            user.set("token", null);
            await user.save();

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

export default auth;
