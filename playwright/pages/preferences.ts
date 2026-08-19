import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

const TAB_IDS: Record<string, string> = {
    General: "app",
    Calendar: "calendar",
    Projects: "projects",
    Board: "board",
    Tasks: "projects-tasks",
    "Task details": "projects-tasksdetails",
    Notepads: "notepad",
    People: "people",
    Sidebar: "sidebar",
    "Notifications & Sound": "notifications",
    Themes: "themes",
    About: "about",
};

const SETTING_IDS: Record<string, string> = {
    "Hide scrollbars": "hide-scrollbars",
    "Show animations": "show-animations",
    "Save home data in your workspace": "save-home-to-workspace",
    "Use a 24 hour clock": "show-24-hours",
    "Show all events in the monthly view": "calendar-show-all-events",
    "Show task details as a dialog window": "dialog-task",
    "Use side-by-side task details": "embedded-task",
    "Click outside of task detail to close": "click-outside-close",
    "Hide new stack button": "hide-new-stack",
    "Show stack progress": "show-stack-progress",
    "Highlight selected stack": "highlight-stack",
    "Show larger stacks": "show-large-stacks",
    "Enable columns background": "stacks-background",
    "Show larger Stack tint bar": "bigger-stack-header",
    "Lazy load stacks": "stack-lazy-load",
    "Highlight selected task": "highlight-task",
    "Click to select tasks": "click-select-task",
    "Show progress": "show-progress",
    "Show description": "show-description",
    "Show priority": "show-priority",
    "Show verbose priority": "show-extended-priority",
    "Show verbose status": "show-extended-status",
    "Show assignees": "show-assignees",
    "Show dates": "show-dates",
    "Show subtasks": "show-subtasks",
    "Show comments counter": "show-comments",
    "Show notifications": "show-notifications",
    "Fixed cover height": "fixed-cover-height",
    "Lazy load tasks": "task-lazy-load",
    "Show attachments": "task-details-attachments",
    "Show dependencies": "task-details-dependencies",
    "Show locations": "task-details-locations",
    "Show links": "task-details-links",
    "Show time entries": "task-details-time",
    "Show comments": "task-details-comments",
    "Show completed subtasks": "task-details-completed-subtasks",
    "Make notepad width fixed": "notepad-fix-width",
    "Enable spell checking": "notepad-spell-check",
    "Use side-by-side person details": "people-embedded-person",
    "Use side-by-side company details": "people-embedded-company",
    "Hide `General` section": "hide-general",
    "Show announcements notifications": "show-announcements",
    "Enable sounds": "sounds",
};

type PreferenceControl = {
    tab: string;
    setting?: string;
    type: "switch" | "select" | "theme";
};

