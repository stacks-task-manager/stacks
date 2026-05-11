// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Session-based login, password recovery, and reset HTML flows (cookies + redirects).
 */
import { TenantEntity, UserEntity } from "@stacks/db";
import { compare } from "bcryptjs";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import z from "zod/v4";
import { getCookieSecret, getJwtSecret } from "../config/secrets";
import { validator } from "../middleware/validator";
import { LoginErrorSchema, LoginSchema, PasswordRecoverySchema } from "./schema/user";

const login = new Hono();

const LOGIN_FLASH_COOKIE = "login_flash";
const FLASH_COOKIE_OPTS = { path: "/", maxAge: 120, httpOnly: true, sameSite: "Lax" as const };

type LoginFlashPayload = {
    errors?: string[];
    success?: string[];
    recoveryToken?: string;
};

/** Persists one-shot flash messages for the next HTML response. */
async function setLoginFlash(c: Context, payload: LoginFlashPayload) {
    await setSignedCookie(
        c,
        LOGIN_FLASH_COOKIE,
        JSON.stringify(payload),
        getCookieSecret(),
        FLASH_COOKIE_OPTS
    );
}

/** Reads and clears the signed login flash cookie. */
async function takeLoginFlash(c: Context): Promise<LoginFlashPayload> {
    const raw = await getSignedCookie(c, getCookieSecret(), LOGIN_FLASH_COOKIE);
    deleteCookie(c, LOGIN_FLASH_COOKIE, { path: "/" });
    if (!raw) {
        return {};
    }
    try {
        return JSON.parse(raw) as LoginFlashPayload;
    } catch {
        return {};
    }
}

/** GET `/` — Renders login template with query/flash errors. */
login.get("/", validator(LoginErrorSchema, "query"), async c => {
    try {
        const query = c.req.valid("query");
        const flash = await takeLoginFlash(c);
        const errors = [...(flash.errors ?? [])];
        const success = [...(flash.success ?? [])];

        if (query.e != null) {
            errors.push(Buffer.from(query.e, "base64").toString());
        }

        return c.replyHtml("login", { errors, success });
    } catch (error) {
        return c.text("Login page not found", 404);
    }
});

/** POST `/` — Validates credentials, sets auth cookies, redirects to `/app`. */
login.post("/", async c => {
    try {
        const loginData = await c.req.parseBody();
        LoginSchema.parse(loginData);

        const { email, password } = loginData;

        // Find user
        const user = await UserEntity.findOne({ where: { email } });

        if (!user) {
            await setLoginFlash(c, { errors: ["Invalid email or password"] });
            return c.redirect("/login");
        }

        // Verify password
        const passwordMatch = await compare(password as string, user.get("password"));
        if (!passwordMatch) {
            await setLoginFlash(c, { errors: ["Invalid email or password"] });
            return c.redirect("/login");
        }

        // Find tenant
        const tenant = await TenantEntity.findByPk(user.get("tenant") as unknown as number);
        if (!tenant) {
            await setLoginFlash(c, { errors: ["Invalid email or password"] });
            return c.redirect("/login");
        }

        if (user.get("token") && (user.get("token") as string).length > 0) {
            await setLoginFlash(c, {
                errors: [
                    "User account not yet activated. Please click on the link in the email to activate your account.",
                ],
            });
            return c.redirect("/login");
        }

        // Generate JWT token
        const payload = {
            uid: user.get("id"),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
        };
        const token = await sign(payload, getJwtSecret());

        // Set cookie with the token
        await setSignedCookie(c, "auth_token", token, getCookieSecret());
        await setCookie(c, "uid", `${payload.uid}`);
        await setCookie(c, "tenant", `${tenant.get("id")}`);

        // Redirect to home or dashboard
        return c.redirect("/app");
    } catch (error) {
        if (error instanceof z.ZodError) {
            await setLoginFlash(c, { errors: error.issues.map(issue => issue.message) });
        }
        return c.redirect(`/login`);
    }
});

/** GET `/password-recovery` — Renders password recovery form with flash state. */
login.get("/password-recovery", async c => {
    try {
        const flash = await takeLoginFlash(c);
        const errors = [...(flash.errors ?? [])];
        const recoveryToken = flash.recoveryToken;

        return c.replyHtml("password-recovery", { errors, recoveryToken });
    } catch (error) {
        return c.text("Password recover page not found", 404);
    }
});

/** POST `/password-recovery` — Starts recovery flow and redirects. */
login.post("/password-recovery", async c => {
    try {
        const recoveryData = await c.req.parseBody();
        PasswordRecoverySchema.parse(recoveryData);

        const userEntity = await UserEntity.findOne({ where: { email: recoveryData.email } });

        const recoveryErrors: string[] = [];
        if (!userEntity) {
            recoveryErrors.push("Invalid email");
        } else if (userEntity.get("disabled")) {
            recoveryErrors.push("User account disabled. Please contact support.");
        } else if (userEntity.get("token") && (userEntity.get("token") as string).length > 0) {
            recoveryErrors.push(
                "User account not yet activated. Please click on the link in the email to activate your account."
            );
        } else if (userEntity.get("system")) {
            recoveryErrors.push("Unauthorized password reset. Please contact support.");
        }

        if (recoveryErrors.length) {
            await setLoginFlash(c, { errors: recoveryErrors });
            return c.redirect("/password-recovery");
        }

        userEntity?.set("passToken", Math.floor(111111 + Math.random() * 999999).toString());
        await userEntity?.save();

        return c.redirect("/login/password-reset");
    } catch (error) {
        if (error instanceof z.ZodError) {
            await setLoginFlash(c, { errors: error.issues.map(issue => issue.message) });
        }
        return c.redirect(`/login`);
    }
});

/** GET `/password-reset` — Renders password reset page. */
login.get("/password-reset", async c => {
    try {
        return c.replyHtml("password-reset");
    } catch (error) {
        return c.text("Password reset page not found", 404);
    }
});

export default login;
