// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TAGSECTION, TAGTYPE, type IWorkbookFilters } from "@stacks/types";
import { getCurrentProjectId, useProjectStatuses, useProjectTags, useTags } from "app/hooks";
import type { IFilters } from "app/store/projectFilters";
import React, { FunctionComponent, memo } from "react";

import type { ProjectFilterActions, TaskFilterProps, WorkbookFilterActions } from "./TaskFilterActions";
import { TaskFilterFields } from "./TaskFilterFields";

interface IProjectTaskFilterProps {
    mode: "project" | "myTasks";
    filters: IFilters;
    actions: ProjectFilterActions;
}

const ProjectTaskFilter: FunctionComponent<IProjectTaskFilterProps> = ({ mode, filters, actions }) => {
    const projectId = getCurrentProjectId();
    const availableTags = useProjectTags(projectId);
    const availableStatuses = useProjectStatuses(projectId);

    return (
        <TaskFilterFields
            values={{
                query: filters.query,
                state: filters.state,
                priority: filters.priority,
                tags: filters.tags,
                statuses: filters.status ? [filters.status] : [],
                assignees: filters.assignees,
                me: filters.me,
                nobody: filters.nobody,
                skipMe: filters.skipMe,
                onlyAssigned: filters.onlyAssigned,
                startDate: filters.startDate,
                doDate: filters.doDate,
                dueDate: filters.dueDate,
                overdue: filters.overdue,
                inProgress: filters.inProgress,
            }}
            actions={{
                setQuery: actions.setQuery,
                hide: actions.hide,
                setState: state => actions.set("state", state),
                setAssignment: values => actions.setMultiple(values),
                setPriority: priority => actions.set("priority", priority),
                setTags: tags => actions.set("tags", tags),
                setStatuses: statuses => actions.set("status", statuses[0]),
                setAssignees: assignees => actions.set("assignees", assignees),
                setStartDate: date => actions.set("startDate", date),
                setDoDate: date => actions.set("doDate", date),
                setDueDate: date => actions.set("dueDate", date),
                setOverdue: overdue => actions.set("overdue", overdue),
                setInProgress: inProgress => actions.set("inProgress", inProgress),
            }}
            features={{ showQuery: true, showAssignment: mode === "project" }}
            data={{ availableTags, availableStatuses }}
        />
    );
};

interface IWorkbookTaskFilterProps {
    filters: IWorkbookFilters;
    actions: WorkbookFilterActions;
}

const WorkbookTaskFilter: FunctionComponent<IWorkbookTaskFilterProps> = ({ filters, actions }) => {
    const availableTags = useTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
    const availableStatuses = useTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);

    return (
        <TaskFilterFields
            values={{
                projects: filters.projects,
                state: filters.state,
                priority: filters.priority,
                tags: filters.tags,
                statuses: filters.statuses,
                assignees: filters.assignees,
                me: filters.me,
                nobody: filters.nobody,
                skipMe: filters.skipMe,
                onlyAssigned: filters.onlyAssigned,
                startDate: filters.startDate,
                doDate: filters.doDate,
                dueDate: filters.dueDate,
                overdue: filters.overdue,
                inProgress: filters.inProgress,
                loggedTime: filters.loggedTime,
            }}
            actions={{
                setProjects: projects => actions.set("projects", projects),
                setState: state => actions.set("state", state),
                setAssignment: values => actions.setMultiple(values),
                setPriority: priority => actions.set("priority", priority),
                setTags: tags => actions.set("tags", tags),
                setStatuses: statuses => actions.set("statuses", statuses),
                setAssignees: assignees => actions.set("assignees", assignees),
                setStartDate: date => actions.set("startDate", date),
                setDoDate: date => actions.set("doDate", date),
                setDueDate: date => actions.set("dueDate", date),
                setOverdue: overdue => actions.set("overdue", overdue),
                setInProgress: inProgress => actions.set("inProgress", inProgress),
                setLoggedTime: loggedTime => actions.set("loggedTime", loggedTime),
            }}
            features={{
                showProjects: true,
                showAssignment: true,
                multipleStatuses: true,
                showLoggedTime: true,
            }}
            data={{ availableTags, availableStatuses }}
        />
    );
};

export const TaskFilter = memo(function TaskFilter(props: TaskFilterProps) {
    return props.mode === "workbook" ? (
        <WorkbookTaskFilter filters={props.filters} actions={props.actions} />
    ) : (
        <ProjectTaskFilter mode={props.mode} filters={props.filters} actions={props.actions} />
    );
});
