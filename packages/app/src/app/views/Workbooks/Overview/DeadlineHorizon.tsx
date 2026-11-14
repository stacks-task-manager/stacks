// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import { PRIORITY } from "@stacks/types";

import { Icon } from "app/components/common";
import { getPriorityColor } from "app/utils/colors";
import type { IWorkbookDeadline } from "app/utils/workbookOverview";

interface IDeadlineHorizonProps {
    data: IWorkbookDeadline;
}

export const DeadlineHorizon = ({ data }: IDeadlineHorizonProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Deadline horizon")}</h6>
        {data.overdue > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icon icon="alert-circle-filled" color={getPriorityColor(PRIORITY.CRITICAL)} />
                <span>
                    {translate("Overdue")}: {data.overdue}
                </span>
            </div>
        )}
        {data.days.length > 0 ? (
            data.days.map(day => (
                <div
                    key={day.label}
                    style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
                >
                    <span>
                        {day.label === "Today" || day.label === "Tomorrow" ? translate(day.label) : day.label}
                    </span>
                    <strong>{day.count}</strong>
                </div>
            ))
        ) : (
            <p className={Classes.TEXT_MUTED}>{translate("No deadlines in the next 7 days")}</p>
        )}
    </Card>
);
