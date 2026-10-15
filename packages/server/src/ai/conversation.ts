// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { randomUUID } from "node:crypto";
import type { AiChatChoiceReply, AiChatWidget, AiChatClientMessage } from "@stacks/types";
import { AI_TOOL_REGISTRY, type AiToolExecuteOverride } from "./tools";
import { referenceKinds, assertResolvedMutationReferences } from "./referenceInput";
import { mutationSummary } from "./results";
import { resolveReferences } from "./references";
import { unsupportedRequestReason } from "./promptContext";

export type PendingChoice = {
    widget: Extract<AiChatWidget, { type: "choice" }>;
    mutation?: { toolName: string; input: unknown; intent: string };
    resolution?: {
        toolName: string;
        input: Record<string, unknown>;
        intent: string;
        field: string;
        index?: number;
    };
};
export type Conversation = {
    userId: string;
    touched: number;
    busy: boolean;
    pending?: PendingChoice;
    knownIds: Set<string>;
    knownKinds: Map<string, Set<string>>;
    labels: Map<string, string>;
    results: unknown[];
    completed: Map<string, { text: string; widgets: AiChatWidget[] }>;
};
export function createConversationState(user: string, now = Date.now()): Conversation {
    return {
        userId: user,
        touched: now,
        busy: false,
        knownIds: new Set([user]),
        knownKinds: new Map([[user, new Set(["person"])]]),
        labels: new Map([[user, "You"]]),
        results: [],
        completed: new Map(),
    };
}

