import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

const VIEW_TEST_ID = "bookmarks-view";
const ROW_PREFIX = "bookmark-row-";
const MENU_BUTTON_PREFIX = "bookmark-menu-button-";
const PIN_MENU_ITEM_PREFIX = "bookmark-menu-pin-";
const DELETE_MENU_ITEM_PREFIX = "bookmark-menu-delete-";
const SEARCH_INPUT_TEST_ID = "bookmarks-search-input";

/**
 * Page object for the Bookmarks view at `/app/bookmarks`.
 *
 * Rows, row menus and the toolbar search are app-owned, so every selector uses the
 * testids added in `packages/app/src/app/views/Bookmarks/Bookmarks.tsx`
 * (`bookmark-row-<id>`, `bookmark-menu-button-<id>`, `bookmark-menu-pin-<id>`,
 * `bookmark-menu-delete-<id>`) and `ToolbarBookmarks.tsx` (`bookmarks-search-input`).
 *
 * The view groups rows by `bookmark.type` with a `pinned` group first
 * (`Bookmarks.tsx:17`), so {@link groups} reads that rendered structure rather than
 * assuming a row order.
 */
class Bookmarks extends Base {
    constructor(page: Page) {
        super(page);
    }

    /** The rendered Bookmarks view. */
    public view(): Locator {
        return this.page.getByTestId(VIEW_TEST_ID);
    }

    /** The row for a bookmark id. */
    public row(bookmarkId: string): Locator {
        return this.page.getByTestId(`${ROW_PREFIX}${bookmarkId}`);
    }

    /** Every rendered row, including rows left by earlier runs. */
    public get rows(): Locator {
        return this.page.getByTestId(new RegExp(`^${ROW_PREFIX}`));
    }

    /** Bookmark ids currently rendered as rows, in DOM order. */
    public async renderedRowIds(): Promise<string[]> {
        const testIds = await this.rows.evaluateAll(elements =>
            elements.map(element => element.getAttribute("data-testid") ?? "")
        );
        return testIds
            .filter(testId => testId.startsWith(ROW_PREFIX))
            .map(testId => testId.slice(ROW_PREFIX.length));
    }

    /**
     * The rendered groups as `{ heading, rowIds }` in DOM order. Mirrors the grouping in
     * `Bookmarks.tsx:68` (a `div` per type with an `h5` heading and one `li` per bookmark).
     */
    public async groups(): Promise<Array<{ heading: string; rowIds: string[] }>> {
        return await this.page.evaluate(() => {
            const container = document.querySelector(".bookmarks");
            if (!container) return [];
            const groups = [];
            for (const group of container.querySelectorAll(":scope > div")) {
                const heading = group.querySelector("h5");
                const rowIds = [];
                for (const row of group.querySelectorAll("[data-testid^='bookmark-row-']")) {
                    const testId = row.getAttribute("data-testid") ?? "";
                    if (testId.startsWith("bookmark-row-")) rowIds.push(testId.slice("bookmark-row-".length));
                }
                groups.push({ heading: heading ? heading.textContent : "", rowIds });
            }
            return groups;
        });
    }

    /** Navigates to the Bookmarks view and waits for a settled render (rows or the empty state). */
    public async open() {
        await this.goto("/app/bookmarks");
        await expect(this.view()).toBeVisible();
        await expect
            .poll(
                async () =>
                    (await this.rows.count()) > 0 || (await this.page.getByText("No bookmarks").count()) > 0
            )
            .toBe(true);
    }

    public async reload(): Promise<void> {
        await this.page.reload({ waitUntil: "networkidle" });
    }

    /** Types a toolbar search query, which the view filters through `BookmarksStore.query`. */
    public async setQuery(query: string) {
        await this.page.getByTestId(SEARCH_INPUT_TEST_ID).fill(query);
    }

    /** Clears the toolbar search query so every bookmark renders again. */
    public async clearQuery() {
        await this.setQuery("");
    }

