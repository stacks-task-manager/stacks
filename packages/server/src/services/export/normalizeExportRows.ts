// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Normalizes arbitrary JSON export `data` into string columns and rows for Excel.
 */

/** Coerces a single cell to a display string (objects JSON-stringified). */
function cellString(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * Builds column headers and string rows for generic Excel export from arbitrary JSON `data` rows.
 */
export function normalizeExportRows(inputData: unknown | unknown[]): { columns: string[]; rows: string[][] } {
    const data = Array.isArray(inputData) ? inputData : [inputData];

    if (data.length === 0) {
        return { columns: [], rows: [] };
    }

    const first = data[0];
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
        const columns = Object.keys(first as Record<string, unknown>);
        const rows = data.map(item => {
            if (item !== null && typeof item === "object" && !Array.isArray(item)) {
                const obj = item as Record<string, unknown>;
                return columns.map(col => cellString(obj[col]));
            }
            return columns.map(() => cellString(item));
        });
        return { columns, rows };
    }

    return { columns: ["value"], rows: data.map(item => [cellString(item)]) };
}
