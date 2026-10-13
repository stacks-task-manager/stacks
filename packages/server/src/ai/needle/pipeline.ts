// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { getNeedleConfidenceThreshold } from "../config";
import { eligibleNeedleTools } from "./eligibility";
import { randomUUID } from "node:crypto";
import type { AiChatClientMessage, AiChatWidget } from "@stacks/types";
import { requestContext } from "../../services/requestContext";
import { clientRouteTemplateVars, parseClientRoute, type AiChatClientRoutePayload } from "../clientRoute";
import { selectPromptContext } from "../promptContext";
import { getTool, NEEDLE_TOOL_METADATA, needleSchema, presentResult } from "./catalog";
import { planWithNeedle, type NeedleCall, type NeedleResult } from "./runtime";
import { getChatSession, type ChatSession, type ChoiceReply } from "./sessions";
import { resolveReference } from "./references";
import type { AiToolExecuteOverride } from "../tools";
import type { AiChatDebugToolCall } from "../debugLog";

export type NeedleTurn = {
    widgets: AiChatWidget[];
    results: unknown[];
    tools: AiChatDebugToolCall[];
    plans: NeedleResult[];
    fallback?: string;
    mutated: boolean;
};
export function status(label: string, severity: "success" | "warning" | "error" = "warning"): AiChatWidget {
    return { type: "status", label, severity };
}
function choice(
    session: ChatSession,
    calls: NeedleCall[],
    question: string,
    options: { label: string; value: unknown }[],
    field?: string
) {
    const token = randomUUID();
    const entries = options.slice(0, 10).map(option => ({ ...option, id: randomUUID() }));
    session.pending = {
        token,
        calls,
        field,
        options: Object.fromEntries(entries.map(option => [option.id, option.value])),
    };
    return {
        type: "choice" as const,
        id: randomUUID(),
        pendingActionToken: token,
        question,
        control: "buttons" as const,
        options: entries.map(({ id, label }) => ({ id, label })),
    };
}
function typedField(session: ChatSession, calls: NeedleCall[], field: string): AiChatWidget {
    session.pending = { token: randomUUID(), calls, field, options: {} };
    return status(`Required: ${field}`);
}
export async function runNeedleTurn(options: {
    conversationId: string;
    choiceReply?: ChoiceReply;
    history: AiChatClientMessage[];
    message: string;
    route?: AiChatClientRoutePayload | null;
    executeOverride?: AiToolExecuteOverride;
    shadow?: boolean;
}): Promise<NeedleTurn> {
    const turn: NeedleTurn = { widgets: [], results: [], tools: [], plans: [], mutated: false };
    const user = requestContext.getCurrentUser();
    const session = getChatSession(user.tenant, user.id, options.conversationId);
    if (session.busy) {
        turn.widgets.push(status("Chat request already running"));
        return turn;
    }
    session.busy = true;
    turn.mutated = Boolean(session.pending && session.mutated);
    try {
        const resuming = Boolean(
            options.choiceReply ||
                (session.pending?.field && Object.keys(session.pending.options).length === 0)
        );
        const request = resuming && session.pendingRequest ? session.pendingRequest : options.message;
        session.pendingRequest = request;
        const intent = request.replace(/"[^"\n]*"|'[^'\n]*'/g, "");
        const selection = selectPromptContext({
            newUserMessage: request,
            history: options.history,
            parsedRoute: options.route ? parseClientRoute(options.route) : null,
            routeSection: options.route?.section,
        });
        const names = eligibleNeedleTools(selection.allowedTools, request);
        const allowed = new Set(names);
        const vars = clientRouteTemplateVars(options.route ?? undefined);
        const defaults: Record<string, string> = {};
        for (const key of ["projectId", "taskId", "personId", "companyId", "notepadId"] as const)
            if (vars[key]) defaults[key] = String(vars[key]);
        if (options.message.length > 4000) {
            turn.widgets.push(status("Provide more request details"));
            turn.fallback = "request too long";
            return turn;
        }
        const input = options.message;
        const job = {
            query: request,
            tools: names.map(name => needleSchema(name, defaults)),
            system: `date: ${new Date().toISOString()}; user: ${user.id}`,
            inputs: [
                `Context: ${JSON.stringify(defaults)}\nPrevious results: ${session.context
                    .join("\n")
                    .slice(-2000)}\nRequest: ${request}`,
            ],
        };
        const seen = new Set<string>();
        let calls: NeedleCall[] | undefined;
        let confirmed = false;
        if (
            /^\s*(hi|hello|hey|thanks|thank you)[!. ]*$/i.test(input) &&
            !options.choiceReply &&
            !session.pending
        ) {
            turn.fallback = "unsupported";
            turn.widgets.push(status("Request unsupported"));
            return turn;
        }
        if (options.shadow) {
            turn.plans.push(await planWithNeedle(job));
            turn.fallback = "shadow";
            return turn;
        }
        if (options.choiceReply) {
            const pending = session.pending;
            if (
                !pending ||
                pending.token !== options.choiceReply.token ||
                !Array.isArray(options.choiceReply.optionIds) ||
                options.choiceReply.optionIds.length !== 1 ||
                !Object.hasOwn(pending.options, options.choiceReply.optionIds[0])
            ) {
                turn.widgets.push(status("Choice expired or invalid"));
                return turn;
            }
            const value = pending.options[options.choiceReply.optionIds[0]];
            if (pending.field) session.context.push(JSON.stringify({ selected: value }));
            session.pending = undefined;
            calls = pending.calls;
            if (pending.field) {
                calls[0].arguments[pending.field] = value;
                confirmed = true;
            } else if (value === false) {
                turn.widgets.push(status("Cancelled"));
                return turn;
            } else if (!calls.length) {
                job.inputs = [`Request: ${String(value)}`];
                calls = undefined;
            } else confirmed = true;
        } else if (session.pending?.field && Object.keys(session.pending.options).length === 0) {
            const pending = session.pending;
            session.pending = undefined;
            calls = pending.calls;
            let value: unknown = input;
            try {
                value = JSON.parse(input);
            } catch {
                /* String fields use verbatim text. */
            }
            calls[0].arguments[pending.field!] = value;
            confirmed = true;
        } else {
            session.pending = undefined;
        }
        for (let step = 0; step < 12; step++) {
            let plan: NeedleResult | undefined;
            if (!calls) {
                plan = await planWithNeedle(job);
                turn.plans.push(plan);
                if (options.shadow) {
                    turn.fallback = "shadow";
                    return turn;
                }
                if (!plan.response.success) throw new Error("Needle completion failed");
                if (plan.response.type === "respond") {
                    if (!turn.results.length) turn.fallback = "unsupported";
                    break;
                }
                calls = plan.response.function_calls?.length
                    ? plan.response.function_calls
                    : plan.response.suppressed_calls;
                calls = calls?.map(call => ({ ...call, arguments: { ...call.arguments } }));
                if (!calls?.length) {
                    if (!turn.results.length) {
                        turn.fallback = "unsupported";
                        turn.widgets.push(status("Request unsupported"));
                    }
                    break;
                }
                if (plan.response.validation?.negation) {
                    turn.widgets.push(status("Request unsupported"));
                    return turn;
                }
                for (const grounding of plan.response.validation?.ungrounded ?? []) {
                    // The WASM validator reports snake_case names even for camelCase schemas.
                    const [toolName, fieldName] = grounding.split(".");
                    const normalize = (name: string) => name.replace(/_/g, "").toLowerCase();
                    const index = calls.findIndex(call => normalize(call.name) === normalize(toolName));
                    const call = calls[index];
                    if (!call || !fieldName) {
                        turn.widgets.push(status("Provide more request details"));
                        return turn;
                    }
                    const schema = needleSchema(call.name).parameters;
                    const field = Object.keys(schema.properties ?? {}).find(
                        key => normalize(key) === normalize(fieldName)
                    );
                    if (!field) throw new Error("Invalid grounding field");
                    if (!schema.required?.includes(field)) {
                        delete call.arguments[field];
                        continue;
                    }
                    turn.widgets.push(typedField(session, calls.slice(index), field));
                    return turn;
                }
            }
            if (
                !calls.length ||
                calls.length > 12 ||
                calls.some(
                    call =>
                        !allowed.has(call.name) ||
                        !call.arguments ||
                        typeof call.arguments !== "object" ||
                        Array.isArray(call.arguments)
                )
            )
                throw new Error("Invalid Needle tool call");
            for (const call of calls) {
                if (
                    call.name === "createStack" &&
                    !/\b(first|last|before|after|position|index|beginning|start|end)\b/i.test(intent)
                )
                    delete call.arguments.insertIndex;
                if (
                    call.name === "createTask" &&
                    !/\b(due|today|tomorrow|yesterday|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\d{4}-\d{2}-\d{2}/i.test(
                        intent
                    )
                )
                    delete call.arguments.duedate;
            }
            if (
                !confirmed &&
                (!plan ||
                    typeof plan.response.confidence !== "number" ||
                    !Number.isFinite(plan.response.confidence) ||
                    plan.response.confidence < getNeedleConfidenceThreshold())
            ) {
                turn.widgets.push(
                    choice(
                        session,
                        calls,
                        calls
                            .map(
                                call =>
                                    `${NEEDLE_TOOL_METADATA[call.name].label}: ${Object.entries(
                                        call.arguments
                                    )
                                        .map(
                                            ([key, value]) =>
                                                `${key
                                                    .replace(/Id$/, "")
                                                    .replace(/([a-z])([A-Z])/g, "$1 $2")}: ${
                                                    Array.isArray(value) ? value.join(", ") : String(value)
                                                }`
                                        )
                                        .join("; ")}`
                            )
                            .join("; "),
                        [
                            { label: "Confirm", value: true },
                            { label: "Cancel", value: false },
                        ]
                    )
                );
                return turn;
            }
            for (let index = 0; index < calls.length; index++) {
                if (turn.tools.length >= 12) {
                    turn.widgets.push(status("Action limit reached"));
                    return turn;
                }
                const call = calls[index];
                const remaining = calls.slice(index);
                const def = getTool(call.name);
                const args = { ...call.arguments };
                if (
                    call.name === "createTask" &&
                    !args.stackId &&
                    !/\b(?:default|first|last)\s+(?:column|stack)\b/i.test(request)
                ) {
                    const destination =
                        /\b(?:in|into|under)\s+(?:(?:the\s+)?(?:column|stack)\s+)?["']?([^"'\n,.;]+?)["']?\s+(?=called|named)\b/i
                            .exec(intent)?.[1]
                            ?.trim();
                    if (destination) args.stackId = destination;
                    else {
                        const candidates = await resolveReference(
                            "stack",
                            "",
                            String(args.projectId ?? defaults.projectId ?? "") || undefined
                        );
                        if (!candidates.length) {
                            turn.widgets.push(status("Which column?"));
                            return turn;
                        }
                        turn.widgets.push(
                            choice(
                                session,
                                remaining,
                                "Which column?",
                                candidates.map(candidate => ({
                                    label: candidate.label,
                                    value: candidate.id,
                                })),
                                "stackId"
                            )
                        );
                        return turn;
                    }
                }
                if (call.name === "createTask" && defaults.projectId && !/\bproject\b/i.test(request)) {
                    const column =
                        /\bin\s+(?:(?:the\s+)?(?:column|stack)\s+)?(.+?)\s+(?:called|named|name)\s+/i
                            .exec(request)?.[1]
                            ?.trim();
                    if (column) {
                        // A task inside a named column on the current board belongs to that board.
                        args.projectId = defaults.projectId;
                        args.stackId = column.replace(/^["']|["']$/g, "");
                    }
                }
                if (
                    call.name === "updateTask" &&
                    args.title !== undefined &&
                    !/\b(rename|title|name|called)\b/i.test(input) &&
                    !confirmed
                ) {
                    turn.widgets.push(status("Provide more request details"));
                    turn.fallback = "unrequested title change";
                    return turn;
                }
                if (
                    ["findTasks", "listTasks"].includes(call.name) &&
                    args.assignedOnly === true &&
                    args.assigneeUserIds === undefined &&
                    /\bassigned to me\b/i.test(input)
                ) {
                    delete args.assignedOnly;
                    args.assigneeUserIds = "me";
                }
                const references = { ...NEEDLE_TOOL_METADATA[call.name].references };
                if (
                    call.name === "navigate" &&
                    ["project", "task", "person", "company", "notepad"].includes(String(args.view))
                ) {
                    references.id = String(args.view) as
                        | "project"
                        | "task"
                        | "person"
                        | "company"
                        | "notepad";
                    if (!args.id && defaults[`${args.view}Id`]) args.id = defaults[`${args.view}Id`];
                }
                let referenceProject = String(args.projectId ?? defaults.projectId ?? "") || undefined;
                for (const [field, kind] of Object.entries(references)) {
                    if (
                        args[field] === undefined &&
                        defaults[field] &&
                        needleSchema(call.name).parameters.required?.includes(field)
                    )
                        args[field] = defaults[field];
                    if (args[field] === undefined || args[field] === null) continue;
                    const values = Array.isArray(args[field]) ? (args[field] as unknown[]) : [args[field]];
                    const resolved: string[] = [];
                    for (const value of values) {
                        // Trust IDs only when grounded for this exact field. A project ID in
                        // defaults must never authorize it as a stack/task/person ID.
                        const trusted =
                            typeof value === "string" &&
                            /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) &&
                            (request.includes(value) || defaults[field] === value);
                        if (
                            trusted ||
                            (typeof value === "string" &&
                                value.startsWith("google_") &&
                                input.includes(value))
                        ) {
                            resolved.push(String(value));
                            continue;
                        }
                        let candidates = await resolveReference(kind, value, referenceProject);
                        if (!candidates.length && call.name === "deleteStack" && field === "stackId") {
                            const requestedColumn =
                                /\b(?:delete|remove)\s+(?:(?:(?:the|a|an)\s+)?(?:column|stack)\s+(?:(?:named|called)\s+)?)?["']?([^"'\n,.;]+?)["']?(?=\s+(?:from|in|on|please)\b|$)/i
                                    .exec(request)?.[1]
                                    ?.trim();
                            if (requestedColumn)
                                candidates = await resolveReference(
                                    "stack",
                                    requestedColumn,
                                    referenceProject
                                );
                        }
                        if (!candidates.length && call.name === "deleteTask" && field === "taskId") {
                            const requestedTask =
                                /\b(?:delete|remove)\s+(?:(?:the|a|an)\s+)?(?:(?:task)\s+(?:named|called)\s+)?["']?([^"'\n,.;]+?)["']?(?=\s+(?:from|in|on|please)\b|$)/i
                                    .exec(request)?.[1]
                                    ?.trim();
                            if (requestedTask)
                                candidates = await resolveReference("task", requestedTask, referenceProject);
                        }
                        if (candidates.length === 1) resolved.push(candidates[0].id);
                        else if (candidates.length > 1) {
                            // Resolve arrays one slot at a time, retaining earlier resolved entries.
                            const choices = candidates.map(candidate => ({
                                label: candidate.label,
                                value: Array.isArray(args[field])
                                    ? [...resolved, candidate.id, ...values.slice(resolved.length + 1)]
                                    : candidate.id,
                            }));
                            remaining[0] = { ...call, arguments: args };
                            turn.widgets.push(choice(session, remaining, `Choose ${kind}`, choices, field));
                            return turn;
                        } else {
                            remaining[0] = { ...call, arguments: args };
                            turn.widgets.push(typedField(session, remaining, field));
                            return turn;
                        }
                    }
                    args[field] = Array.isArray(args[field]) ? resolved : resolved[0];
                    if (field === "projectId") referenceProject = String(args[field]);
                    if (field === "taskId" && !referenceProject) {
                        const taskTool = getTool("getTask");
                        const task = (await (taskTool.execute as (input: unknown) => Promise<unknown>)(
                            taskTool.inputSchema.parse({ taskId: args[field] })
                        )) as { project?: string };
                        referenceProject = task.project;
                    }
                }
                for (const field of [
                    "duedate",
                    "startdate",
                    "dodate",
                    "start",
                    "end",
                    "date",
                    "from",
                    "to",
                ]) {
                    const value = args[field];
                    if (typeof value !== "string") continue;
                    if (/^(today|tomorrow|yesterday)$/i.test(value)) {
                        const date = new Date();
                        date.setUTCHours(0, 0, 0, 0);
                        date.setUTCDate(
                            date.getUTCDate() +
                                (value.toLowerCase() === "tomorrow"
                                    ? 1
                                    : value.toLowerCase() === "yesterday"
                                    ? -1
                                    : 0)
                        );
                        args[field] = date.toISOString();
                    } else if (!/^\d{4}-\d{2}-\d{2}/.test(value) || Number.isNaN(new Date(value).getTime())) {
                        remaining[0] = { ...call, arguments: args };
                        turn.widgets.push(typedField(session, remaining, field));
                        return turn;
                    }
                }
                const parsed = def.inputSchema.safeParse(args);
                if (!parsed.success) {
                    const issue = parsed.error.issues[0];
                    const field = String(issue.path[0] ?? "");
                    if (!field) {
                        turn.widgets.push(status("Provide more request details"));
                        return turn;
                    }
                    remaining[0] = { ...call, arguments: args };
                    const property = needleSchema(call.name).parameters.properties?.[field];
                    if (property?.enum)
                        turn.widgets.push(
                            choice(
                                session,
                                remaining,
                                `Choose ${field}`,
                                property.enum.map((value: unknown) => ({ label: String(value), value })),
                                field
                            )
                        );
                    else turn.widgets.push(typedField(session, remaining, field));
                    return turn;
                }
                const fingerprint = JSON.stringify([call.name, parsed.data]);
                if (seen.has(fingerprint)) {
                    turn.widgets.push(status("Repeated action stopped"));
                    return turn;
                }
                seen.add(fingerprint);
                const execute = def.execute as (input: unknown) => Promise<unknown>;
                // Mark before invoking: a thrown mutation may already have partially committed.
                if (NEEDLE_TOOL_METADATA[call.name].mutation) {
                    turn.mutated = true;
                    session.mutated = true;
                }
                try {
                    const output = options.executeOverride
                        ? await options.executeOverride({
                              toolName: call.name,
                              input: parsed.data,
                              defaultExecute: execute,
                          })
                        : await execute(parsed.data);
                    turn.tools.push({
                        toolName: call.name,
                        input: parsed.data,
                        output,
                        success: true,
                        timestamp: new Date().toISOString(),
                    });
                    turn.results.push({ tool: call.name, input: parsed.data, output });
                    const compact = JSON.stringify({ tool: call.name, input: parsed.data, output }).slice(
                        0,
                        6000
                    );
                    job.inputs.push(compact.slice(0, 2000));
                    session.context.push(compact);
                    session.context = session.context.slice(-6);
                    if (call.name === "askUserChoice") {
                        const result = output as {
                            question: string;
                            options: { label: string; value?: string }[];
                        };
                        turn.widgets.push(
                            choice(
                                session,
                                [],
                                result.question,
                                result.options.map(option => ({
                                    label: option.label,
                                    value: option.value ?? option.label,
                                }))
                            )
                        );
                        return turn;
                    }
                    turn.widgets.push(presentResult(call.name, output));
                    if (job.inputs.reduce((sum, item) => sum + item.length, 0) > 16000) {
                        turn.widgets.push(status("Action limit reached"));
                        return turn;
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Tool failed";
                    turn.tools.push({
                        toolName: call.name,
                        input: parsed.data,
                        success: false,
                        error: message,
                        timestamp: new Date().toISOString(),
                    });
                    turn.widgets.push(status(message, "error"));
                    if (turn.mutated) turn.widgets.push(status("Check for partial changes"));
                    return turn;
                }
            }
            // A completed mutation is the action the user requested. Do not interpret its JSON
            // output as a new user command and plan additional, unsolicited writes.
            if (turn.mutated) return turn;
            calls = undefined;
            confirmed = false;
            if (step === 11) turn.widgets.push(status("Action limit reached"));
        }
        return turn;
    } catch (error) {
        turn.fallback = error instanceof Error ? error.message : "Needle unavailable";
        turn.widgets.push(
            status(turn.mutated ? "Check for partial changes" : "Planner unavailable", "error")
        );
        return turn;
    } finally {
        session.busy = false;
        if (!session.pending) {
            session.mutated = false;
            session.pendingRequest = undefined;
        }
        session.touched = Date.now();
    }
}
