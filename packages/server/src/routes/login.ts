// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Session-based login, password recovery, and reset HTML flows (cookies + redirects).
 */
import { TenantEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { compare, hash } from "bcryptjs";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import z from "zod/v4";
import { getCookieSecret, getJwtSecret } from "../config/secrets";
import { isPasswordRecoveryEnabled, isRegistrationEnabled } from "../config/features";
import { translate } from "@stacks/translations";
import { validator } from "../middleware/validator";
import { EmailsLoader } from "../loaders";
import { createPasswordResetToken, hashAccountToken } from "../services/accountTokens";
import type { User } from "../types";
import {
    LoginErrorSchema,
    LoginSchema,
    PasswordRecoverySchema,
    PasswordResetQuerySchema,
    PasswordResetSchema,
} from "./schema/user";

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
        if (query.s != null) {
            success.push(Buffer.from(query.s, "base64").toString());
        }

        return c.replyHtml("login", {
            errors,
            success,
            registrationEnabled: isRegistrationEnabled(),
            passwordRecoveryEnabled: isPasswordRecoveryEnabled(),
        });
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
        if (user.get("disabled")) {
            await setLoginFlash(c, { errors: ["User account disabled. Please contact support."] });
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
    if (!isPasswordRecoveryEnabled()) {
        return c.text(translate("Password recovery is disabled by the administrator"), 403);
    }
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
    if (!isPasswordRecoveryEnabled()) {
        return c.text(translate("Password recovery is disabled by the administrator"), 403);
    }
    try {
        const recoveryData = await c.req.parseBody();
        PasswordRecoverySchema.parse(recoveryData);

        const userEntity = await UserEntity.findOne({ where: { email: recoveryData.email } });

        const recoveryErrors: string[] = [];
        if (!userEntity) {
            recoveryErrors.push("Invalid email");
        } else if (userEntity.get("token") && (userEntity.get("token") as string).length > 0) {
            recoveryErrors.push(
                "User account not yet activated. Please click on the link in the email to activate your account."
            );
        } else if (userEntity.get("disabled")) {
            recoveryErrors.push("User account disabled. Please contact support.");
        } else if (userEntity.get("system")) {
            recoveryErrors.push("Unauthorized password reset. Please contact support.");
        }

        if (recoveryErrors.length) {
            await setLoginFlash(c, { errors: recoveryErrors });
            return c.redirect("/login/password-recovery");
        }

        const reset = createPasswordResetToken();
        userEntity!.set("passwordResetTokenHash", reset.hash);
        userEntity!.set("passwordResetTokenExpiresAt", reset.expiresAt);
        await userEntity!.save();

        const queued = await EmailsLoader.queueEmail(
            String(userEntity!.get("id")),
            {
                userName: `${userEntity!.get("firstName")} ${userEntity!.get("lastName")}`,
                resetLink: `/login/password-reset?token=${reset.token}`,
                expirationTime: "1 hour",
                ipAddress: c.req.header("x-forwarded-for"),
                userAgent: c.req.header("user-agent"),
            },
            EMAIL_TEMPLATES.PASSWORD_RESET,
            c.get("locale") || "en",
            userEntity!.toJSON() as User
        );
        if (!queued) {
            userEntity!.set("passwordResetTokenHash", null);
            userEntity!.set("passwordResetTokenExpiresAt", null);
            await userEntity!.save();
            await setLoginFlash(c, { errors: ["Password recovery email could not be queued"] });
            return c.redirect("/login/password-recovery");
        }

        await setLoginFlash(c, {
            success: ["Check your email for a password reset link."],
        });
        return c.redirect("/login");
    } catch (error) {
        if (error instanceof z.ZodError) {
            await setLoginFlash(c, { errors: error.issues.map(issue => issue.message) });
        }
        return c.redirect(`/login`);
    }
});

/** GET `/password-reset` — Renders password reset page. */
login.get("/password-reset", async c => {
    if (!isPasswordRecoveryEnabled()) {
        return c.text(translate("Password recovery is disabled by the administrator"), 403);
    }
    try {
        const query = PasswordResetQuerySchema.safeParse(c.req.query());
        if (!query.success) {
            return c.text(translate("Password reset link is invalid or expired"), 400);
        }
        const { token } = query.data;
        const user = await UserEntity.findOne({
            where: { passwordResetTokenHash: hashAccountToken(token) },
        });
        const expiresAt = user?.get("passwordResetTokenExpiresAt") as Date | null | undefined;
        if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
            return c.text(translate("Password reset link is invalid or expired"), 400);
        }
        return c.replyHtml("password-reset", { token, email: user.get("email") });
    } catch (error) {
        return c.text("Password reset page not found", 404);
    }
});

/** POST `/password-reset` — Changes a password after validating the emailed token. */
login.post("/password-reset", async c => {
    if (!isPasswordRecoveryEnabled()) {
        return c.text(translate("Password recovery is disabled by the administrator"), 403);
    }
    try {
        const resetData = PasswordResetSchema.parse(await c.req.parseBody());
        const user = await UserEntity.findOne({
            where: { passwordResetTokenHash: hashAccountToken(resetData.token) },
        });
        const expiresAt = user?.get("passwordResetTokenExpiresAt") as Date | null | undefined;
        if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
            return c.text(translate("Password reset link is invalid or expired"), 400);
        }

        user.set("password", await hash(resetData.password1, 10));
        user.set("passwordResetTokenHash", null);
        user.set("passwordResetTokenExpiresAt", null);
        await user.save();
        await setLoginFlash(c, { success: ["Your password has been reset. You can now log in."] });
        return c.redirect("/login");
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.text(error.issues.map(issue => issue.message).join("\n"), 400);
        }
        throw error;
    }
});

export default login;
