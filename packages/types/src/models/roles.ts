// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommon } from "./common";

export enum ROLE_ACTIONS {
    WRITE = "write",
    READ = "read",
}

export interface IRoleActions {
    [ROLE_ACTIONS.WRITE]?: boolean;
    [ROLE_ACTIONS.READ]?: boolean;
}

export enum ROLE_SECTIONS {
    REPORTS = "reports",
    PEOPLE = "people",
    COMPANIES = "companies",
    CALENDAR = "calendar",
    COMMENTS = "comments",
    PROJECT_SETTINGS = "project_settings",
    TIMELOGS = "timelogs",
    ROLES = "roles",
}

export const ROLE_ICONS: Partial<Record<ROLE_SECTIONS, string>> = {
    [ROLE_SECTIONS.REPORTS]: "line-chart-up",
    [ROLE_SECTIONS.PEOPLE]: "users",
    [ROLE_SECTIONS.COMPANIES]: "building-07",
    [ROLE_SECTIONS.CALENDAR]: "calendar-date",
    [ROLE_SECTIONS.COMMENTS]: "message-chat-square",
    [ROLE_SECTIONS.PROJECT_SETTINGS]: "settings-02",
    [ROLE_SECTIONS.TIMELOGS]: "clock-stopwatch",
    [ROLE_SECTIONS.ROLES]: "user-square",
};

export type IRoleAccess = Partial<Record<ROLE_SECTIONS, IRoleActions>>;

export interface IRole extends ICommon {
    title: string;
    access: IRoleAccess;
    description?: string;
    deletedBy: string;
}
