import { Locator, Page } from "@playwright/test";
import { DateRangePicker } from "./DatePicker";

export class Subtasks {
    public page: Page;
    public dateRangePicker: DateRangePicker;
    public wrapper: Locator;
    public input: Locator;
    public addButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dateRangePicker = new DateRangePicker(page);
        this.wrapper = page.getByTestId("subtasks-wrapper");
        this.input = this.wrapper.getByTestId("subtasks-input");
        this.addButton = this.wrapper.getByTestId("new-subtask-button");
    }

    public async saveSubtask(subtask: string) {
        await this.input.fill(subtask);
        await this.input.press("Enter");
    }

    public async addSubtask(subtask: string) {
        await this.addButton.click();
        await this.input.waitFor({ state: "visible" });
        await this.saveSubtask(subtask);
    }

    public async getSubtasks() {
        return await this.wrapper.getByTestId("subtask-item").all();
    }

    public async countSubtasks(): Promise<number> {
        return await this.wrapper.getByTestId("subtask-item").count();
    }

    public subtaskRowByTitle(title: string): Locator {
        return this.wrapper.getByTestId("subtask-item").filter({ has: this.page.getByTestId("subtask-title").filter({ hasText: title }) });
    }

    public subtaskStateByTitle(title: string): Locator {
        return this.subtaskRowByTitle(title).getByTestId("subtask-state");
    }

    public async getSubtask(subtask: string) {
        return await this.wrapper.getByTestId("subtask-item").getByText(subtask);
    }

    public async setDates(name: string, startDate: string, endDate: string) {
        const subtask = await this.getSubtask(name);

        await subtask.getByTestId("subtask-dates-picker-button").click();
        await this.page.getByTestId("date-range-picker-wrapper").waitFor({ state: "visible" });

        // await this.dateRangePicker.setDates({ start: new Date(startDate), end: new Date(endDate) });
    }
}
