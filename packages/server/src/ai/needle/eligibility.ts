// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Explicit calendar subjects constrain destructive calls before model routing. */
export function eligibleNeedleTools(names: string[], message: string): string[] {
    const text = message.replace(/"[^"\n]*"|'[^'\n]*'/g, "");
    if (
        /^(?:please\s+)?(?:open|go to|show)\s+(?:my\s+tasks|home|inbox|calendar|bookmarks|people|reports)[.!]?$/i.test(
            text.trim()
        )
    )
        return names.filter(name => name === "navigate");
    const calendarOnly =
        /\bcalendars?\b/i.test(text) &&
        !/\b(event|events|meeting|meetings|appointment|appointments)\b/i.test(text);
    const verbs = new Set<string>();
    if (/\b(create|add|new)\b/i.test(text)) verbs.add("create");
    if (/\b(delete|remove)\b/i.test(text)) verbs.add("delete");
    if (/\b(move|drag)\b/i.test(text)) verbs.add("move");
    if (/\b(update|change|rename|mark|complete|finish|assign|set|clear)\b/i.test(text)) verbs.add("update");
    const creationTargets = new Set<string>();
    const deletionTargets = new Set<string>();
    const createTools: Record<string, string> = {
        task: "createTask",
        column: "createStack",
        stack: "createStack",
        project: "createProject",
        calendar: "createLocalCalendar",
        event: "createCalendarEvent",
        meeting: "createCalendarEvent",
    };
    for (const match of text.matchAll(
        /\b(?:create|add|new)\s+(?:(?:a|an|the|new|another)\s+)*(task|column|stack|project|calendar|event|meeting)\b/gi
    ))
        creationTargets.add(createTools[match[1].toLowerCase()]);
    const deleteTools: Record<string, string> = {
        task: "deleteTask",
        column: "deleteStack",
        stack: "deleteStack",
        calendar: "deleteLocalCalendar",
        event: "deleteCalendarEvent",
        meeting: "deleteCalendarEvent",
    };
    for (const match of text.matchAll(
        /\b(?:delete|remove)\s+(?:(?:the|a|an)\s+)*(task|column|stack|calendar|event|meeting)\b/gi
    ))
        deletionTargets.add(deleteTools[match[1].toLowerCase()]);
    return names.filter(name => {
        if (name.startsWith("create") && creationTargets.size && !creationTargets.has(name)) return false;
        if (name.startsWith("delete") && deletionTargets.size && !deletionTargets.has(name)) return false;
        const operation = /^(create|delete|move|update)/.exec(name)?.[1];
        if (operation && verbs.size && !verbs.has(operation)) return false;
        if (operation && calendarOnly && /CalendarEvent/.test(name)) return false;
        return true;
    });
}
