// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Strict `translate()` keys for dynamic UI (maps enum/id → i18n message id). Values resolve at access time so boot can call `setTranslations` first. */

import { translate } from "@stacks/translations";
import { PeopleViewType } from "app/store/people";

function translatedRecord<K extends PropertyKey>(msgIds: Record<K, string>): Record<K, string> {
    const out = {} as Record<K, string>;
    for (const key of Reflect.ownKeys(msgIds) as K[]) {
        const msgId = msgIds[key];
        Object.defineProperty(out, key, {
            enumerable: true,
            configurable: true,
            get() {
                return translate(msgId);
            },
        });
    }
    return out;
}

export const PEOPLE_VIEW_TYPE_LABELS: Record<PeopleViewType, string> = translatedRecord({
    contacts: "Contacts",
    companies: "Companies",
    roles: "Roles",
    timesheet: "My Timesheet",
    approvals: "Approvals",
    workload: "Workload",
});

export const PROJECT_VIEWS_LABELS: Record<string, string> = translatedRecord({
    attachments: "Attachments",
    board: "Board",
    default: "Last used view",
    gantt: "Gantt",
    links: "Links",
    list: "List",
    notes: "Notes",
    overview: "Overview",
    table: "Table",
    time: "Time",
    world: "World",
});

export const TASK_PRIORITY: Record<string, string> = translatedRecord({
    all: "All priorities",
    critical: "Critical",
    high: "High",
    low: "Low",
    medium: "Medium",
    none: "None",
});

export const TASK_STACK_CHART_LABELS: Record<string, string> = translatedRecord({
    estimated: "Estimated",
    spent: "Spent",
    remaining: "Remaining",
});

export const AUTOMATION_EVENT_LABELS: Record<string, string> = translatedRecord({
    archived: "archived",
    created: "created",
    do: "do",
    done: "completed",
    move: "moved",
    moved: "moved",
    overdue: "overdue",
    started: "started",
    todo: "incomplete",
});

export const SIDEBAR_MENU_LABELS: Record<string, string> = translatedRecord({
    home: "Home",
    inbox: "Inbox",
    people: "People",
    bookmarks: "Bookmarks",
    jumpto: "Jump to",
    calendar: "Calendar",
    mytasks: "My tasks",
    reports: "Reports",
});

/** Project table grouping (GROUPING_TYPE string values) */
export const TABLE_GROUPING_LABEL_LABELS: Record<string, string> = translatedRecord({
    ungrouped: "Ungrouped",
    stack: "Stack",
    startdate: "Start date",
    duedate: "Due date",
    priority: "Priority",
    people: "People",
});

export const FIELD_TYPE_LABELS: Record<string, string> = translatedRecord({
    checkboxes: "Checkboxes",
    date: "Date",
    dropdown: "Dropdown",
    number: "Number",
    radio: "Radio",
    slider: "Slider",
    switch: "Switch",
    text: "Text",
    textarea: "Text area",
    url: "URL",
});

export const PEOPLE_TITLE_LABELS: Record<string, string> = translatedRecord({
    "title-add": "Add custom field",
    "title-edit": "Edit custom field",
    "title-dr": "Dr",
    "title-jr": "Jr",
    "title-miss": "Miss",
    "title-mr": "Mr",
    "title-mrs": "Mrs",
    "title-ms": "Ms",
    "title-none": "None",
    "title-prof": "Prof",
    "title-rev": "Rev",
    "title-sr": "Sr",
});

export const AUTOMATIONS_DO_LABELS = translatedRecord({
    addstatus: "Add status",
    addtag: "Add tag",
    archive: "Archive task",
    assign: "Assign person",
    dodate: "Set do date",
    done: "Mark as done",
    duedate: "Set due date",
    move: "Move",
    progress: "Set progress",
    removealltags: "Remove all tags",
    removestatus: "Remove status",
    removetag: "Remove tags",
    startdate: "Set start date",
    todo: "Mark as to do",
    unassign: "Unassign person",
    unassignall: "Unassign all",
});

export const DATES_LABELS = translatedRecord({
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    thisWeek: "This week",
    lastWeek: "Last week",
    nextWeek: "Next week",
    thisMonth: "This month",
    lastMonth: "Last month",
    nextMonth: "Next month",
});

/** Tooltip / menu label: completed task → "Mark as to do", else → "Mark as done". */
export function taskToggleDoneLabel(done: boolean): string {
    return done ? translate("Mark as to do") : translate("Mark as done");
}

/** Bookmark group headings by `RECORDTYPE` / grouped key (see bookmarks.type-* in en.json). */
export const BOOKMARK_TYPE_LABELS: Record<string, string> = translatedRecord({
    company: "Companies",
    notepad: "Notepads",
    person: "People",
    pinned: "Pinned bookmarks",
    project: "Projects",
    task: "Tasks",
    url: "Links",
});

export const PEOPLE_GENDER_LABELS: Record<string, string> = translatedRecord({
    male: "Male",
    female: "Female",
    other: "Other",
});

export const PIE_SEGMENT_SPENT_REMAINING: Record<"spent" | "remaining", string> = translatedRecord({
    spent: "Spent",
    remaining: "Remaining",
});

export const BOARD_COUNT_STATUS_LABELS: Record<"idle" | "doing" | "done", string> = translatedRecord({
    idle: "Idle",
    doing: "Doing",
    done: "Done",
});
