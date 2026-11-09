import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Sidebar from "../../pages/sidebar";
import Bookmarks from "../../pages/bookmarks";

/**
 * Bookmarks (`/app/bookmarks`) and the sidebar quick-add dialog against the real API.
 *
 * Every record is scenario-owned (`TOKEN`), so the seeded DB never makes an assertion
 * deterministic. The view groups rows by `bookmark.type` with a `pinned` group first
 * (`packages/app/src/app/views/Bookmarks/Bookmarks.tsx:17`), so grouping assertions read the
 * rendered headings through {@link Bookmarks.groups} rather than assuming a row order.
 *
 * Reproduce: `yarn test:e2e:headed playwright/tests/bookmarks/bookmarks.spec.ts --retries=0 --project=chrome --no-deps`
 */
const TOKEN = `e2e-bookmarks-${Date.now()}`;
const DRAFT_TITLE = `Bookmark draft ${TOKEN}`;
const DRAFT_URL = `https://example.com/${TOKEN}-draft`;
const FINAL_TITLE = `Bookmark final ${TOKEN}`;
const FINAL_URL = `https://example.com/${TOKEN}-final`;
const CANCELLED_TITLE = `Bookmark cancelled ${TOKEN}`;
const CANCELLED_URL = `https://example.com/${TOKEN}-cancelled`;
const DELETED_TITLE = `Bookmark deleted ${TOKEN}`;
const DELETED_URL = `https://example.com/${TOKEN}-deleted`;
const FILTER_HIT_TITLE = `Bookmark filter hit ${TOKEN}`;
const FILTER_HIT_URL = `https://example.com/${TOKEN}-filter-hit`;
const FILTER_MISS_TITLE = `Bookmark filter miss ${TOKEN}`;
const FILTER_MISS_URL = `https://example.com/${TOKEN}-filter-miss`;
const FILTER_QUERY = `${TOKEN}-filter-hit`;
const PINNED_TITLE = `Bookmark pinned ${TOKEN}`;
const PINNED_URL = `https://example.com/${TOKEN}-pinned`;
const TOGGLED_TITLE = `Bookmark pin toggle ${TOKEN}`;
const TOGGLED_URL = `https://example.com/${TOKEN}-pin-toggle`;
const INTERNAL_TITLE = `Bookmark internal ${TOKEN}`;
const PINNED_HEADING = "Pinned bookmarks";
const LINKS_HEADING = "Links";