/** Process-wide cap; expired idle sessions are swept on access before rejecting new ones. */
const MAX_CONVERSATIONS = 1000;
const conversations = new Map<string, Conversation>();
export function getConversation(tenant: string, user: string, id: string, now = Date.now()): Conversation {
    for (const [key, value] of conversations) {
        if (!value.busy && now - value.touched >= 30 * 60 * 1000) conversations.delete(key);
    }
    const key = JSON.stringify([tenant, user, id]);
    let value = conversations.get(key);
    if (!value) {
        if (conversations.size >= MAX_CONVERSATIONS) throw new Error("Chat capacity reached");
        value = createConversationState(user, now);
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
        if (/^(id|.*Id|.*Ids|project|calendar|resourceIds)$/.test(key) || referenceKinds[key]) {
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
    completedCall?: { toolName: string; input: unknown },
    options: {
        resolveReferenceNames?: boolean;
        unsupportedReason?: string;
        projectId?: string;
        onReferenceLookup?: (call: {
            name: string;
            input: Record<string, unknown>;
            output?: unknown;
            error?: string;
        }) => void;
    } = {}
) {
    let stopped = false;
    let failure: string | undefined;
    let summary: string | undefined;
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
    const executeOne: AiToolExecuteOverride = async ({ toolName, input, defaultExecute }) => {
        if (stopped) throw new Error("Await the user's next request or choice before calling another tool");
        if (options.unsupportedReason && (isMutation(toolName) || toolName === "askUserChoice"))
            reject("I can't perform this operation through chat. " + options.unsupportedReason);
        if (toolName === "askUserChoice") {
            const choice = input as { question: string; options: { label: string }[] };
            const unavailable = choice.options
                .map(option => unsupportedRequestReason(option.label))
                .find(Boolean);
            if (unavailable) reject("I can't perform this operation through chat. " + unavailable);
            if (
                /\b(?:create|update|delete|remove|move|rename|assign)\b/i.test(choice.question) &&
                choice.options.some(option =>
                    /^(?:confirm|approve|proceed|yes|do it)$/i.test(option.label.trim())
                )
            )
                reject("Request the action tool so the server can generate a validated confirmation.");
        }
        if (
            options.resolveReferenceNames &&
            input &&
            typeof input === "object" &&
            toolName !== "askUserChoice"
        ) {
            try {
                if (
                    options.projectId &&
                    !(input as Record<string, unknown>).projectId &&
                    ((input as Record<string, unknown>).taskId || (input as Record<string, unknown>).stackId)
                )
                    input = { ...(input as Record<string, unknown>), projectId: options.projectId };
                const resolved = await resolveReferences(
                    input as Record<string, unknown>,
                    session.knownIds,
                    async (name, args) => {
                        const def = AI_TOOL_REGISTRY.find(tool => tool.name === name);
                        if (!def || isMutation(name))
                            throw new Error("Authorized reference lookup unavailable");
                        const parsed = def.inputSchema.parse(args);
                        const defaultExecute = async (data: unknown) =>
                            (def.execute as (data: unknown) => Promise<unknown>)(def.inputSchema.parse(data));
                        try {
                            const output = backend
                                ? await backend({ toolName: name, input: parsed, defaultExecute })
                                : await defaultExecute(parsed);
                            options.onReferenceLookup?.({
                                name,
                                input: parsed as Record<string, unknown>,
                                output,
                            });
                            rememberResult(session, name, output);
                            return output;
                        } catch (error) {
                            options.onReferenceLookup?.({
                                name,
                                input: parsed as Record<string, unknown>,
                                error: error instanceof Error ? error.message : String(error),
                            });
                            throw error;
                        }
                    },
                    session.userId
                );
                input = resolved.input;
                if (resolved.choice) {
                    const choice = resolved.choice;
                    if (choice.matches.length > 20)
                        reject("Too many matching records. Please narrow the name.");
                    stopped = true;
                    const widget = issueChoice(session, {
                        type: "choice",
                        id: randomUUID(),
                        control: "radio",
                        question: `Which ${choice.kind} named "${choice.name}"?`,
                        options: choice.matches.map(row => ({
                            id: randomUUID(),
                            value: row.id,
                            label:
                                String(
                                    row.title ??
                                        row.name ??
                                        [row.firstName, row.lastName].filter(Boolean).join(" ")
                                ) +
                                " — " +
                                String(
                                    row.parentTitle ?? row.projectId ?? row.project ?? row.email ?? row.id
                                ),
                        })),
                    });
                    session.pending!.resolution = {
                        toolName,
                        input: resolved.input,
                        intent: message,
                        field: choice.field,
                        index: choice.index,
                    };
                    return widget;
                }
                const def = AI_TOOL_REGISTRY.find(tool => tool.name === toolName);
                if (!def) reject("Unknown tool");
                input = def!.inputSchema.parse(input);
            } catch (error) {
                reject(error instanceof Error ? error.message : "Reference lookup failed");
            }
        }
        const signature = signatureFor(toolName, input);
        if (seen.has(signature)) throw new Error("Duplicate tool call in this turn");
        seen.add(signature);
        if (isMutation(toolName)) {
            if (options.resolveReferenceNames) {
                try {
                    assertResolvedMutationReferences(input, session.knownKinds);
                } catch (error) {
                    reject(error instanceof Error ? error.message : "Unresolved reference");
                }
            }
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
            if (!toolName.startsWith("delete")) {
                try {
                    const output = backend
                        ? await backend({ toolName, input, defaultExecute })
                        : await defaultExecute(input);
                    summary = mutationSummary(toolName, output);
                    rememberResult(session, toolName, output);
                    return output;
                } catch (error) {
                    reject(error instanceof Error ? error.message : "Action failed");
                }
            }
            return issueChoice(
                session,
                {
                    type: "choice",
                    id: randomUUID(),
                    control: "buttons",
                    question: `Confirm ${toolName
                        .replace(/([a-z])([A-Z])/g, "$1 $2")
                        .toLowerCase()
                        .replace(/stack/g, "column")}: ${Object.entries(input as Record<string, unknown>)
                        .map(([key, value]) => {
                            const display = (v: unknown) =>
                                typeof v === "string" ? session.labels.get(v) ?? v : v;
                            const fieldLabels: Record<string, string> = {
                                stackId: "Column",
                                beforeStackId: "Before column",
                                afterStackId: "After column",
                                projectId: "Project",
                                taskId: "Task",
                                calendarId: "Calendar",
                                calendar: "Calendar",
                                eventId: "Event",
                                personId: "Person",
                                assigneeUserIds: "Assignees",
                                projectOwnerId: "Owner",
                                statusTagId: "Status",
                                afterTaskId: "After task",
                            };
                            return `${
                                fieldLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2")
                            }: ${JSON.stringify(Array.isArray(value) ? value.map(display) : display(value))}`;
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
        if (toolName === "askUserChoice" || toolName === "findTasks") stopped = true;
        const output = backend
            ? await backend({ toolName, input, defaultExecute })
            : await defaultExecute(input);
        if (toolName === "askUserChoice") return issueChoice(session, output as PendingChoice["widget"]);
        rememberResult(session, toolName, output);
        if (toolName === "findTasks") {
            const path = (output as { hashPath?: unknown } | null)?.hashPath;
            if (typeof path !== "string" || !/^\/tasks(?:\?|$)/.test(path))
                reject("The task tool did not return a filtered task view.");
            summary = "The filtered task view is ready.";
        }
        return output;
    };
    let tail: Promise<unknown> = Promise.resolve();
    const execute: AiToolExecuteOverride = args => {
        const result = tail.then(() => executeOne(args));
        tail = result.catch(() => undefined);
        return result;
    };
    return { execute, stopped: () => stopped, failure: () => failure, summary: () => summary };
}
