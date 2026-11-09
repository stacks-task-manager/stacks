// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Authentication middleware for protecting routes
 *
 * This module provides JWT-based authentication middleware that verifies
 * user tokens and attaches user information to the request context.
 *
 * One policy decides whether an identity may act: {@link resolveAuthenticatedIdentity}
 * (token verification plus {@link resolveAccountState}). HTTP middleware renders that
 * decision as the browser/API responses below; the WebSocket upgrade guard renders the
 * same decision as an HTTP status before the handshake.
 */
import { TenantEntity, UserEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { User } from "../types";
import { getAuthTokenWithSource } from "./utils";
import { RolesLoader } from "../loaders";
import { ErrorCode } from "../errors";
import { getCookieSecret, getJwtSecret } from "../config/secrets";
import { SESSION_AUDIENCE, SESSION_ISSUER } from "../config/session";
import {
    BROWSER_NONCE_COOKIE,
    CSRF_FORM_FIELD,
    CSRF_TOKEN_HEADER,
    browserNonceCookieOptions,
} from "../config/browserCsrf";
import { isTrustedOrigin } from "../config/origins";
import {
    browserTokenMatches,
    createBrowserNonce,
    deriveBrowserToken,
    formTokenFields,
    isBrowserUnsafeMethod,
    isFormContentType,
} from "../utils/browserCsrf";
import { sessionStillValid } from "../services/sessions";

// JWT payload interface for type safety
interface JWTPayload {
    uid: string;
    sid: string;
    iss?: string;
    aud?: string;
    email?: string;
    role?: string;
    tenant?: string;
    iat?: number;
    exp?: number;
}

/** Why a token could not be used. */
type TokenFailure =
    | "missing"
    | "expired"
    | "invalid-signature"
    | "invalid-token"
    | "revoked"
    | "unauthorized";

/** Why an authenticated token's account was refused. */
type AccountFailure = "unknown-user" | "disabled" | "deleted" | "tenant-disabled";

export type AuthFailure = TokenFailure | AccountFailure;

type TokenOutcome =
    | { ok: true; source: "header" | "cookie"; payload: JWTPayload }
    | { ok: false; failure: TokenFailure };

export interface AuthIdentity {
    ok: true;
    source: "header" | "cookie";
    userId: string;
    payload: JWTPayload;
    user: UserEntity;
}

type IdentityOutcome = AuthIdentity | { ok: false; failure: AuthFailure };

/** Maps a verification error onto a token failure kind. */
function classifyVerificationError(error: unknown): TokenFailure {
    if (error instanceof Error) {
        if (error.name === "JwtTokenExpired" || error.message.includes("expired")) {
            return "expired";
        }
        if (error.name === "JwtTokenSignatureMismatched") {
            return "invalid-signature";
        }
        if (
            error.name === "JwtAlgorithmMismatch" ||
            error.name === "JwtTokenIssuer" ||
            error.name === "JwtTokenAudience" ||
            error.name === "JwtPayloadRequiresAud"
        ) {
            return "invalid-token";
        }
    }
    return "unauthorized";
}

/**
 * Renders a rejected identity as the response for this request: API requests get
 * an error payload, browser requests redirect to login with the reason.
 */
function respondToAuthFailure(c: Context, failure: AuthFailure): Response {
    const isApiRequest = c.req.path.startsWith("/api/");
    const redirectWithReason = (message: string) =>
        c.redirect("/login?e=" + Buffer.from(translate(message)).toString("base64"));

    switch (failure) {
        case "expired":
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("Token expired")),
                    undefined,
                    401,
                    ErrorCode.UNAUTHORIZED
                );
            }
            return c.redirect("/login");
        case "invalid-signature":
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("Invalid token signature")),
                    undefined,
                    401,
                    ErrorCode.INVALID_TOKEN
                );
            }
            return c.redirect("/login");
        case "missing":
            return c.replyError(
                new Error(translate("Authentication token missing")),
                undefined,
                401,
                ErrorCode.UNAUTHORIZED
            );
        case "revoked":
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("Session was revoked")),
                    undefined,
                    401,
                    ErrorCode.UNAUTHORIZED
                );
            }
            return redirectWithReason("Session was revoked");
        case "invalid-token":
            return c.replyError(
                new Error(translate("Invalid authentication token")),
                undefined,
                401,
                ErrorCode.INVALID_TOKEN
            );
        case "unknown-user":
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("User not found or deactivated")),
                    undefined,
                    401,
                    ErrorCode.UNAUTHORIZED
                );
            }
            return redirectWithReason("User not found or deactivated");
        case "disabled":
            return redirectWithReason("User disabled");
        case "deleted":
            return redirectWithReason("Account was deleted");
        case "tenant-disabled":
            return redirectWithReason("Tenant disabled");
        default:
            return c.replyError(
                new Error(translate("Authentication failed")),
                undefined,
                401,
                ErrorCode.UNAUTHORIZED
            );
    }
}

