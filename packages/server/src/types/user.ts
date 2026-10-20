// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Authenticated session user: directory person plus optional OAuth token bags.
 */
import { IPerson } from "@stacks/types";

/**
 * Server-only session user: the public person shape plus credentials and account state that
 * must never be serialized into a person response.
 */
export interface User extends IPerson {
    password?: string;
    token?: string | null;
    activationTokenHash?: string | null;
    activationTokenExpiresAt?: string | null;
    passwordResetTokenHash?: string | null;
    passwordResetTokenExpiresAt?: string | null;
    oauthTokens?: {
        google?: {
            access_token: string;
            refresh_token: string;
            scope: string;
            token_type: string;
            expiry_date: number;
        };
        microsoft?: {
            access_token: string;
            refresh_token: string;
            scope: string;
            token_type: string;
            expiry_date: number;
        };
    };
}
