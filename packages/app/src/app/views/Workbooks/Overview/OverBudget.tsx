// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import type { IWorkbookOverBudget as IOverBudgetData } from "@stacks/types";

import { stripMd } from "app/utils/string";

interface IOverBudgetProps {
    data: IOverBudgetData;
    getProjectName: (projectId: string) => string;
    onOpenTask: (taskId: string) => void;
}

export const OverBudget = ({ data, getProjectName, onOpenTask }: IOverBudgetProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Over budget tasks")}</h6>
        <p className={Classes.TEXT_MUTED}>{translate("Spending more than their estimate")}</p>

        {data.tasks.length > 0 ? (
            <div className="workbook-recent-list">
                {data.tasks.map(task => (
                    <button
                        key={task.id}
                        type="button"
                        className="workbook-recent-list__item"
                        data-testid={`workbook-overbudget-task-${task.id}`}
                        onClick={() => onOpenTask(task.id)}
                    >
                        <span className="workbook-recent-list__title">{stripMd(task.title)}</span>
                        <span className={Classes.TEXT_MUTED}>
                            {getProjectName(task.project)} ·{" "}
                            {translate("Over estimate by pct", { pct: task.overrunPct })}
                        </span>
                    </button>
                ))}
            </div>
        ) : (
            <p className={Classes.TEXT_MUTED}>{translate("No tasks over budget")}</p>
        )}
    </Card>
);
