import { expect, Locator, Page } from "@playwright/test";

const TABLE_ID = "tasks-filtered";
/** localStorage key (tenant-prefixed by the app's Storage utility) for the table's visible columns. */
const COLUMN_KEY = "table-tasks-filtered-visible-columns";

/**
 * Page object for the filtered tasks table at `/app/tasks?…`.
 *
 * All DOM selectors rely on the TablePersistent data-testid attributes:
 * - table: `table-${TABLE_ID}`
 * - row:   `table-${TABLE_ID}-row-<taskId>`
 * - cell:  `table-${TABLE_ID}-cell-<taskId>-<column>`
 */
class TasksTable {
    private page: Page;

    /**
     * The value that existed in localStorage before this POM overrode the column
     * visibility preference (null = the key was absent). `restoreColumnVisibility()`
     * re-applies exactly that, including its absence.
     */
    private previousColumnVisibility: string | null = null;
    private hasOverriddenColumns = false;

    constructor(page: Page) {
        this.page = page;
    }

    private async scopedStorageKey(key: string): Promise<string> {
        return await this.page.evaluate(async key => {
            const response = await fetch("/api/boot");
            if (!response.ok) throw new Error(`Boot data lookup failed with HTTP ${response.status}`);
            const { data } = await response.json();
            const tenantId = data?.session?.tenantId;
            if (!tenantId) throw new Error("Boot data did not include the storage tenant");
            return `${tenantId}/${key}`;
        }, key);
    }

