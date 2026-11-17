// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import type { IWorkbookLeadTime as ILeadTimeData } from "@stacks/types";

interface ITaskAgingProps {
    data: ILeadTimeData;
}

export const TaskAging = ({ data }: ITaskAgingProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Task aging")}</h6>
        <p className={Classes.TEXT_MUTED}>{translate("Lead time and open task age")}</p>

        <div className="workbook-overview__metrics">
            <div className="workbook-overview__metric">
                <strong>{data.avgCompletionDays !== null ? data.avgCompletionDays : "—"}</strong>
                <span>{translate("Avg days to complete")}</span>
            </div>
            <div className="workbook-overview__metric">
                <strong>{data.medianOpenAgeDays !== null ? data.medianOpenAgeDays : "—"}</strong>
                <span>{translate("Median open task age")}</span>
            </div>
        </div>
    </Card>
);
