import { Locator, Page } from "@playwright/test";

export interface ActivityEntry {
    text: string;
    removed: string[];
    inserted: string[];
    images: number;
    scripts: number;
}

export class ActivityLog {
    public list: Locator;
    public entry: Locator;

    public page: Page;
    public toggleLogs: Locator;

    constructor(page: Page) {
        this.page = page;
        this.list = page.getByTestId("comments-list");
        this.entry = this.list.getByTestId("activity-log-entry");
        this.toggleLogs = page.getByTestId("comments-toggle-logs");
    }

    public async open(): Promise<void> {
        // The comments block is lazy-rendered inside the task-details scroller, so
        // scroll the always-present divider into view to trigger the render first.
        const divider = this.page.locator("#comments");
        await divider.waitFor({ state: "attached" });
        await divider.scrollIntoViewIfNeeded();
        await this.toggleLogs.waitFor({ state: "visible", timeout: 10000 });
        await this.toggleLogs.click();
        await this.list.waitFor({ state: "visible" });
    }

    public async countEntries(): Promise<number> {
        return await this.entry.count();
    }

    private async textsOf(element: Locator, tag: string): Promise<string[]> {
        const marks = await element.locator(tag).all();
        const texts: string[] = [];
        for (const mark of marks) {
            texts.push((await mark.textContent()) ?? "");
        }
        return texts;
    }

    public async getEntries(): Promise<ActivityEntry[]> {
        const entries = await this.entry.all();
        const result: ActivityEntry[] = [];
        for (const element of entries) {
            result.push({
                text: (await element.textContent()) ?? "",
                removed: await this.textsOf(element, "del"),
                inserted: await this.textsOf(element, "ins"),
                images: await element.locator("img").count(),
                scripts: await element.locator("script").count(),
            });
        }
        return result;
    }
}
