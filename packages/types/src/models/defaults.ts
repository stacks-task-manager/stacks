// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPreferences } from "./preferences.js";
import { SIDEBARITEMS } from "./sidebar.js";
import { TASKDETAILMATRIX } from "./task.js";

export const defaultPreferences: IPreferences = {
    // Projects

    // Stacks
    showStackProgress: false,
    showLargeStacks: false,
    biggerStackHeader: false,
    stacksBackground: false,
    stackLazyLoad: true,

    // Tasks
    collapseLongTaks: false,
    fixedCoverHeight: true,
    taskCopyFormat: "{{title}} - {{description}}",
    taskFormatSeparator: ", ",
    taskLazyLoad: true,
    dialogTask: false,
    embeddedTask: false,
    clickOutsideClose: true,

    // Board
    highlightTask: true,
    highlightStack: true,
    clickSelectTask: true,
    showPriority: true,
    showExtendedPriority: false,
    showAssignees: true,
    showDates: true,
    showTags: true,
    showStatus: true,
    showState: true,
    showComments: true,
    showSubtasks: true,
    showRepeats: true,
    showProgress: true,
    showNotifications: true,
    showExtendedStatus: false,
    showDescription: false,

    // Calendar
    calendarDefaultView: "month",
    show24Hours: false,
    calendarShowAllEvents: false,

    // Interface
    darkMode: false,
    hideNewStack: false,
    hideScrollbars: false,
    showAnimations: true,

    // Sounds
    sounds: true,

    // Locale:
    dateLocale: "en-US",
    timezone: "UTC",
    forceWeekMonday: false,

    // Notepad
    notepadFixWidth: true,
    notepadSpellCheck: true,

    // People
    peopleEmbeddedPerson: false,
    peopleEmbeddedCompany: false,

    // Notifications
    showAnnouncements: true,

    // Task Details
    taskDetailsMatrix: [
        TASKDETAILMATRIX.ASSIGNEES,
        TASKDETAILMATRIX.PRIORITY,
        TASKDETAILMATRIX.STATUS,
        TASKDETAILMATRIX.STARTDATE,
        TASKDETAILMATRIX.DUEDATE,
        TASKDETAILMATRIX.REPEATS,
    ],
    taskDetailsRows: [
        TASKDETAILMATRIX.TAGS,
        TASKDETAILMATRIX.ESTIMATE,
        TASKDETAILMATRIX.TIMESPENT,
        TASKDETAILMATRIX.PROJECTS,
        TASKDETAILMATRIX.STACK,
    ],
    taskDetailsComments: true,
    taskDetailsSubtasks: true,
    taskDetailsLocations: true,
    taskDetailsLinks: true,
    taskDetailsTime: true,
    taskDetailsAttachments: true,
    taskDetailsShowCompletedSubtasks: true,
    taskDetailsDependencies: true,

    // Sidebar
    pinnedItems: [
        SIDEBARITEMS.HOME,
        SIDEBARITEMS.PEOPLE,
        SIDEBARITEMS.INBOX,
        SIDEBARITEMS.BOOKMARKS,
        SIDEBARITEMS.JUMPTO,
    ],
    hideGeneral: false,

    // Home
    saveHomeToWorkspace: false,

    savedFilters: {},
};
