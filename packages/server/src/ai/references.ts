// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { referenceKinds, isUuidReference } from "./referenceInput";

type Row = Record<string, unknown> & { id: string };
export type ReferenceChoice = {
    field: string;
    index?: number;
    name: string;
    kind: string;
    matches: Row[];
};
const normalize = (value: string) => value.trim().normalize("NFKC").toLocaleLowerCase("en");
const label = (row: Row) =>
    String(row.title ?? row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" "));
const rowsOf = (output: unknown): Row[] => {
    const rows = Array.isArray(output)
        ? output
        : output && typeof output === "object"
        ? Object.values(output).find(Array.isArray) ?? []
        : [];
    return (rows as unknown[]).filter(
        (row): row is Row => !!row && typeof row === "object" && typeof (row as Row).id === "string"
    );
};
export function setReference(
    input: Record<string, unknown>,
    field: string,
    index: number | undefined,
    id: string
) {
    if (index === undefined) input[field] = id;
    else (input[field] as unknown[])[index] = id;
}

/** Only exact matches from authorized tools; no fuzzy guessing or scans of arbitrary event history. */
export async function resolveReferences(
    input: Record<string, unknown>,
    knownIds: Set<string>,
    lookup: (name: string, input: Record<string, unknown>) => Promise<unknown>,
    currentUserId?: string
): Promise<{ input: Record<string, unknown>; choice?: ReferenceChoice }> {
    const resolved = structuredClone(input);
    const fields = Object.keys(resolved).filter(key => referenceKinds[key]);
    const order = ["projectId", "project", "calendarId", "calendar", "taskId", "taskIds", "parentTaskId"];
    fields.sort(
        (a, b) => (order.includes(a) ? order.indexOf(a) : 100) - (order.includes(b) ? order.indexOf(b) : 100)
    );
    for (const field of fields) {
        const value = resolved[field];
        const values = Array.isArray(value) ? value : [value];
        for (let index = 0; index < values.length; index++) {
            const name = values[index];
            if (
                typeof name !== "string" ||
                knownIds.has(name) ||
                isUuidReference(name) ||
                /^google_/.test(name)
            )
                continue;
            if (!name.trim())
                throw new Error("Resolve a nonempty target reference before proposing this action");
            const kind = referenceKinds[field];
            if (kind === "person" && currentUserId && /^(?:me|myself)$/i.test(name.trim())) {
                setReference(resolved, field, Array.isArray(value) ? index : undefined, currentUserId);
                continue;
            }
            let output: unknown;
            if (kind === "project") output = await lookup("listProjects", { search: name });
            else if (kind === "task")
                output = await lookup("listTasks", {
                    searchQuery: name,
                    ...(typeof resolved.projectId === "string" ? { projectId: resolved.projectId } : {}),
                });
            else if (kind === "person") output = await lookup("searchPeople", { query: name, limit: 200 });
            else if (kind === "calendar") output = await lookup("listCalendars", {});
            else if (kind === "company") output = await lookup("listCompanies", {});
            else if (kind === "tag") output = await lookup("listTags", {});
            else if (kind === "stack") {
                let projectId = resolved.projectId;
                if (typeof resolved.taskId === "string") {
                    const task = (await lookup("getTask", { taskId: resolved.taskId })) as Record<
                        string,
                        unknown
                    >;
                    projectId = task.projectId ?? task.project;
                }
                if (!projectId) throw new Error(`Which project contains the column "${name}"?`);
                output = await lookup("listStacks", { projectId });
            } else if (kind === "event") {
                output = await lookup("listCalendarEvents", {
                    span: "month",
                    ...(typeof resolved.start === "string" ? { date: resolved.start.slice(0, 10) } : {}),
                });
            } else output = await lookup("globalSearch", { query: name });
            const meta =
                output && typeof output === "object" && !Array.isArray(output)
                    ? (output as Record<string, unknown>)
                    : {};
            if (meta.truncated === true)
                throw new Error(`The ${kind} lookup is incomplete. Please narrow the name "${name}".`);
            const matches = [
                ...new Map(
                    rowsOf(output)
                        .filter(
                            row =>
                                (kind !== "notepad" || row.type === "notepad") &&
                                [
                                    row.id,
                                    label(row),
                                    ...(kind === "person"
                                        ? [row.email, row.nickname, row.firstName, row.lastName]
                                        : []),
                                ].some(
                                    value => typeof value === "string" && normalize(value) === normalize(name)
                                )
                        )
                        .map(row => [row.id, row])
                ).values(),
            ];
            if (!matches.length)
                throw new Error(
                    `Could not find ${kind} "${name}"${
                        kind === "event"
                            ? " in the searched month; specify its date or list the relevant date range first"
                            : " among accessible records"
                    }.`
                );
            if (matches.length > 1)
                return {
                    input: resolved,
                    choice: { field, index: Array.isArray(value) ? index : undefined, name, kind, matches },
                };
            setReference(resolved, field, Array.isArray(value) ? index : undefined, matches[0].id);
        }
    }
    return { input: resolved };
}
