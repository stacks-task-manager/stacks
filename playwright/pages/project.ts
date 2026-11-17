import { expect, Locator, Page } from "@playwright/test";
import Base, { ExportResult } from "./base";
import { NewProjectDialog } from "./components/NewProjectDialog";
import Sidebar from "./sidebar";
import { NewTaskDialog } from "./components/NewTaskDialog";
import { TimelogDialog } from "./components/TimelogDialog";
import type { IProjectOverview } from "@stacks/types";

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
    public tintPicker: Locator;
    public tintToggleButton: Locator;
    public tintHexInput: Locator;
    public tintRemoveButton: Locator;
    public filterButton: Locator;
    public filterQueryInput: Locator;
    public doDateFilterButton: Locator;
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
        this.tintPicker = page.getByTestId("tint-picker");
        this.tintToggleButton = page.getByTestId("tint-toggle-button");
        this.tintHexInput = page.getByTestId("tint-hex-input");
        this.tintRemoveButton = page.getByTestId("tint-remove-button");
        this.filterButton = page.getByTestId("project-filter-button");
        this.filterQueryInput = page.getByTestId("filter-query-input");
        this.doDateFilterButton = page.getByTestId("do-date-filter-button");
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
        const headers = await this.browserMutationHeaders();
        for (let attempt = 0; attempt < 3; attempt++) {
            const response = await this.page.request.delete(`/api/documents/${projectId}`, { headers });
            if (response.status() === 429 && attempt < 2) {
                const retryAfter = Number(response.headers()["retry-after"]);
                if (!Number.isFinite(retryAfter) || retryAfter < 1) {
                    throw new Error("Project cleanup was rate limited without a valid Retry-After header");
                }
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            if (response.status() === 404) {
                const lookup = await this.page.request.get("/api/documents");
                if (!lookup.ok()) {
                    throw new Error(`Project cleanup verification failed with HTTP ${lookup.status()}`);
                }
                const body = await lookup.json();
                const documents = body.data?.documents ?? body.data;
                if (Array.isArray(documents) && !documents.some(document => document.id === projectId))
                    return;
            }
            if (!response.ok()) {
                throw new Error(`Project cleanup failed for ${projectId} with HTTP ${response.status()}`);
            }
            return;
        }
    }

    public async exportPdf(): Promise<ExportResult> {
        return this.exportProject("pdf");
    }

    public async exportProject(format: "xlsx" | "json" | "pdf"): Promise<ExportResult> {
        if (format === "pdf") await this.switchView("overview");
        await this.openMenu();
        await this.menuItem("project-menu-export").hover();

        const item = this.page.getByTestId(`project-menu-export-${format}`);
        await item.waitFor({ state: "visible" });
        return this.captureExport(async () => {
            await item.click();
            await this.menu.waitFor({ state: "hidden" });
        });
    }

    /** Archives all completed tasks (confirms the warning dialog). */
    public async archiveCompleted(): Promise<void> {
        await this.openMenu();
        await this.openArchivesMenu();
        const item = this.page.getByTestId("project-menu-archive-completed");
        await item.waitFor({ state: "visible" });
        await item.click();
        const dialog = this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        await dialog.waitFor({ state: "hidden" });
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

    /** Opens the toolbar menu and reveals the Tint picker submenu. */
    public async openTintPicker() {
        await this.openMenu();
        await this.menuItem("project-toolbar-tint").hover();
        await this.tintPicker.waitFor({ state: "visible" });
    }

    /** Opens the task filter drawer from the toolbar filter button. */
    public async openFilterDrawer() {
        await this.filterButton.click();
        await this.filterQueryInput.waitFor({ state: "visible" });
    }

    /** Closes the task filter drawer. */
    public async closeFilterDrawer() {
        await this.page.keyboard.press("Escape");
        await this.filterQueryInput.waitFor({ state: "hidden" });
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

    /**
     * Toggles the current project's favorite state from its toolbar star. This is a
     * client-side-only mutation (`store/actions/projects.ts:306 toggleFavorite` writes
     * browser localStorage; no server route), so nothing is awaited from the network here.
     */
    public async toggleFavorite() {
        await this.favoriteButton.waitFor({ state: "visible" });
        await this.favoriteButton.click();
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

    public async openListView(projectId: string, searchParams: Record<string, string> = {}) {
        const query = new URLSearchParams(searchParams).toString();
        await this.goto(`/app/project/${projectId}${query ? `?${query}` : ""}`);
        await this.project.waitFor({ state: "visible" });
        await this.switchView("list");
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

    public async expectOverviewAfterReload(
        projectId: string,
        expected: Pick<
            IProjectOverview,
            "tasksTotal" | "tasksIdle" | "tasksInProgress" | "tasksCompleted" | "timeEstimatedTotal"
        >,
        estimateLabel: string
    ) {
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "GET" &&
                new URL(response.url()).pathname === `/api/projects/${projectId}/overview`
        );
        await this.page.reload();
        const response = await responsePromise;
        expect(response.ok(), `Overview returned ${response.status()}`).toBeTruthy();
        expect((await response.json()).data).toMatchObject(expected);
        await expect(this.page.getByTestId("project-overview-total-tasks")).toHaveText(
            String(expected.tasksTotal)
        );
        await expect(this.page.getByTestId("project-overview-tasks-idle")).toHaveText(
            String(expected.tasksIdle)
        );
        await expect(this.page.getByTestId("project-overview-tasks-in-progress")).toHaveText(
            String(expected.tasksInProgress)
        );
        await expect(this.page.getByTestId("project-overview-tasks-completed")).toHaveText(
            String(expected.tasksCompleted)
        );
        await expect(this.page.getByTestId("project-overview-estimated-total")).toHaveText(estimateLabel);
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

    // ── W7: attachments and links, populated ─────────────────────────────────

    public async openAttachments() {
        await this.switchView("attachments");
    }

    public async expectAttachmentsEmpty() {
        await this.expectEmptyView("attachments");
    }

    public async openLinks() {
        await this.switchView("links");
    }

    public async expectLinksEmpty() {
        await this.expectEmptyView("links");
    }

    public attachmentCard(attachmentId: string): Locator {
        return this.page.getByTestId(`attachment-card-${attachmentId}`);
    }

    public attachmentCards(): Locator {
        return this.page.getByTestId(/^attachment-card-/);
    }

    public async expectAttachmentCardVisible(attachmentId: string) {
        await expect(this.attachmentCard(attachmentId)).toBeVisible();
    }

    public async expectAttachmentCardAbsent(attachmentId: string) {
        await expect(this.attachmentCard(attachmentId)).toHaveCount(0);
    }

    public async expectAttachmentCardCount(count: number) {
        await expect(this.attachmentCards()).toHaveCount(count);
    }

    /** Opens the `...` menu of an attachment card (shares the FileMenu test ids). */
    public async openAttachmentMenu(attachmentId: string) {
        await this.page.getByTestId(`attachment-menu-button-${attachmentId}`).click();
        await expect(this.page.getByTestId("file-menu")).toBeVisible();
    }

    public attachmentMenuDownload(): Locator {
        return this.page.getByTestId("file-menu-download");
    }

    public attachmentMenuPreview(): Locator {
        return this.page.getByTestId("file-menu-preview");
    }

    public attachmentMenuDelete(): Locator {
        return this.page.getByTestId("file-menu-delete");
    }

    public attachmentOpenTask(attachmentId: string): Locator {
        return this.page.getByTestId(`attachment-open-task-${attachmentId}`);
    }

    /** Confirms the FileMenu delete dialog. */
    public async confirmAttachmentDelete() {
        const dialog = this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        await dialog.waitFor({ state: "hidden" });
    }

    /** Types into the attachments toolbar search (the view debounces 500 ms). */
    public async searchAttachments(query: string) {
        await this.page.getByTestId("project-attachments-search").fill(query);
    }

    public linkRow(linkId: string): Locator {
        return this.page.getByTestId(`link-row-${linkId}`);
    }

    public linkRows(): Locator {
        return this.page.getByTestId(/^link-row-/);
    }

    public async expectLinkRowVisible(linkId: string) {
        await expect(this.linkRow(linkId)).toBeVisible();
    }

    public async expectLinkRowCount(count: number) {
        await expect(this.linkRows()).toHaveCount(count);
    }

    /** Opens the `...` menu of a link row. */
    public async openLinkRowMenu(linkId: string) {
        await this.page.getByTestId(`link-menu-button-${linkId}`).click();
        await expect(this.page.getByTestId(`link-copy-${linkId}`)).toBeVisible();
    }

    public linkMenuOpen(linkId: string): Locator {
        return this.page.getByTestId(`link-open-${linkId}`);
    }

    public linkMenuCopy(linkId: string): Locator {
        return this.page.getByTestId(`link-copy-${linkId}`);
    }

    /** Types into the links toolbar search (the view debounces 500 ms). */
    public async searchLinks(query: string) {
        await this.page.getByTestId("project-links-search").fill(query);
    }

    /**
     * Clicks a control that opens a URL in a new tab (`openInNewTab`) and returns the
     * URL it targets. A forced download also emits a `download` event; we race the two,
     * assert the URL, and cancel/close so nothing is written to disk.
     */
    private async captureNewTabUrl(control: Locator, pathFragment: string): Promise<string> {
        const context = this.page.context();
        const downloadPromise = context.waitForEvent("download", { timeout: 15000 }).then(download => {
            void download.cancel();
            return download.url();
        });
        const pagePromise = context.waitForEvent("page", { timeout: 15000 }).then(async popup => {
            await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
            const url = popup.url();
            await popup.close().catch(() => undefined);
            return url;
        });

        await control.click();

        const url = await Promise.race([downloadPromise, pagePromise]);
        if (!url.includes(pathFragment)) {
            throw new Error(`Expected a URL containing "${pathFragment}", got "${url}"`);
        }
        return url;
    }

    /** Clicks "Download..." on an attachment card and returns the download URL. */
    public async attachmentDownloadUrl(attachmentId: string): Promise<string> {
        const download = this.attachmentMenuDownload();
        await this.openAttachmentMenu(attachmentId);
        return this.captureNewTabUrl(download, `/api/files/download/${attachmentId}`);
    }

    /** Clicks "Preview..." on an attachment card and returns the preview URL. */
    public async attachmentPreviewUrl(attachmentId: string): Promise<string> {
        const preview = this.attachmentMenuPreview();
        await this.openAttachmentMenu(attachmentId);
        return this.captureNewTabUrl(preview, `/api/files/preview/${attachmentId}`);
    }

    /** Clicks a link row (opens the URL in a new tab) and returns the popup URL. */
    public async linkRowOpenUrl(linkId: string): Promise<string> {
        const row = this.linkRow(linkId);
        await row.waitFor({ state: "visible" });
        const box = await row.boundingBox();
        if (!box) throw new Error("link row has no bounding box");
        // The row body hosts the task link; click the title area (left of the row) so the
        // row's own onClick (open URL in a new tab) fires. Moving the mouse here also
        // dismisses the view tab's tooltip portal, which would otherwise intercept.
        const point = { x: box.x + 80, y: box.y + 10 };
        await this.page.mouse.move(point.x, point.y);
        const context = this.page.context();
        const pagePromise = context.waitForEvent("page", { timeout: 15000 }).then(async popup => {
            await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
            const url = popup.url();
            await popup.close().catch(() => undefined);
            return url;
        });
        await this.page.mouse.click(point.x, point.y);
        const url = await pagePromise;
        if (!url.includes("example.com/w7-link")) {
            throw new Error(`Expected a URL containing "example.com/w7-link", got "${url}"`);
        }
        return url;
    }

    /** Clicks "Open link..." in the row menu and returns the popup URL. */
    public async linkMenuOpenUrl(linkId: string): Promise<string> {
        const open = this.linkMenuOpen(linkId);
        await this.openLinkRowMenu(linkId);
        return this.captureNewTabUrl(open, "example.com/w7-link");
    }

    /** Clicks "Copy url" in the row menu. */
    public async copyLinkUrl(linkId: string) {
        await this.openLinkRowMenu(linkId);
        await this.linkMenuCopy(linkId).click();
    }

    /** Reads the current clipboard text (the spec must grant clipboard-read). */
    public async readClipboard(): Promise<string> {
        return this.page.evaluate(() => navigator.clipboard.readText());
    }

    public async expectLinkCopiedToast() {
        await expect(this.page.getByText("Link copied to your clipboard")).toBeVisible();
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
    public fieldDialogTitle: Locator;
    public fieldDialogSave: Locator;
    public fieldsAddButton: Locator;

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
        this.fieldDialogTitle = page.getByTestId("field-dialog-title");
        this.fieldDialogSave = page.getByTestId("field-dialog-save");
        this.fieldsAddButton = page.getByTestId("project-fields-add");
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

    /** The row for the custom field with the given title. */
    public fieldRow(title: string): Locator {
        return this.page.getByTestId("project-field-row").filter({ hasText: title });
    }

    /** Adds a text custom field via the add dialog. */
    public async addField(title: string): Promise<void> {
        await this.openTab("fields");
        await this.fieldsAddButton.click();
        await this.fieldDialogTitle.fill(title);
        await this.fieldDialogSave.click();
        await this.fieldRow(title).waitFor({ state: "visible" });
    }

    /** Deletes a custom field via its row menu. */
    public async deleteField(title: string): Promise<void> {
        await this.openTab("fields");
        await this.fieldRow(title).getByTestId("project-field-menu").click();
        const deleteItem = this.page.getByTestId("project-field-delete");
        await deleteItem.waitFor({ state: "visible" });
        await deleteItem.click();
        // Confirm the delete dialog.
        await this.page.getByTestId("confirm-dialog-confirm-button").click();
        await this.fieldRow(title).waitFor({ state: "hidden" });
    }
}

export default Project;
