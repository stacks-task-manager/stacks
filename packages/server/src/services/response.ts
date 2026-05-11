// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Response helper utilities for standardized API responses
 *
 * This module extends the Hono context with replyError and replySuccess methods
 * to ensure consistent response formatting across the application with localization support.
 */

import type { Hono } from "hono";
import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../errors";
import "../types/hono.d.ts";
import { EMAIL_TEMPLATES, EmailTemplateData } from "@stacks/types";
import { EmailsLoader } from "../loaders";

// Type definitions for standardized responses
interface ErrorResponse {
    success: false;
    message: string;
    errors?: any;
    timestamp: string;
    code?: string;
}

interface SuccessResponse<T = any> {
    success: true;
    data?: T;
    message?: string;
    timestamp: string;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
}

/**
 * Registers response helper methods on the Hono application context
 *
 * Adds replyError and replySuccess methods to all route contexts for
 * consistent API response formatting with localization support.
 *
 * @param app - Hono application instance
 */
export function registerResponseHelpers(app: Hono): void {
    app.use("*", async (c, next) => {
        /**
         * Single API for error JSON responses (localized via `Locale` header).
         *
         * - **`replyError(appError)`** — prefer `Errors.*()` so status and `ErrorCode` are set on the error.
         * - **`replyError(message, undefined, status, errorCode?)`** — plain `Error` or string when you must set status explicitly.
         * - **`replyError(message, errorsPayload, status, errorCode?)`** — extra body (e.g. validation details).
         *   Do not pass HTTP status as the second argument; use `undefined` if there is no `errors` object.
         */
        c.replyError = function (
            error: AppError | Error | string,
            errors?: any,
            code?: number,
            errorCode?: string
        ) {
            let errorMessage: string;
            let statusCode: number;
            let resolvedCode: string | undefined;
            let errorsPayload: any = errors;

            if (error instanceof AppError) {
                errorMessage = error.message;
                statusCode = code ?? error.statusCode;
                resolvedCode = errorCode ?? error.code;
                errorsPayload = {
                    code: error.code,
                    ...(error.context && { context: error.context }),
                    ...errors,
                };
            } else {
                errorMessage = typeof error === "string" ? error : error.message;
                const fromCause =
                    typeof error === "object" && error && typeof (error as Error).cause === "number"
                        ? ((error as Error).cause as number)
                        : undefined;
                statusCode = code ?? fromCause ?? 500;
                resolvedCode = errorCode;
                errorsPayload = errors;
            }

            const response: ErrorResponse = {
                success: false,
                message: errorMessage,
                timestamp: new Date().toISOString(),
                ...(errorsPayload && Object.keys(errorsPayload).length > 0 && { errors: errorsPayload }),
                ...(resolvedCode && { code: resolvedCode }),
            };

            return this.json(response, statusCode as any);
        };

        /**
         * Recursively replaces undefined values with null in an object
         *
         * @param obj - Object to process
         * @returns Object with undefined values replaced by null
         */
        function replaceUndefinedWithNull(obj: any): any {
            if (obj === null || obj === undefined) {
                return null;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => replaceUndefinedWithNull(item));
            }

            // Handle Date objects, functions, and other special objects
            if (typeof obj === "object" && obj.constructor !== Object) {
                return obj;
            }

            if (typeof obj === "object") {
                const result: any = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        result[key] = replaceUndefinedWithNull(obj[key]);
                    }
                }
                return result;
            }

            return obj;
        }

        /**
         * Sends a standardized success response
         *
         * @param data - Response data payload
         * @param message - Optional success message
         * @param meta - Optional metadata (pagination, etc.)
         * @param statusCode - HTTP status code (default: 200)
         */
        c.replySuccess = function <T = any>(
            data?: T,
            message?: string,
            meta?: any,
            statusCode: ContentfulStatusCode = 200
        ) {
            // Process data to replace undefined with null
            const processedData = data !== undefined ? replaceUndefinedWithNull(data) : undefined;
            const processedMeta = meta ? replaceUndefinedWithNull(meta) : undefined;

            const response: SuccessResponse<T> = {
                success: true,
                timestamp: new Date().toISOString(),
                ...(processedData !== undefined && { data: processedData }),
                ...(message && { message }),
                ...(processedMeta && { meta: processedMeta }),
            };

            return this.json(response, statusCode);
        };

        c.sendEmail = async function <T extends EMAIL_TEMPLATES>(
            recipientId: string,
            template: T,
            data: EmailTemplateData<T>,
            scheduleAt?: Date
        ): Promise<boolean> {
            const user = c.get("user");
            const locale = c.req.header("Locale") || "en";
            return await EmailsLoader.queueEmail(recipientId, data, template, locale, user, scheduleAt);
        };

        c.replyHtml = function (file: string, data?: any) {
            const htmlPath = join(process.cwd(), "static", `${file}.html`);
            const templateSource = readFileSync(htmlPath, "utf-8");
            const template = Handlebars.compile(templateSource);
            const html = template(data || {});
            return this.html(html);
        };

        await next();
    });
}
