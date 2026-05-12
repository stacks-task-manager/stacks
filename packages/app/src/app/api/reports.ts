// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Analytics reports catalog and typed report data.
 */
import type { ReportSpan } from "app/store/reports";
import request from "./request";
import { IReport, REPORT_TYPE } from "@stacks/types";

export const ReportsAPI = {
    /** UI catalog of report cards. */
    async list(): Promise<IReport[]> {
        return request.get(`/api/reports`);
    },
    /** Fetches report payload; passes `span` when not `all-time`. */
    async load(type: REPORT_TYPE, options?: { span?: ReportSpan }) {
        const params =
            options?.span != null && options.span !== "all-time" ? { span: options.span } : undefined;
        return request.get(`/api/reports/${type}`, params ? { params } : {});
    },
};
