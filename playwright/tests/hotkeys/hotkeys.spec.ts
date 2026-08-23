import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Hotkeys from "../../pages/hotkeys";

test.describe("Keyboard shortcuts", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let hotkeys: Hotkeys;

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });
        hotkeys = new Hotkeys(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("toggles global dialogs and the sidebar", async () => {
        await hotkeys.expectGlobalDialogsAndSidebar();
    });

    test("navigates between core views and browser history", async () => {
        await hotkeys.expectDestinationAndHistoryShortcuts();
    });

    test("changes Calendar views, dates, filters, and sidebar state", async () => {
        await hotkeys.expectCalendarShortcuts();
    });

    test("opens creation dialogs and section filters", async () => {
        await hotkeys.expectCreationAndFilterShortcuts();
    });

    test("moves through and resets People intervals", async () => {
        await hotkeys.expectPeopleIntervalShortcuts();
    });
});
