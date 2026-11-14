// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import { timeSince } from "app/utils/date";
import { stripMd } from "app/utils/string";
import type { IWorkbookRecentCompletion } from "app/utils/workbookOverview";

interface IRecentlyCompletedProps {
    tasks: IWorkbookRecentCompletion[];
    getProjectName: (projectId: string) => string;
    onOpenTask: (taskId: string) => void;
}

export const RecentlyCompleted = ({ tasks, getProjectName, onOpenTask }: IRecentlyCompletedProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Recently completed")}</h6>
        {tasks.length > 0 ? (
            <div className="workbook-recent-list">
                {tasks.map(task => (
                    <button
                        key={task.id}
                        type="button"
                        className="workbook-recent-list__item"
                        data-testid={`workbook-recent-task-${task.id}`}
                        onClick={() => onOpenTask(task.id)}
                    >
                        <span className="workbook-recent-list__title">{stripMd(task.title)}</span>
                        <span className={Classes.TEXT_MUTED}>
                            {getProjectName(task.project)} · {timeSince(task.doneAt ?? undefined)}
                        </span>
                    </button>
                ))}
            </div>
        ) : (
            <p className={Classes.TEXT_MUTED}>{translate("No completions yet")}</p>
        )}
    </Card>
);
