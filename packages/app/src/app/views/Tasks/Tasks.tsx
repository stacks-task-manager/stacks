// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";

import { PRIORITY, ITask } from "@stacks/types";
import { BlankSlate, Grid } from "app/components/common";
import { TaskLoadParams, TasksAPI } from "app/api/tasks";
import { shallowEqual } from "app/hooks/store";
import { TasksActions } from "app/store/actions";
import { TasksStore } from "app/store/tasks";
import { PRIORITY_VALUES } from "app/utils/filterQueryParams";
import { AppView, AppViewContent, TaskRowSkeleton, TasksTable } from "app/widgets";

const PROGRESS_FILTER = /^(gt|gte|lt|lte|eq):(0|[1-9]|[1-9][0-9]|100)$/;
/** `YYYY-MM-DD` — a bare calendar day, normalised to UTC midnight below. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** `YYYY-MM-DDTHH:MM[:SS[.sss]]` with an optional explicit timezone. */
const ISO_MOMENT = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:\d{2})?$/;
/** A `YYYY-MM-DD` prefix that names a real calendar day, used to reject rollover such as `2026-02-30`. */
const calendarDay = (value: string): boolean => {
    const day = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
};

/**
 * Read a filter date from the URL, dropping anything unparseable.
 *
 * Date-only values become UTC midnight, so `?dueFrom=2026-10-12` names that same calendar day in
 * every browser timezone; date-times without an explicit timezone are read as UTC too. Invalid
 * values are never returned, because the shared Axios/`qs` layer serialises `Date` params and
 * throws `RangeError: Invalid time value` for an Invalid Date.
 */
function readFilterDate(searchParams: URLSearchParams, key: string): Date | undefined {
    const raw = searchParams.get(key);
    if (!raw) {
        return undefined;
    }

    const moment = ISO_MOMENT.exec(raw);
    const iso = ISO_DAY.test(raw)
        ? `${raw}T00:00:00.000Z`
        : moment && moment[2]
        ? raw
        : moment
        ? `${moment[1]}Z`
        : "";
    if (!iso) {
        return undefined;
    }

    const value = new Date(iso);
    if (!Number.isFinite(value.getTime()) || !calendarDay(raw)) {
        return undefined;
    }

    return value;
}

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
    const from = readFilterDate(searchParams, "from");
    const to = readFilterDate(searchParams, "to");
    const tags = readUuidList("tags");
    const status = readUuidList("status");
    const priorityRaw = readOptionalString("priority");
    const priority = priorityRaw && PRIORITY_VALUES.has(priorityRaw) ? priorityRaw : undefined;
    const progressRaw = readOptionalString("progress");
    const progress = progressRaw && PROGRESS_FILTER.test(progressRaw) ? progressRaw : undefined;
    const dueFrom = readFilterDate(searchParams, "dueFrom");
    const dueTo = readFilterDate(searchParams, "dueTo");
    const startFrom = readFilterDate(searchParams, "startFrom");
    const startTo = readFilterDate(searchParams, "startTo");

    const params: TaskLoadParams = {};
    if (ids?.length) params.ids = ids;
    if (project?.length) params.project = project;
    if (stackList?.length) {
        params.stack = stackList.length === 1 ? stackList[0]! : stackList;
    }
    if (assignees?.length) params.assignees = assignees;
    if (parent) params.parent = parent;
    if (query) params.query = query;
    if (from) params.from = from;
    if (to) params.to = to;
    if (tags?.length) params.tags = tags;
    if (status?.length) params.status = status;
    if (priority) params.priority = priority as PRIORITY;
    if (progress) params.progress = progress;
    if (dueFrom) params.dueFrom = dueFrom;
    if (dueTo) params.dueTo = dueTo;
    if (startFrom) params.startFrom = startFrom;
    if (startTo) params.startTo = startTo;

    const archived = readTrueFlag("archived");
    const completed = readTrueFlag("completed");
    const open = readTrueFlag("open");
    const overdue = readTrueFlag("overdue");
    const assigned = readTrueFlag("assigned");
    const unassigned = readTrueFlag("unassigned");
    if (archived) params.archived = true;
    if (completed) params.completed = true;
    if (open) params.open = true;
    if (overdue) params.overdue = true;
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

    // ids of the filtered fetch, in server order — rows are sourced from TasksStore so
    // in-cell edits (and realtime updates) re-render the table without a refetch
    const [loadedIds, setLoadedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const tasks = TasksStore.use(state => {
        const byId = new Map(state.tasks.map((t: ITask) => [t.id, t]));
        return loadedIds.map(id => byId.get(id)).filter((t): t is ITask => Boolean(t));
    }, shallowEqual);

    useEffect(() => {
        if (!loadParams) {
            setLoadedIds([]);
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
                    await TasksActions.upsertTasks(list);
                    setLoadedIds(list.map((t: ITask) => t.id));
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadedIds([]);
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
                        description={translate("No matching tasks filter")}
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
                        testId="tasks-no-match-slate"
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

    return (
        <AppView append={<Outlet />} data-testid="tasks-view">
            {body}
        </AppView>
    );
};