/**
 * Verifies the request token and the session behind it, then returns its payload.
 *
 * Every transport goes through here, so a token is usable only when it carries
 * the required claims, matches the issuer/audience we issue, and its session row
 * is still unrevoked and unexpired. The session query is narrow (id + userId,
 * three attributes) because this also runs for static `/app/*` requests; the
 * account policy stays in {@link resolveAccountState}.
 */
async function resolveTokenPrincipal(c: Context): Promise<TokenOutcome> {
    const { token, source } = await getAuthTokenWithSource(c);

    if (!token) {
        return { ok: false, failure: "missing" };
    }

    const jwtSecret = getJwtSecret();

    try {
        const payload = (await verify(token, jwtSecret, {
            alg: "HS256",
            iss: SESSION_ISSUER,
            aud: SESSION_AUDIENCE,
        })) as unknown as JWTPayload;

        if (!payload || !hasRequiredClaims(payload)) {
            return { ok: false, failure: "invalid-token" };
        }

        const uid = String(payload.uid);
        const sid = String(payload.sid);

        if (!(await sessionStillValid(sid, uid))) {
            return { ok: false, failure: "revoked" };
        }

        return { ok: true, source: source === "cookie" ? "cookie" : "header", payload };
    } catch (error) {
        const failure = classifyVerificationError(error);
        console.warn("Authentication token rejected:", failure);
        return { ok: false, failure };
    }
}

/**
 * Hono validates issuer, audience, `nbf`, `exp` and `iat` when they are present,
 * but a token that omits any required claim is still "verified". Legacy tokens
 * (no `sid`, no issuer/audience) are refused at rollout, as agreed.
 */
function hasRequiredClaims(payload: JWTPayload): boolean {
    return (
        payload.uid !== undefined &&
        payload.sid !== undefined &&
        payload.iat !== undefined &&
        payload.exp !== undefined &&
        payload.iss !== undefined &&
        payload.aud !== undefined
    );
}

/**
 * Shared account policy: an identity may act only while its account and its
 * tenant are active. Used by the HTTP middleware and the WebSocket guard.
 */
export async function resolveAccountState(
    userId: string
): Promise<{ ok: true; user: UserEntity } | { ok: false; failure: AccountFailure }> {
    const user = await UserEntity.findOne({
        where: {
            id: userId,
        },
    });

    if (!user) {
        return { ok: false, failure: "unknown-user" };
    }

    if (user.get("disabled")) {
        return { ok: false, failure: "disabled" };
    }

    if (user.get("deleted")) {
        return { ok: false, failure: "deleted" };
    }

    const tenant = await TenantEntity.findOne({
        where: {
            id: user.get("tenant"),
            disabled: false,
        },
    });

    if (!tenant) {
        return { ok: false, failure: "tenant-disabled" };
    }

    return { ok: true, user };
}

/**
 * Full policy: token verification plus the account check above.
 */
export async function resolveAuthenticatedIdentity(c: Context): Promise<IdentityOutcome> {
    const tokenOutcome = await resolveTokenPrincipal(c);
    if (!tokenOutcome.ok) {
        return { ok: false, failure: tokenOutcome.failure };
    }

    const { source, payload } = tokenOutcome;
    const userId = String(payload.uid);

    const account = await resolveAccountState(userId);
    if (!account.ok) {
        return { ok: false, failure: account.failure };
    }

    return { ok: true, source, userId, payload, user: account.user };
}

/**
 * Issues the browser nonce cookie when this browser does not already carry one
 * and returns the token derived from it.
 *
 * Issuing only when absent is what makes the endpoint race-safe: two parallel
 * requests from the same browser cannot mint two nonces and leave the browser
 * holding a token the server no longer knows.
 */
export async function browserRequestToken(c: Context): Promise<string> {
    const secret = getCookieSecret();
    const existing = await getSignedCookie(c, secret, BROWSER_NONCE_COOKIE);
    if (existing) {
        return deriveBrowserToken(existing, secret);
    }

    const nonce = createBrowserNonce();
    await setSignedCookie(
        c,
        BROWSER_NONCE_COOKIE,
        nonce,
        secret,
        browserNonceCookieOptions(c.req.header("x-forwarded-proto"))
    );
    return deriveBrowserToken(nonce, secret);
}

/**
 * Replaces the nonce after a session boundary so a token an earlier page handed
 * out cannot be replayed against the next one.
 */
