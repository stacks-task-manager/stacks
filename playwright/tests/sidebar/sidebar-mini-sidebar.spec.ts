import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import App from "../../pages/app";
import Auth from "../../pages/auth";
import Preferences from "../../pages/preferences";

test.describe("Sidebar - Mini Sidebar", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let app: App;
    let auth: Auth;
    let preferences: Preferences;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        app = new App(page);
        auth = new Auth(page);
        preferences = new Preferences(page);
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

    test("Should show the profile menu context when clicked", async () => {
        await app.profileButton.click();
        await expect(app.profileMenu).toBeVisible();

        const menuItems = app.profileMenu.getByRole("menuitem");
        const menuItemLabels = await menuItems.allTextContents();
        await expect(menuItemLabels).toEqual(["Edit profile...", "Log out"]);
    });

    test("Should show the help menu when clicked", async () => {
        await app.helpButton.click();
        await expect(app.helpMenu).toBeVisible();

        const menuItems = app.helpMenu.getByRole("menuitem");
        const menuItemLabels = await menuItems.allTextContents();
        await expect(menuItemLabels).toEqual([
            "Help docs",
            "Support center",
            "Keyboard shortcuts",
            "What's new",
        ]);
    });

    test("Should show the preferences dialog when clicked", async () => {
        await preferences.preferencesButton.click();
        await expect(preferences.preferencesDialog).toBeVisible();
        // close the dialog
        await preferences.preferencesDialog.getByRole("button", { name: "Close" }).click();
    });

    test("Should show the search when clicked", async () => {
        await app.globalSearchButton.click();
        await expect(app.globalSearchDialog).toBeVisible();
        await page.click("body");
        await expect(app.globalSearchDialog).toBeHidden();
    });

    test("Should logout from the profile menu", async () => {
        await app.profileButton.click();
        await app.profileMenu.getByRole("menuitem", { name: "Log out" }).click({ force: true });
        await auth.loginCard.waitFor({ state: "visible" });
        await expect(auth.loginCard).toBeVisible();
    });

    // test to check if the connection state is connected
});
