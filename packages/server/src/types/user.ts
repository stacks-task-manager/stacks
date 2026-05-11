// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Authenticated session user: directory person plus optional OAuth token bags.
 */
import { IPerson } from "@stacks/types";

export interface User extends IPerson {
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
