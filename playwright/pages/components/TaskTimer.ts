import { expect, Locator, Page } from "@playwright/test";
import type { ITimeLog } from "@stacks/types";

export class TaskTimer {
    private readonly page: Page;
    private readonly taskDetails: Locator;

    constructor(page: Page) {
        this.page = page;
        this.taskDetails = page.getByTestId("task-details-header");
    }

    public async captureStorage(): Promise<{ key?: string; value: string | null }> {
        return this.page.evaluate(() => {
            const key = Object.keys(localStorage).find(candidate => candidate.endsWith("active-timers"));
            return { key, value: key ? localStorage.getItem(key) : null };
        });
    }

    public async restoreStorage(snapshot: { key?: string; value: string | null }): Promise<void> {
        await this.page.evaluate(({ key, value }) => {
            for (const candidate of Object.keys(localStorage)) {
                if (candidate.endsWith("active-timers")) localStorage.removeItem(candidate);
            }
            if (key && value !== null) localStorage.setItem(key, value);
        }, snapshot);
    }

    public async start(): Promise<void> {
        await this.taskDetails.getByTestId("time-tracker-start").click();
        await expect(this.taskDetails.getByTestId("time-tracker-stop")).toBeVisible();
    }

    public async expectRunningAfterReload(): Promise<void> {
        await this.page.reload();
        const running = this.taskDetails.getByTestId("time-tracker-stop");
        await expect(running).toBeVisible();
        await expect(running).toContainText(/\d{2}:\d{2}:\d{2}/);
        await expect(running).not.toContainText("00:00:00");
    }

    public async expectStoppedAfterReload(): Promise<void> {
        await this.page.reload();
        await expect(this.taskDetails.getByTestId("time-tracker-start")).toBeVisible();
        await expect(this.taskDetails.getByTestId("time-tracker-stop")).toHaveCount(0);
        await expect(this.page.getByTestId("quick-timelog")).toHaveCount(0);
    }

    public async stopAndSave(): Promise<ITimeLog> {
        await this.taskDetails.getByTestId("time-tracker-stop").click();
        const form = this.page.getByTestId("quick-timelog");
        await expect(form).toBeVisible();
        const duration = form.getByTestId("quick-timelog-duration");
        await expect(duration).toHaveAttribute("data-valid", "true");
        const responsePromise = this.page.waitForResponse(
            response => response.request().method() === "POST" && response.url().includes("/api/timelogs")
        );
        await this.page.getByTestId("quick-timelog-save-button").click();
        const response = await responsePromise;
        expect(response.ok(), `Timer log create returned ${response.status()}`).toBeTruthy();
        const body = await response.json();
        const timelog = (body.data ?? body) as ITimeLog;
        await expect(form).toBeHidden();
        return timelog;
    }

    public async cancelRunningTimer(): Promise<void> {
        const stop = this.taskDetails.getByTestId("time-tracker-stop");
        const form = this.page.getByTestId("quick-timelog");
        if (await stop.isVisible().catch(() => false)) {
            await stop.click();
            await expect(form).toBeVisible();
        }
        if (await form.isVisible().catch(() => false)) {
            await this.page.getByTestId("time-tracker-clear").click();
            await expect(form).toBeHidden();
        }
    }
}
