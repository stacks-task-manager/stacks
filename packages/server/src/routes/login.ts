// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Session-based login, password recovery, and reset HTML flows (cookies + redirects).
 */
import { sequelize, TenantEntity, UserEntity } from "@stacks/db";
import { Op } from "sequelize";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { compare, hash } from "bcryptjs";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import z from "zod/v4";
import { getCookieSecret } from "../config/secrets";
import { Logger } from "../utils/logger";
import { authCookieOptions, HINT_COOKIE_OPTS, isSecureCookieRequest } from "../config/session";
import { browserMutationAllowed, browserRequestToken, rotateBrowserNonce } from "../middleware/auth";
import { isPasswordRecoveryEnabled, isRegistrationEnabled } from "../config/features";
import { translate } from "@stacks/translations";
import { validator } from "../middleware/validator";
import { EmailsLoader } from "../loaders";
import { createPasswordResetToken, hashAccountToken } from "../services/accountTokens";
import { issueSession, revokeAllUserSessions } from "../services/sessions";
import type { User } from "../types";
import { getClientIP } from "../utils/clientIp";
import { enforceAuthAttemptLimit } from "../utils/authRateLimit";
import { resolveAccountState } from "../middleware/auth";
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

        const csrf = await browserRequestToken(c);
        return c.replyHtml("login", {
            csrf,
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
    if (!(await browserMutationAllowed(c, "none"))) {
        return c.text(translate("Cross site request rejected"), 403);
    }
    try {
        const loginData = await c.req.parseBody();
        LoginSchema.parse(loginData);

        const { email, password } = loginData;
        const limited = await enforceAuthAttemptLimit(c, "login", String(email));
        if (limited) return limited;

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

        const account = await resolveAccountState(String(user.get("id")));
        if (!account.ok) {
            await setLoginFlash(c, { errors: ["Invalid email or password"] });
            return c.redirect("/login");
        }
        const activeUser = account.user;

        if (activeUser.get("token") && (activeUser.get("token") as string).length > 0) {
            await setLoginFlash(c, {
                errors: [
                    "User account not yet activated. Please click on the link in the email to activate your account.",
                ],
            });
            return c.redirect("/login");
        }
        const { token } = await issueSession(String(activeUser.get("id")), String(activeUser.get("tenant")));

        await setSignedCookie(
            c,
            "auth_token",
            token,
            getCookieSecret(),
            authCookieOptions(token, isSecureCookieRequest(c.req.header("x-forwarded-proto")))
        );
        await setCookie(c, "uid", String(activeUser.get("id")), HINT_COOKIE_OPTS);
        await rotateBrowserNonce(c);

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

        const csrf = await browserRequestToken(c);
        return c.replyHtml("password-recovery", { csrf, errors, recoveryToken });
    } catch (error) {
        return c.text("Password recover page not found", 404);
    }
});

/** POST `/password-recovery` — Queues a reset link without revealing which accounts exist. */
login.post("/password-recovery", async c => {
    if (!(await browserMutationAllowed(c, "none"))) {
        return c.text(translate("Cross site request rejected"), 403);
    }
    if (!isPasswordRecoveryEnabled()) {
        return c.text(translate("Password recovery is disabled by the administrator"), 403);
    }
    try {
        const recoveryData = await c.req.parseBody();
        PasswordRecoverySchema.parse(recoveryData);
        const limited = await enforceAuthAttemptLimit(c, "recovery", String(recoveryData.email));
        if (limited) return limited;

        const userEntity = await UserEntity.findOne({ where: { email: recoveryData.email } });
        const eligible =
            userEntity &&
            !userEntity.get("disabled") &&
            !userEntity.get("system") &&
            !userEntity.get("deleted");

        if (eligible) {
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
                    ipAddress: getClientIP(c),
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
                Logger.security(
                    "Password recovery email could not be queued",
                    "medium",
                    { email: recoveryData.email },
                    c
                );
            }
        }

        await setLoginFlash(c, { errors: [translate("Password recovery link sent if the account exists")] });
        return c.redirect("/login/password-recovery");
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
        const csrf = await browserRequestToken(c);
        return c.replyHtml("password-reset", { csrf, token, email: user.get("email") });
    } catch (error) {
        return c.text("Password reset page not found", 404);
    }
});

/** POST `/password-reset` — Changes a password after validating the emailed token. */
login.post("/password-reset", async c => {
    if (!(await browserMutationAllowed(c, "none"))) {
        return c.text(translate("Cross site request rejected"), 403);
    }
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

        const tokenHash = hashAccountToken(resetData.token);
        const transaction = await sequelize.transaction();
        try {
            const [claimed] = await UserEntity.update(
                {
                    password: await hash(resetData.password1, 10),
                    passwordResetTokenHash: null,
                    passwordResetTokenExpiresAt: null,
                },
                {
                    where: {
                        id: user.get("id"),
                        passwordResetTokenHash: tokenHash,
                        passwordResetTokenExpiresAt: { [Op.gt]: new Date() },
                    },
                    returning: false,
                    transaction,
                }
            );
            if (claimed !== 1) {
                await transaction.rollback();
                return c.text(translate("Password reset link is invalid or expired"), 400);
            }
            await revokeAllUserSessions(String(user.get("id")), transaction);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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
