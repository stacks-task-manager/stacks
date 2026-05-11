// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Dispatches typed report builders and attaches date-range metadata.
 */
import { REPORT_TYPE } from "@stacks/types";
import { translate } from "@stacks/translations";

import { Errors } from "../errors";
import { reportBuilders } from "./builders";
import type { ReportLoadContext } from "./context";
import { attachReportMeta } from "./meta";

/** Runs the registered builder for `type` and wraps the payload with {@link attachReportMeta}. */
async function getReport(type: REPORT_TYPE, ctx: ReportLoadContext = {}) {
    const builder = reportBuilders[type];
    if (!builder) {
        throw Errors.notFound(translate("Report not found"));
    }
    const data = await builder(ctx);
    return attachReportMeta(data as object, ctx);
}

export const ReportsLoader = {
    getReport,
};
