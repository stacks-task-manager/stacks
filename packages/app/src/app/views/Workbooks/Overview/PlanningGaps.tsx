// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common";
import type { IWorkbookPlanningGaps as IPlanningGapsData } from "app/utils/workbookOverview";

interface IPlanningGapsProps {
    data: IPlanningGapsData;
}

export const PlanningGaps = ({ data }: IPlanningGapsProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Planning gaps")}</h6>
        <p className={Classes.TEXT_MUTED}>{translate("Tasks missing planning data")}</p>

        {[
            { icon: "alert-circle", label: translate("No due date"), count: data.noDueDate },
            { icon: "calendar-date", label: translate("No start date"), count: data.noStartDate },
            { icon: "user-edit", label: translate("No assignees"), count: data.noAssignees },
        ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <Icon icon={item.icon} />
                <span>{item.label}</span>
                <span className="workbook-overview__count">{item.count}</span>
            </div>
        ))}
    </Card>
);
