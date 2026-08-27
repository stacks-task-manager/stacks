// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { createHash, randomBytes, randomUUID } from "crypto";

export const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createActivationToken(): { token: string; expiresAt: Date } {
    return { token: randomUUID(), expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS) };
}

export function hashAccountToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(32).toString("hex");
    return {
        token,
        hash: hashAccountToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    };
}
