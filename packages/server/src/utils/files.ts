// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { existsSync } from "fs";
import { lookup } from "mime-types";

/**
 * File utilities
 *
 * Provides helpers for working with file metadata and sizes.
 */

/**
 * Convert a byte size into a human‑readable string (e.g. "1.5 MB").
 *
 * - Uses base 1024 (binary units): B, KB, MB, GB, TB, PB, EB
 * - Rounds to 1 decimal place for values < 10 in non‑byte units; otherwise no decimals
 *
 * @param bytes Size in bytes
 * @returns Human readable size string
 */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const k = 1024;
    const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    // Round to 1 decimal, but only show it if non-zero
    const rounded = Math.round(value * 10) / 10;
    const decimals = Number.isInteger(rounded) ? 0 : 1;

    return `${rounded.toFixed(decimals)} ${units[i]}`;
}

/**
 * Get the MIME type of a file at the given path.
 *
 * @param filePath Path to the file
 * @returns MIME type string or null if file does not exist
 */
export function getMimeType(filePath: string): string | null {
    if (!existsSync(filePath)) {
        return null;
    }
    return lookup(filePath) || null;
}
