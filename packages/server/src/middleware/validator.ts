// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ValidationTargets } from "hono";
import { createMiddleware } from "hono/factory";
import { ZodError } from "zod/v4";
import { Errors } from "../errors";
import { translate } from "@stacks/translations";

// Extend Hono's HonoRequest type to include the valid method
declare module "hono" {
    interface HonoRequest {
        valid<T = any>(target: keyof ValidationTargets): T;
    }
}

/**
 * Interface for detailed validation error information
 */
interface ValidationErrorDetails {
    field: string;
    message: string;
    code: string;
}

/**
 * Formats Zod validation errors into a more readable structure
 * @param error - The ZodError to format
 * @returns Array of formatted error details
 */
function formatValidationErrors(error: ZodError): ValidationErrorDetails[] {
    return error.issues.map(err => ({
        field: err.path.join(".") || "root",
        message: err.message,
        code: err.code,
    }));
}

/**
 * Custom validation middleware for Hono that integrates with Zod schemas
 *
 * Features:
 * - Validates request data against Zod schemas
 * - Supports json, query, form, and param validation
 * - Provides detailed error messages
 * - Integrates with custom error handling
 * - Type-safe validation results
 *
 * @param schema - Zod schema to validate against
 * @param type - Type of data to validate ('json', 'query', 'form', 'param')
 * @returns Hono middleware function
 *
 * @example
 * ```typescript
 * import { validator } from './middleware/validator';
 * import { z } from 'zod';
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * app.post('/users', validator(userSchema), async (c) => {
 *   const userData = c.req.valid('json');
 *   // userData is now type-safe and validated
 * });
 * ```
 */
export const validator = (schema: any, type: keyof ValidationTargets = "json") => {
    return createMiddleware(async (c, next) => {
        let value: any;

        try {
            switch (type) {
                case "json":
                    value = await c.req.json();
                    break;
                case "query":
                    {
                        const queries = c.req.queries();
                        const normalized: Record<string, any> = {};
                        for (const [key, val] of Object.entries(queries)) {
                            if (Array.isArray(val)) {
                                normalized[key] = val.length > 1 ? val : val[0];
                            } else {
                                normalized[key] = val as any;
                            }
                        }
                        value = normalized;
                    }
                    break;
                case "form":
                    value = await c.req.parseBody();
                    break;
                case "param":
                    value = c.req.param();
                    break;
                default:
                    value = await c.req.json();
            }
        } catch (error) {
            return c.replyError(Errors.badRequest(translate("Invalid request format")));
        }

        const result = schema.safeParse(value);
        if (!result.success) {
            const formattedErrors = formatValidationErrors(result.error);

            console.warn("Validation failed:", {
                path: c.req.path,
                method: c.req.method,
                errors: formattedErrors,
            });

            return c.replyError(
                new Error(translate("Data validation failed")),
                { validationErrors: formattedErrors, errorCode: "VALIDATION_ERROR" },
                400
            );
        }

        // Store validated data in context
        c.set("validatedData", result.data);

        // Add valid method to request for backward compatibility
        (c.req as any).valid = (target: string) => {
            if (target === type) {
                return result.data;
            }
            return undefined;
        };

        await next();
    });
};

/**
 * Convenience function for query parameter validation
 * @param schema - Zod schema for query parameters
 * @returns Validation middleware
 */
export const queryValidator = (schema: any) => {
    return validator(schema, "query");
};

/**
 * Convenience function for form data validation
 * @param schema - Zod schema for form data
 * @returns Validation middleware
 */
export const formValidator = (schema: any) => {
    return validator(schema, "form");
};

/**
 * Convenience function for JSON body validation
 * @param schema - Zod schema for JSON body
 * @returns Validation middleware
 */
export const jsonValidator = (schema: any) => {
    return validator(schema, "json");
};

/**
 * Convenience function for URL parameter validation
 * @param schema - Zod schema for URL parameters
 * @returns Validation middleware
 */
export const paramValidator = (schema: any) => {
    return validator(schema, "param");
};
