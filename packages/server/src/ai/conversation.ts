// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { randomUUID } from "node:crypto";
import type { AiChatChoiceReply, AiChatWidget, AiChatClientMessage } from "@stacks/types";
import type { AiToolExecuteOverride } from "./tools";

export type PendingChoice = {
    widget: Extract<AiChatWidget, { type: "choice" }>;
    mutation?: { toolName: string; input: unknown; intent: string };
};
export type Conversation = {
    touched: number;
    busy: boolean;
    pending?: PendingChoice;
    knownIds: Set<string>;
    knownKinds: Map<string, Set<string>>;
    labels: Map<string, string>;
    results: unknown[];
    completed: Map<string, { text: string; widgets: AiChatWidget[] }>;
};
const conversations = new Map<string, Conversation>();
export function getConversation(tenant: string, user: string, id: string, now = Date.now()): Conversation {
    for (const [key, value] of conversations) {
        if (!value.busy && now - value.touched >= 30 * 60 * 1000) conversations.delete(key);
    }
    const key = JSON.stringify([tenant, user, id]);
    let value = conversations.get(key);
    if (!value) {
        if (conversations.size >= 1000) throw new Error("Chat capacity reached");
        value = {
            touched: now,
            busy: false,
            knownIds: new Set([user]),
            knownKinds: new Map([[user, new Set(["person"])]]),
            labels: new Map([[user, "You"]]),
            results: [],
            completed: new Map(),
        };
        conversations.set(key, value);
    }
    value.touched = now;
    return value;
}
const toolKind = (name: string) =>
    /CalendarEvent/.test(name)
        ? "event"
        : /Calendar/.test(name)
        ? "calendar"
        : /Project/.test(name)
        ? "project"
        : /Task/.test(name)
        ? "task"
        : /Stack/.test(name)
        ? "stack"
        : /People|Person/.test(name)
        ? "person"
        : /Compan/.test(name)
        ? "company"
        : /Notepad/.test(name)
        ? "notepad"
        : /Tag/.test(name)
        ? "tag"
        : undefined;
const referenceKinds: Record<string, string> = {
    projectId: "project",
    project: "project",
    taskId: "task",
    afterTaskId: "task",
    stackId: "stack",
    stack: "stack",
    personId: "person",
    assigneeUserIds: "person",
    projectOwnerId: "person",
    companyId: "company",
    calendarId: "calendar",
    calendar: "calendar",
    eventId: "event",
    notepadId: "notepad",
    statusTagId: "tag",
};
export function rememberIds(session: Conversation, value: unknown, kind?: string): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        for (const entry of value) rememberIds(session, entry, kind);
        return;
    }
    const tag = (id: string, entityKind: string | undefined) => {
        if (!entityKind || !session.knownIds.has(id)) return;
        const kinds = session.knownKinds.get(id) ?? new Set<string>();
        kinds.add(entityKind);
        session.knownKinds.set(id, kinds);
    };
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string") {
        const label =
            record.title ?? record.name ?? [record.firstName, record.lastName].filter(Boolean).join(" ");
        if (typeof label === "string" && label && session.labels.size < 2000)
            session.labels.set(record.id, label.slice(0, 300));
    }
    for (const [key, entry] of Object.entries(value)) {
        if (/^(id|.*Id|.*Ids|project|calendar|resourceIds)$/.test(key)) {
            for (const id of Array.isArray(entry) ? entry : [entry]) {
                if (typeof id === "string" && session.knownIds.size < 2000) {
                    session.knownIds.add(id);
                    tag(
                        id,
                        key === "id"
                            ? kind ??
                                  (typeof record.type === "string" &&
                                  [
                                      "project",
                                      "task",
                                      "stack",
                                      "person",
                                      "company",
                                      "calendar",
                                      "event",
                                      "notepad",
                                      "tag",
                                  ].includes(record.type)
                                      ? record.type
                                      : undefined)
                            : key === "parentId" && typeof record.parentType === "string"
                            ? record.parentType
                            : referenceKinds[key]
                    );
                }
            }
        }
        if (entry && typeof entry === "object") rememberIds(session, entry, kind);
    }
}
export function issueChoice(
    session: Conversation,
    widget: PendingChoice["widget"],
    mutation?: PendingChoice["mutation"]
) {
    const choice = { ...widget, pendingActionToken: randomUUID() };
    session.pending = { widget: choice, mutation };
    return choice;
}
export function consumeChoice(
    session: Conversation,
    reply: AiChatChoiceReply
): PendingChoice & { labels: string[] } {
    const pending = session.pending;
    if (
        !pending ||
        pending.widget.pendingActionToken !== reply.token ||
        !Array.isArray(reply.optionIds) ||
        !reply.optionIds.length ||
        new Set(reply.optionIds).size !== reply.optionIds.length ||
        (pending.widget.control !== "checkbox" && reply.optionIds.length !== 1) ||
        reply.optionIds.some(id => !pending.widget.options.some(option => option.id === id))
    ) {
        throw new Error("Choice expired or invalid");
    }
    session.pending = undefined;
    return {
        ...pending,
        labels: reply.optionIds.map(id => pending.widget.options.find(option => option.id === id)!.label),
    };
}
/** Bound retained data while keeping it valid JSON; raw record instructions remain untrusted. */
export function rememberResult(session: Conversation, tool: string, output: unknown) {
    rememberIds(session, output, toolKind(tool));
    const compact = (value: unknown, depth = 0): unknown => {
        if (typeof value === "string") return value.slice(0, 4000);
        if (value instanceof Date) return value.toISOString();
        if (!value || typeof value !== "object") return value;
        if (depth >= 5) return "[nested data omitted]";
        if (Array.isArray(value)) return value.slice(0, 30).map(entry => compact(entry, depth + 1));
        return Object.fromEntries(
            Object.entries(value)
                .slice(0, 40)
                .map(([key, entry]) => [key, compact(entry, depth + 1)])
        );
    };
    session.results.push({ tool, output: compact(output), referenceDataMayBeTruncated: true });
    session.results = session.results.slice(-10);
}
export const isMutation = (name: string) => /^(create|update|delete|move)/.test(name);

