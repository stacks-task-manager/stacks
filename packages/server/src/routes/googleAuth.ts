// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Google Calendar OAuth helpers: URL, callback HTML, token status, disconnect, calendar list.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { translate } from "@stacks/translations";
import { privateResponse } from "../middleware/privateResponse";
import { POLLINGACTIONS, POLLINGTYPE, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { getCookie, setCookie } from "hono/cookie";
import { createInlineScriptNonce, scriptSafeJson } from "../utils/scriptContext";
import { postMessageTargetOrigin } from "../config/postMessageOrigin";
import { OAUTH_NONCE_COOKIE, oauthNonceCookieOptions } from "../config/oauthAttempts";
import { isSecureCookieRequest } from "../config/session";
import { beginOAuthAttempt, redeemOAuthAttempt } from "../services/oauthAttempts";
import { sendRealtimeUpdateToUser } from "../events";
import { requireAuth } from "../middleware/auth";
import { requireRoleAccess } from "../middleware/roleAccess";
import googleOAuthService from "../services/googleOAuthService";
import type { User } from "../types/user";

const googleAuth = new Hono();
googleAuth.use("*", privateResponse);

const sendGoogleCalendarAuthUpdate = (userId: string) => {
    sendRealtimeUpdateToUser(userId, {
        type: POLLINGTYPE.CALENDAR,
        record: "google",
        action: POLLINGACTIONS.UPDATE,
        automation: true,
    });
};

export const popupHtml = (targetOrigin: string, payload: Record<string, unknown>, message: string) => {
    const nonce = createInlineScriptNonce();
    const safeTargetOrigin = scriptSafeJson(targetOrigin);
    const safePayload = scriptSafeJson(payload);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google OAuth</title>
        </head>
        <body>
          <script nonce="${nonce}">
            try {
              window.opener && window.opener.postMessage(${safePayload}, ${safeTargetOrigin});
            } finally {
              window.close();
            }
          </script>
          <p>${message}</p>
        </body>
      </html>
    `;

    return { html, headers: { "Content-Security-Policy": `script-src 'nonce-${nonce}'` } };
};

const popupResponse = (
    c: Context,
    targetOrigin: string,
    payload: Record<string, unknown>,
    message: string
) => {
    const popup = popupHtml(targetOrigin, payload, message);
    return c.html(popup.html, 200, popup.headers);
};

/**
 * Get Google OAuth authorization URL. The state value, the browser nonce, and the
 * PKCE verifier belong to the attempt recorded here; only the callback that
 * presents all three can redeem it.
 */
googleAuth.get(
    "/auth-url",
    requireAuth,
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    async c => {
        try {
            const user = c.get("user") as User;
            const attempt = await beginOAuthAttempt(
                String(user.id),
                String(c.get("userTenant")),
                String(c.get("sid"))
            );
            const authUrl = googleOAuthService.getAuthUrl(attempt.state, attempt.challenge);

            await setCookie(
                c,
                OAUTH_NONCE_COOKIE,
                attempt.nonce,
                oauthNonceCookieOptions(isSecureCookieRequest(c.req.header("x-forwarded-proto")))
            );

            return c.replySuccess({ authUrl });
        } catch {
            console.error("Google OAuth authorization URL creation failed");
            return c.json({ error: "Failed to generate authorization URL" }, 500);
        }
    }
);

/**
 * Handle Google OAuth callback
 */
const handleCallback = async (c: Context, code?: string, error?: string, state?: string) => {
    const targetOrigin = postMessageTargetOrigin(c);
    try {
        // Nothing is exchanged or stored until the callback proves it finishes the
        // flow this browser started, so an unsolicited or replayed callback links
        // no credentials even when it carries a real code.
        const user = c.get("user") as User;
        const attempt = await redeemOAuthAttempt(
            state,
            String(user.id),
            String(c.get("userTenant")),
            String(c.get("sid")),
            getCookie(c, OAUTH_NONCE_COOKIE)
        );

        if (!attempt) {
            return popupResponse(
                c,
                targetOrigin,
                { type: "GOOGLE_AUTH_ERROR", code: "oauth_error" },
                "Authentication failed! This window will close automatically."
            );
        }

        if (error) {
            return popupResponse(
                c,
                targetOrigin,
                { type: "GOOGLE_AUTH_ERROR", code: "oauth_error" },
                "Authentication failed."
            );
        }

        if (!code) return c.json({ error: "Authorization code is required" }, 400);

        // Exchange code for tokens with the verifier that started this attempt
        const tokens = await googleOAuthService.getTokens(code, attempt.codeVerifier);

        // Store tokens for the user
        await googleOAuthService.storeTokens(user.id, tokens);
        sendGoogleCalendarAuthUpdate(user.id);

        return popupResponse(
            c,
            targetOrigin,
            { type: "GOOGLE_AUTH_SUCCESS" },
            "Authentication successful! This window will close automatically."
        );
    } catch {
        console.error("Google OAuth callback failed");

        return popupResponse(
            c,
            targetOrigin,
            { type: "GOOGLE_AUTH_ERROR", code: "oauth_error" },
            "Authentication failed! This window will close automatically."
        );
    }
};

googleAuth.get(
    "/callback",
    requireAuth,
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    async (c: Context) => {
        const code = c.req.query("code");
        const error = c.req.query("error");
        const state = c.req.query("state");
        return await handleCallback(c, code, error, state);
    }
);

googleAuth.post(
    "/callback",
    requireAuth,
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    async (c: Context) => {
        const { code, error, state } = await c.req.json();
        return await handleCallback(c, code, error, state);
    }
);

/**
 * Check Google authentication status
 */
googleAuth.get("/status", requireAuth, requireRoleAccess(ROLE_SECTIONS.CALENDAR), async c => {
    try {
        const user = c.get("user") as User;
        const hasValidTokens = await googleOAuthService.hasValidTokens(user.id);

        return c.replySuccess({
            isAuthenticated: hasValidTokens,
            provider: "google",
        });
    } catch {
        console.error("Google OAuth status lookup failed");
        return c.replyError(new Error(translate("Google auth check failed")));
    }
});

/**
 * Disconnect Google account
 */
const handleDisconnect = async (c: Context) => {
    try {
        const user = c.get("user") as User;
        await googleOAuthService.removeTokens(user.id);
        sendGoogleCalendarAuthUpdate(user.id);

        return c.replySuccess({ disconnected: true }, "Google account disconnected successfully");
    } catch {
        console.error("Google OAuth disconnect failed");
        return c.json({ error: "Failed to disconnect Google account" }, 500);
    }
};

googleAuth.delete(
    "/disconnect",
    requireAuth,
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    handleDisconnect
);
googleAuth.post(
    "/disconnect",
    requireAuth,
    requireRoleAccess(ROLE_SECTIONS.CALENDAR, ROLE_ACTIONS.WRITE),
    handleDisconnect
);

/**
 * Get Google calendars
 */
googleAuth.get("/calendars", requireAuth, requireRoleAccess(ROLE_SECTIONS.CALENDAR), async c => {
    try {
        const user = c.get("user") as User;
        const calendars = await googleOAuthService.getCalendars(user.id);

        const normalized = calendars.map((calendar: any) => {
            const accessRole = typeof calendar.accessRole === "string" ? calendar.accessRole : "";
            const readOnly = accessRole !== "owner" && accessRole !== "writer";
            return {
                id: calendar.id,
                title: calendar.summary ?? "",
                color: calendar.backgroundColor ?? "#1976d2",
                source: "google",
                primary: calendar.primary === true,
                readOnly,
            };
        });

        return c.replySuccess(normalized);
    } catch {
        console.error("Google Calendar listing failed");
        return c.json({ error: "Failed to fetch Google calendars" }, 500);
    }
});

export default googleAuth;
