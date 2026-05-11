// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Escape a value for safe use inside single-quoted PostgreSQL string literals in raw SQL fragments. */
export function pgStringLiteral(value: unknown): string {
    return `'${String(value).replace(/'/g, "''")}'`;
}
