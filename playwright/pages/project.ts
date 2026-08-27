import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { NewProjectDialog } from "./components/NewProjectDialog";
import Sidebar from "./sidebar";
import { NewTaskDialog } from "./components/NewTaskDialog";
import { TimelogDialog } from "./components/TimelogDialog";

export const PROJECT_VIEW_IDS = [
    "board",
    "list",
    "attachments",
    "links",
    "overview",
    "time",
    "world",
    "gantt",
    "notes",
] as const;

export type ProjectViewId = (typeof PROJECT_VIEW_IDS)[number];
export type EmptyProjectViewId = "attachments" | "links" | "gantt";

export interface PdfExportResult {
    status: number;
    contentType: string | undefined;
    contentDisposition: string | undefined;
    requestBody: unknown;
    body: Buffer;
}

class Project extends Base {
    public sidebar: Sidebar;
    public newProjectDialog: NewProjectDialog;
    public newTaskDialog: NewTaskDialog;
    public timelogDialog: TimelogDialog;

    public project: Locator;
    public toolbar: Locator;
    public menuButton: Locator;
    public menu: Locator;
    public dialog: Locator;
    public infoButton: Locator;
    public infoContent: Locator;
    public favoriteButton: Locator;
    public expirationButton: Locator;
    public reloadButton: Locator;
    public titleInput: Locator;
    public title: Locator;
    public viewsButton: Locator;
    public viewsMenu: Locator;
    public settings: ProjectSettings;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.newProjectDialog = new NewProjectDialog(page);
        this.newTaskDialog = new NewTaskDialog(page);
        this.timelogDialog = new TimelogDialog(page);

