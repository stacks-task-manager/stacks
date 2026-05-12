// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPreferences } from "@stacks/types";

export interface IPanelInterface {
    preferences: IPreferences;
    onChange: (
        key: keyof IPreferences,
        value: IPreferences[keyof IPreferences],
        callback?: (preferences: IPreferences) => void
    ) => void;
}

export * from "./AppPanel";
export * from "./SidebarPanel";
export * from "./ProjectsPanel";
export * from "./ThemesPanel";
export * from "./NotepadPanel";
export * from "./NotificationsPanel";
export * from "./CalendarPanel";
export * from "./TasksPanel";
export * from "./TaskDetailsPanel";
export * from "./ProjectsGeneral";
