// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

const ENABLED_VALUES = new Set(["true", "1", "yes", "on"]);

/** Parses an opt-in feature flag. Unknown, empty, and missing values are disabled. */
export function parseEnabledFeature(value: string | undefined): boolean {
    return value !== undefined && ENABLED_VALUES.has(value.trim().toLowerCase());
}

export function isRegistrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return parseEnabledFeature(env.REGISTRATION_ENABLED);
}

export function isPasswordRecoveryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return parseEnabledFeature(env.PASSWORD_RECOVERY_ENABLED);
}