        this.project = page.getByTestId("project");
        this.toolbar = page.getByTestId("project-toolbar");
        this.menuButton = page.getByTestId("project-menu-button");
        this.menu = page.getByTestId("project-menu");
        this.dialog = page.getByRole("dialog");
        this.infoButton = page.getByTestId("project-info-button");
        this.infoContent = page.getByTestId("project-info-content");
        this.favoriteButton = page.getByTestId("project-favorite-button");
        this.expirationButton = page.getByTestId("project-expiration-button");
        this.reloadButton = page.getByTestId("project-reload-button");
        this.titleInput = page.getByTestId("toolbar-title-input");
        this.title = page.getByTestId("toolbar-title");
        this.viewsButton = page.getByTestId("project-views-button");
        this.viewsMenu = page.getByTestId("project-views-menu");
        this.settings = new ProjectSettings(page);
    }

    public async addNew({ name }: { name: string }) {
        await this.sidebar.addNew("project");
        await this.newProjectDialog.dialog.waitFor({ state: "visible" });
        await this.newProjectDialog.titleInput.fill(name);
        await this.newProjectDialog.descriptionInput.fill("Lorem ipsum sit amet");

        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/documents") && response.request().method() === "POST"
        );

        await this.newProjectDialog.saveButton.click();
        const response = await responsePromise;
        await this.newProjectDialog.dialog.waitFor({ state: "hidden" });

        const { data } = await response.json();
        return data?.id;
    }

    public async delete(projectName: string) {
        await this.sidebar.deleteDocument(projectName);
    }

    public async deleteById(projectId: string) {
        const response = await this.page.request.delete(`/api/documents/${projectId}`);
        if (!response.ok()) {
            throw new Error(`Project cleanup failed with HTTP ${response.status()}`);
        }
    }

    public async exportPdf(): Promise<PdfExportResult> {
        await this.switchView("overview");
        await this.openMenu();
        await this.menuItem("project-menu-export").hover();

        const pdfItem = this.page.getByTestId("project-menu-export-pdf");
        await pdfItem.waitFor({ state: "visible" });
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes("/api/export") && response.request().method() === "POST"
        );
        await pdfItem.click();
        await this.menu.waitFor({ state: "hidden" });

        const response = await responsePromise;
        return {
            status: response.status(),
            contentType: response.headers()["content-type"],
            contentDisposition: response.headers()["content-disposition"],
            requestBody: response.request().postDataJSON(),
            body: await response.body(),
        };
    }

    public async addTask({
        project,
        column,
        task,
    }: {
        project: string;
        column: string;
        task: {
            title: string;
            description?: string;
            assignees?: string[];
            priority?: string;
            status?: string;
            dates?: { start?: string; end?: string };
            tags?: string[];
        };
    }) {
        await this.sidebar.addNew("task");
        await this.newTaskDialog.dialog.waitFor({ state: "visible" });
        await this.newTaskDialog.titleInput.fill(task.title);

        // setting the project
        await this.newTaskDialog.projectSelectButton.click();
        await this.newTaskDialog.projectSelectMenu.waitFor({ state: "visible" });
        const projectItem = this.newTaskDialog.projectSelectMenu.getByText(project, { exact: true });
        await projectItem.scrollIntoViewIfNeeded();
        await projectItem.click();

        // setting the column
        await this.newTaskDialog.stackSelectButton.click();
        await this.newTaskDialog.stackSelectMenu.waitFor({ state: "visible" });
        const columnItem = this.newTaskDialog.stackSelectMenu.getByText(column, { exact: true });
        await columnItem.scrollIntoViewIfNeeded();
        await columnItem.click();

        // setting the description
        if (task.description) {
            await this.newTaskDialog.descriptionInput.fill(task.description);
        }

        if (task.priority) {
            await this.newTaskDialog.priorityButton.click();
            await this.newTaskDialog.priorityMenu.waitFor({ state: "visible" });
            await this.newTaskDialog.priorityMenu.getByText(task.priority).click();
        }

        await this.newTaskDialog.saveButton.click();
    }

    public async openMenu() {
        await this.menuButton.click();
        await this.menu.waitFor({ state: "visible" });
    }

    public async closeInfo() {
        await this.page.keyboard.press("Escape");
        await this.infoContent.waitFor({ state: "hidden" });
    }

    public async closeMenu() {
        await this.page.keyboard.press("Escape");
        await this.menu.waitFor({ state: "hidden" });
    }

    public menuItem(testId: string): Locator {
        return this.menu.getByTestId(testId);
    }

    public async expectProjectUrl(projectId: string) {
        await this.expectPath(`/app/project/${projectId}`, { state: "todo" });
    }

    public async openArchivesMenu() {
        await this.menuItem("project-menu-archives").hover();
        await this.page.getByTestId("project-menu-show-archived").waitFor({ state: "visible" });
    }

    public async openSettings() {
        await this.openMenu();
        await this.menuItem("project-menu-settings").click();
        await this.settings.dialog.waitFor({ state: "visible" });
        await this.settings.openTab("settings");
    }

    public async reload() {
        await this.reloadButton.waitFor({ state: "visible" });
        await expect(this.reloadButton).toBeEnabled();

        const requestPromise = this.page.waitForRequest(
            request => request.url().includes("/api/projects/") && request.method() === "GET"
        );
        await this.reloadButton.click();
        await requestPromise;
    }

    public async rename(title: string) {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes("/api/documents/") && response.request().method() === "PATCH"
        );
        await this.page.getByTestId("toolbar-title").dblclick();
        await expect(this.titleInput).toBeVisible();
        await this.titleInput.fill(title);
        await this.titleInput.press("Enter");
        await responsePromise;
    }

    public viewTab(view: ProjectViewId): Locator {
        return this.toolbar.getByTestId(`project-view-tab-${view}`);
    }

    public viewToggle(view: ProjectViewId): Locator {
        return this.viewsMenu.getByTestId(`project-view-toggle-${view}`);
    }

    public async switchView(view: ProjectViewId) {
        await this.viewTab(view).click();
        await expect(this.viewTab(view)).toHaveAttribute("data-active", "true");
        await expect(this.page.getByTestId(`project-view-${view}`)).toBeVisible();
    }

    public async enableAllViews() {
        await this.viewsButton.click();
        await this.viewsMenu.waitFor({ state: "visible" });

        for (const view of PROJECT_VIEW_IDS) {
            if (!(await this.viewTab(view).isVisible())) {
                await this.viewToggle(view).click();
                await expect(this.viewTab(view)).toBeVisible();
            }
        }

        await this.page.keyboard.press("Escape");
        await this.viewsMenu.waitFor({ state: "hidden" });
    }

    public async expectAllViewsVisible() {
        for (const view of PROJECT_VIEW_IDS) {
            await expect(this.viewTab(view)).toBeVisible();
        }
    }

    public async expectEmptyView(view: EmptyProjectViewId) {
        await this.switchView(view);
        await expect(this.page.getByTestId(`project-${view}-empty`)).toBeVisible();
    }

    public async setNotesAndExpectPersistence(notes: string) {
        await this.switchView("notes");
        const editor = this.page.getByTestId("tip-tap-editor");
        await editor.click();

        const responsePromise = this.page.waitForResponse(
            response => response.url().includes("/api/projects/") && response.request().method() === "PATCH"
        );
        await this.page.keyboard.press("ControlOrMeta+A");
        await this.page.keyboard.insertText(notes);
        await responsePromise;

        await this.page.reload();
        await expect(this.page.getByTestId("project-view-notes")).toBeVisible();
        await expect(this.page.getByTestId("tip-tap-editor")).toContainText(notes);
    }
}

