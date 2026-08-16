import { Locator, Page } from "@playwright/test";
import Base from "./base";
import { NewProjectDialog } from "./components/NewProjectDialog";
import Sidebar from "./sidebar";
import { NewTaskDialog } from "./components/NewTaskDialog";
import { TimelogDialog } from "./components/TimelogDialog";

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

    public async close() {
        await this.closeButton.click();
        await this.dialog.waitFor({ state: "hidden" });
    }
}

export default Project;
