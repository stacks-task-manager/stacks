// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Full user UI preferences blob persisted via PATCH `/api/preferences`.
 */
import { z } from "zod/v4";

/** Every toggle and layout key the SPA persists for the signed-in user. */
export const PreferencesSchema = z.object({
    // Projects

    // Stacks
    showStackProgress: z.boolean(),
    showLargeStacks: z.boolean(),
    biggerStackHeader: z.boolean(),
    stacksBackground: z.boolean(),
    stackLazyLoad: z.boolean(),

    // Tasks
    collapseLongTaks: z.boolean(),
    fixedCoverHeight: z.boolean(),
    taskCopyFormat: z.string(),
    taskFormatSeparator: z.string(),
    taskLazyLoad: z.boolean(),
    dialogTask: z.boolean(),
    embeddedTask: z.boolean(),
    clickOutsideClose: z.boolean(),

    // Board
    highlightTask: z.boolean(),
    highlightStack: z.boolean(),
    clickSelectTask: z.boolean(),
    showPriority: z.boolean(),
    showExtendedPriority: z.boolean(),
    showAssignees: z.boolean(),
    showDates: z.boolean(),
    showTags: z.boolean(),
    showStatus: z.boolean(),
    showState: z.boolean(),
    showComments: z.boolean(),
    showSubtasks: z.boolean(),
    showRepeats: z.boolean(),
    showProgress: z.boolean(),
    showNotifications: z.boolean(),
    showExtendedStatus: z.boolean(),
    showDescription: z.boolean(),

    // Calendar
    calendarDefaultView: z.enum(["month", "week", "day", "agenda"]),
    show24Hours: z.boolean(),
    calendarShowAllEvents: z.boolean(),

    // Interface
    darkMode: z.boolean(),
    hideNewStack: z.boolean(),
    hideScrollbars: z.boolean(),
    showAnimations: z.boolean(),

    // Sounds
    sounds: z.boolean(),

    // Locale
    dateLocale: z.string(),
    timezone: z.string(),
    forceWeekMonday: z.boolean(),

    // Noatepad
    notepadFixWidth: z.boolean(),
    notepadSpellCheck: z.boolean(),

    // People
    peopleEmbeddedPerson: z.boolean(),
    peopleEmbeddedCompany: z.boolean(),

    // Notifications
    showAnnouncements: z.boolean(),

    // Task Details
    taskDetailsMatrix: z.json(),
    taskDetailsRows: z.json(),
    taskDetailsComments: z.boolean(),
    taskDetailsSubtasks: z.boolean(),
    taskDetailsLocations: z.boolean(),
    taskDetailsLinks: z.boolean(),
    taskDetailsTime: z.boolean(),
    taskDetailsAttachments: z.boolean(),
    taskDetailsShowCompletedSubtasks: z.boolean(),
    taskDetailsDependencies: z.boolean(),

    // Sidebar
    pinnedItems: z.json(),
    hideGeneral: z.boolean(),

    // Home
    saveHomeToWorkspace: z.boolean(),

    savedFilters: z.record(z.string(), z.json()),
});
