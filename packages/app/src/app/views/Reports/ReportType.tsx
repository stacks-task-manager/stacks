// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { ITableColumns, REPORT_TYPE } from "@stacks/types";
import { ReportsAPI } from "app/api";
import { BlankSlate, Grid } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { ReportsStore } from "app/store/reports";
import { AppView, AppViewContent, ToolbarReport } from "app/widgets";
import React, { FunctionComponent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ReportData, ReportGrid, ReportRow } from "./ReportGrid";
import { ReportChart } from "./ReportChart";

/** A report payload is either a leaf (grid/chart) or a container of nested reports. */
type ReportPayload =
    | { type: "grid"; size?: string; columns: ITableColumns<ReportRow>; data: ReportData }
    | { type: "chart"; size?: string }
    | { columns: ReportPayload[] };

export const ReportType = () => {
    const params = useParams();
    const span = ReportsStore.use(s => s.span, shallowEqual);
    const [report, setReport] = useState<ReportPayload>();

    useEffect(() => {
        if (!params.type) {
            return;
        }
        let cancelled = false;
        (async () => {
            setReport(undefined);
            const data = (await ReportsAPI.load(params.type as REPORT_TYPE, {
                span,
            })) as unknown as ReportPayload;
            if (!cancelled) {
                setReport(data);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [params.type, span]);

    return (
        <AppView toolbar={<ToolbarReport />} id="reports">
            <AppViewContent padded>
                {report == null && (
                    <Grid vertical>
                        <BlankSlate title={translate("No report found")} icon={"chart-line"} />
                    </Grid>
                )}
                {report != null && <ReportRenderer report={report} />}
            </AppViewContent>
        </AppView>
    );
};

interface ReportRendererProps {
    report: ReportPayload;
}
const ReportRenderer: FunctionComponent<ReportRendererProps> = ({ report }) => {
    if ("type" in report) {
        return (
            <div className={`report-column size-${report.size ?? "100"}`}>
                {report.type === "grid" && (
                    <ReportGrid type={report.type} columns={report.columns} data={report.data} />
                )}
                {report.type === "chart" && <ReportChart />}
            </div>
        );
    }

    return (
        <div className="report-grid">
            {report.columns.map((column, index) => (
                <ReportRenderer key={index} report={column} />
            ))}
        </div>
    );
};
