// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { AiChatWidget } from "@stacks/types";
const humanLabel = (name: string) =>
    name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, s => s.toUpperCase());
/** A completed handler is evidence of success only when its result confirms the action. */
export function mutationSummary(name: string, output: unknown): string {
    const row = output && typeof output === "object" ? (output as Record<string, unknown>) : {};
    if (typeof row.id !== "string" || !row.id || (name.startsWith("delete") && row.deleted !== true))
        throw new Error("The tool did not confirm the action succeeded; check its result before retrying.");
    const verb = name.startsWith("create")
        ? "created"
        : name.startsWith("delete")
        ? "deleted"
        : name.startsWith("move")
        ? "moved"
        : "updated";
    const entity = name
        .replace(/^(create|delete|move|update)/, "")
        .replace(/^Local/, "")
        .replace(/^Stack$/, "Column")
        .replace(/([a-z])([A-Z])/g, "$1 $2");
    return `${entity} ${verb}${typeof row.title === "string" && row.title ? ": " + row.title : ""}.`;
}
export function presentResult(name: string, output: unknown): AiChatWidget {
    const meta = { label: humanLabel(name) };
    const object = output && typeof output === "object" ? (output as Record<string, unknown>) : {};
    const array = Array.isArray(output)
        ? output
        : (Object.values(object).find(Array.isArray) as unknown[] | undefined);
    const rows = array ?? [output];
    const items = rows.slice(0, 20).map(raw => {
        const row: Record<string, unknown> =
            raw && typeof raw === "object" ? (raw as Record<string, unknown>) : { value: raw };
        const label = String(
            row.title ??
                row.label ??
                row.name ??
                ([row.firstName, row.lastName].filter(Boolean).join(" ") || "Result")
        );
        const fields = Object.entries(row)
            .filter(
                ([key, value]) =>
                    !/^(id|.*Id|summary|hashPath|title|label|name)$/.test(key) &&
                    !Array.isArray(value) &&
                    (typeof value !== "object" || value === null)
            )
            .slice(0, 12)
            .map(([key, value]) => ({
                label: humanLabel(key),
                value: String(value ?? "—")
                    .replace(/<[^>]*>/g, "")
                    .slice(0, key === "content" ? 400 : 300),
            }));
        const id = typeof row.id === "string" ? row.id : undefined;
        const encoded = id
            ? encodeURIComponent(
                  /Notepad/.test(name) && typeof row.documentId === "string" ? row.documentId : id
              )
            : undefined;
        const hashPath =
            typeof row.hashPath === "string"
                ? row.hashPath
                : !encoded
                ? undefined
                : /Task/.test(name) && (row.projectId ?? row.project)
                ? `/project/${encodeURIComponent(String(row.projectId ?? row.project))}/${encoded}`
                : /Project/.test(name)
                ? `/project/${encoded}`
                : /Notepad/.test(name)
                ? `/notepad/${encoded}`
                : /Compan/.test(name)
                ? `/company/${encoded}`
                : /People|Person/.test(name)
                ? `/person/${encoded}`
                : undefined;
        return { label, fields, hashPath };
    });
    return {
        type: "result",
        label: meta.label,
        items,
        truncated: rows.length > 20 || object.truncated === true,
    };
}
