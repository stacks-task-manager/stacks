// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useCallback, useMemo } from "react";
import { translate } from "@stacks/translations";
import type { ITask } from "@stacks/types";

import { buildWorkbookOverview } from "app/utils/workbookOverview";
import { EstimatedSpent } from "app/views/Project/Overview/EstimatedSpent/EstimatedSpent";
import { PeopleLoad } from "app/views/Project/Overview/PeopleLoad/PeopleLoad";
import { TasksPriority } from "app/views/Project/Overview/TasksPriority/TasksPriority";
import { TasksSummary } from "app/views/Project/Overview/TasksSummary/TasksSummary";
import { CompletionMomentum } from "./Overview/CompletionMomentum";
import { DeadlineHorizon } from "./Overview/DeadlineHorizon";
import { PlanningGaps } from "./Overview/PlanningGaps";
import { ProjectWorkload } from "./Overview/ProjectWorkload";
import { RecentlyCompleted } from "./Overview/RecentlyCompleted";

interface IWorkbookOverviewProps {
    tasks: ITask[];
    projects: { id: string; title: string }[];
    timezone: string;
    onOpenTask: (taskId: string) => void;
}

export const WorkbookOverview = ({ tasks, projects, timezone, onOpenTask }: IWorkbookOverviewProps) => {
    const overview = useMemo(
        () => buildWorkbookOverview(tasks, projects, new Date(), timezone),
        [tasks, projects, timezone]
    );
    const projectNames = useMemo(
        () => new Map(projects.map(project => [project.id, project.title])),
        [projects]
    );

    const getProjectName = useCallback(
        (projectId: string) => projectNames.get(projectId) ?? translate("Unknown project"),
        [projectNames]
    );

    return (
        <div className="workbook-overview" data-testid="workbook-overview">
            <div className="workbook-overview__summary">
                <TasksSummary
                    total={overview.tasksTotal}
                    idle={overview.tasksIdle}
                    inProgress={overview.tasksInProgress}
                    completed={overview.tasksCompleted}
                    today={overview.tasksStartingToday}
                    overdue={overview.tasksOverdue}
                    archived={overview.tasksArchived}
                />
            </div>

            <div className="workbook-overview__grid">
                <ProjectWorkload data={overview.projects} />
                <DeadlineHorizon data={overview.deadline} />
                <TasksPriority
                    critical={overview.critical}
                    high={overview.high}
                    medium={overview.medium}
                    low={overview.low}
                />
                <PeopleLoad
                    assignees={overview.assigneeIds}
                    counter={Object.fromEntries(overview.workload)}
                />
                <EstimatedSpent
                    estimatedTotal={overview.timeEstimatedTotal}
                    loggedTotal={overview.timeLoggedTotal}
                    remaining={overview.timeRemaining}
                />
                <PlanningGaps data={overview.planningGaps} />
                <CompletionMomentum data={overview.momentum} />
                <RecentlyCompleted
                    tasks={overview.recentCompleted}
                    getProjectName={getProjectName}
                    onOpenTask={onOpenTask}
                />
            </div>
        </div>
    );
};
