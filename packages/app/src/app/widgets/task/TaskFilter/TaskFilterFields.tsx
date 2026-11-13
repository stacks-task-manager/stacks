// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ITag, PRIORITY } from "@stacks/types";
import { translate } from "@stacks/translations";
import type { IFilters } from "app/store/projectFilters";
import React, { FunctionComponent } from "react";

import { AssigneesFilter } from "./AssigneesFilter";
import { DateFilter } from "./DateFilter";
import { PriorityFilter } from "./PriorityFilter";
import { ProjectsFilter } from "./ProjectsFilter";
import { QueryFilter } from "./QueryFilter";
import { QuickFilters } from "./QuickFilters";
import { StatusesFilter } from "./StatusesFilter";
import { TagsFilter } from "./TagsFilter";
import type { TaskAssignmentChanges } from "./TaskAssignmentFilter";
import { TaskAssignmentFilter } from "./TaskAssignmentFilter";
import { TaskStateFilter } from "./TaskStateFilter";

interface TaskFilterFieldValues {
    query?: string;
    projects?: string[];
    state: IFilters["state"];
    priority?: PRIORITY;
    tags: string[];
    statuses: string[];
    assignees: string[];
    me?: boolean;
    nobody?: boolean;
    skipMe?: boolean;
    onlyAssigned?: boolean;
    startDate?: string;
    doDate?: string;
    dueDate?: string;
    overdue: boolean;
    inProgress: boolean;
    loggedTime?: boolean;
}

interface TaskFilterFieldActions {
    setQuery?: (query: string) => void;
    hide?: () => void;
    setProjects?: (projects: string[]) => void;
    setState: (state: IFilters["state"]) => void;
    setAssignment: (values: TaskAssignmentChanges) => void;
    setPriority: (priority: PRIORITY | null | undefined) => void;
    setTags: (tags: string[]) => void;
    setStatuses: (statuses: string[]) => void;
    setAssignees: (assignees: string[]) => void;
    setStartDate?: (date?: string) => void;
    setDoDate?: (date?: string) => void;
    setDueDate?: (date?: string) => void;
    setOverdue: (overdue: boolean) => void;
    setInProgress: (inProgress: boolean) => void;
    setLoggedTime?: (loggedTime: boolean) => void;
}

interface TaskFilterFieldFeatures {
    showQuery?: boolean;
    showProjects?: boolean;
    showAssignment?: boolean;
    multipleStatuses?: boolean;
    showLoggedTime?: boolean;
}

interface TaskFilterFieldData {
    availableTags: ITag[];
    availableStatuses: ITag[];
}

interface ITaskFilterFieldsProps {
    values: TaskFilterFieldValues;
    actions: TaskFilterFieldActions;
    features: TaskFilterFieldFeatures;
    data: TaskFilterFieldData;
}

/** Shared presentation for the project and workbook task-filter variants. */
export const TaskFilterFields: FunctionComponent<ITaskFilterFieldsProps> = ({
    values,
    actions,
    features,
    data,
}) => {
    const assignmentDisabled = Boolean(values.me) || Boolean(values.nobody);
    const handleLoggedTimeChange = actions.setLoggedTime
        ? () => actions.setLoggedTime?.(!values.loggedTime)
        : undefined;

    return (
        <>
            {features.showQuery && values.query !== undefined && actions.setQuery && actions.hide && (
                <QueryFilter
                    term={values.query}
                    onChange={actions.setQuery}
                    onHide={actions.hide}
                    label={translate("Search task")}
                    helperText={translate("Search in task title or description")}
                />
            )}

            {features.showProjects && values.projects && actions.setProjects && (
                <ProjectsFilter projects={values.projects} onChange={actions.setProjects} />
            )}

            <TaskStateFilter state={values.state} onChange={actions.setState} />

            {features.showAssignment && (
                <>
                    <TaskAssignmentFilter
                        me={values.me}
                        nobody={values.nobody}
                        skipMe={values.skipMe}
                        onlyAssigned={values.onlyAssigned}
                        onChange={actions.setAssignment}
                    />
                    <AssigneesFilter
                        assignees={values.assignees}
                        disabled={assignmentDisabled}
                        onChange={actions.setAssignees}
                    />
                </>
            )}

            <PriorityFilter priority={values.priority} onChange={actions.setPriority} />
            <TagsFilter tags={values.tags} availableTags={data.availableTags} onChange={actions.setTags} />
            <StatusesFilter
                statuses={values.statuses}
                availableStatuses={data.availableStatuses}
                multiple={features.multipleStatuses}
                onChange={actions.setStatuses}
            />

            {actions.setStartDate && (
                <DateFilter
                    date={values.startDate}
                    emptyLabel={translate("Start date")}
                    onChange={actions.setStartDate}
                    data-testid="start-date-filter"
                />
            )}
            {actions.setDoDate && (
                <DateFilter
                    date={values.doDate}
                    emptyLabel={translate("Do date")}
                    onChange={actions.setDoDate}
                    data-testid="do-date-filter"
                />
            )}
            {actions.setDueDate && (
                <DateFilter
                    date={values.dueDate}
                    emptyLabel={translate("Due Date")}
                    onChange={actions.setDueDate}
                    data-testid="due-date-filter"
                />
            )}

            <QuickFilters
                overdue={values.overdue}
                inProgress={values.inProgress}
                loggedTime={values.loggedTime}
                showLoggedTime={features.showLoggedTime}
                onOverdueChange={() => actions.setOverdue(!values.overdue)}
                onInProgressChange={() => actions.setInProgress(!values.inProgress)}
                onLoggedTimeChange={handleLoggedTimeChange}
            />
        </>
    );
};
