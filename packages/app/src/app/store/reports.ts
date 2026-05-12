// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Selected report type and span.
 */
import { IReport } from "@stacks/types";
import { entity } from "app/hooks/store";

export type ReportSpan = "all-time" | "year" | "month" | "week";

export interface IReportsStore {
    span: ReportSpan;
    date: Date;
    isLoading: boolean;
    reports: IReport[];
}

export const ReportsStore = entity<IReportsStore>({
    span: "all-time",
    date: new Date(),
    isLoading: false,
    reports: [],
});
