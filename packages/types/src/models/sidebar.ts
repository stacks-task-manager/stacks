// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { APPICONS } from "./icons.js";

export enum SIDEBARITEMS {
    HOME = "home",
    INBOX = "inbox",
    PEOPLE = "people",
    BOOKMARKS = "bookmarks",
    JUMPTO = "jumpto",
    CALENDAR = "calendar",
    MYTASKS = "mytasks",
    REPORTS = "reports",
}

export type ISidebarTypeKeys = SIDEBARITEMS;
export type ISidebarIcon = {
    [key in ISidebarTypeKeys]: string;
};

export const SIDEBARICON: ISidebarIcon = {
    home: "home",
    inbox: APPICONS.INBOX,
    people: APPICONS.PEOPLE,
    bookmarks: APPICONS.BOOKMARK,
    jumpto: "zap-fast",
    calendar: "calendar-date",
    mytasks: "check-circle",
    // planner: "calendar-minus-01",
    reports: APPICONS.REPORTS,
};
