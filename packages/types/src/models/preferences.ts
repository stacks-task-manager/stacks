// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { SIDEBARITEMS } from "./sidebar.js";
import { TASKDETAILMATRIX } from "./task.js";

export interface IPreferences {
    // Projects

    // Stacks
    showStackProgress: boolean;
    showLargeStacks: boolean;
    biggerStackHeader: boolean;
    stacksBackground: boolean;
    stackLazyLoad: boolean;

    // Tasks
    collapseLongTaks: boolean;
    fixedCoverHeight: boolean;
    taskCopyFormat: string;
    taskFormatSeparator: string;
    taskLazyLoad: boolean;
    dialogTask: boolean;
    embeddedTask: boolean;
    clickOutsideClose: boolean;

    // Board
    highlightTask: boolean;
    highlightStack: boolean;
    clickSelectTask: boolean;
    showPriority: boolean;
    showExtendedPriority: boolean;
    showAssignees: boolean;
    showDates: boolean;
    showTags: boolean;
    showStatus: boolean;
    showState: boolean;
    showComments: boolean;
    showSubtasks: boolean;
    showRepeats: boolean;
    showProgress: boolean;
    showNotifications: boolean;
    showExtendedStatus: boolean;
    showDescription: boolean;

    // Calendar
    calendarDefaultView: "month" | "week" | "day" | "agenda";
    show24Hours: boolean;
    calendarShowAllEvents: boolean;

    // Interface
    darkMode: boolean;
    hideNewStack: boolean;
    hideScrollbars: boolean;
    showAnimations: boolean;

    // Sounds
    sounds: boolean;

    // Locale
    dateLocale: string;
    timezone: string;
    forceWeekMonday: boolean;

    // Noatepad
    notepadFixWidth: boolean;
    notepadSpellCheck: boolean;

    // People
    peopleEmbeddedPerson: boolean;
    peopleEmbeddedCompany: boolean;

    // Notifications
    showAnnouncements: boolean;

    // Task Details
    taskDetailsMatrix: (TASKDETAILMATRIX | undefined)[];
    taskDetailsRows: TASKDETAILMATRIX[];
    taskDetailsComments: boolean;
    taskDetailsSubtasks: boolean;
    taskDetailsLocations: boolean;
    taskDetailsLinks: boolean;
    taskDetailsTime: boolean;
    taskDetailsAttachments: boolean;
    taskDetailsShowCompletedSubtasks: boolean;
    taskDetailsDependencies: boolean;

    // Sidebar
    pinnedItems: SIDEBARITEMS[];
    hideGeneral: boolean;

    // Home
    saveHomeToWorkspace: boolean;

    /** Per-project (or `mytasks` / `inbox`) saved filter presets */
    savedFilters: Record<string, unknown>;
}
