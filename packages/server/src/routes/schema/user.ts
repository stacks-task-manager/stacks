// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Auth and directory user payloads: registration, login, activation, recovery.
 */
import { z } from "zod/v4";

import { isAcceptableNewPassword } from "../../utils/passwordPolicy";

/** Account credentials are 32 random bytes rendered as lowercase hex. */
export const AccountTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** A password being written must satisfy the policy before bcrypt ever sees it. */
const NewPasswordSchema = z.string().refine(isAcceptableNewPassword, {
    message: "New password must be at least 12 characters and at most 72 bytes",
});

/** Public registration against a tenant and default role. */
export const UserRegisterSchema = z
    .object({
        email: z.email(),
        password: NewPasswordSchema,
        tenant: z.guid(),
        firstName: z.string(),
        lastName: z.string(),
        gender: z.string().optional(),
    })
    .strict();

/** API JSON login (non-HTML). */
export const UserLoginSchema = z
    .object({
        email: z.email(),
        password: z.string(),
    })
    .strict();

/** Creates a workspace person; `real` controls activation email. */
export const NewPersonSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    role: z.uuid(),
    real: z.boolean(),
    company: z.string().optional(),
    email: z.email().optional(),
});

/** Completes signup from emailed token and sets password. */
export const UserActivationSchema = z
    .object({
        token: AccountTokenSchema,
        password1: NewPasswordSchema,
        password2: z.string().optional(),
    })
    .refine(({ password1, password2 }) => password1 === password2, {
        message: "Passwords must match",
        path: ["password"],
    });

/** HTML login form fields (parseBody). */
export const LoginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

/** Optional base64 error payload on GET `/login`. */
export const LoginErrorSchema = z.object({
    e: z.string().optional(),
    s: z.string().optional(),
});

/** Starts password recovery for an email. */
export const PasswordRecoverySchema = z.object({
    email: z.email(),
});

export const PasswordResetQuerySchema = z.object({
    token: AccountTokenSchema,
});

export const PasswordResetSchema = z
    .object({
        token: AccountTokenSchema,
        password1: NewPasswordSchema,
        password2: z.string(),
    })
    .refine(({ password1, password2 }) => password1 === password2, {
        message: "Passwords must match",
        path: ["password2"],
    });
