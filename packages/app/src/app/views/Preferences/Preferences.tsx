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
            <div className={Classes.DIALOG_BODY}>
                <Tabs
                    // id="preferences-tabs"
                    // className="custom-tabs"
                    className="settings"
                    selectedTabId={currentTab}
                    vertical
                    onChange={(currentTab: string) => setCurrentTab(currentTab)}
                >
                    <SettingsTabSection title={translate("App")} icon={<Dashboard />} />
                    <Tab id="app" title={translate("General")} panel={<AppPanel {...panelProps} />} />
                    <Tab
                        id="calendar"
                        title={translate("Calendar")}
                        panel={<CalendarPanel {...panelProps} />}
                    />

                    <SettingsTabSection title={translate("Projects")} icon={<Briefcase />} />
                    <Tab
                        id="projects"
                        title={translate("General")}
                        panel={<ProjectsGeneralPanel {...panelProps} />}
                    />
                    <Tab id="board" title={translate("Board")} panel={<ProjectsPanel {...panelProps} />} />
                    <Tab
                        id="projects-tasks"
                        title={translate("Tasks")}
                        panel={<TasksPanel {...panelProps} />}
                    />
                    <Tab
                        id="projects-tasksdetails"
                        title={translate("Task details")}
                        panel={<TaskDetailsPanel {...panelProps} />}
                    />

                    <SettingsTabSection title="Notepad & People" icon={<Book />} />
                    <Tab
                        id="notepad"
                        title={translate("Notepads")}
                        panel={<NotepadPanel {...panelProps} />}
                    />
                    {/* <Tab id="goal" title="Goal" panel={<span />} /> */}
                    {/* <Tab id="keep" title="Keep" panel={<span />} /> */}
                    <Tab id="people" title={translate("People")} panel={<PeoplePanel {...panelProps} />} />

                    <SettingsTabSection title={translate("Look feel")} icon={<Notifications />} />
                    <Tab id="sidebar" title={translate("Sidebar")} panel={<SidebarPanel {...panelProps} />} />
                    <Tab
                        id="notifications"
                        title="Notifications & Sound"
                        panel={<NotificationsPanel {...panelProps} />}
                    />
                    <Tab id="themes" title={translate("Themes")} panel={<ThemesPanel {...panelProps} />} />

                    {/* <Tabs.Expander /> */}
                    <SettingsTabSection title="Other" icon={<Lifesaver />} />

                    <Tab id="about" title={translate("About")} panel={<AboutPanel {...panelProps} />} />
                </Tabs>
            </div>
        </Dialog>
    );
};