    /** Opens the row menu (Pin/Unpin and Delete) for a bookmark id. */
    public async openRowMenu(bookmarkId: string) {
        // `_bookmarks.scss` hides the popover trigger until the row is hovered.
        await this.row(bookmarkId).hover();
        await this.page.getByTestId(`${MENU_BUTTON_PREFIX}${bookmarkId}`).waitFor({ state: "visible" });
        await this.page.getByTestId(`${MENU_BUTTON_PREFIX}${bookmarkId}`).click();
        await this.page.getByTestId(`${PIN_MENU_ITEM_PREFIX}${bookmarkId}`).waitFor({
            state: "visible",
        });
    }

    /**
     * Pins/unpins a bookmark from its row menu and waits for the store mutation. The
     * request itself is a client-side no-op (see the ledger gate), so nothing is awaited
     * from the server here.
     */
    public async togglePinFromRowMenu(bookmarkId: string) {
        await this.openRowMenu(bookmarkId);
        await this.page.getByTestId(`${PIN_MENU_ITEM_PREFIX}${bookmarkId}`).click();
        await expect.poll(async () => (await this.renderedRowIds()).includes(bookmarkId)).toBe(true);
    }

    /** Deletes a bookmark from its row menu and waits for the DELETE response and row removal. */
    public async deleteFromRowMenu(bookmarkId: string) {
        await this.openRowMenu(bookmarkId);
        const response = await Promise.all([
            this.page.waitForResponse(response => response.url().includes(`/api/bookmarks/${bookmarkId}`)),
            this.page.getByTestId(`${DELETE_MENU_ITEM_PREFIX}${bookmarkId}`).click(),
        ]);
        expect(response[0].ok(), `bookmark delete failed (${response[0].status()})`).toBeTruthy();
        await expect.poll(async () => !(await this.renderedRowIds()).includes(bookmarkId)).toBe(true);
    }

    /** Lists the current user's bookmarks from the real API. */
    public async listViaApi(): Promise<any[]> {
        const response = await this.page.request.get("/api/bookmarks", {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `bookmark list failed (${response.status()})`).toBeTruthy();
        return (await response.json()).data;
    }

    /** Creates a bookmark through the real API and returns its id. */
    public async createViaApi(payload: Record<string, unknown>) {
        const response = await this.page.request.post("/api/bookmarks", {
            headers: await this.browserMutationHeaders(),
            data: payload,
        });
        expect(response.ok(), `bookmark create failed (${response.status()})`).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    /** Creates a bookmark through the real API and returns the raw response for rejection checks. */
    public async createViaApiRaw(payload: Record<string, unknown>) {
        return await this.page.request.post("/api/bookmarks", {
            headers: await this.browserMutationHeaders(),
            data: payload,
        });
    }

    /** Removes a bookmark through the real API. */
    public async deleteViaApi(bookmarkId: string) {
        const response = await this.page.request.delete(`/api/bookmarks/${bookmarkId}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `bookmark delete failed (${response.status()})`).toBeTruthy();
    }

    /** Removes a bookmark through the real API and returns the raw response for teardown checks. */
    public async deleteViaApiRaw(bookmarkId: string) {
        return await this.page.request.delete(`/api/bookmarks/${bookmarkId}`, {
            headers: await this.browserMutationHeaders(),
        });
    }

    /** Asserts a row renders and shows the given title (and URL for link bookmarks). */
    public async expectRowText(bookmarkId: string, title: string, url?: string) {
        const row = this.row(bookmarkId);
        await expect.poll(async () => (await row.count()) > 0).toBe(true);
        await expect(row.getByText(title, { exact: true })).toBeVisible();
        if (url !== undefined) {
            await expect(row.getByText(url, { exact: true })).toBeVisible();
        }
    }

    /** Asserts no row is rendered for a bookmark id. */
    public async expectRowHidden(bookmarkId: string) {
        await expect.poll(async () => (await this.row(bookmarkId).count()) === 0).toBe(true);
    }
}
export default Bookmarks;
