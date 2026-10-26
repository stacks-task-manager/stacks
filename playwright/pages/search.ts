import { expect, Locator, Page } from "@playwright/test";
import App from "./app";

/**
 * POM for the global search dialog (`packages/app/src/app/widgets/search/Search/Search.tsx`).
 * The workspace search button (`SearchButton.tsx`) owns the open/closed state, so `open()`/`close()`
 * drive that toggle. Dismissing an already-open dialog goes through the dialog's Escape contract
 * (`Search.tsx:210` clears a non-empty query first, then closes), and any other overlay left open
 * over the sidebar rail is dismissed by clicking its backdrop (`Dialog.canOutsideClickClose`) so
 * the toggle is reachable before it is clicked.
 */
class Search extends App {
    public dialog: Locator;
    public queryInput: Locator;
    public typeChips: Locator;
    public noResults: Locator;
    public results: Locator;

    constructor(page: Page) {
        super(page);

        this.dialog = this.globalSearchDialog;
        this.queryInput = this.globalSearchInput;
        this.typeChips = page.getByTestId("search-types");
        this.noResults = page.getByTestId("search-no-results");
        this.results = page.getByTestId(/^search-result-/);
    }

    public async open() {
        await this.dismissDialog();
        await this.clearRailOverSearchButton();
        await this.globalSearchButton.click();
        await expect(this.dialog).toBeVisible();
    }

    public async close() {
        await this.dismissDialog();
        await expect(this.dialog).toHaveCount(0);
    }

    // Escape closes the dialog only when the query is empty; otherwise it clears the query first.
    public async dismissDialog() {
        if ((await this.dialog.count()) === 0) return;

        await this.queryInput.focus();
        await this.queryInput.press("Escape");
        if ((await this.dialog.count()) > 0) {
            await this.queryInput.press("Escape");
        }
        await expect.poll(() => this.dialog.count()).toBe(0);
    }

    // An open Blueprint overlay raises a backdrop over the sidebar rail; clicking outside the
    // overlay closes it, so clear the rail until the search toggle is the top element.
    private async clearRailOverSearchButton() {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            if (!(await this.backdropOverSearchButton())) return;
            await this.globalSearchButton.click({ force: true });
        }
        await expect(await this.backdropOverSearchButton()).toBe(false);
    }

    private async backdropOverSearchButton(): Promise<boolean> {
        return await this.page.evaluate(() => {
            const button = document.querySelector("[data-testid=global-search-button]");
            if (!button) return false;
            const box = button.getBoundingClientRect();
            const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return top?.classList.contains("bp6-overlay-backdrop") ?? false;
        });
    }

    public async setQuery(query: string) {
        await this.queryInput.fill(query);
    }

    // The search request is debounced by 500ms and renders either rows or the empty state.
    public async waitForOutcome() {
        await expect.poll(() => this.outcomeCount()).toBeGreaterThan(0);
    }

    private async outcomeCount(): Promise<number> {
        return (await this.results.count()) + (await this.noResults.count()) + (await this.typeChips.count());
    }

    public async resultIds(): Promise<string[]> {
        return await this.results
            .evaluateAll(elements => elements.map(element => element.getAttribute("data-testid") ?? ""))
            .then(testIds => testIds.map(testId => testId.replace(/^search-result-/, "")));
    }

    public async firstResultId(): Promise<string> {
        const [first] = await this.resultIds();
        return first ?? "";
    }

    public resultItem(entityId: string): Locator {
        return this.page.getByTestId(`search-result-${entityId}`);
    }

    public typeChip(type: string): Locator {
        return this.page.getByTestId(`search-type-${type}`);
    }

    public async expectRowsFor(entityIds: string[]) {
        for (const entityId of entityIds) {
            await expect(this.resultItem(entityId)).toBeVisible();
        }
    }

    public async expectNoRowsFor(entityIds: string[]) {
        for (const entityId of entityIds) {
            await expect(this.resultItem(entityId)).toHaveCount(0);
        }
    }

    public async expectResultCount(count: number) {
        await expect.poll(() => this.results.count()).toBe(count);
    }

    public async expectEmptyState() {
        await expect(this.noResults).toBeVisible();
        await expect(this.results).toHaveCount(0);
    }

    public async expectNoSearchSurface() {
        await expect.poll(() => this.outcomeCount()).toBe(0);
    }

    public async narrowToType(type: string) {
        await this.typeChip(type).click();
        await expect.poll(() => this.resultIds()).not.toHaveLength(0);
    }

    // Keyboard contract: ArrowDown walks the results, Enter opens the selected one and closes the dialog.
    public async openResultWithKeyboard(steps: number) {
        await this.queryInput.focus();
        for (let step = 0; step < steps; step += 1) {
            await this.queryInput.press("ArrowDown");
        }
        await this.queryInput.press("Enter");
    }

    public async clearQuery() {
        await this.queryInput.press("Escape");
        await this.expectNoSearchSurface();
    }

    public async closeWithKeyboard() {
        await this.queryInput.press("Escape");
        await expect(this.dialog).toHaveCount(0);
    }
}

export default Search;
