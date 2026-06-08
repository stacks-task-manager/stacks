// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";

import { ITask } from "@stacks/types";
import { BlankSlate, Grid } from "app/components/common";
import { TaskLoadParams, TasksAPI } from "app/api/tasks";
import { TasksActions } from "app/store/actions";
import { AppView, AppViewContent, TaskRowSkeleton, TasksTable } from "app/widgets";
import { parseISO } from "date-fns";

/** Build GET `/api/tasks` params from URL search (same filter keys as {@link TasksFilteredSchema}). */
export function searchParamsToTaskLoadParams(searchParams: URLSearchParams): TaskLoadParams | null {
    const readUuidList = (key: string): string[] | undefined => {
        const multi = searchParams
            .getAll(key)
            .flatMap(v => v.split(","))
            .map(s => s.trim())
            .filter(Boolean);
        return multi.length ? multi : undefined;
    };

    const readOptionalString = (key: string): string | undefined => {
        const v = searchParams.get(key);
        return v != null && v !== "" ? v : undefined;
    };

    const readTrueFlag = (key: string): true | undefined =>
        searchParams.get(key) === "true" ? true : undefined;

    const ids = readUuidList("ids");
    const project = readUuidList("project");
    const stackList = readUuidList("stack");
    const assignees = readUuidList("assignees");
    const parent = readOptionalString("parent");
    const queryRaw = readOptionalString("query");
    const query = queryRaw?.trim() ? queryRaw.trim() : undefined;
    const from = readOptionalString("from");
    const to = readOptionalString("to");

    const params: TaskLoadParams = {};
    if (ids?.length) params.ids = ids;
    if (project?.length) params.project = project;
    if (stackList?.length) {
        params.stack = stackList.length === 1 ? stackList[0]! : stackList;
    }
    if (assignees?.length) params.assignees = assignees;
    if (parent) params.parent = parent;
    if (query) params.query = query;
    if (from) params.from = parseISO(from);
    if (to) params.to = parseISO(to);

    const archived = readTrueFlag("archived");
    const completed = readTrueFlag("completed");
    const open = readTrueFlag("open");
    const assigned = readTrueFlag("assigned");
    const unassigned = readTrueFlag("unassigned");
    if (archived) params.archived = true;
    if (completed) params.completed = true;
    if (open) params.open = true;
    if (assigned) params.assigned = true;
    if (unassigned) params.unassigned = true;

    const hasFilter = Object.entries(params).some(([, value]) => value !== undefined);

    if (!hasFilter) {
        return null;
    }

    return params;
}

export const Tasks = () => {
    const [searchParams] = useSearchParams();
    const searchKey = searchParams.toString();

    const loadParams = useMemo(
        () => searchParamsToTaskLoadParams(new URLSearchParams(searchKey)),
        [searchKey]
    );

    const [tasks, setTasks] = useState<ITask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!loadParams) {
            setTasks([]);
            setLoadError(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const list = await TasksAPI.load(loadParams);
                if (!cancelled) {
                    setTasks(list);
                    await TasksActions.upsertTasks(list);
                }
            } catch (e) {
                if (!cancelled) {
                    setTasks([]);
                    setLoadError(e instanceof Error ? e.message : translate("Something went wrong"));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [loadParams]);

    const body = (() => {
        if (!loadParams) {
            return (
                <Grid vertical>
                    <BlankSlate
                        title={translate("No tasks found")}
                        icon="filter"
                        description={translate(
                            "There are no tasks that match your current filter settings. Try adjusting your filter and try again"
                        )}
                    />
                </Grid>
            );
        }

        if (loadError) {
            return (
                <Grid vertical>
                    <BlankSlate
                        title={translate("Could not load tasks")}
                        icon="error"
                        description={loadError}
                    />
                </Grid>
            );
        }

        if (isLoading) {
            return (
                <AppViewContent padded>
                    <Grid vertical gap={8}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TaskRowSkeleton key={i} />
                        ))}
                    </Grid>
                </AppViewContent>
            );
        }

        if (tasks.length === 0) {
            return (
                <Grid vertical>
                    <BlankSlate
                        title={translate("No tasks")}
                        icon="check-circle"
                        description={translate("No tasks match these filters")}
                    />
                </Grid>
            );
        }

        return (
            <AppViewContent padded>
                <TasksTable tasks={tasks} id="tasks-filtered" />
            </AppViewContent>
        );
    })();

    return <AppView append={<Outlet />}>{body}</AppView>;
};
