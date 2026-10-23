// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Session revocation for the browser. The session cookie authenticates the
 * request, so no bearer token is sent; the browser CSRF token proves the call
 * came from this app rather than a cross-site form submission.
 */
import request from "./request";
import { clearCsrfToken } from "./request";
import type { SilencedAxiosRequestConfig } from "./request";

export const AuthAPI = {
    /** POST `/auth/logout`; `revoked` is false when the session was already gone. */
    async revokeCurrentSession(): Promise<{ revoked: boolean }> {
        const config: SilencedAxiosRequestConfig = { silent: true };
        clearCsrfToken();
        return request.post("/auth/logout", null, config);
    },
};
