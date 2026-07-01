// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Dynamic prompt + tool selector.
 *
 * Goal: per turn, assemble only the system prompt fragments and expose only the
 * tools that the current intent actually needs. Cheaper in tokens, easier for
 * the model to stay on-task, and still capable — because the "core" fragment +
 * core tools always cover identity, navigation, and common getters.
 *
 * The selector is **pure** (no I/O). Inputs: latest user message, recent chat
 * history, and the parsed client route. Output: the set of active topics,
 * which in turn determine:
 *   - which `system-<topic>.md` fragments to append after `system-core.md`
 *   - which tools survive the per-turn filter in `buildAiTools`
 *
 * Tests: `__tests__/promptContext.test.ts`.
 */
import type { AiChatClientMessage } from "./chat";
import type { ParsedClientRoute } from "./clientRoute";

export const PROMPT_TOPICS = [
    "tasks",
    "projects",
    "notepads",
    "calendar",
    "org",
] as const;

export type PromptTopic = (typeof PROMPT_TOPICS)[number];

/**
 * Tools that are always available regardless of topic. Chosen for two reasons:
 *   1. They're tiny (descriptions measured in a few dozen tokens each) so the
 *      cost of always including them is negligible.
 *   2. They unblock navigation, identity resolution, and single-record reads
 *      from anywhere, which keeps the assistant conversational even when no
 *      topic matches (e.g. a pure "who am I" turn).
 */
export const CORE_TOOLS: readonly string[] = [
    "navigate",
    "openProfile",
    "globalSearch",
    "listProjects",
    "searchPeople",
    "getProject",
    "getTask",
    "getPerson",
    "getCompany",
    "summarizeNotepad",
];

/**
 * Extra tools enabled per topic. Must stay in sync with each
 * `system-<topic>.md` fragment — if a fragment mentions a tool it must also
 * be listed here, otherwise the model will hallucinate a tool that isn't
 * registered this turn.
 */
export const TOPIC_TOOLS: Record<PromptTopic, readonly string[]> = {
    tasks: [
        "findTasks",
        "listTasks",
        "createTask",
        "updateTask",
        "moveTask",
        "listStacks",
        "listTags",
        "listActivities",
        "listReminders",
    ],
    projects: ["createProject", "listStacks", "createStack", "updateStack"],
    notepads: ["listNotepads"],
    calendar: ["listCalendarEvents"],
    org: ["listTags", "listCompanies", "listBookmarks"],
};

/**
 * Keyword patterns used to detect topic intent in free-form user text.
 *
 * Favor recall over precision: a false positive just adds a few tools that
 * won't be called, but a false negative means the model can't answer. The
 * matchers intentionally use word boundaries and common synonyms.
 */