const PREFERENCE_CONTROLS: Record<string, PreferenceControl> = {
    hideScrollbars: { tab: "General", setting: "hide-scrollbars", type: "switch" },
    showAnimations: { tab: "General", setting: "show-animations", type: "switch" },
    saveHomeToWorkspace: { tab: "General", setting: "save-home-to-workspace", type: "switch" },
    show24Hours: { tab: "Calendar", setting: "show-24-hours", type: "switch" },
    calendarDefaultView: { tab: "Calendar", setting: "calendar-default-view", type: "select" },
    calendarShowAllEvents: { tab: "Calendar", setting: "calendar-show-all-events", type: "switch" },
    dialogTask: { tab: "Projects", setting: "dialog-task", type: "switch" },
    embeddedTask: { tab: "Projects", setting: "embedded-task", type: "switch" },
    clickOutsideClose: { tab: "Projects", setting: "click-outside-close", type: "switch" },
    hideNewStack: { tab: "Board", setting: "hide-new-stack", type: "switch" },
    showStackProgress: { tab: "Board", setting: "show-stack-progress", type: "switch" },
    highlightStack: { tab: "Board", setting: "highlight-stack", type: "switch" },
    showLargeStacks: { tab: "Board", setting: "show-large-stacks", type: "switch" },
    stacksBackground: { tab: "Board", setting: "stacks-background", type: "switch" },
    biggerStackHeader: { tab: "Board", setting: "bigger-stack-header", type: "switch" },
    stackLazyLoad: { tab: "Board", setting: "stack-lazy-load", type: "switch" },
    highlightTask: { tab: "Board", setting: "highlight-task", type: "switch" },
    clickSelectTask: { tab: "Board", setting: "click-select-task", type: "switch" },
    showProgress: { tab: "Board", setting: "show-progress", type: "switch" },
    showDescription: { tab: "Board", setting: "show-description", type: "switch" },
    showPriority: { tab: "Board", setting: "show-priority", type: "switch" },
    showExtendedPriority: { tab: "Board", setting: "show-extended-priority", type: "switch" },
    showExtendedStatus: { tab: "Board", setting: "show-extended-status", type: "switch" },
    showAssignees: { tab: "Board", setting: "show-assignees", type: "switch" },
    showDates: { tab: "Board", setting: "show-dates", type: "switch" },
    showSubtasks: { tab: "Board", setting: "show-subtasks", type: "switch" },
    showComments: { tab: "Board", setting: "show-comments", type: "switch" },
    showNotifications: { tab: "Board", setting: "show-notifications", type: "switch" },
    fixedCoverHeight: { tab: "Tasks", setting: "fixed-cover-height", type: "switch" },
    taskLazyLoad: { tab: "Tasks", setting: "task-lazy-load", type: "switch" },
    taskDetailsAttachments: {
        tab: "Task details",
        setting: "task-details-attachments",
        type: "switch",
    },
    taskDetailsSubtasks: { tab: "Task details", setting: "task-details-subtasks", type: "switch" },
    taskDetailsDependencies: {
        tab: "Task details",
        setting: "task-details-dependencies",
        type: "switch",
    },
    taskDetailsLocations: {
        tab: "Task details",
        setting: "task-details-locations",
        type: "switch",
    },
    taskDetailsLinks: { tab: "Task details", setting: "task-details-links", type: "switch" },
    taskDetailsTime: { tab: "Task details", setting: "task-details-time", type: "switch" },
    taskDetailsComments: { tab: "Task details", setting: "task-details-comments", type: "switch" },
    taskDetailsShowCompletedSubtasks: {
        tab: "Task details",
        setting: "task-details-completed-subtasks",
        type: "switch",
    },
    notepadFixWidth: { tab: "Notepads", setting: "notepad-fix-width", type: "switch" },
    notepadSpellCheck: { tab: "Notepads", setting: "notepad-spell-check", type: "switch" },
    peopleEmbeddedPerson: { tab: "People", setting: "people-embedded-person", type: "switch" },
    peopleEmbeddedCompany: { tab: "People", setting: "people-embedded-company", type: "switch" },
    hideGeneral: { tab: "Sidebar", setting: "hide-general", type: "switch" },
    showAnnouncements: { tab: "Notifications & Sound", setting: "show-announcements", type: "switch" },
    sounds: { tab: "Notifications & Sound", setting: "sounds", type: "switch" },
    darkMode: { tab: "Themes", type: "theme" },
};

class Preferences extends Base {
    public preferencesButton: Locator;
    public preferencesDialog: Locator;

    constructor(page: Page) {
        super(page);

        this.preferencesButton = page.getByTestId("preferences-button");
        this.preferencesDialog = page.getByTestId("preferences-dialog");
    }

    public async openPreferences() {
        if (!(await this.preferencesDialog.isVisible())) {
            await this.preferencesButton.click();
        }
        await expect(this.preferencesDialog).toBeVisible();
    }

    public async closePreferences() {
        if (await this.preferencesDialog.isVisible()) {
            await this.page.keyboard.press("Escape");
        }
        await expect(this.preferencesDialog).toBeHidden();
    }

    public getTab(tab: string): Locator {
        return this.page.getByTestId(`preferences-tab-${TAB_IDS[tab] ?? tab}`);
    }

    public getPreferenceRow(setting: string): Locator {
        const settingId = SETTING_IDS[setting] ?? setting;
        return this.page.getByTestId(`preferences-setting-${settingId}`);
    }

    public getPreferenceControl(setting: string): Locator {
        const settingId = SETTING_IDS[setting] ?? setting;
        return this.page.getByTestId(`preferences-setting-${settingId}-control`);
    }

