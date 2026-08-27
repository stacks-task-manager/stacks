import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Reports from "../../pages/reports";

test.describe("Reports", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let reports: Reports;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        reports = new Reports(page);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("retains the report title after refreshing a deep link", async () => {
        await reports.openAndRefresh("planned_vs_actual");
        await reports.expectTitle("Planned vs. Actual");
    });
});
