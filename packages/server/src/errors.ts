// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AppError, ErrorCode } from "./utils/errorHandler";

/** Re-exported so app code imports errors only from this file (definitions live in `errorHandler.ts`). */
export { AppError, ErrorCode };

/**
 * Single entry point for throwing API errors: use **`Errors.*`** everywhere (loaders, routes, middleware).
 * Each helper returns an {@link AppError}; do not call `new AppError` outside this module.
 *
 * Use the same string as a key in `locales/server/en.json` (e.g. `throw Errors.notFound(translate("Stack not found"))`).
 *
 * Named **`Errors`** (plural) so it does not shadow the native `Error` constructor.
 */
export const Errors = {
    notFound: (messageKey: string) => new AppError(messageKey, ErrorCode.NOT_FOUND, 404),

    forbidden: (messageKey: string) => new AppError(messageKey, ErrorCode.FORBIDDEN, 403),

    unauthorized: (messageKey: string) => new AppError(messageKey, ErrorCode.UNAUTHORIZED, 401),

    badRequest: (messageKey: string, context?: Record<string, unknown>) =>
        new AppError(messageKey, ErrorCode.VALIDATION_ERROR, 400, true, context),

    /** 400 with {@link ErrorCode.BAD_REQUEST} (constraints, export, etc.). */
    invalidInput: (messageKey: string) => new AppError(messageKey, ErrorCode.BAD_REQUEST, 400),

    /** 501 with {@link ErrorCode.BAD_REQUEST} (unimplemented endpoints). */
    notImplemented: (messageKey: string) => new AppError(messageKey, ErrorCode.BAD_REQUEST, 501),

    conflict: (messageKey: string) => new AppError(messageKey, ErrorCode.CONFLICT, 409),

    alreadyExists: (messageKey: string) => new AppError(messageKey, ErrorCode.ALREADY_EXISTS, 409),

    internal: (messageKey: string, context?: Record<string, unknown>) =>
        new AppError(messageKey, ErrorCode.INTERNAL_ERROR, 500, true, context),
};