/** Client-supplied assistant prose cannot introduce new authoritative record ids. */
export function groundedHistory(
    session: Conversation,
    history: AiChatClientMessage[]
): AiChatClientMessage[] {
    return history.map(message =>
        message.role !== "assistant"
            ? message
            : {
                  ...message,
                  content: message.content.replace(
                      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
                      id =>
                          session.knownIds.has(id) || session.knownIds.has(id.toLowerCase())
                              ? id
                              : "[unverified reference; resolve through tools]"
                  ),
              }
    );
}

/** Stops further calls synchronously, including parallel SDK calls in the same step. */
export function createExecutionGuard(
    session: Conversation,
    message: string,
    backend?: AiToolExecuteOverride,
    completedCall?: { toolName: string; input: unknown }
) {
    let stopped = false;
    let failure: string | undefined;
    const reject = (reason: string): never => {
        stopped = true;
        failure = reason;
        throw new Error(reason);
    };
    const signatureFor = (toolName: string, input: unknown) =>
        JSON.stringify([toolName, input], (_key, value) =>
            value && typeof value === "object" && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
                : value
        );
    const seen = new Set<string>();
    if (completedCall) seen.add(signatureFor(completedCall.toolName, completedCall.input));
    const execute: AiToolExecuteOverride = async ({ toolName, input, defaultExecute }) => {
        if (stopped) throw new Error("Await the user's choice before calling another tool");
        const signature = signatureFor(toolName, input);
        if (seen.has(signature)) throw new Error("Duplicate tool call in this turn");
        seen.add(signature);
        if (isMutation(toolName)) {
            const references: string[] = [];
            for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
                if (/^(.*Id|.*Ids|project|calendar)$/.test(key)) {
                    for (const id of Array.isArray(value) ? value : [value]) {
                        if (typeof id === "string") {
                            if (!id.trim())
                                reject("Resolve a nonempty target reference before proposing this action");
                            references.push(id);
                        }
                    }
                }
            }
            if (
                references.some(id => !session.knownIds.has(id) && !message.split(/[\s"'`,;]+/).includes(id))
            ) {
                reject("Resolve the target using an authorized lookup before proposing this action");
            }
            for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
                const expectedKind = referenceKinds[key];
                if (!expectedKind) continue;
                for (const id of Array.isArray(value) ? value : [value]) {
                    const kinds = typeof id === "string" ? session.knownKinds.get(id) : undefined;
                    if (kinds?.size && !kinds.has(expectedKind))
                        reject(
                            `The ${key} reference is not a ${expectedKind}; resolve the correct target first`
                        );
                }
            }
            stopped = true;
            return issueChoice(
                session,
                {
                    type: "choice",
                    id: randomUUID(),
                    control: "buttons",
                    question: `Confirm ${toolName
                        .replace(/([a-z])([A-Z])/g, "$1 $2")
                        .toLowerCase()}: ${Object.entries(input as Record<string, unknown>)
                        .map(([key, value]) => {
                            const display = (v: unknown) =>
                                typeof v === "string" ? session.labels.get(v) ?? v : v;
                            return `${key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${JSON.stringify(
                                Array.isArray(value) ? value.map(display) : display(value)
                            )}`;
                        })
                        .join("; ")}${
                        toolName.startsWith("delete")
                            ? ". Deletion is permanent and may remove related records."
                            : ""
                    }`,
                    options: [
                        { id: "confirm", label: "Confirm" },
                        { id: "cancel", label: "Cancel" },
                    ],
                },
                { toolName, input: structuredClone(input), intent: message }
            );
        }
        if (toolName === "askUserChoice") stopped = true;
        const output = backend
            ? await backend({ toolName, input, defaultExecute })
            : await defaultExecute(input);
        rememberIds(session, output, toolKind(toolName));
        if (toolName === "askUserChoice") return issueChoice(session, output as PendingChoice["widget"]);
        rememberResult(session, toolName, output);
        return output;
    };
    return { execute, stopped: () => stopped, failure: () => failure };
}
