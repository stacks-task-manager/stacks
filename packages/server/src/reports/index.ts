// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public report module: loader, context types, and span helpers.
 */
export { ReportsLoader } from "./registry";
export type { ReportLoadContext } from "./context";
export type { ReportSpan } from "./dateRange";
export { getSpanRange, isReportSpan } from "./dateRange";
