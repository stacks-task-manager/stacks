import { expect, type Locator, type Page } from "@playwright/test";
import { DEFAULT_WORKBOOK_FILTERS, type IWorkbookFilters } from "@stacks/types";

import Base from "./base";

export type WorkbookView = "table" | "gantt" | "overview";

/** A workbook list-card test id (`workbook-<uuid>`), excluding toolbar/dialog test ids. */
const WORKBOOK_ITEM_TEST_ID = /^workbook-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Page object for the Workbooks list (`/app/workbooks`) and a workbook detail view
 * (`/app/workbooks/:id`).
 *
 * List cards use `workbook-<id>` (`Workbooks.tsx`); the detail table is the shared
 * TablePersistent renderer with `id="workbook:<id>"`, so rows are
 * `table-workbook:<id>-row-<taskId>` and can be driven through `TasksTable`.
 */
class Workbooks extends Base {
    public readonly view: Locator;
    public readonly toolbar: Locator;
    public readonly searchInput: Locator;
    public readonly createButton: Locator;
    public readonly blankSlate: Locator;
    public readonly items: Locator;

    public readonly dialog: Locator;
    public readonly titleInput: Locator;
    public readonly saveButton: Locator;
    public readonly cancelButton: Locator;
    public readonly projectFilterButton: Locator;
    public readonly inProgressSwitch: Locator;

    public readonly workbookView: Locator;
    public readonly workbookToolbar: Locator;
    public readonly toolbarTitle: Locator;
    public readonly menuButton: Locator;
    public readonly menu: Locator;
    public readonly editFiltersItem: Locator;
    public readonly deleteItem: Locator;
    public readonly overview: Locator;
    public readonly emptySlate: Locator;

    constructor(page: Page) {
        super(page);

        this.view = page.getByTestId("workbooks-view");
        this.toolbar = page.getByTestId("workbooks-toolbar");
        this.searchInput = page.getByTestId("workbooks-search-input");
        this.createButton = page.getByTestId("workbook-create-button");
        this.blankSlate = page.getByTestId("workbooks-blank-slate");
        this.items = page.getByTestId(WORKBOOK_ITEM_TEST_ID);

        this.dialog = page.getByTestId("workbook-dialog");
        this.titleInput = page.getByTestId("workbook-title-input");
        this.saveButton = page.getByTestId("workbook-save-button");
        this.cancelButton = page.getByTestId("workbook-cancel-button");
        this.projectFilterButton = page.getByTestId("task-filter-project-button");
        this.inProgressSwitch = page.getByTestId("task-filter-in-progress");

        this.workbookView = page.getByTestId("workbook-view");
        this.workbookToolbar = page.getByTestId("workbook-toolbar");
        this.toolbarTitle = page.getByTestId("workbook-toolbar-title");
        this.menuButton = page.getByTestId("workbook-menu-button");
        this.menu = page.getByTestId("workbook-menu");
        this.editFiltersItem = page.getByTestId("workbook-menu-edit-filters");
        this.deleteItem = page.getByTestId("workbook-menu-delete");
        this.overview = page.getByTestId("workbook-overview");
        this.emptySlate = page.getByTestId("workbook-empty-slate");
    }

    /** Opens the workbook list and waits for its first settled render (cards or blank slate). */
    public async open() {
        await this.goto("/app/workbooks");
        await this.expectListReady();
    }

    /** Reloads the workbook list and waits for its settled render. */
    public async reloadList() {
        await this.page.reload();
        await this.expectListReady();
    }

    /** Reloads an open workbook detail and waits for its toolbar. */
    public async reloadWorkbook() {
        await this.page.reload();
        await expect(this.workbookView).toBeVisible();
        await expect(this.workbookToolbar).toBeVisible();
    }

    private async expectListReady() {
        await expect(this.view).toBeVisible();
        await expect
            .poll(async () => (await this.items.count()) > 0 || (await this.blankSlate.count()) > 0)
            .toBe(true);
    }

    /** The list card for a workbook id. */
    public workbookItem(workbookId: string): Locator {
        return this.page.getByTestId(`workbook-${workbookId}`);
    }

    /** Workbook ids currently rendered as list cards, in DOM order. */
    public async renderedWorkbookIds(): Promise<string[]> {
        const testIds = await this.items.evaluateAll(elements =>
            elements.map(element => element.getAttribute("data-testid") ?? "")
        );
        return testIds
            .filter(testId => WORKBOOK_ITEM_TEST_ID.test(testId))
            .map(testId => testId.slice("workbook-".length));
    }

    public async expectWorkbookPresent(workbookId: string) {
        await expect(this.workbookItem(workbookId)).toBeVisible();
    }

    public async expectWorkbookAbsent(workbookId: string) {
        await expect(this.workbookItem(workbookId)).toHaveCount(0);
    }

    /** Asserts every given workbook card is rendered (other residue cards may also be present). */
    public async expectRenderedWorkbooks(workbookIds: string[]) {
        await expect
            .poll(async () => {
                const rendered = await this.renderedWorkbookIds();
                return workbookIds.every(workbookId => rendered.includes(workbookId));
            })
            .toBe(true);
    }

    public async setQuery(query: string) {
        await this.searchInput.fill(query);
    }

    public async clearQuery() {
        await this.setQuery("");
    }

    public async openCreateDialog() {
        await this.createButton.click();
        await expect(this.dialog).toBeVisible();
    }

    public async expectDialogTitle(title: string) {
        await expect(this.titleInput).toHaveValue(title);
    }

    public async fillTitle(title: string) {
        await this.titleInput.fill(title);
    }