    public async openTab(tab: string) {
        await this.openPreferences();
        await this.getTab(tab).click();
    }

    public async setSwitch(tab: string, setting: string, checked: boolean) {
        await this.openTab(tab);
        const control = this.getPreferenceControl(this.resolveSetting(tab, setting));
        const currentValue = await control.isChecked();

        if (currentValue !== checked) {
            const responsePromise = this.waitForPreferenceUpdate();
            await control.setChecked(checked, { force: true });
            await responsePromise;
        }

        await expect(control).toBeChecked({ checked });
    }

    public async toggleAndRestoreSwitch(tab: string, setting: string) {
        await this.openTab(tab);
        const resolvedSetting = this.resolveSetting(tab, setting);
        const control = this.getPreferenceControl(resolvedSetting);
        const originalValue = await control.isChecked();

        await this.setSwitch(tab, setting, !originalValue);
        await this.closePreferences();
        await this.openTab(tab);
        await expect(this.getPreferenceControl(resolvedSetting)).toBeChecked({ checked: !originalValue });
        await this.setSwitch(tab, resolvedSetting, originalValue);
    }

    public async selectOption(tab: string, setting: string, value: string) {
        await this.openTab(tab);
        const responsePromise = this.waitForPreferenceUpdate();
        await this.getPreferenceControl(setting).selectOption(value);
        await responsePromise;
        await expect(this.getPreferenceControl(setting)).toHaveValue(value);
    }

    public async chooseTheme(theme: "light" | "dark") {
        await this.openTab("Themes");
        const isDark = await this.page.evaluate(() => document.body.classList.contains("bp6-dark"));
        const shouldBeDark = theme === "dark";
        if (isDark !== shouldBeDark) {
            const responsePromise = this.waitForPreferenceUpdate();
            await this.page.getByTestId(`preferences-theme-${theme}`).click();
            await responsePromise;
        }
    }

    public async toggleSetting(tab: string, setting: string, checked: boolean) {
        await this.setSwitch(tab, setting, checked);
        await this.closePreferences();
    }

    public async setPref(key: string, value: boolean | string) {
        const preference = PREFERENCE_CONTROLS[key];
        if (!preference) {
            throw new Error(`Unsupported preference key: ${key}`);
        }

        try {
            if (preference.type === "switch") {
                if (typeof value !== "boolean" || !preference.setting) {
                    throw new Error(`Preference ${key} requires a boolean value`);
                }
                await this.setSwitch(preference.tab, preference.setting, value);
            } else if (preference.type === "select") {
                if (typeof value !== "string" || !preference.setting) {
                    throw new Error(`Preference ${key} requires a string value`);
                }
                await this.selectOption(preference.tab, preference.setting, value);
            } else {
                if (typeof value !== "boolean") {
                    throw new Error(`Preference ${key} requires a boolean value`);
                }
                await this.chooseTheme(value ? "dark" : "light");
            }
        } finally {
            await this.closePreferences();
        }
    }

    public async snapshotPreferences(): Promise<Record<string, unknown>> {
        return this.page.evaluate(async () => {
            const response = await fetch("/api/boot");
            const body = await response.json();
            return (body.data ?? body).preferences;
        });
    }

    public async restorePreferences(preferences: Record<string, unknown>) {
        await this.page.evaluate(async restoredPreferences => {
            await fetch("/api/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(restoredPreferences),
            });
        }, preferences);
        await this.page.reload();
    }

    public async expectBodyClass(className: string, enabled: boolean) {
        await expect
            .poll(() => this.page.evaluate(name => document.body.classList.contains(name), className))
            .toBe(enabled);
    }

    private resolveSetting(tab: string, setting: string) {
        if (tab === "Task details" && setting === "Show subtasks") {
            return "task-details-subtasks";
        }
        return setting;
    }

    private waitForPreferenceUpdate() {
        return this.page.waitForResponse(
            response =>
                response.url().includes("/api/preferences") &&
                response.request().method() === "PATCH" &&
                response.ok()
        );
    }
}

export default Preferences;
