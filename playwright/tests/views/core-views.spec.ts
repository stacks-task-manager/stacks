import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import CoreViews from "../../pages/coreViews";

test.describe("Core views", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let views: CoreViews;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        views = new CoreViews(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("opens previously untested routed views", async () => {
        await views.open("home");
        await views.open("inbox");
        await views.open("bookmarks");
        await views.open("my-tasks");
        await views.open("reports");
        await views.open("tasks");
    });
});