export async function rotateBrowserNonce(c: Context): Promise<void> {
    const secret = getCookieSecret();
    const options = browserNonceCookieOptions(c.req.header("x-forwarded-proto"));
    await deleteCookie(c, BROWSER_NONCE_COOKIE, { path: options.path ?? "/" });
    await setSignedCookie(c, BROWSER_NONCE_COOKIE, createBrowserNonce(), secret, options);
}

/**
 * Origin policy for a request that only reads state: a present but untrusted Origin is
 * rejected, an absent one is a non-browser caller and is allowed.
 */
export function browserOriginAllowed(c: Context): boolean {
    const origin = c.req.header("Origin");
    return origin === undefined || isTrustedOrigin(origin);
}

/**
 * Browser CSRF policy for a request that would change state.
 *
 * A verified bearer token is not a browser transport (an HTML form cannot set an
 * `Authorization` header), so it is exempt. Otherwise the request must present
 * exactly one token bound to the signed nonce cookie, and an `Origin` header
 * that is present must be one of the configured origins. An opaque `null`
 * origin is accepted only when the nonce-bound token proves same-site intent;
 * without the nonce it cannot use the native-client exception. A request that
 * carries neither cookie and has no opaque Origin is left to the identity check.
 */
export async function browserMutationAllowed(
    c: Context,
    verifiedSource: "header" | "cookie" | "none"
): Promise<boolean> {
    if (!isBrowserUnsafeMethod(c.req.method)) {
        return true;
    }

    if (verifiedSource === "header") {
        return true;
    }

    const origin = c.req.header("Origin");
    const opaqueOrigin = origin === "null";
    if (origin !== undefined && !opaqueOrigin && !isTrustedOrigin(origin)) {
        return false;
    }

    const secret = getCookieSecret();
    const nonce = await getSignedCookie(c, secret, BROWSER_NONCE_COOKIE);
    const authCookie = await getSignedCookie(c, secret, "auth_token");
    if (!nonce && !authCookie) {
        return !opaqueOrigin;
    }
    if (!nonce) {
        return false;
    }

    const candidates: string[] = [];
    const header = c.req.header(CSRF_TOKEN_HEADER);
    if (header !== undefined) {
        candidates.push(header);
    }

    const contentType = c.req.header("Content-Type") ?? "";
    if (isFormContentType(contentType)) {
        try {
            candidates.push(...formTokenFields(await c.req.formData(), CSRF_FORM_FIELD));
        } catch {
            // A body the platform cannot parse as a form carries no token candidate.
        }
    }

    return candidates.length === 1 && browserTokenMatches(candidates[0], nonce, secret);
}

/**
 * Session auth for SPA routes and assets. Check account state on each request so
 * disabling or deleting an account (or its tenant) revokes access immediately.
 * Role loading remains exclusive to API requests.
 */
export const requireAuthSession: MiddlewareHandler = async (c, next) => {
    const outcome = await resolveTokenPrincipal(c);
    if (!outcome.ok) {
        return respondToAuthFailure(c, outcome.failure);
    }

    const { payload } = outcome;
    const account = await resolveAccountState(String(payload.uid));
    if (!account.ok) {
        return respondToAuthFailure(c, account.failure);
    }

    c.set("userId", payload.uid);
    c.set("user", { id: payload.uid } as User);
    c.set("instanceId", c.req.header("X-Instance-ID") ?? "");

    await next();
};

/**
 * Authentication middleware that verifies JWT tokens and loads user data
 *
 * This middleware:
 * 1. Extracts JWT token from Authorization header or signed cookie
 * 2. Verifies token signature and expiration
 * 3. Loads user data from database
 * 4. Attaches user object to context for downstream handlers
 * 5. Redirects to login on authentication failure
 *
 * @param c - Hono context object
 * @param next - Next middleware function
 * @returns Response or continues to next middleware
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
    try {
        const identity = await resolveAuthenticatedIdentity(c);
        if (!identity.ok) {
            return respondToAuthFailure(c, identity.failure);
        }

        if (!(await browserMutationAllowed(c, identity.source))) {
            return c.replyError(
                new Error(translate("Cross site request rejected")),
                undefined,
                403,
                ErrorCode.FORBIDDEN
            );
        }

        const { user, payload } = identity;
        const role = await RolesLoader.getById(user.get("role"), user.get("tenant"));

        // Attach user data to context for downstream handlers
        c.set("user", user.toJSON());
        c.set("userId", String(user.id));
        c.set("sid", payload.sid);
        c.set("userRole", role);
        c.set("userTenant", user.tenant);
        c.set("instanceId", c.req.header("X-Instance-ID") ?? "");

        await next();
    } catch {
        console.error("Authentication middleware failed");
        return c.replyError(
            new Error(translate("Authentication failed")),
            undefined,
            401,
            ErrorCode.UNAUTHORIZED
        );
    }
};
