// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Auth and directory user payloads: registration, login, activation, recovery.
 */
import { z } from "zod/v4";

/** Public registration against a tenant and default role. */
export const UserRegisterSchema = z
    .object({
        email: z.email(),
        password: z.string().min(8),
        role: z.uuid(),
        tenant: z.uuid(),
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
        token: z.string(),
        password1: z.string(),
        password2: z.string().optional(),
    })
    .refine(({ password1, password2 }) => password1 === password2, {
        message: "Passwords must match",
        path: ["password"],
    })
    .refine(({ password1 }) => password1.length >= 8, {
        message: "Password must be at least 8 characters long",
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
});

/** Starts password recovery for an email. */
export const PasswordRecoverySchema = z.object({
    email: z.email(),
});