export class ProjectSettings {
    public page: Page;
    public dialog: Locator;
    public tabs: Locator;
    public closeButton: Locator;
    public descriptionInput: Locator;
    public defaultFilterSelect: Locator;
    public showSubtasksSwitch: Locator;
    public showSubtasksInput: Locator;
    public backgroundUrlInput: Locator;
    public clearBackgroundButton: Locator;
    public endDateButton: Locator;
    public oneWeekShortcut: Locator;
    public datePickerApplyButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dialog = page.getByTestId("project-settings-dialog-content");
        this.tabs = page.getByTestId("project-settings-tabs");
        this.closeButton = page.getByTestId("project-settings-close-button");
        this.descriptionInput = page.getByTestId("project-settings-description-input");
        this.defaultFilterSelect = page.getByTestId("project-settings-default-filter-select");
        this.showSubtasksSwitch = page.getByTestId("project-settings-show-subtasks-switch");
        this.showSubtasksInput = this.showSubtasksSwitch;
        this.backgroundUrlInput = page.getByTestId("project-settings-background-url-input");
        this.clearBackgroundButton = page.getByTestId("project-settings-clear-background-button");
        this.endDateButton = page.getByTestId("project-settings-end-date-button");
        this.oneWeekShortcut = page.getByTestId("date-picker-shortcut-1-week");
        this.datePickerApplyButton = page.getByTestId("date-picker-apply");
    }

    public async openTab(tab: "settings" | "interface" | "time" | "fields") {
        await this.page.getByTestId(`project-settings-tab-${tab}`).click();
    }

    public async setDescription(description: string) {
        await this.openTab("settings");
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/projects/") && response.request().method() === "PATCH"
        );
        await this.descriptionInput.fill(description);
        await responsePromise;
    }

    public async setDefaultFilter(value: "all" | "done" | "todo" | "") {
        await this.openTab("settings");
        await this.defaultFilterSelect.selectOption(value);
    }

    public async toggleShowSubtasks() {
        await this.openTab("settings");
        const nextChecked = !(await this.showSubtasksInput.isChecked());
        await this.showSubtasksInput.setChecked(nextChecked, { force: true });
    }

    public async setBackgroundUrl(url: string) {
        await this.openTab("interface");
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/projects/") && response.request().method() === "PATCH"
        );
        await this.backgroundUrlInput.fill(url);
        await this.backgroundUrlInput.blur();
        await responsePromise;
    }

    public async setEndDateSoon() {
        await this.openTab("time");
        await this.endDateButton.click();
        await this.oneWeekShortcut.click();

        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/projects/") && response.request().method() === "PATCH"
        );
        await this.datePickerApplyButton.click();
        await responsePromise;
    }

    public async close() {
        await this.closeButton.click();
        await this.dialog.waitFor({ state: "hidden" });
    }
}

export default Project;
