// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, SegmentedControl, Tooltip } from "@blueprintjs/core";
import React, { useEffect, useMemo } from "react";
import { shallowEqual } from "app/hooks/store";
import { ReportsActions } from "app/store/actions";
import { ReportSpan, ReportsStore } from "app/store/reports";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "app/components/common";
import {
    MainToolbar,
    SectionToolbar,
    SectionToolbarOptions,
    SectionToolbarSide,
    SectionToolbarTitle,
} from "app/widgets/toolbars/ToolbarLayout";

export const ToolbarReports = () => {
    return (
        <MainToolbar>
            <SectionToolbar>
                <SectionToolbarSide side>
                    <SectionToolbarTitle>
                        <h1>{translate("Reports")}</h1>
                    </SectionToolbarTitle>
                    <SectionToolbarOptions>&nbsp;</SectionToolbarOptions>
                </SectionToolbarSide>
                <SectionToolbarSide fixed>
                    {/* <ReloadButton
                        tooltip="Reload reports"
                        placement="bottom-end"
                        onClick={ReportsActions.load}
                    /> */}
                </SectionToolbarSide>
            </SectionToolbar>
            <SectionToolbar>
                <SectionToolbarSide>
                    {/* <button
                        className={classNames("view-type-button", { active: viewType === "table" })}
                        onClick={() => ReportsActions.setView("table")}
                    >
                        <Icon icon="list-view" size={14} />
                        {translate("List")}
                    </button>
                    <button
                        className={classNames("view-type-button", { active: viewType === "gantt" })}
                        onClick={() => ReportsActions.setView("gantt")}
                    >
                        <Icon icon="dataflow-03" size={14} />
                        {translate("Gantt")}
                    </button>
                    <button
                        className={classNames("view-type-button", { active: viewType === "overview" })}
                        onClick={() => ReportsActions.setView("overview")}
                    >
                        <Icon icon="overview-view" size={14} />
                        {translate("Overview")}
                    </button> */}
                </SectionToolbarSide>
                <SectionToolbarSide></SectionToolbarSide>
            </SectionToolbar>
        </MainToolbar>
    );
};

const ReportFilterSpan = [
    {
        label: "All time",
        value: "all-time",
    },
    {
        label: "Year",
        value: "year",
    },
    {
        label: "Month",
        value: "month",
    },
    {
        label: "Week",
        value: "week",
    },
];

export const ToolbarReport = () => {
    const params = useParams();
    const { span, reports } = ReportsStore.use(
        state => ({ span: state.span, reports: state.reports }),
        shallowEqual
    );

    const navigate = useNavigate();

    useEffect(() => {
        ReportsActions.loadList();
    }, []);

    const report = useMemo(() => {
        return reports.find(report => report.type === params.type);
    }, [params.type, reports]);

    return (
        <MainToolbar>
            <SectionToolbar>
                <SectionToolbarSide side>
                    <SectionToolbarTitle>
                        <Button
                            icon="chevron-left"
                            onClick={() => navigate("/reports")}
                            size="small"
                            variant="minimal"
                        />
                        <h1 data-testid="report-toolbar-title">{report?.title ?? "Unknown report"}</h1>

                        {report && (
                            <Tooltip content={report.description}>
                                <Icon icon="info-circle" cursor="help" />
                            </Tooltip>
                        )}
                    </SectionToolbarTitle>
                </SectionToolbarSide>
                <SectionToolbarSide fixed>
                    <SegmentedControl
                        options={ReportFilterSpan}
                        value={span}
                        onValueChange={newSpan => ReportsActions.setSpan(newSpan as ReportSpan)}
                    />
                </SectionToolbarSide>
            </SectionToolbar>
        </MainToolbar>
    );
};