test.describe("Bookmarks - Sidebar bookmarks", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let sidebar: Sidebar;
    let bookmarks: Bookmarks;
    const created: string[] = [];

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        sidebar = new Sidebar(page);
        bookmarks = new Bookmarks(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        const cleanupErrors: string[] = [];

        const attempt = async (label: string, action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                cleanupErrors.push(`${label}: ${error}`);
            }
        };

        for (const bookmarkId of created) {
            try {
                if (!page || page.isClosed()) {
                    cleanupErrors.push(`bookmark ${bookmarkId} cleanup skipped: page closed`);
                    continue;
                }
                const response = await bookmarks.deleteViaApiRaw(bookmarkId);
                if (![200, 204, 404].includes(response.status())) {
                    cleanupErrors.push(`bookmark ${bookmarkId} cleanup returned HTTP ${response.status()}`);
                }
            } catch (error) {
                cleanupErrors.push(`bookmark ${bookmarkId} cleanup failed: ${error}`);
            }
        }

        try {
            if (page && !page.isClosed()) {
                const leaked = (await bookmarks.listViaApi()).filter((record: any) =>
                    created.includes(record.id)
                );
                if (leaked.length) {
                    cleanupErrors.push(`bookmarks still present after cleanup: ${leaked.map(r => r.id)}`);
                }
            }
        } catch (error) {
            cleanupErrors.push(`bookmark cleanup verification failed: ${error}`);
        }

        await attempt("close page", () => page.close());
        await attempt("close context", () => context.close());
        await attempt("close browser", () => browser.close());
        if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Bookmarks cleanup failed");
    });

    test("Should create a URL bookmark from the quick add menu and keep it after a reload", async () => {
        await sidebar.addNew("bookmark");
        await sidebar.newBookmarkDialog.fill(DRAFT_TITLE, DRAFT_URL);
        await sidebar.newBookmarkDialog.edit(FINAL_TITLE, FINAL_URL);
        const bookmarkId = await sidebar.newBookmarkDialog.save();
        created.push(bookmarkId);

        await bookmarks.open();
        await bookmarks.expectRowText(bookmarkId, FINAL_TITLE, FINAL_URL);

        const record = (await bookmarks.listViaApi()).find((bookmark: any) => bookmark.id === bookmarkId);
        expect(record, `bookmark ${bookmarkId} missing from the API list`).toBeDefined();
        expect([record.title, record.url, record.type, record.pinned]).toEqual([
            FINAL_TITLE,
            FINAL_URL,
            "url",
            false,
        ]);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowText(bookmarkId, FINAL_TITLE, FINAL_URL);
    });

    test("Should keep the dialog edits as the saved values", async () => {
        const record = (await bookmarks.listViaApi()).find((bookmark: any) => bookmark.title === FINAL_TITLE);
        expect(record, `the saved bookmark is not listed`).toBeDefined();
        expect(record.url).toBe(FINAL_URL);
        const drafts = (await bookmarks.listViaApi()).filter(
            (bookmark: any) => bookmark.title === DRAFT_TITLE
        );
        expect(drafts.length, `the draft title ${DRAFT_TITLE} was saved instead`).toBe(0);
    });

    test("Should cancel the quick add dialog without creating a bookmark", async () => {
        await sidebar.addNew("bookmark");
        await sidebar.newBookmarkDialog.fill(CANCELLED_TITLE, CANCELLED_URL);
        await sidebar.newBookmarkDialog.cancel();

        const cancelled = (await bookmarks.listViaApi()).filter(
            (bookmark: any) => bookmark.title === CANCELLED_TITLE
        );
        expect(cancelled.length, `cancelled dialog created ${CANCELLED_TITLE}`).toBe(0);
    });

    test("Should delete a bookmark from its row menu and keep it gone after a reload", async () => {
        const bookmarkId = await bookmarks.createViaApi({
            title: DELETED_TITLE,
            url: DELETED_URL,
            type: "url",
            pinned: false,
        });
        created.push(bookmarkId);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowText(bookmarkId, DELETED_TITLE, DELETED_URL);

        await bookmarks.deleteFromRowMenu(bookmarkId);
        await bookmarks.expectRowHidden(bookmarkId);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowHidden(bookmarkId);
        const stillListed = (await bookmarks.listViaApi()).filter(
            (bookmark: any) => bookmark.id === bookmarkId
        );
        expect(stillListed.length, `deleted bookmark ${bookmarkId} is still listed`).toBe(0);
    });

    test("Should filter the list from the toolbar search", async () => {
        const hitId = await bookmarks.createViaApi({
            title: FILTER_HIT_TITLE,
            url: FILTER_HIT_URL,
            type: "url",
            pinned: false,
        });
        const missId = await bookmarks.createViaApi({
            title: FILTER_MISS_TITLE,
            url: FILTER_MISS_URL,
            type: "url",
            pinned: false,
        });
        created.push(hitId, missId);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowText(hitId, FILTER_HIT_TITLE, FILTER_HIT_URL);
        await bookmarks.expectRowText(missId, FILTER_MISS_TITLE, FILTER_MISS_URL);

        await bookmarks.setQuery(FILTER_QUERY);
        await expect
            .poll(async () => {
                const rendered = await bookmarks.renderedRowIds();
                return rendered.includes(hitId) && !rendered.includes(missId);
            })
            .toBe(true);

        await bookmarks.clearQuery();
        await expect
            .poll(async () => {
                const rendered = await bookmarks.renderedRowIds();
                return rendered.includes(hitId) && rendered.includes(missId);
            })
            .toBe(true);
    });

    test("Should group a pinned bookmark under the pinned heading and keep it after a reload", async () => {
        const bookmarkId = await bookmarks.createViaApi({
            title: PINNED_TITLE,
            url: PINNED_URL,
            type: "url",
            pinned: true,
        });
        created.push(bookmarkId);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowText(bookmarkId, PINNED_TITLE, PINNED_URL);
        const pinnedGroup = (await bookmarks.groups()).find(group => group.rowIds.includes(bookmarkId));
        if (!pinnedGroup) throw new Error(`pinned bookmark ${bookmarkId} is not rendered`);
        expect(pinnedGroup.heading).toBe(PINNED_HEADING);

        await bookmarks.reload();
        await bookmarks.expectRowText(bookmarkId, PINNED_TITLE, PINNED_URL);
        const reloadedGroup = (await bookmarks.groups()).find(group => group.rowIds.includes(bookmarkId));
        if (!reloadedGroup) throw new Error(`pinned bookmark ${bookmarkId} is not grouped after reload`);
        expect(reloadedGroup.heading).toBe(PINNED_HEADING);
    });

    test("Should report that the row menu pin toggle is not persisted by the server", async () => {
        const bookmarkId = await bookmarks.createViaApi({
            title: TOGGLED_TITLE,
            url: TOGGLED_URL,
            type: "url",
            pinned: false,
        });
        created.push(bookmarkId);

        await bookmarks.reload();
        await bookmarks.open();
        await bookmarks.expectRowText(bookmarkId, TOGGLED_TITLE, TOGGLED_URL);

        await bookmarks.togglePinFromRowMenu(bookmarkId);
        const liveGroup = (await bookmarks.groups()).find(group => group.rowIds.includes(bookmarkId));
        if (!liveGroup) throw new Error(`pinning bookmark ${bookmarkId} did not regroup it`);
        expect(liveGroup.heading).toBe(PINNED_HEADING);

        await bookmarks.reload();
        await bookmarks.expectRowText(bookmarkId, TOGGLED_TITLE, TOGGLED_URL);
        const reloadedGroup = (await bookmarks.groups()).find(group => group.rowIds.includes(bookmarkId));
        if (!reloadedGroup) throw new Error(`bookmark ${bookmarkId} is not rendered after reload`);
        expect(reloadedGroup.heading).toBe(LINKS_HEADING);
        const persisted = (await bookmarks.listViaApi()).find((bookmark: any) => bookmark.id === bookmarkId);
        expect(persisted, `bookmark ${bookmarkId} is not listed after reload`).toBeDefined();
        expect(persisted.pinned).toBe(false);
    });

    test("Should reject an internal bookmark because the create schema requires a URL", async () => {
        const response = await bookmarks.createViaApiRaw({
            title: INTERNAL_TITLE,
            type: "task",
            url: null,
            pinned: false,
            resourceId: crypto.randomUUID(),
        });
        expect(response.status(), `internal bookmark rejected with HTTP ${response.status()}`).toBe(400);
        const internal = (await bookmarks.listViaApi()).filter(
            (bookmark: any) => bookmark.title === INTERNAL_TITLE
        );
        expect(internal.length, `internal bookmark ${INTERNAL_TITLE} was accepted`).toBe(0);
    });
});
