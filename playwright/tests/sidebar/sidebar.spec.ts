import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Sidebar from "../../pages/sidebar";
import { metaOrControl } from "../../utils";

test.describe("Sidebar", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let sidebar: Sidebar;

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        sidebar = new Sidebar(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }

        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    });

    test("Should toggle sidebar", async () => {
        await test.step("sidebar is open and will close it via the button", async () => {
            await expect(sidebar.sidebar).not.toHaveClass(/closed/);
            await sidebar.toggleButton.click();
            await expect(sidebar.sidebar).toHaveClass(/closed/);
        });

        await test.step("sidebar is closed and will open via the button", async () => {
            await sidebar.toggleButton.click();
            await expect(sidebar.sidebar).not.toHaveClass(/closed/);
        });

        await test.step("sidebar is open close it with hotkey", async () => {
            await page.keyboard.press(`${metaOrControl}+b`);
            await expect(sidebar.sidebar).toHaveClass(/closed/);
        });

        await test.step("sidebar is closed open it with hotkey", async () => {
            await page.keyboard.press(`${metaOrControl}+b`);
            await expect(sidebar.sidebar).not.toHaveClass(/closed/);
        });
    });

    test("Should have the following General menu items", async () => {
        await expect(sidebar.pinnedItemsWrapper).toBeVisible();
        const labels = await sidebar.pinnedItems.allTextContents();
        await expect(labels).toEqual([
            "Home",
            expect.stringMatching(/^People/),
            "Inbox",
            "Bookmarks",
            "Jump to",
        ]);
        await expect(sidebar.moreButton).toBeVisible();

        // click the more menu to show the unpinned buttons
        await sidebar.moreButton.click();
        await expect(sidebar.moreMenu).toBeVisible();

        const menuItems = sidebar.moreMenu.getByRole("menuitem");
        const menuItemLabels = await menuItems.allTextContents();
        await expect(menuItemLabels).toEqual(["Calendar", "My tasks", "Reports", "Manage pinned items..."]);
    });

    /*
        Should pin menu items
        Should go to the general sections using click or hotkey
    */
});
