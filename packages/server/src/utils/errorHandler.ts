// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { ApiMessageKeys } from "../apiMessageKeys";

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
    // Authentication & Authorization
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_TOKEN = "INVALID_TOKEN",

    // Validation
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",

    // Resource Management
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    CONFLICT = "CONFLICT",

    // Database
    DATABASE_ERROR = "DATABASE_ERROR",
    TRANSACTION_FAILED = "TRANSACTION_FAILED",

    // External Services
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

    // General
    INTERNAL_ERROR = "INTERNAL_ERROR",
    BAD_REQUEST = "BAD_REQUEST",
}

/**
 * Application error class with structured error information
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: Record<string, any>
    ) {
        super(message);

        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, AppError);
    }
}

function errorCodeFromHttpStatus(status: number): ErrorCode {
    if (status === 404) return ErrorCode.NOT_FOUND;
    if (status === 403) return ErrorCode.FORBIDDEN;
    if (status === 401) return ErrorCode.UNAUTHORIZED;
    if (status === 400) return ErrorCode.VALIDATION_ERROR;
    if (status === 409) return ErrorCode.CONFLICT;
    if (status === 501 || status === 502) return ErrorCode.BAD_REQUEST;
    return ErrorCode.INTERNAL_ERROR;
}

/**
 * Global error handler middleware for Hono.
 */
export const errorHandler = (error: Error, c: Context) => {
    // Handle AppError instances
    if (error instanceof AppError) {
        return c.replyError(
            error.message,
            {
                code: error.code,
                ...(error.context && { context: error.context }),
            },
            error.statusCode,
            error.code
        );
    }

    // Legacy: plain Error with numeric HTTP status in `cause` (e.g. loaders)
    if (error instanceof Error && typeof error.cause === "number") {
        const status = error.cause;
        const code = errorCodeFromHttpStatus(status);
        return c.replyError(error.message, { code }, status, code);
    }

    // Handle Hono HTTPException
    if (error instanceof HTTPException) {
        return c.replyError(
            error.message,
            { code: ErrorCode.BAD_REQUEST },
            error.status,
            ErrorCode.BAD_REQUEST
        );
    }

    // Handle validation errors from Zod or other validators
    if (error.name === "ZodError") {
        return c.replyError(
            ApiMessageKeys.validationFailed,
            {
                code: ErrorCode.VALIDATION_ERROR,
                context: { issues: (error as any).issues },
            },
            400,
            ErrorCode.VALIDATION_ERROR
        );
    }

    // Handle Sequelize errors
    if (error.name?.includes("Sequelize")) {
        const isDevelopment = process.env.NODE_ENV === "development";
        return c.replyError(
            isDevelopment ? error.message : ApiMessageKeys.databaseOperationFailed,
            {
                code: ErrorCode.DATABASE_ERROR,
                ...(isDevelopment && { stack: error.stack }),
            },
            500,
            ErrorCode.DATABASE_ERROR
        );
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === "development";
    console.error("Unhandled error:", error);

    return c.replyError(
        isDevelopment ? error.message : ApiMessageKeys.internalServerError,
        {
            code: ErrorCode.INTERNAL_ERROR,
            ...(isDevelopment && { stack: error.stack }),
        },
        500,
        ErrorCode.INTERNAL_ERROR
    );
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (c: Context, next?: Function) => {
        return Promise.resolve(fn(c, next)).catch(error => {
            return errorHandler(error, c);
        });
    };
};

/**
 * Utility to safely parse error messages from various sources
 */
export const parseErrorMessage = (error: any): string => {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return ApiMessageKeys.unknownErrorOccurred;
};

/**
 * Utility to check if an error is operational (expected) or programming error
 */
export const isOperationalError = (error: Error): boolean => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
