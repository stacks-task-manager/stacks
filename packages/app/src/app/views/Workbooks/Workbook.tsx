// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { translate } from "@stacks/translations";
import type { IStack } from "@stacks/types";

import { BlankSlate, Grid } from "app/components/common";
import { usePreferences } from "app/hooks/preferences";
import { shallowEqual } from "app/hooks/store";
import { GanttChart } from "app/components/common/GanttChart/GanttChart";
import { AppView, AppViewContent, TasksTable, ToolbarWorkbook, type WorkbookView } from "app/widgets";
import { StacksStore } from "app/store/stacks";
import { WorkbooksActions } from "app/store/actions";
import { WorkbooksStore } from "app/store/workbooks";
import { PeopleStore } from "app/store/people";
import { TasksStore } from "app/store/tasks";
import { rescheduleGanttTask } from "app/store/actions/gantt";
import { convertToGantt } from "app/views/Project/Gantt/ganttTasks";
import { groupWorkbookTasks, selectWorkbookTasks } from "app/utils/workbookTasks";
import { WorkbookDialog } from "./WorkbookDialog";
import { WorkbookOverview } from "./WorkbookOverview";

export const Workbook = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [draftTitle, setDraftTitle] = useState("");
    const [view, setView] = useState<WorkbookView>("table");
    const [editOpen, setEditOpen] = useState(false);
    const [taskIds, setTaskIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { timezone = "UTC" } = usePreferences(["timezone"]);
    const currentUserId = PeopleStore.use(state => state.me);
    const workbook = WorkbooksStore.use(
        state => state.workbooks.find(item => item.id === id),
        (left, right) => left?.updated === right?.updated && left?.id === right?.id
    );
    const stacks = StacksStore.use(
        state => state.stacks,
        (left, right) => left === right
    );

    useEffect(() => {
        if (!id) return;
        WorkbooksActions.load(id)
            .then(loaded => {
                WorkbooksStore.set(state => ({
                    ...state,
                    workbooks: [loaded, ...state.workbooks.filter(item => item.id !== loaded.id)],
                }));
            })
            .catch(() => navigate("/workbooks"));
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        WorkbooksActions.loadTasks(id)
            .then(tasks => {
                if (!cancelled) setTaskIds(tasks.map(task => task.id));
            })
            .catch(() => {
                if (!cancelled) setTaskIds([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id, workbook?.updated]);

    const tasks = TasksStore.use(state => {
        return taskIds
            .map(taskId => state.tasksById.get(taskId))
            .filter((task): task is NonNullable<typeof task> => Boolean(task));
    }, shallowEqual);
    const result = useMemo(
        () =>
            workbook
                ? selectWorkbookTasks(tasks, workbook.filters, currentUserId, new Date(), timezone, query)
                : { tasks: [], treeTasks: [] },
        [currentUserId, query, tasks, timezone, workbook]
    );
    const tree = useMemo(() => groupWorkbookTasks(result.treeTasks), [result.treeTasks]);
    const projects = useMemo(
        () => [
            ...new Map(
                result.tasks.map(task => [
                    task.project,
                    task.projectInfo ?? { id: task.project, title: translate("Unknown project") },
                ])
            ).values(),
        ],
        [result.tasks]
    );
    const assigneeIds = useMemo(
        () => [...new Set(result.treeTasks.flatMap(task => task.assignees ?? []))],
        [result.treeTasks]
    );
    const people = PeopleStore.use(
        state => state.people.filter(person => assigneeIds.includes(person.id)),
        (left, right) => left === right
    );

    useEffect(() => {
        if (workbook?.title) setDraftTitle(workbook.title);
    }, [workbook?.title]);

    const toolbar = (
        <ToolbarWorkbook
            workbook={workbook}
            title={draftTitle}
            query={query}
            view={view}
            tasks={result.tasks}
            onTitleChange={setDraftTitle}
            onQueryChange={setQuery}
            onViewChange={setView}
            onEditFilters={() => setEditOpen(true)}
        />
    );

    return (
        <AppView
            data-testid="workbook-view"
            toolbar={toolbar}
            append={
                <>
                    <WorkbookDialog
                        isOpen={editOpen}
                        onClose={() => setEditOpen(false)}
                        workbook={workbook}
                    />
                    <Outlet />
                </>
            }
        >
            {loading && result.tasks.length === 0 ? (
                <AppViewContent padded>
                    <Grid>{translate("Loading tasks")}</Grid>
                </AppViewContent>
            ) : result.tasks.length === 0 ? (
                <BlankSlate
                    testId="workbook-empty-slate"
                    icon="book-open-01"
                    title={translate("No tasks")}
                    description={translate("No tasks match these filters")}
                />
            ) : view === "table" ? (
                <AppViewContent padded>
                    <TasksTable
                        tasks={tree}
                        id={`workbook:${id}`}
                        defaultColumns={[
                            "title",
                            "project",
                            "startdate",
                            "duedate",
                            "progress",
                            "tags",
                            "stack",
                        ]}
                    />
                </AppViewContent>
            ) : view === "gantt" ? (
                <AppViewContent relative>
                    <GanttChart
                        title={workbook?.title ?? translate("Tasks")}
                        rows={convertToGantt(result.treeTasks, stacks as IStack[], people)}
                        onActivate={taskId => navigate(`/workbooks/${id}/${taskId}`)}
                        onDatesChange={(taskId, range) => rescheduleGanttTask(taskId, range)}
                    />
                </AppViewContent>
            ) : (
                <AppViewContent padded>
                    <WorkbookOverview
                        tasks={result.tasks}
                        projects={projects}
                        timezone={timezone}
                        onOpenTask={taskId => navigate(`/workbooks/${id}/${taskId}`)}
                    />
                </AppViewContent>
            )}
        </AppView>
    );
};
