import { expect, Locator, Page } from "@playwright/test";
import { format } from "date-fns";
import type { ITimeLog } from "@stacks/types";

export class TaskTimeLogs {
    private readonly page: Page;
    private readonly form: Locator;
    private lastInputDate?: string;

    constructor(page: Page) {
        this.page = page;
        this.form = page.getByTestId("quick-timelog");
    }

    public async load(taskId: string): Promise<ITimeLog[]> {
        const response = await this.page.request.get(`/api/timelogs?task=${taskId}`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        return (body.data ?? body) as ITimeLog[];
    }

    public async getInputDate(): Promise<string> {
        return this.form.getByTestId("quick-timelog-date").inputValue();
    }

    public getLastInputDate(): string {
        if (!this.lastInputDate) throw new Error("No time-entry date has been captured");
        return this.lastInputDate;
    }

    public async openNewEntry(): Promise<void> {
        await this.page.getByTestId("task-time-logs-add-entry").click();
        await expect(this.form).toBeVisible();
    }

    public async expectRequiredAndInvalidDuration(): Promise<void> {
        await this.openNewEntry();
        const duration = this.form.getByTestId("quick-timelog-duration");
        const save = this.page.getByTestId("quick-timelog-save-button");
        await expect(save).toBeDisabled();
        await duration.fill("not a duration");
        await expect(duration).toHaveAttribute("data-valid", "false");
        await expect(save).toBeDisabled();
        await this.form.getByTestId("quick-timelog-cancel-button").click();
        await expect(this.form).toBeHidden();
    }

    private async enter(durationValue: string, description: string): Promise<void> {
        const duration = this.form.getByTestId("quick-timelog-duration");
        await duration.fill(durationValue);
        await duration.press("Enter");
        await this.form.getByTestId("quick-timelog-description").fill(description);
    }

    public async create(
        taskId: string,
        durationValue: string,
        description: string,
        date?: Date
    ): Promise<ITimeLog> {
        await this.openNewEntry();
        if (date) {
            const dateInput = this.form.getByTestId("quick-timelog-date");
            await dateInput.fill(format(date, "P"));
            await dateInput.press("Enter");
            await expect(dateInput).toHaveValue(format(date, "P"));
        }
        this.lastInputDate = await this.getInputDate();
        await this.enter(durationValue, description);
        const responsePromise = this.page.waitForResponse(
            response => response.request().method() === "POST" && response.url().includes("/api/timelogs")
        );
        await this.page.getByTestId("quick-timelog-save-button").click();
        const response = await responsePromise;
        expect(response.ok(), `Timelog create returned ${response.status()}`).toBeTruthy();
        const body = await response.json();
        const timelog = (body.data ?? body) as ITimeLog;
        await expect(this.page.getByTestId(`task-time-log-${timelog.id}`)).toBeVisible();
        expect(timelog.task).toBe(taskId);
        return timelog;
    }

    public async expectTotal(text: string): Promise<void> {
        await expect(this.page.getByTestId("task-time-logs-total")).toHaveText(text);
    }

    public async expectEmpty(): Promise<void> {
        await expect(this.page.getByTestId("task-time-logs-empty")).toBeVisible();
    }

    public async expectProjectEntry(id: string, description: string): Promise<void> {
        const row = this.page.getByTestId(`project-time-entry-${id}`);
        await expect(row).toBeVisible();
        await expect(row).toContainText(description);
    }

    public async expectProjectTotal(text: string): Promise<void> {
        await expect(this.page.getByTestId("project-time-total-logged")).toHaveText(text);
    }

    public async expectProjectEntryDate(id: string, dateText: string): Promise<void> {
        const cellText = await this.page.evaluate((testId: string) => {
            const row = document.querySelector(`[data-testid="${testId}"]`);
            const cell = row ? row.querySelector("td") : null;
            return cell ? cell.textContent.trim() : null;
        }, `project-time-entry-${id}`);
        expect(cellText, `Project time entry ${id} has no date cell`).toBe(dateText);
    }

    public async expectProjectEntryOrder(ids: string[]): Promise<void> {
        const order = await this.page.evaluate(() =>
            Array.from(document.querySelectorAll("[data-testid^='project-time-entry-']")).map(row =>
                row.getAttribute("data-testid")
            )
        );
        expect(order).toEqual(ids.map(id => `project-time-entry-${id}`));
    }

    public async getBrowserZoneForDate(
        year: number,
        month: number,
        day: number
    ): Promise<{ timeZone: string; offsetMinutes: number }> {
        const zone = await this.page.evaluate(
            ([y, m, d]: number[]) => ({
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                offsetMinutes: new Date(y, m, d).getTimezoneOffset(),
            }),
            [year, month, day]
        );
        return { timeZone: zone.timeZone, offsetMinutes: zone.offsetMinutes };
    }

    public async update(id: string, durationValue: string, description: string): Promise<void> {
        await this.page.getByTestId(`task-time-log-menu-${id}`).click();
        await this.page.getByTestId(`task-time-log-edit-${id}`).click();
        await expect(this.form).toBeVisible();
        await this.enter(durationValue, description);
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/timelogs/${id}`)
        );
        await this.page.getByTestId("quick-timelog-save-button").click();
        const response = await responsePromise;
        expect(response.ok(), `Timelog update returned ${response.status()}`).toBeTruthy();
        await expect(this.page.getByTestId(`task-time-log-${id}`)).toContainText(description);
    }

    public async delete(id: string): Promise<void> {
        await this.page.getByTestId(`task-time-log-menu-${id}`).click();
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "DELETE" && response.url().includes(`/api/timelogs/${id}`)
        );
        await this.page.getByTestId(`task-time-log-delete-${id}`).click();
        const response = await responsePromise;
        expect(response.ok(), `Timelog delete returned ${response.status()}`).toBeTruthy();
        await expect(this.page.getByTestId(`task-time-log-${id}`)).toHaveCount(0);
    }

    public async cleanup(id: string): Promise<void> {
        const csrfResponse = await this.page.request.get("/auth/csrf");
        expect(csrfResponse.ok()).toBeTruthy();
        const { data } = await csrfResponse.json();
        for (let attempt = 0; attempt < 3; attempt++) {
            const response = await this.page.request.delete(`/api/timelogs/${id}`, {
                headers: {
                    Origin: new URL(this.page.url()).origin,
                    "x-csrf-token": data.token,
                },
            });
            if (response.status() === 429 && attempt < 2) {
                const retryAfter = Number(response.headers()["retry-after"]);
                if (!Number.isFinite(retryAfter) || retryAfter < 1) {
                    throw new Error("Timelog cleanup was rate limited without a valid Retry-After header");
                }
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            expect([200, 404], `Timelog cleanup returned ${response.status()}`).toContain(response.status());
            return;
        }
    }
}