    private async mutateApi(
        method: "POST" | "PATCH" | "DELETE",
        path: string,
        data?: Record<string, unknown>
    ): Promise<{ ok: boolean; status: number; body: any }> {
        return await this.page.evaluate(
            async ({ method, path, data }) => {
                const csrfResponse = await fetch("/auth/csrf");
                const csrfBody = await csrfResponse.json();
                const response = await fetch(path, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        "x-csrf-token": csrfBody.data?.token,
                    },
                    body: data ? JSON.stringify(data) : undefined,
                });
                const body = await response.json().catch(() => null);
                return { ok: response.ok, status: response.status, body };
            },
            { method, path, data }
        );
    }

    /** The row for a task id. */
    public row(taskId: string): Locator {
        return this.page.getByTestId(`table-${TABLE_ID}-row-${taskId}`);
    }

    public get rows(): Locator {
        return this.page.getByTestId(new RegExp(`^table-${TABLE_ID}-row-`));
    }

    /** A cell within the row of a known task id. */
    public cell(taskId: string, column: string): Locator {
        return this.row(taskId).getByTestId(`table-${TABLE_ID}-cell-${taskId}-${column}`);
    }

    /**
     * Navigates to the filtered tasks table and waits for it to render.
     *
     * `visibleColumns` overrides the persisted column visibility for this session
     * (the table default hides e.g. the `priority` and `assignees` columns).
     * Pair with `restoreColumnVisibility()` after the scenario.
     */
    public async openFilteredTasks(query: Record<string, string>, visibleColumns?: string[]): Promise<void> {
        if (visibleColumns) {
            const storageKey = await this.scopedStorageKey(COLUMN_KEY);
            const previous = await this.page.evaluate(
                ({ storageKey, columns }) => {
                    const previous = localStorage.getItem(storageKey);
                    localStorage.setItem(storageKey, JSON.stringify(columns));
                    return previous;
                },
                { storageKey, columns: visibleColumns }
            );
            if (!this.hasOverriddenColumns) {
                this.previousColumnVisibility = previous;
                this.hasOverriddenColumns = true;
            }
            await this.page.reload();
        }

        const qs = new URLSearchParams(query).toString();
        await this.page.goto(`/app/tasks?${qs}`);
        const table = this.page.getByTestId(`table-${TABLE_ID}`);
        const emptySlate = this.page.getByTestId("tasks-no-match-slate");
        await expect(table.or(emptySlate)).toBeVisible();
    }

    /**
     * Re-applies the column-visibility preference saved when this POM overrode it —
     * restoring its absence when the key did not exist before. Does nothing when
     * this POM never touched the preference. Safe to call after a failed scenario.
     */
    public async restoreColumnVisibility() {
        if (!this.hasOverriddenColumns || this.page.isClosed()) return;
        await this.seedColumnVisibility(this.previousColumnVisibility);
        this.hasOverriddenColumns = false;
    }

    /** The persisted column-visibility preference for the current tenant (null = absent). */
    public async columnVisibility(): Promise<string | null> {
        if (this.page.isClosed()) return null;
        const storageKey = await this.scopedStorageKey(COLUMN_KEY);
        return await this.page.evaluate(storageKey => localStorage.getItem(storageKey), storageKey);
    }

    /** Writes the persisted column-visibility preference, or removes it when given null. */
    public async seedColumnVisibility(value: string | null) {
        const storageKey = await this.scopedStorageKey(COLUMN_KEY);
        await this.page.evaluate(
            ({ storageKey, value }) => {
                if (value === null || value === undefined) localStorage.removeItem(storageKey);
                else localStorage.setItem(storageKey, value);
            },
            { storageKey, value }
        );
    }

    /**
     * Navigates to a filtered tasks URL whose filter matches nothing and waits for the empty state,
     * so a following `expectRowAbsent` cannot pass against a stale render. Pair with
     * {@link openFilteredTasks} when the filter is expected to match.
     */
    public async gotoEmptyFilteredTasks(query: Record<string, string>) {
        const qs = new URLSearchParams(query).toString();
        await this.page.goto(`/app/tasks?${qs}`);
        await this.page.getByTestId("tasks-no-match-slate").waitFor({ state: "visible" });
    }

    /**
     * Task ids the filtered list route returns for the same query keys the view uses.
     * Awaits the API response, so a scenario can compare the server's answer with the rendered DOM.
     */
    public async filteredTaskIds(query: Record<string, string>): Promise<string[]> {
        const qs = new URLSearchParams(query).toString();
        const response = await this.page.request.get(`/api/tasks?${qs}`);
        if (!response.ok()) {
            throw new Error(`Filtered task lookup failed with HTTP ${response.status()}`);
        }
        const { data } = await response.json();
        return (data as { id: string }[]).map(row => row.id);
    }

    /**
     * ISO date-time at noon on the page's local day `offset` days away. The value is computed inside
     * the browser so it shares the clock of the date pickers that set the task dates, and noon keeps
     * a whole-day window from slipping across time zones.
     */
    public async dayWindowValue(offset: number): Promise<string> {
        return await this.page.evaluate(
            ({ offset }) => {
                const day = new Date();
                day.setDate(day.getDate() + offset);
                const month = String(day.getMonth() + 1).padStart(2, "0");
                const date = String(day.getDate()).padStart(2, "0");
                return `${day.getFullYear()}-${month}-${date}T12:00:00.000Z`;
            },
            { offset }
        );
    }

    /** Asserts the table shows a row for the task id. */
    public async expectRowVisible(taskId: string) {
        await expect(this.row(taskId)).toBeVisible();
    }

    /** Asserts the table renders no row for the task id (the filter excluded it). */
    public async expectRowAbsent(taskId: string) {
        await expect(this.row(taskId)).toHaveCount(0);
    }

    public async expectRowCount(count: number) {
        await expect(this.rows).toHaveCount(count);
    }

    /** Asserts a cell's rendered text. */
    public async expectCellText(taskId: string, column: string, expectedText: string) {
        await expect(this.cell(taskId, column)).toHaveText(expectedText);
    }

    /** Asserts a cell's rendered text is not present yet. */
    public async expectCellTextNot(taskId: string, column: string, expectedText: string) {
        await expect(this.cell(taskId, column)).not.toHaveText(expectedText);
    }

    /** Changes a task's priority through the in-cell priority picker. */
    public async setPriority(taskId: string, priority: string) {
        await this.row(taskId).getByTestId("priority-button").click();
        await this.page.getByTestId("priority-menu").waitFor({ state: "visible" });
        await this.page.getByTestId("priority-menu").getByTestId(`priority-${priority}`).click();
    }

    /** Sets a task's due date to "Tomorrow" through the in-cell date picker. */
    public async setDueDateToTomorrow(taskId: string) {
        await this.cell(taskId, "duedate").getByTestId("round-button-date-add").click();
        await this.page.getByTestId("date-picker").waitFor({ state: "visible" });
        await this.page.getByTestId("date-picker-shortcut-tomorrow").click();
        await this.page.getByTestId("date-picker-apply").click();
    }

    /**
     * Asserts the due-date cell's rendered text contains tomorrow's date. The
     * expected value is computed inside the browser page, so it shares the date
     * picker's clock and time zone. Containment (not exact equality) is deliberate:
     * the cell renders the full extended format, e.g. `"Oct 16, 2026, 12:00 PM"`,
     * and the time-of-day convention is not what this regression targets.
     */
    public async expectDueDateShowsTomorrow(taskId: string) {
        const expectedDate = await this.page.evaluate(() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }).format(tomorrow);
        });
        await expect(this.cell(taskId, "duedate")).toContainText(expectedDate);
    }

    // -- setup/cleanup helpers (API-level, no DOM) --

    /** Returns the person id of the person with the given email. */
    public async getPersonIdByEmail(email: string): Promise<string> {
        const response = await this.page.request.get("/api/people");
        const { data } = await response.json();
        const person = data.find((item: any) => item.email === email);
        if (!person) throw new Error(`Person with email ${email} not found`);
        return person.id;
    }

    /** Creates a stack in a project through the API. Returns the stack id. */
    public async createStackViaApi({
        projectId,
        title,
    }: {
        projectId: string;
        title: string;
    }): Promise<string> {
        const created = await this.mutateApi("POST", "/api/stacks", { project: projectId, title });
        if (!created.ok) throw new Error(`Stack creation failed with HTTP ${created.status}`);
        return created.body.data.id;
    }

    /** Waits until a task (matched by title in a project) exists, then returns its id. */
    public async waitForTaskViaApi({
        projectId,
        title,
    }: {
        projectId: string;
        title: string;
    }): Promise<string> {
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
            const response = await this.page.request.get(`/api/tasks?project=${projectId}`);
            const { data } = await response.json();
            const task = data.find((item: any) => item.title === title);
            if (task) return task.id;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error(`Task "${title}" not found in project ${projectId}`);
    }

    /** Assigns a task (matched by title in a project) to a person. Returns the task id. */
    public async assignTaskViaApi({
        projectId,
        title,
        personId,
    }: {
        projectId: string;
        title: string;
        personId: string;
    }): Promise<string> {
        const response = await this.page.request.get(`/api/tasks?project=${projectId}`);
        const { data } = await response.json();
        const task = data.find((item: any) => item.title === title);
        if (!task) throw new Error(`Task "${title}" not found in project ${projectId}`);

        const update = await this.mutateApi("PATCH", `/api/tasks/${task.id}`, {
            assignees: [personId],
        });
        if (!update.ok) throw new Error(`Assigning task failed with HTTP ${update.status}`);

        return task.id;
    }

    /**
     * Id of the tag or status with an exact title, creating it when the workspace has none.
     * The lookup-first shape keeps repeated runs from stacking up duplicates, since tags have no
     * DELETE route to clean up after them.
     */
    public async findOrCreateTagViaApi({
        title,
        type,
    }: {
        title: string;
        type: "tag" | "status";
    }): Promise<string> {
        const response = await this.page.request.get("/api/tags");
        if (!response.ok()) throw new Error(`Tag lookup failed with HTTP ${response.status()}`);
        const { data } = await response.json();
        const existing = (data as any[]).find(
            row => row.title === title && row.type === type && row.section === "projects"
        );
        if (existing) return existing.id;

        const created = await this.mutateApi("POST", "/api/tags", {
            title,
            color: "#888888",
            section: "projects",
            type,
        });
        if (!created.ok) throw new Error(`Tag creation failed with HTTP ${created.status}`);
        return created.body.data.id;
    }

    /** Replaces a task's tags through the API. */
    public async setTaskTagsViaApi(taskId: string, tagIds: string[]) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, { tags: tagIds });
        if (!response.ok) throw new Error(`Tagging task failed with HTTP ${response.status}`);
    }

    /** Sets a task's status tag through the API. */
    public async setTaskStatusViaApi(taskId: string, statusTagId: string) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, { status: statusTagId });
        if (!response.ok) throw new Error(`Setting task status failed with HTTP ${response.status}`);
    }

    /** Sets a task's progress percentage through the API. */
    public async setTaskProgressViaApi(taskId: string, progress: number) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, { progress });
        if (!response.ok) throw new Error(`Setting task progress failed with HTTP ${response.status}`);
    }

    /** Seeds a task's due date and progress for a filtered-list scenario. */
    public async setTaskDueDateAndProgressViaApi(taskId: string, dueDate: string, progress: number) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, {
            duedate: dueDate,
            progress,
        });
        if (!response.ok) {
            throw new Error(`Setting task due date and progress failed with HTTP ${response.status}`);
        }
    }

    /** Creates a task inside a project stack through the API. Returns the new task id. */
    public async createTaskViaApi({
        projectId,
        stackId,
        title,
    }: {
        projectId: string;
        stackId: string;
        title: string;
    }): Promise<string> {
        const created = await this.mutateApi("POST", "/api/tasks", {
            task: { title, project: projectId, stack: stackId },
        });
        if (!created.ok) throw new Error(`Task creation failed with HTTP ${created.status}`);
        return created.body.data.id;
    }

    /** Replaces the assignees of a task through the API. */
    public async setTaskAssigneesViaApi(taskId: string, personIds: string[]) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, { assignees: personIds });
        if (!response.ok) throw new Error(`Setting task assignees failed with HTTP ${response.status}`);
    }

    /** Marks a task complete or open through the API. */
    public async setTaskDoneViaApi(taskId: string, done: boolean) {
        const response = await this.mutateApi("PATCH", `/api/tasks/${taskId}`, { done });
        if (!response.ok) throw new Error(`Setting task completion failed with HTTP ${response.status}`);
    }

    /** Hard-deletes a task through the API. */
    public async deleteTaskViaApi(taskId: string) {
        const response = await this.mutateApi("DELETE", `/api/tasks/${taskId}`);
        if (!response.ok) throw new Error(`Task cleanup failed with HTTP ${response.status}`);
    }
}

export default TasksTable;
