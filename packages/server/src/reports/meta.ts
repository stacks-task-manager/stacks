// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ReportLoadContext } from "./context";
import { getSpanRange } from "./dateRange";

/** Echoes requested span and resolved UTC range on report JSON responses. */
export interface ReportResponseMeta {
    span: string | null;
    rangeStart: string | null;
    rangeEnd: string | null;
}

/** Merges `meta` describing the active span into a builder result. */
export function attachReportMeta<T extends object>(report: T, ctx: ReportLoadContext): T & { meta: ReportResponseMeta } {
    const range = ctx.span ? getSpanRange(ctx.span) : null;
    return {
        ...report,
        meta: {
            span: ctx.span ?? null,
            rangeStart: range ? range.start.toISOString() : null,
            rangeEnd: range ? range.end.toISOString() : null,
        },
    };
}
