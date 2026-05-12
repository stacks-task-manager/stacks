// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PRIORITY } from "@stacks/types";

import { IFilters } from "app/store/projectFilters";

const PRIORITY_VALUES = new Set<string>(Object.values(PRIORITY));

const STATE_VALUES = new Set<string>(["all", "done", "todo"]);

/** Query keys (IFilters field names except aliases). */
const Q = {
    state: "state",
    priority: "priority",
    tags: "tags",
    assignees: "assignees",
    status: "status",
    query: "q",
    startDate: "startDate",
    doDate: "doDate",
    dueDate: "dueDate",
    overdue: "overdue",
    inProgress: "inProgress",
    me: "me",
    nobody: "nobody",
    skipMe: "skipMe",
    onlyAssigned: "onlyAssigned",
    showSubtasks: "showSubtasks",
    stackId: "stackId",
} as const;

function paramToBool(raw: string | null): boolean | undefined {
    if (raw == null || raw === "") return undefined;
    return raw === "1" || raw === "true" || raw === "yes";
}

function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((x, i) => x === sb[i]);
}

/**
 * Serialize filters to URL search params.
 * `state` is always included (shareable links). Other keys only if they differ from `defaults`.
 */
export function filtersToSearchParams(filters: IFilters, defaults: IFilters): URLSearchParams {
    const params = new URLSearchParams();

    params.set(Q.state, filters.state);

    if (filters.query !== defaults.query) {
        if (filters.query) params.set(Q.query, filters.query);
    }

    if (filters.priority !== defaults.priority) {
        if (filters.priority) params.set(Q.priority, filters.priority);
    }

    if (!arraysEqual(filters.tags, defaults.tags)) {
        if (filters.tags.length > 0) params.set(Q.tags, filters.tags.join(","));
    }

    if (!arraysEqual(filters.assignees, defaults.assignees)) {
        if (filters.assignees.length > 0) params.set(Q.assignees, filters.assignees.join(","));
    }

    if (filters.status !== defaults.status) {
        if (filters.status) params.set(Q.status, filters.status);
    }

    if (filters.startDate !== defaults.startDate) {
        if (filters.startDate) params.set(Q.startDate, filters.startDate);
    }

    if (filters.doDate !== defaults.doDate) {
        if (filters.doDate) params.set(Q.doDate, filters.doDate);
    }

    if (filters.dueDate !== defaults.dueDate) {
        if (filters.dueDate) params.set(Q.dueDate, filters.dueDate);
    }

    if (filters.overdue !== defaults.overdue) {
        if (filters.overdue) params.set(Q.overdue, "1");
    }

    if (filters.inProgress !== defaults.inProgress) {
        if (filters.inProgress) params.set(Q.inProgress, "1");
    }

    // Optional tri-state flags: treat false and undefined as off (same as defaults).
    if (Boolean(filters.me) !== Boolean(defaults.me)) {
        if (filters.me) params.set(Q.me, "1");
    }

    if (Boolean(filters.nobody) !== Boolean(defaults.nobody)) {
        if (filters.nobody) params.set(Q.nobody, "1");
    }

    if (Boolean(filters.skipMe) !== Boolean(defaults.skipMe)) {
        if (filters.skipMe) params.set(Q.skipMe, "1");
    }

    if (Boolean(filters.onlyAssigned) !== Boolean(defaults.onlyAssigned)) {
        if (filters.onlyAssigned) params.set(Q.onlyAssigned, "1");
    }

    if (filters.showSubtasks !== defaults.showSubtasks) {
        if (filters.showSubtasks) params.set(Q.showSubtasks, "1");
    }

    // stack object not compared; use id only in URL
    const stackId = filters.stack?.id;
    const defaultStackId = defaults.stack?.id;
    if (stackId !== defaultStackId) {
        if (stackId) params.set(Q.stackId, stackId);
    }

    return params;
}

function splitCommaList(raw: string | null): string[] {
    if (raw == null || raw === "") return [];
    return raw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

export type ParsedFilterQuery = Partial<IFilters> & { stackId?: string };

/**
 * Parse URL search params into partial IFilters. Only keys present in the URL are set.
 */
export function searchParamsToFilters(params: URLSearchParams): ParsedFilterQuery {
    const out: ParsedFilterQuery = {};

    const state = params.get(Q.state);
    if (state != null && STATE_VALUES.has(state)) {
        out.state = state as IFilters["state"];
    }

    const q = params.get(Q.query);
    if (q != null) out.query = q;

    const priority = params.get(Q.priority);
    if (priority != null && PRIORITY_VALUES.has(priority)) {
        out.priority = priority as IFilters["priority"];
    }

    const tags = splitCommaList(params.get(Q.tags));
    if (tags.length > 0) out.tags = tags;

    const assignees = splitCommaList(params.get(Q.assignees));
    if (assignees.length > 0) out.assignees = assignees;

    const status = params.get(Q.status);
    if (status != null && status !== "") out.status = status;

    const startDate = params.get(Q.startDate);
    if (startDate != null && startDate !== "") out.startDate = startDate;

    const doDate = params.get(Q.doDate);
    if (doDate != null && doDate !== "") out.doDate = doDate;

    const dueDate = params.get(Q.dueDate);
    if (dueDate != null && dueDate !== "") out.dueDate = dueDate;

    const overdue = paramToBool(params.get(Q.overdue));
    if (overdue === true) out.overdue = true;

    const inProgress = paramToBool(params.get(Q.inProgress));
    if (inProgress === true) out.inProgress = true;

    const me = paramToBool(params.get(Q.me));
    if (me === true) out.me = true;

    const nobody = paramToBool(params.get(Q.nobody));
    if (nobody === true) out.nobody = true;

    const skipMe = paramToBool(params.get(Q.skipMe));
    if (skipMe === true) out.skipMe = true;

    const onlyAssigned = paramToBool(params.get(Q.onlyAssigned));
    if (onlyAssigned === true) out.onlyAssigned = true;

    const showSubtasks = paramToBool(params.get(Q.showSubtasks));
    if (showSubtasks === true) out.showSubtasks = true;

    const stackId = params.get(Q.stackId);
    if (stackId != null && stackId !== "") out.stackId = stackId;

    return out;
}

export function searchParamsSignature(params: URLSearchParams): string {
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

/** Whether the filter sidebar should open based on parsed URL vs effective defaults. */
export function shouldOpenFilterDrawerFromQuery(
    parsed: ParsedFilterQuery,
    effectiveDefaults: IFilters
): boolean {
    const { stackId, ...rest } = parsed;

    if (stackId != null && stackId !== "") return true;

    for (const key of Object.keys(rest) as (keyof IFilters)[]) {
        const v = rest[key];
        if (v === undefined) continue;
        const d = effectiveDefaults[key];
        if (key === "tags" || key === "assignees") {
            if (!arraysEqual((v as string[]) ?? [], (d as string[]) ?? [])) return true;
            continue;
        }
        if (v !== d) return true;
    }

    return false;
}