    /** Selects a project in the workbook dialog's project filter. */
    public async selectProject(projectId: string, projectTitle: string) {
        await this.projectFilterButton.click();
        await this.page.getByTestId("project-picker-search").fill(projectTitle);
        await this.page.getByTestId(`project-picker-item-${projectId}`).click();
        // the picker is multi-select and stays open; clicking the dialog closes it
        await this.titleInput.click();
    }

    /** Saves the create dialog, returning the created workbook id after the redirect. */
    public async saveDialog(): Promise<string> {
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/api/workbooks"
        );
        await this.saveButton.click();
        const response = await responsePromise;
        expect(response.ok(), `workbook create failed (${response.status()})`).toBeTruthy();
        const { data } = await response.json();
        await expect(this.dialog).toBeHidden();
        await this.expectPath(`/app/workbooks/${data.id}`);
        return data.id as string;
    }

    /** Saves an edit dialog and waits for the PATCH response and dialog close. */
    public async saveEditDialog() {
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" &&
                new URL(response.url()).pathname.startsWith("/api/workbooks/")
        );
        await this.saveButton.click();
        const response = await responsePromise;
        expect(response.ok(), `workbook update failed (${response.status()})`).toBeTruthy();
        await expect(this.dialog).toBeHidden();
    }

    /** Opens the workbook detail by URL. */
    public async openWorkbook(workbookId: string) {
        await this.goto(`/app/workbooks/${workbookId}`);
        await expect(this.workbookView).toBeVisible();
        await expect(this.workbookToolbar).toBeVisible();
    }

    /** Opens a workbook by clicking its list card. */
    public async openWorkbookFromList(workbookId: string) {
        await this.workbookItem(workbookId).click();
        await this.expectPath(`/app/workbooks/${workbookId}`);
        await expect(this.workbookToolbar).toBeVisible();
    }

    public async expectToolbarTitle(title: string) {
        await expect(this.toolbarTitle).toHaveText(title);
    }

    /** Waits for the workbook's task render (table or empty slate). */
    public async waitForTasks(workbookId: string) {
        await expect(this.page.getByTestId(`table-workbook:${workbookId}`).or(this.emptySlate)).toBeVisible();
    }

    public async selectView(view: WorkbookView) {
        await this.page.getByTestId(`workbook-view-tab-${view}`).click();
        if (view === "overview") await expect(this.overview).toBeVisible();
    }

    public async expectSummary({
        idle,
        inProgress,
        completed,
    }: {
        idle?: number;
        inProgress?: number;
        completed?: number;
    }) {
        if (idle !== undefined) {
            await expect(this.page.getByTestId("project-overview-tasks-idle")).toHaveText(String(idle));
        }
        if (inProgress !== undefined) {
            await expect(this.page.getByTestId("project-overview-tasks-in-progress")).toHaveText(
                String(inProgress)
            );
        }
        if (completed !== undefined) {
            await expect(this.page.getByTestId("project-overview-tasks-completed")).toHaveText(
                String(completed)
            );
        }
    }

    public async expectRecentTask(taskId: string) {
        await expect(this.page.getByTestId(`workbook-recent-task-${taskId}`)).toBeVisible();
    }

    public async openMenu() {
        await this.menuButton.click();
        await expect(this.menu).toBeVisible();
    }

    public async openEditFilters() {
        await this.openMenu();
        await this.editFiltersItem.click();
        await expect(this.dialog).toBeVisible();
    }

    /** Enables the workbook filter "Only tasks in progress". */
    public async enableInProgressFilter() {
        await expect(this.inProgressSwitch).not.toBeChecked();
        // the label's visual indicator intercepts pointer events; force the hidden input
        await this.inProgressSwitch.click({ force: true });
        await expect(this.inProgressSwitch).toBeChecked();
    }

    /** Deletes the open workbook through its toolbar menu and confirmation dialog. */
    public async deleteFromMenu(workbookId: string) {
        await this.openMenu();
        await this.deleteItem.click();

        const dialog = this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });

        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "DELETE" &&
                new URL(response.url()).pathname === `/api/workbooks/${workbookId}`
        );
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        const response = await responsePromise;
        expect(response.ok(), `workbook delete failed (${response.status()})`).toBeTruthy();
        await expect(dialog).toBeHidden();
        await expect(this.view).toBeVisible();
    }

    // -- setup/cleanup helpers (API-level, no DOM) --

    public async listViaApi(): Promise<any[]> {
        const response = await this.page.request.get("/api/workbooks");
        expect(response.ok(), `workbook list failed (${response.status()})`).toBeTruthy();
        return (await response.json()).data;
    }

    /** Creates a workbook through the API and returns its id. */
    public async createViaApi({
        title,
        filters,
    }: {
        title: string;
        filters?: Partial<IWorkbookFilters>;
    }): Promise<string> {
        const headers = await this.browserMutationHeaders();
        const response = await this.page.request.post("/api/workbooks", {
            headers,
            data: {
                title,
                filters: { ...DEFAULT_WORKBOOK_FILTERS, ...filters },
            },
        });
        expect(response.ok(), `workbook create failed (${response.status()})`).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    /** Hard-deletes a workbook through the API; 404 is accepted so cleanup is repeatable. */
    public async deleteViaApi(workbookId: string) {
        const headers = await this.browserMutationHeaders();
        const response = await this.page.request.delete(`/api/workbooks/${workbookId}`, { headers });
        if (![200, 204, 404].includes(response.status())) {
            throw new Error(`Workbook cleanup failed with HTTP ${response.status()}`);
        }
    }
}

export default Workbooks;
