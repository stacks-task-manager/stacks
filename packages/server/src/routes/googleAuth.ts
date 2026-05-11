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
googleAuth.post('/callback', requireAuth, async (c: Context) => {
    const targetOrigin = JSON.stringify(postMessageTargetOrigin(c));
    try {
        const user = c.get('user') as User;
        const { code } = await c.req.json();

        if (!code) {
            return c.json({ error: 'Authorization code is required' }, 400);
        }

        // Exchange code for tokens
        const tokens = await googleOAuthService.getTokens(code);

        // Store tokens for the user
        await googleOAuthService.storeTokens(user.id, tokens);

        // Return HTML page that sends success message to parent window
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google OAuth Success</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, ${targetOrigin});
            window.close();
          </script>
          <p>Authentication successful! This window will close automatically.</p>
        </body>
      </html>
    `;

        return c.html(html);
    } catch (error) {
        console.error('Error in Google OAuth callback:', error);

        // Return HTML page that sends error message to parent window
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google OAuth Error</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Failed to process Google OAuth callback' }, ${targetOrigin});
            window.close();
          </script>
          <p>Authentication failed! This window will close automatically.</p>
        </body>
      </html>
    `;

        return c.html(html);
    }
});

/**
 * Check Google authentication status
 */
googleAuth.get('/status', requireAuth, async (c) => {
    try {
        const user = c.get('user') as User;
        const hasValidTokens = await googleOAuthService.hasValidTokens(user.id);

        return c.json({
            isAuthenticated: hasValidTokens,
            provider: 'google'
        });
    } catch (error) {
        console.error('Error checking Google auth status:', error);
        return c.replyError(new Error(translate("Google auth check failed")));
    }
});

/**
 * Disconnect Google account
 */
googleAuth.delete('/disconnect', requireAuth, async (c) => {
    try {
        const user = c.get('user') as User;
        await googleOAuthService.removeTokens(user.id);

        return c.replySuccess({
            success: true,
            message: 'Google account disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting Google account:', error);
        return c.json({ error: 'Failed to disconnect Google account' }, 500);
    }
});

/**
 * Get Google calendars
 */
googleAuth.get('/calendars', requireAuth, async (c) => {
    try {
        const user = c.get('user') as User;
        const calendars = await googleOAuthService.getCalendars(user.id);

        return c.replySuccess({ calendars });
    } catch (error) {
        console.error('Error fetching Google calendars:', error);
        return c.json({ error: 'Failed to fetch Google calendars' }, 500);
    }
});

export default googleAuth;
