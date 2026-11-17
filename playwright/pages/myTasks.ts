import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

const TABLE_ID = "mytasks";
const VIEW_TEST_ID = "my-tasks-view";
const BLANK_SLATE_TEST_ID = "my-tasks-blank-slate";
const CLEAR_FILTERS_TEST_ID = "my-tasks-clear-filters";
/** localStorage key (tenant-prefixed by the app's Storage utility) for the group expansion state. */
const GROUP_EXPANSION_KEY = "table-mytasks-visible-groups";
const ROW_TEST_ID_PREFIX = `table-${TABLE_ID}-row-`;

/**
 * Page object for the My Tasks view at `/app/mytasks?…`.
 *
 * Rows come from the shared TablePersistent renderer with `id="mytasks"`
 * (`packages/app/src/app/views/MyTasks/MyTasks.tsx:107`), so every selector relies on
 * the row testid `table-mytasks-row-<taskId>`. There is no `table-mytasks` root testid.
 *
 * My Tasks groups rows by project document and a collapsed group renders no rows at all
 * (`packages/app/src/app/components/common/Table/TablePersistent/TablePersistent.tsx:671`),
 * while only the first group is expanded by default (`MyTasks.tsx:63`). With a live database
 * the scenario project is never first, so {@link expandGroup} must run before any membership
 * assertion. It writes the same persisted value the group header toggle writes
 * (`TablePersistent.tsx:589`) and reloads, so the app reads it through its own storage path.
 */
class MyTasks extends Base {
    constructor(page: Page) {
        super(page);
    }

    /** The rendered My Tasks view. */
    public view(): Locator {
        return this.page.getByTestId(VIEW_TEST_ID);
    }

    /** The empty state rendered when no task matches. */
    public blankSlate(): Locator {
        return this.page.getByTestId(BLANK_SLATE_TEST_ID);
    }

    /** The row for a task id. */
    public row(taskId: string): Locator {
        return this.page.getByTestId(`table-${TABLE_ID}-row-${taskId}`);
    }

    /** Every rendered row, including rows belonging to other (residue) projects. */
    public get rows(): Locator {
        return this.page.getByTestId(new RegExp(`^table-${TABLE_ID}-row-`));
    }

    /** Task ids currently rendered as rows, in DOM order. */
    public async renderedRowIds(): Promise<string[]> {
        const testIds = await this.rows.evaluateAll(elements =>
            elements.map(element => element.getAttribute("data-testid") ?? "")
        );
        return testIds
            .filter(testId => testId.startsWith(ROW_TEST_ID_PREFIX))
            .map(testId => testId.slice(ROW_TEST_ID_PREFIX.length));
    }

    /**
     * The tenant-scoped localStorage key the app uses for a storage key. Mirrors the
     * private helper in `pages/tasksTable.ts` because that one is not reusable here.
     */
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

    /**
     * Navigates to My Tasks and waits for a settled render (rows or the empty state),
     * so a following membership assertion cannot pass against a stale document.
     */
    public async open(query?: Record<string, string>) {
        const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
        await this.goto(`/app/mytasks${qs}`);
        await expect(this.view()).toBeVisible();
        await expect
            .poll(async () => (await this.rows.count()) > 0 || (await this.blankSlate().count()) > 0)
            .toBe(true);
    }

    /** Navigates to a My Tasks filter that matches nothing and waits for the empty state. */
    public async openEmpty(query: Record<string, string>) {
        const qs = new URLSearchParams(query).toString();
        await this.goto(`/app/mytasks?${qs}`);
        await this.blankSlate().waitFor({ state: "visible" });
    }

    /**
     * Clicks the empty state's "Clear filters" action and waits for the default list to
     * render again. Only valid after {@link openEmpty}.
     */
    public async clearFilters() {
        await this.page.getByTestId(CLEAR_FILTERS_TEST_ID).click();
        await expect.poll(async () => (await this.rows.count()) > 0).toBe(true);
    }

    /**
     * Expands the group for a project document so its rows render, then reloads so the
     * table re-reads the persisted preference. Pair with {@link clearGroupExpansion}.
     */
    public async expandGroup(groupId: string) {
        await this.setGroupExpansion(groupId, true);
    }

    /** Drops the persisted group-expansion entry for a scenario document. */
    public async clearGroupExpansion(groupId: string) {
        await this.setGroupExpansion(groupId, false);
    }

    private async setGroupExpansion(groupId: string, expanded: boolean) {
        const storageKey = await this.scopedStorageKey(GROUP_EXPANSION_KEY);
        await this.page.evaluate(
            ({ storageKey, groupId, expanded }) => {
                const raw = localStorage.getItem(storageKey);
                const entries = raw ? JSON.parse(raw) : [];
                const next = entries.filter((entry: string) => !entry.startsWith(`${groupId}:`));
                if (expanded) next.push(`${groupId}:on`);
                localStorage.setItem(storageKey, JSON.stringify(next));
            },
            { storageKey, groupId, expanded }
        );
        await this.page.reload();
    }

    /**
     * Asserts that exactly the expected scenario tasks are rendered.
     *
     * Membership is compared only against the ids this scenario created, so pre-existing
     * rows from other projects (the live database is never reset) cannot affect the result.
     */
    public async expectScenarioMembership(visible: string[], scenarioIds: string[]) {
        await expect
            .poll(async () => {
                const rendered = await this.renderedRowIds();
                const owned = scenarioIds.filter(id => rendered.includes(id)).sort();
                return owned.join(",") === [...visible].sort().join(",");
            })
            .toBe(true);
    }

    /** Asserts the address bar still carries the given filter parameters. */
    public async expectQuery(params: Record<string, string>) {
        await this.expectPath("/app/mytasks", params);
    }

