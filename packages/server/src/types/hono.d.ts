// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { User } from "./user";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { IRole, SendEmailFunction } from "@stacks/types";
import type { ZodIssue } from "zod/v4";
import type { AppError } from "../errors";
import "hono";

declare module "hono" {
    interface ContextVariableMap {
        /** Authenticated user attached by `requireAuth`. */
        user: User;
        /** Zod validation issues attached by the `validator` middleware. */
        issues: ZodIssue[];
        /** Set by `translations` middleware from `Accept-Language` (BCP-47 / file stem, e.g. `en`, `de`). */
        locale: string;
        /** Set by `withRequestContext` when user is authenticated (UUID per request). */
        requestId?: string;
        /** User id; set by `requireAuth` (and by `requireAuthSession` with a thin placeholder user). */
        userId: string;
        /** Fully resolved role; set by `requireAuth` alongside `user`. */
        userRole: IRole;
        /** Tenant id for the authenticated user. */
        userTenant: string;
        /** Instance id derived from the `X-Instance-ID` request header. */
        instanceId: string;
        /** Role summary set by `requireAdmin` after DB-backed admin check. */
        adminRole: { id: string; name: string; admin: boolean };
        /** Parsed payload attached by the generic `validator` helper when no Zod validator is used. */
        validatedData: unknown;
    }
    interface Context<V extends ContextVariableMap = ContextVariableMap> {
        get<K extends keyof V>(key: K): V[K];
        replyError: (error: AppError | Error | string, errors?: any, code?: number, errorCode?: string) => Response;
        replySuccess: <T = any>(
            data?: T,
            message?: string,
            meta?: any,
            statusCode?: ContentfulStatusCode
        ) => Response;
        sendEmail: SendEmailFunction;
        replyHtml: (file: string, data?: any) => Response;
    }
}
