// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ReportSpan } from "./dateRange";

/** Optional report query scope passed from HTTP (`span` query). */
export interface ReportLoadContext {
    span?: ReportSpan;
}
