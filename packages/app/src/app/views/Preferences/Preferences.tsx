// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Dialog, Tab, Tabs } from "@blueprintjs/core";
import React, { useState } from "react";
import { GlobalStore, togglePreferences } from "app/store/global";
import { PreferencesStore } from "app/store/preferences";

import { SettingsTabSection } from "app/components/common";
import { useSubscribe } from "app/hooks";
import { IPreferences } from "@stacks/types";
import {
    AppPanel,
    CalendarPanel,
    NotepadPanel,
    NotificationsPanel,
    ProjectsGeneralPanel,
    ProjectsPanel,
    SidebarPanel,
    TaskDetailsPanel,
    TasksPanel,
    ThemesPanel,
} from "./Panels";
import { AboutPanel } from "./Panels/AboutPanel";
import { PeoplePanel } from "./Panels/PeoplePanel";
import { PreferencesActions } from "app/store/actions/preferences";
import { Book, Briefcase, Dashboard, Lifesaver, Notifications } from "@blueprintjs/icons";

export const Preferences = () => {
    const { isPreferencesVisible } = GlobalStore.use();
    const preferences = PreferencesStore.use();
    const [currentTab, setCurrentTab] = useState("app");

    useSubscribe("preferences:tab", tab => {
        setCurrentTab(tab);
    });

    const handleChange = (key: keyof IPreferences, value: IPreferences[keyof IPreferences]) => {
        PreferencesActions.update(key, value);
    };

    const handleClose = () => {
        togglePreferences(false);
    };

    const panelProps = {
        preferences,
        onChange: handleChange,
    };

    return (
        <Dialog
            className="preferences"
            title={translate("Preferences")}
            isOpen={isPreferencesVisible}
            canEscapeKeyClose
            canOutsideClickClose
            style={{ width: 800 }}
            onClose={handleClose}
        >
            <div className={Classes.DIALOG_BODY} data-testid="preferences-dialog">
                <Tabs
                    data-testid="preferences-tabs"
                    // id="preferences-tabs"
                    // className="custom-tabs"
                    className="settings"
                    selectedTabId={currentTab}
                    vertical
                    onChange={(currentTab: string) => setCurrentTab(currentTab)}
                >
                    <SettingsTabSection title={translate("App")} icon={<Dashboard />} />
                    <Tab
                        id="app"
                        data-testid="preferences-tab-app"
                        title={translate("General")}
                        panel={<AppPanel {...panelProps} />}
                    />
                    <Tab
                        id="calendar"
                        data-testid="preferences-tab-calendar"
                        title={translate("Calendar")}
                        panel={<CalendarPanel {...panelProps} />}
                    />

                    <SettingsTabSection title={translate("Projects")} icon={<Briefcase />} />
                    <Tab
                        id="projects"
                        data-testid="preferences-tab-projects"
                        title={translate("General")}
                        panel={<ProjectsGeneralPanel {...panelProps} />}
                    />
                    <Tab
                        id="board"
                        data-testid="preferences-tab-board"
                        title={translate("Board")}
                        panel={<ProjectsPanel {...panelProps} />}
                    />
                    <Tab
                        id="projects-tasks"
                        data-testid="preferences-tab-projects-tasks"
                        title={translate("Tasks")}
                        panel={<TasksPanel {...panelProps} />}
                    />
                    <Tab
                        id="projects-tasksdetails"
                        data-testid="preferences-tab-projects-tasksdetails"
                        title={translate("Task details")}
                        panel={<TaskDetailsPanel {...panelProps} />}
                    />

                    <SettingsTabSection title="Notepad & People" icon={<Book />} />
                    <Tab
                        id="notepad"
                        data-testid="preferences-tab-notepad"
                        title={translate("Notepads")}
                        panel={<NotepadPanel {...panelProps} />}
                    />
                    {/* <Tab id="goal" title="Goal" panel={<span />} /> */}
                    {/* <Tab id="keep" title="Keep" panel={<span />} /> */}
                    <Tab
                        id="people"
                        data-testid="preferences-tab-people"
                        title={translate("People")}
                        panel={<PeoplePanel {...panelProps} />}
                    />

                    <SettingsTabSection title={translate("Look feel")} icon={<Notifications />} />
                    <Tab
                        id="sidebar"
                        data-testid="preferences-tab-sidebar"
                        title={translate("Sidebar")}
                        panel={<SidebarPanel {...panelProps} />}
                    />
                    <Tab
                        id="notifications"
                        data-testid="preferences-tab-notifications"
                        title="Notifications & Sound"
                        panel={<NotificationsPanel {...panelProps} />}
                    />
                    <Tab
                        id="themes"
                        data-testid="preferences-tab-themes"
                        title={translate("Themes")}
                        panel={<ThemesPanel {...panelProps} />}
                    />

                    {/* <Tabs.Expander /> */}
                    <SettingsTabSection title="Other" icon={<Lifesaver />} />

                    <Tab
                        id="about"
                        data-testid="preferences-tab-about"
                        title={translate("About")}
                        panel={<AboutPanel {...panelProps} />}
                    />
                </Tabs>
            </div>
        </Dialog>
    );
};
