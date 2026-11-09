// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * New-password policy (S14): the bounds a candidate password must satisfy before it
 * reaches bcrypt. bcrypt reads at most 72 UTF-8 bytes and silently ignores the rest,
 * so an over-length candidate is rejected rather than truncated. The policy is only
 * ever applied to passwords being written; existing hashes are never re-checked, which
 * is what keeps legacy shorter passwords valid on login.
 */
export const MIN_NEW_PASSWORD_CHARACTERS = 12;
export const MAX_PASSWORD_BYTES = 72;

/** Counts code points, which is what a user means by "characters". */
const characterCount = (value: string): number => [...value].length;

/** Counts UTF-8 bytes, which is the unit bcrypt actually reads. */
const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");

/** True when a candidate may be hashed as a new password. */
export const isAcceptableNewPassword = (password: string): boolean =>
    characterCount(password) >= MIN_NEW_PASSWORD_CHARACTERS && byteLength(password) <= MAX_PASSWORD_BYTES;
