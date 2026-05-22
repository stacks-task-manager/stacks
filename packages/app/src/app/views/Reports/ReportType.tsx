// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { REPORT_TYPE } from "@stacks/types";
import { ReportsAPI } from "app/api";
import { BlankSlate, Grid } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { ReportsStore } from "app/store/reports";
import { AppView, AppViewContent, ToolbarReport } from "app/widgets";
import React, { FunctionComponent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ReportGrid } from "./ReportGrid";
import { ReportChart } from "./ReportChart";

export const ReportType = () => {
    const params = useParams();
    const span = ReportsStore.use(s => s.span, shallowEqual);
    const [report, setReport] = useState<any>();

    useEffect(() => {
        if (!params.type) {
            return;
        }
        let cancelled = false;
        (async () => {
            setReport(undefined);
            const data = await ReportsAPI.load(params.type as REPORT_TYPE, { span });
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
                {report == null && <Grid vertical><BlankSlate title="No report found" icon={"chart-line"} /></Grid>}
                {report != null && (
                    <ReportRenderer report={report} />
                )}

            </AppViewContent>
        </AppView>
    );

}

interface ReportRendererProps {
    report: any;
}
const ReportRenderer: FunctionComponent<ReportRendererProps> = ({ report }) => {
    if (["grid", "chart"].includes(report.type)) {
        return (
            <div className={`report-column size-${report.size ?? "100"}`}>
                {report.type === "grid" && <ReportGrid type={report.type} columns={report.columns} data={report.data} />}
                {report.type === "chart" && <ReportChart />}
            </div>
        )
    }

    return (
        <div className="report-grid">
            {report.columns.map((column: any, index: number) => <ReportRenderer key={index} report={column} />)}
        </div>
    );

}