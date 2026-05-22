// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear } from "date-fns";

/** API query ?span= — server resolves ranges in the host's local timezone (Date uses system local time). */
export type ReportSpan = "year" | "month" | "week";

const SPAN_VALUES: ReportSpan[] = ["year", "month", "week"];

export function isReportSpan(value: string): value is ReportSpan {
    return (SPAN_VALUES as string[]).includes(value);
}

export function getSpanRange(span: ReportSpan, now: Date = new Date()): { start: Date; end: Date } {
    switch (span) {
        case "year":
            return { start: startOfYear(now), end: endOfYear(now) };
        case "month":
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case "week":
            return { start: startOfWeek(now), end: endOfWeek(now) };
    }
}