const TOPIC_KEYWORDS: Record<PromptTopic, RegExp> = {
    tasks:
        /\b(task|tasks|todo|to-?do|assign(?:ee|ed)?|due\s*date|due|complete[ds]?|mark(?: as)? (?:done|todo)|backlog|ticket)\b/i,
    projects:
        /\b(project|projects|board|column|stack|kanban|lane|pipeline|milestone)\b/i,
    notepads: /\b(note|notes|notepad|notepads|doc|document(?!ation)|memo)\b/i,
    calendar:
        /\b(calendar|event|events|meeting|meetings|schedule[ds]?|appointment|today'?s schedule|this week)\b/i,
    org: /\b(compan(?:y|ies)|org|organi[sz]ation|tag|tags|label|labels|bookmark|bookmarks|pinned)\b/i,
};

/**
 * Route → default topics. When the user is already looking at a domain, we
 * assume the follow-up relates to it even when no keyword is present
 * ("delete this" on a task route means tasks).
 *
 * Keys match `AiChatClientRoutePayload.section` values produced by the client
 * (see `parseClientRoute`).
 */
const ROUTE_TOPICS: Record<string, PromptTopic[]> = {
    inbox: ["tasks"],
    mytasks: ["tasks"],
    tasks: ["tasks"],
    project: ["tasks", "projects"],
    people: ["org"],
    person: [],
    company: ["org"],
    calendar: ["calendar"],
    notepad: ["notepads"],
    reports: ["tasks"],
    bookmarks: ["org"],
    home: [],
};

export type PromptContextInputs = {
    newUserMessage: string;
    history?: AiChatClientMessage[];
    parsedRoute?: ParsedClientRoute | null;
    /** Routing section (e.g. `"project"`, `"mytasks"`). */
    routeSection?: string;
};

export type PromptContextSelection = {
    topics: PromptTopic[];
    /** Names of tools to expose this turn (core ∪ selected topic tools). */
    allowedTools: string[];
    /** Ordered list of prompt template names to concatenate (core first). */
    promptFragments: string[];
    /** Debug: which signals voted for each topic. Handy in logs and tests. */
    reasons: Record<string, string[]>;
};

function matchKeywords(text: string): { topic: PromptTopic; matched: string }[] {
    const hits: { topic: PromptTopic; matched: string }[] = [];
    for (const topic of PROMPT_TOPICS) {
        const m = text.match(TOPIC_KEYWORDS[topic]);
        if (m) {
            hits.push({ topic, matched: m[0] });
        }
    }
    return hits;
}

function stickyTopicsFromHistory(history: AiChatClientMessage[]): PromptTopic[] {
    // Look at the last 3 turns (user+assistant combined text). Short window so
    // stale intent doesn't dominate — if the user changes topic, one fresh
    // keyword-free turn drops the old sticky topic.
    const tail = history.slice(-3).map(m => m.content).join("\n");
    if (!tail.trim()) {
        return [];
    }
    return matchKeywords(tail).map(h => h.topic);
}

function uniq<T>(values: readonly T[]): T[] {
    return Array.from(new Set(values));
}

/**
 * Pick the active topics + the tool + prompt-fragment sets for this turn.
 *
 * Always include the `system-core.md` fragment. When no topic signal fires
 * we default to `tasks` — most Stacks traffic is task-management and the
 * core tools can also answer pure navigation / identity questions, so this
 * is a safe fallback (vs. enabling nothing and getting stuck).
 */
export function selectPromptContext(
    inputs: PromptContextInputs
): PromptContextSelection {
    const reasons: Record<string, string[]> = {};
    const activate = (topic: PromptTopic, reason: string) => {
        (reasons[topic] ??= []).push(reason);
    };

    const messageHits = matchKeywords(inputs.newUserMessage ?? "");
    for (const hit of messageHits) {
        activate(hit.topic, `message keyword "${hit.matched}"`);
    }

    const section = (inputs.routeSection ?? "").trim();
    const routeTopics = section ? ROUTE_TOPICS[section] ?? [] : [];
    for (const topic of routeTopics) {
        activate(topic, `route section "${section}"`);
    }

    // ParsedClientRoute may carry ids even when the section alone isn't in
    // ROUTE_TOPICS (e.g. a company profile under `people`). Use them as
    // secondary signals.
    const parsed = inputs.parsedRoute;
    if (parsed) {
        if (parsed.projectId) {
            activate("tasks", "route projectId present");
            activate("projects", "route projectId present");
        }
        if (parsed.taskId) {
            activate("tasks", "route taskId present");
        }
        if (parsed.notepadId) {
            activate("notepads", "route notepadId present");
        }
        if (parsed.companyId) {
            activate("org", "route companyId present");
        }
        if (parsed.reportType) {
            activate("tasks", "reports view implies tasks");
        }
    }

    const stickyTopics = stickyTopicsFromHistory(inputs.history ?? []);
    for (const topic of stickyTopics) {
        // Only add stickiness if the topic isn't already a primary match.
        // This is purely additive — sticky topics never override anything.
        activate(topic, "sticky from recent chat");
    }

    let topics = PROMPT_TOPICS.filter(t => reasons[t] && reasons[t].length > 0);

    if (topics.length === 0) {
        topics = ["tasks"];
        reasons.tasks = ["default fallback"];
    }

    const toolSet = new Set<string>(CORE_TOOLS);
    for (const topic of topics) {
        for (const tool of TOPIC_TOOLS[topic]) {
            toolSet.add(tool);
        }
    }

    const promptFragments = ["system-core.md", ...topics.map(t => `system-${t}.md`)];

    return {
        topics: uniq(topics),
        allowedTools: Array.from(toolSet),
        promptFragments,
        reasons,
    };
}
