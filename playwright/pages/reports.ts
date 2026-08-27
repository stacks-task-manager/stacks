import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

class Reports extends Base {
    public title: Locator;

    constructor(page: Page) {
        super(page);
        this.title = page.getByTestId("report-toolbar-title");
    }

    public async openAndRefresh(type: string) {
        await this.page.goto(`/app/reports/${type}`);
        await this.page.reload();
    }

    public async expectTitle(title: string) {
        await expect(this.title).toHaveText(title);
    }
}

export default Reports;
