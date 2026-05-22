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

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.newProjectDialog = new NewProjectDialog(page);
        this.newTaskDialog = new NewTaskDialog(page);
        this.timelogDialog = new TimelogDialog(page);

        this.project = page.getByTestId("project");
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
        const projectItem = this.newTaskDialog.projectSelectMenu.getByText(project);
        await projectItem.scrollIntoViewIfNeeded();
        await projectItem.click();

        // setting the column
        await this.newTaskDialog.stackSelectButton.click();
        await this.newTaskDialog.stackSelectMenu.waitFor({ state: "visible" });
        const columnItem = this.newTaskDialog.stackSelectMenu.getByText(column);
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
}

export default Project;
