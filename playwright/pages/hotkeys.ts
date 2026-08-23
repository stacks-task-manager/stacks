import { expect, type Page } from "@playwright/test";
import Base from "./base";

type ShortcutDestination = {
    combo: string;
    testId: string;
};

const DESTINATIONS: ShortcutDestination[] = [
    { combo: "Meta+Alt+H", testId: "home-view" },
    { combo: "Meta+Alt+P", testId: "people-view" },
    { combo: "Meta+Alt+C", testId: "calendar-surface" },
    { combo: "Meta+Alt+T", testId: "my-tasks-view" },
    { combo: "Meta+Alt+R", testId: "reports-view" },
    { combo: "Meta+Alt+B", testId: "bookmarks-view" },
    { combo: "Meta+Alt+I", testId: "inbox-view" },
];

class Hotkeys extends Base {
    constructor(page: Page) {
        super(page);
    }

    public async expectGlobalDialogsAndSidebar() {
        const hotkeysDialog = this.page.getByTestId("hotkeys-dialog");
        const preferencesDialog = this.page.getByTestId("preferences-dialog");
        const sidebar = this.page.getByTestId("sidebar");

        await expect(this.page.getByTestId("help-button")).toBeVisible();
        await this.page.getByTestId("help-button").click();
        await expect(this.page.getByTestId("help-menu")).toBeVisible();
        await this.press("Escape");
        await this.page.getByTestId("toggle-sidebar-button").focus();
        await this.press("Control+Slash");
        await expect(hotkeysDialog).toBeVisible();
        await this.press("Control+Slash");
        await expect(hotkeysDialog).toBeHidden();

        await this.press("Meta+Comma");
        await expect(preferencesDialog).toBeVisible();
        await this.press("Meta+Comma");
        await expect(preferencesDialog).toBeHidden();

        const initiallyClosed = await sidebar.evaluate(element => element.classList.contains("closed"));
        await this.press("Meta+B");
        await expect(sidebar).toHaveClass(initiallyClosed ? /^(?!.*closed)/ : /closed/);
        await this.press("Meta+B");
        await expect(sidebar).toHaveClass(initiallyClosed ? /closed/ : /^(?!.*closed)/);
    }

    public async expectDestinationAndHistoryShortcuts() {
        for (const destination of DESTINATIONS) {
            await this.press(destination.combo);
            await expect(this.page.getByTestId(destination.testId)).toBeVisible();
        }

        await this.press("Meta+Alt+H");
        await expect(this.page.getByTestId("home-view")).toBeVisible();
        await this.press("Meta+Alt+C");
        await expect(this.page.getByTestId("calendar-surface")).toBeVisible();

        await this.press("Control+[");
        await expect(this.page.getByTestId("home-view")).toBeVisible();
        await this.press("Control+]");
        await expect(this.page.getByTestId("calendar-surface")).toBeVisible();
    }

    public async expectCalendarShortcuts() {
        const surface = this.page.getByTestId("calendar-surface");
        const currentDate = this.page.getByTestId("calendar-current-date");
        const filters = this.page.getByTestId("calendar-filters-sidebar");
        const sidebar = this.page.getByTestId("sidebar");

        await this.press("Meta+Alt+C");
        await expect(surface).toBeVisible();

        await this.press("Meta+1");
        await expect(surface).toHaveAttribute("data-calendar-view", "one");
        await this.press("Meta+2");
        await expect(surface).toHaveAttribute("data-calendar-view", "week");
        await this.press("Meta+3");
        await expect(surface).toHaveAttribute("data-calendar-view", "month");

        const initialDate = await currentDate.textContent();
        await this.press("ArrowLeft");
        await expect(currentDate).not.toHaveText(initialDate ?? "");
        await this.press("ArrowRight");
        await expect(currentDate).toHaveText(initialDate ?? "");
        await this.press("ArrowLeft");
        await this.press("ArrowDown");
        await expect(currentDate).toHaveText(initialDate ?? "");

        await this.press("Control+F");
        await expect(filters).toBeVisible();
        await this.press("Control+F");
        await expect(filters).toBeHidden();

        const initiallyClosed = await sidebar.evaluate(element => element.classList.contains("closed"));
        await this.press("Meta+U");
        await expect(sidebar).toHaveClass(initiallyClosed ? /^(?!.*closed)/ : /closed/);
        await this.press("Meta+U");
        await expect(sidebar).toHaveClass(initiallyClosed ? /closed/ : /^(?!.*closed)/);
    }

    public async expectCreationAndFilterShortcuts() {
        await this.press("Meta+Alt+B");
        await expect(this.page.getByTestId("bookmarks-view")).toBeVisible();
        await this.press("Control+N");
        await expect(this.page.getByTestId("new-bookmark-name-input")).toBeVisible();
        await this.page.getByTestId("new-bookmark-dialog-cancel-button").click();

        await this.press("Meta+Alt+T");
        await expect(this.page.getByTestId("my-tasks-view")).toBeVisible();
        await this.press("Meta+N");
        await expect(this.page.getByTestId("new-task-title-input")).toBeVisible();
        await this.page.getByTestId("new-task-dialog-cancel-button").click();
        await this.press("Control+F");
        await expect(this.page.getByTestId("my-tasks-filters-sidebar")).toBeVisible();
        await this.page.getByTestId("my-tasks-view").click();

        await this.press("Meta+Alt+P");
        await expect(this.page.getByTestId("people-view")).toBeVisible();
        await this.press("Control+F");
        await expect(this.page.getByTestId("people-filters-sidebar")).toBeVisible();
        await this.page.getByTestId("people-view").click();
        await this.press("Control+N");
        await expect(this.page.getByTestId("new-person-first-name-input")).toBeVisible();
        await this.page.getByTestId("new-person-cancel-button").click();
    }

    public async expectPeopleIntervalShortcuts() {
        await this.press("Meta+Alt+P");
        await this.page.getByTestId("people-tab-timesheet").click();
        await expect(this.page.getByTestId("people-timesheet-view")).toBeVisible();

        const currentWeek = this.page.getByTestId("people-timesheet-current-week-button");
        await expect(currentWeek).not.toHaveClass(/intent-primary/);
        await this.press("ArrowLeft");
        await expect(currentWeek).toHaveClass(/intent-primary/);
        await this.press("ArrowRight");
        await expect(currentWeek).not.toHaveClass(/intent-primary/);
        await this.press("ArrowLeft");
        await this.press("ArrowDown");
        await expect(currentWeek).not.toHaveClass(/intent-primary/);
    }

    private async press(combo: string) {
        await this.page.keyboard.press(combo);
    }
}

export default Hotkeys;
