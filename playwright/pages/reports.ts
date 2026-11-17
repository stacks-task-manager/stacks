import { expect, Locator, Page, Request, Route } from "@playwright/test";
import Base from "./base";

class Reports extends Base {
    public title: Locator;
    public grid: Locator;
    public chart: Locator;
    public blankSlate: Locator;

    constructor(page: Page) {
        super(page);
        this.title = page.getByTestId("report-toolbar-title");
        this.grid = page.getByTestId("report-grid");
        this.chart = page.getByTestId("report-chart");
        this.blankSlate = page.getByTestId("report-blank-slate");
    }

    public spanButton(value: string): Locator {
        return this.page.getByTestId(`report-span-${value}`);
    }

    /** Opens the report deep link. Tests assert the specific content (grid/chart/slate). */
    public async openReport(type: string) {
        await this.page.goto(`/app/reports/${type}`);
        await this.title.waitFor({ state: "visible" });
    }

    public async expectTitle(title: string) {
        await expect(this.title).toHaveText(title);
    }

    public async expectGrid() {
        await expect(this.grid).toBeVisible();
    }

    /** Asserts the given column headers render (by their text, not a CSS match). */
    public async expectGridHeaders(labels: string[]) {
        for (const label of labels) {
            await expect(this.grid.getByRole("columnheader", { name: label })).toBeVisible();
        }
    }

    /** Asserts at least `count` data rows render in the grid. */
    public async expectGridRowCountAtLeast(count: number) {
        await expect
            .poll(async () => this.grid.getByTestId(/^table-grid-row-/).count(), { timeout: 15000 })
            .toBeGreaterThanOrEqual(count);
    }

    public async expectChart() {
        await expect(this.chart).toBeVisible();
    }

    public async expectBlankSlate() {
        await expect(this.blankSlate).toBeVisible();
    }

    /** Clicks the span segment and waits for the re-requested report payload. */
    public async setSpan(value: string): Promise<void> {
        const requestPromise = this.waitForReportRequest(value);
        await this.spanButton(value).click();
        await requestPromise;
    }

    /** Resolves when a report payload request carrying `span` fires (the catalog list is excluded). */
    public waitForReportRequest(span: string): Promise<Request> {
        return this.page.waitForRequest(request => {
            const url = new URL(request.url());
            if (!url.pathname.startsWith("/api/reports/")) return false;
            return url.searchParams.get("span") === span;
        });
    }
}

export default Reports;
