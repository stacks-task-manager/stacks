// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Google Calendar OAuth helpers: URL, callback HTML, token status, disconnect, calendar list.
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { translate } from "@stacks/translations";
import { postMessageTargetOrigin } from '../config/postMessageOrigin';
import { requireAuth } from '../middleware/auth';
import googleOAuthService from '../services/googleOAuthService';
import type { User } from '../types/user';

const googleAuth = new Hono();

const popupHtml = (targetOrigin: string, payload: Record<string, unknown>, message: string) => {
    const safeTargetOrigin = JSON.stringify(targetOrigin);
    const safePayload = JSON.stringify(payload);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google OAuth</title>
        </head>
        <body>
          <script>
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
};

/**
 * Get Google OAuth authorization URL
 */
googleAuth.get('/auth-url', requireAuth, async (c) => {
    try {
        const authUrl = googleOAuthService.getAuthUrl();
        return c.replySuccess({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        return c.json({ error: 'Failed to generate authorization URL' }, 500);
    }
});

/**
 * Handle Google OAuth callback
 */
const handleCallback = async (c: Context, code?: string, error?: string) => {
    const targetOrigin = postMessageTargetOrigin(c);
    try {
        if (error) {
            return c.html(
                popupHtml(targetOrigin, { type: "GOOGLE_AUTH_ERROR", error }, "Authentication failed.")
            );
        }

        const user = c.get('user') as User;
        if (!code) return c.json({ error: 'Authorization code is required' }, 400);

        // Exchange code for tokens
        const tokens = await googleOAuthService.getTokens(code);

        // Store tokens for the user
        await googleOAuthService.storeTokens(user.id, tokens);

        return c.html(
            popupHtml(
                targetOrigin,
                { type: "GOOGLE_AUTH_SUCCESS" },
                "Authentication successful! This window will close automatically."
            )
        );
    } catch (error) {
        console.error('Error in Google OAuth callback:', error);

        return c.html(
            popupHtml(
                targetOrigin,
                { type: "GOOGLE_AUTH_ERROR", error: "Failed to process Google OAuth callback" },
                "Authentication failed! This window will close automatically."
            )
        );
    }
};

googleAuth.get('/callback', requireAuth, async (c: Context) => {
    const code = c.req.query("code");
    const error = c.req.query("error");
    return await handleCallback(c, code, error);
});

googleAuth.post('/callback', requireAuth, async (c: Context) => {
    const { code } = await c.req.json();
    return await handleCallback(c, code);
});

/**
 * Check Google authentication status
 */
googleAuth.get('/status', requireAuth, async (c) => {
    try {
        const user = c.get('user') as User;
        const hasValidTokens = await googleOAuthService.hasValidTokens(user.id);

        return c.replySuccess({
            isAuthenticated: hasValidTokens,
            provider: 'google',
        });
    } catch (error) {
        console.error('Error checking Google auth status:', error);
        return c.replyError(new Error(translate("Google auth check failed")));
    }
});

/**
 * Disconnect Google account
 */
const handleDisconnect = async (c: Context) => {
    try {
        const user = c.get('user') as User;
        await googleOAuthService.removeTokens(user.id);

        return c.replySuccess({ disconnected: true }, 'Google account disconnected successfully');
    } catch (error) {
        console.error('Error disconnecting Google account:', error);
        return c.json({ error: 'Failed to disconnect Google account' }, 500);
    }
};

googleAuth.delete('/disconnect', requireAuth, handleDisconnect);
googleAuth.post('/disconnect', requireAuth, handleDisconnect);

/**
 * Get Google calendars
 */
googleAuth.get('/calendars', requireAuth, async (c) => {
    try {
        const user = c.get('user') as User;
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
    } catch (error) {
        console.error('Error fetching Google calendars:', error);
        return c.json({ error: 'Failed to fetch Google calendars' }, 500);
    }
});

export default googleAuth;
