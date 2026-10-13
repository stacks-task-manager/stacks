// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { getTool, type ReferenceKind } from "./catalog";
import { requestContext } from "../../services/requestContext";
export type Candidate = { id: string; label: string };
async function lookup(name: string, input: Record<string, unknown>) {
    const def = getTool(name);
    const value = await (def.execute as (input: unknown) => Promise<unknown>)(def.inputSchema.parse(input));
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (value && typeof value === "object")
        return (Object.values(value).find(Array.isArray) as Record<string, unknown>[]) ?? [];
    return [];
}
export async function resolveReference(
    kind: ReferenceKind,
    value: unknown,
    projectId?: string
): Promise<Candidate[]> {
    const query = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (kind === "person" && /^(me|myself|my)$/.test(query)) {
        const user = requestContext.getCurrentUser();
        return [{ id: user.id, label: user.email }];
    }
    let rows: Record<string, unknown>[] = [];
    switch (kind) {
        case "project":
            rows = await lookup("listProjects", {});
            break;
        case "task":
            rows = await lookup("listTasks", {
                ...(projectId ? { projectId } : {}),
                ...(query ? { searchQuery: query } : { doneFilter: "all" }),
            });
            break;
        case "stack":
            if (projectId) rows = await lookup("listStacks", { projectId });
            else {
                for (const project of await lookup("listProjects", {})) {
                    const stacks = await lookup("listStacks", { projectId: project.id });
                    rows.push(
                        ...stacks.map(stack => ({
                            ...stack,
                            displayLabel: `${project.title} / ${stack.title}`,
                        }))
                    );
                }
            }
            break;
        case "person":
            if (query) rows = await lookup("searchPeople", { query });
            break;
        case "company":
            rows = await lookup("listCompanies", {});
            break;
        case "calendar":
            rows = await lookup("listCalendars", {});
            break;
        case "event":
            rows = await lookup("listCalendarEvents", { span: "month" });
            break;
        case "notepad":
            rows = await lookup("listNotepads", {});
            break;
        case "tag":
            rows = await lookup("listTags", {});
            break;
        // Folder ids require an explicit id; DocumentsLoader validates access on creation.
        case "folder":
            return [];
    }
    const candidates = rows
        .map(row => {
            const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ");
            const aliases = [row.title, row.name, fullName, row.nickname, row.email].filter(
                (value): value is string => typeof value === "string" && Boolean(value)
            );
            return {
                id: String(row.id),
                label: typeof row.displayLabel === "string" ? row.displayLabel : aliases[0] ?? String(row.id),
                aliases: aliases.map(value => value.toLowerCase()),
            };
        })
        .filter(row => row.id !== "undefined");
    const exact = candidates.filter(row => row.id.toLowerCase() === query || row.aliases.includes(query));
    const matches = !query
        ? candidates
        : exact.length
        ? exact
        : candidates.filter(row => row.aliases.some(alias => alias.includes(query)));
    return matches.map(({ id, label }) => ({ id, label }));
}
