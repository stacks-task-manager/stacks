import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Preferences from "../../pages/preferences";

const BOOLEAN_SETTINGS: Array<{ tab: string; settings: string[] }> = [
    {
        tab: "General",
        settings: ["hideScrollbars", "showAnimations", "saveHomeToWorkspace"],
    },
    {
        tab: "Calendar",
        settings: ["show24Hours", "calendarShowAllEvents"],
    },
    {
        tab: "Board",
        settings: [
            "hideNewStack",
            "showStackProgress",
            "highlightStack",
            "showLargeStacks",
            "stacksBackground",
            "biggerStackHeader",
            "stackLazyLoad",
            "highlightTask",
            "showProgress",
            "showDescription",
            "showPriority",
            "showExtendedStatus",
            "showAssignees",
            "showDates",
            "showSubtasks",
            "showComments",
            "showNotifications",
        ],
    },
    {
        tab: "Tasks",
        settings: ["fixedCoverHeight", "taskLazyLoad"],
    },
    {
        tab: "Task details",
        settings: [
            "taskDetailsAttachments",
            "taskDetailsSubtasks",
            "taskDetailsDependencies",
            "taskDetailsLocations",
            "taskDetailsLinks",
            "taskDetailsTime",
            "taskDetailsComments",
            "taskDetailsShowCompletedSubtasks",
        ],
    },
    {
        tab: "Notepads",
        settings: ["notepadFixWidth", "notepadSpellCheck"],
    },
    {
        tab: "People",
        settings: ["peopleEmbeddedPerson", "peopleEmbeddedCompany"],
    },
    {
        tab: "Sidebar",
        settings: ["hideGeneral"],
    },
    {
        tab: "Notifications & Sound",
        settings: ["showAnnouncements", "sounds"],
    },
];

test.describe("Preferences", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let preferences: Preferences;
    let originalPreferences: Record<string, unknown>;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        preferences = new Preferences(page);
    });

    test.beforeEach(async ({ attachVideoContext }: any) => {
        attachVideoContext(context);
        originalPreferences = await preferences.snapshotPreferences();
    });

    test.afterEach(async () => {
        await preferences.restorePreferences(originalPreferences);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("toggles every independent boolean option and persists its value", async () => {
        for (const group of BOOLEAN_SETTINGS) {
            for (const setting of group.settings) {
                await test.step(`${group.tab}: ${setting}`, async () => {
                    const originalValue = Boolean(originalPreferences[setting]);
                    await preferences.setPref(setting, !originalValue);
                    await preferences.setPref(setting, originalValue);
                });
            }
        }
    });

    test("toggles conditional project options", async () => {
        await preferences.setPref("dialogTask", false);
        await preferences.setPref("embeddedTask", true);
        await preferences.setPref("embeddedTask", false);

        await preferences.setPref("embeddedTask", true);
        await preferences.setPref("clickOutsideClose", !Boolean(originalPreferences.clickOutsideClose));

        await preferences.setPref("highlightTask", true);
        await preferences.setPref("clickSelectTask", !Boolean(originalPreferences.clickSelectTask));

        await preferences.setPref("showPriority", true);
        await preferences.setPref("showExtendedPriority", !Boolean(originalPreferences.showExtendedPriority));

        await preferences.setPref("dialogTask", true);
    });

    test("applies app-level visual preferences", async () => {
        await preferences.setPref("hideScrollbars", true);
        await preferences.expectBodyClass("no-scrollbars", true);

        await preferences.setPref("hideScrollbars", false);
        await preferences.expectBodyClass("no-scrollbars", false);

        await preferences.setPref("darkMode", true);
        await preferences.expectBodyClass("bp6-dark", true);

        await preferences.setPref("darkMode", false);
        await preferences.expectBodyClass("bp6-dark", false);
    });

    test("changes and persists the default calendar view", async () => {
        const originalView = String(originalPreferences.calendarDefaultView ?? "month");
        const changedView = originalView === "day" ? "month" : "day";

        await preferences.setPref("calendarDefaultView", changedView);
        await preferences.setPref("calendarDefaultView", originalView);
    });
});
