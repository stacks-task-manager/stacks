import { expect, Locator, Page } from "@playwright/test";

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
        // Trigger lazy comments through the stable task scroller rather than a
        // divider that can detach while the reloaded task finishes rendering.
        const scroller = this.page.getByTestId("task-details-scroll-area");
        await scroller.evaluateAll(elements => {
            for (const element of elements) element.scrollTop = element.scrollHeight;
        });
        await this.toggleLogs.waitFor({ state: "visible", timeout: 10000 });
        await this.toggleLogs.click();
        await this.list.waitFor({ state: "visible" });
    }

    public async countEntries(): Promise<number> {
        return await this.entry.count();
    }

    public async expectRenameFromAuthor(title: string, author: string): Promise<void> {
        await expect
            .poll(async () => {
                const entries = await this.getEntries();
                return entries.some(entry => entry.text.includes(title) && entry.text.includes(author));
            })
            .toBe(true);
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