    /** Reloads the current My Tasks document, so persisted state must survive a fresh load. */
    public async reload() {
        await this.page.reload();
    }

    // ---------------------------------------------------------------------------
    // W4 — Schedule / timebox view
    // ---------------------------------------------------------------------------

    /** The List view toggle in the My Tasks toolbar. */
    public viewListButton(): Locator {
        return this.page.getByTestId("my-tasks-view-list-button");
    }

    /** The Schedule view toggle in the My Tasks toolbar. */
    public viewScheduleButton(): Locator {
        return this.page.getByTestId("my-tasks-view-schedule-button");
    }

    /** The timebox sub-view selector (Board / Calendar widths). Only rendered in Schedule. */
    public timeboxViewButton(): Locator {
        return this.page.getByTestId("timebox-view-button");
    }

    /** The current date-span label. Only rendered in Schedule. */
    public dateLabel(): Locator {
        return this.page.getByTestId("timebox-date-label");
    }

    /** The "Go to Today" button. Rendered only when the current span does not contain today. */
    public todayButton(): Locator {
        return this.page.getByTestId("timebox-today-button");
    }

    /** The rendered timebox board branch. */
    public board(): Locator {
        return this.page.getByTestId("timebox-board");
    }

    /** The rendered timebox calendar branch. */
    public calendar(): Locator {
        return this.page.getByTestId("timebox-calendar");
    }

    /** The day slot (column) for a `yyyy-MM-dd` date in the timebox board. */
    public slot(date: string): Locator {
        return this.page.getByTestId(`timebox-slot-${date}`);
    }

    /** The task card for a task id, scoped to the day slot for a date. */
    public taskInSlot(date: string, taskId: string): Locator {
        return this.slot(date).getByTestId(`timebox-task-${taskId}`);
    }

    /** Switches to the Schedule view and waits for the timebox to render (defaults to the board). */
    public async openSchedule() {
        await this.viewScheduleButton().click();
        await expect(this.board()).toBeVisible();
    }

    /** Switches back to the List view so a later scenario does not inherit the schedule state. */
    public async openList() {
        await this.viewListButton().click();
        await expect(this.board()).toBeHidden();
    }

    /** Asserts which timebox branch (board or calendar) is rendered. */
    public async expectScheduleView(kind: "board" | "calendar") {
        if (kind === "board") {
            await expect(this.board()).toBeVisible();
            await expect(this.calendar()).toBeHidden();
        } else {
            await expect(this.calendar()).toBeVisible();
            await expect(this.board()).toBeHidden();
        }
    }

    private async selectScheduleMenuItem(testId: string) {
        await this.timeboxViewButton().click();
        const item = this.page.getByTestId(testId);
        // Wait for the popover to fully open before clicking so the interaction is stable.
        await item.waitFor({ state: "visible", timeout: 10000 });
        await item.click();
    }

    public async selectScheduleBoard() {
        await this.selectScheduleMenuItem("timebox-schedule-board");
        await expect(this.board()).toBeVisible();
    }

    public async selectCalendarOne() {
        await this.selectScheduleMenuItem("timebox-calendar-one");
        await expect(this.calendar()).toBeVisible();
    }

    public async selectCalendarThree() {
        await this.selectScheduleMenuItem("timebox-calendar-three");
        await expect(this.calendar()).toBeVisible();
    }

    public async selectCalendarWeekdays() {
        await this.selectScheduleMenuItem("timebox-calendar-weekdays");
        await expect(this.calendar()).toBeVisible();
    }

    public async selectCalendarWeek() {
        await this.selectScheduleMenuItem("timebox-calendar-week");
        await expect(this.calendar()).toBeVisible();
    }

    public async selectCalendarMonth() {
        await this.selectScheduleMenuItem("timebox-calendar-month");
        await expect(this.calendar()).toBeVisible();
    }

    /** Reads the current date-span label text. */
    public async getDateLabelText(): Promise<string> {
        return (await this.dateLabel().textContent())?.trim() ?? "";
    }

    /** Asserts the date-span label contains the expected text. */
    public async expectDateLabel(text: string) {
        await expect(this.dateLabel()).toContainText(text);
    }

    /** Moves the visible date span one step back or forward via the toolbar buttons. */
    public async moveSpan(direction: "prev" | "next") {
        const testId = direction === "prev" ? "timebox-prev-button" : "timebox-next-button";
        await this.page.getByTestId(testId).click();
    }

    /**
     * Returns to today. If the current span already contains today the Today button is absent, so
     * the span is advanced until it appears; clicking it restores the today span and hides it again.
     */
    public async goToToday() {
        await expect
            .poll(
                async () => {
                    if (await this.todayButton().isVisible()) return true;
                    await this.moveSpan("next");
                    return false;
                },
                { timeout: 15000 }
            )
            .toBe(true);
        await this.todayButton().click();
        await expect(this.todayButton()).toBeHidden();
    }

    /** Maps the bound navigation keys to Playwright key names. */
    private static readonly NAV_KEY_MAP: Record<string, string> = {
        Left: "ArrowLeft",
        Right: "ArrowRight",
        Up: "ArrowUp",
    };

    /** Presses a timebox navigation key (Left/Right/Up) after clearing any focused control. */
    public async pressNavKey(key: "Left" | "Right" | "Up") {
        await this.page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (el && el !== document.body) el.blur();
        });
        await this.page.keyboard.press(MyTasks.NAV_KEY_MAP[key]);
    }

    /** Asserts a task with a date is rendered inside the day slot for that date. */
    public async expectTaskInSlot(date: string, taskId: string) {
        await expect(this.slot(date)).toBeVisible();
        await expect(this.taskInSlot(date, taskId)).toBeVisible();
    }
}

export default MyTasks;
