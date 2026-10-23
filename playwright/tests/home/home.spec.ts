import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Home from "../../pages/home";
import Bookmarks from "../../pages/bookmarks";
import Project from "../../pages/project";
import People from "../../pages/people";
import { closeDb, getDb } from "../../fixtures/db";

/**
 * Home favorites, pinned bookmarks and private notes at `/app/home` against the real API.
 *
 * Every record is scenario-owned (`TOKEN`), so the seeded database never decides an outcome. The
 * three Home widgets are app-owned, so rows, avatars and empty states are read through the testids
 * in `packages/app/src/app/views/Home/Home.tsx` (`home-bookmark-<id>`, `home-avatar-<id>`,
 * `home-empty-*`). Favorite projects and favorite companies render through third-party Blueprint
 * `MenuItem`s with no testid, so those assertions read the unique scenario title text inside the
 * `home-view` subtree only — the sidebar also renders document titles, and the scoped locator
 * excludes it.
 *
 * Persistence is asserted where the server actually stores it (pinned bookmarks through
 * `POST /api/bookmarks`) and its absence is asserted where it does not: favorite projects
 * (`store/actions/projects.ts:306` writes browser localStorage), favorite people and companies
 * (`store/actions/people.ts`), and private notes (`packages/server/src/routes/home.ts:13` returns
 * `notes: ""` and `packages/app/src/app/api/index.ts` `saveNotes` is a no-op stub).
 *
 * Reproduce: `yarn test:e2e:headed playwright/tests/home/home.spec.ts --retries=0 --project=chrome --no-deps`
 */
const TOKEN = `e2e-home-${Date.now()}`;
const PINNED_TITLE = `Home pinned bookmark ${TOKEN}`;
const PINNED_URL = `https://example.com/${TOKEN}-pinned`;
const UNPINNED_TITLE = `Home unpinned bookmark ${TOKEN}`;
const UNPINNED_URL = `https://example.com/${TOKEN}-unpinned`;
const FAVORITE_PROJECT_TITLE = `Home favorite project ${TOKEN}`;
const ORDINARY_PROJECT_TITLE = `Home ordinary project ${TOKEN}`;
const FAVORITE_PERSON_FIRST = "Homefavs";
const FAVORITE_PERSON_LAST = `Person ${TOKEN}`;
const FAVORITE_PERSON_EMAIL = `home-favs-${TOKEN}@example.com`;
const FAVORITE_COMPANY_TITLE = `Home favorite company ${TOKEN}`;
const NOTES_TEXT = `Home private notes ${TOKEN}`;

test.describe("Home - Favorites, pinned bookmarks and private notes", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let home: Home;
    let bookmarks: Bookmarks;
    let project: Project;
    let people: People;
    const bookmarkIds: string[] = [];
    const projectIds: string[] = [];
    const personIds = new Set<string>();
    const companyIds = new Set<string>();

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        home = new Home(page);
        bookmarks = new Bookmarks(page);
        project = new Project(page);
        people = new People(page);
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

        for (const bookmarkId of bookmarkIds) {
            await attempt(`delete bookmark ${bookmarkId}`, async () => {
                const response = await bookmarks.deleteViaApiRaw(bookmarkId);
                if (![200, 204, 404].includes(response.status())) {
                    throw new Error(`bookmark ${bookmarkId} cleanup returned HTTP ${response.status()}`);
                }
            });
        }
        await attempt("verify bookmarks removed", async () => {
            const leaked = (await bookmarks.listViaApi()).filter((record: any) =>
                bookmarkIds.includes(record.id)
            );
            if (leaked.length) {
                throw new Error(`bookmarks still present after cleanup: ${leaked.map(r => r.id)}`);
            }
        });

        for (const projectId of projectIds) {
            await attempt(`delete project ${projectId}`, () => project.deleteById(projectId));
        }

        for (const personId of personIds) {
            await attempt(`delete person ${personId}`, () => getDb().cleanupPerson(personId));
        }
        for (const companyId of companyIds) {
            await attempt(`delete company ${companyId}`, () => getDb().cleanupCompany(companyId));
        }
        await attempt("close db", () => closeDb());

        if (page) await attempt("close page", () => page.close());
        if (context) await attempt("close context", () => context.close());
        if (browser) await attempt("close browser", () => browser.close());
        if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Home cleanup failed");
    });

    test("Should render the favorite, pin and notes empty states for a fresh browser context", async () => {
        await home.open();
        await expect(home.emptyState("favorite-projects")).toBeVisible();
        await expect(home.emptyState("pinned-bookmarks")).toBeVisible();
        await expect(home.emptyState("favorite-people")).toBeVisible();
        expect(await home.notesText(), "a fresh context has no private notes").toBe("");
    });

    test("Should show only pinned bookmarks on Home, keep the pin after a reload, and empty after deleting it", async () => {
        const pinnedId = await bookmarks.createViaApi({
            title: PINNED_TITLE,
            url: PINNED_URL,
            type: "url",
            pinned: true,
        });
        const unpinnedId = await bookmarks.createViaApi({
            title: UNPINNED_TITLE,
            url: UNPINNED_URL,
            type: "url",
            pinned: false,
        });
        bookmarkIds.push(pinnedId, unpinnedId);

        await home.open();
        await home.reload();
        await home.expectBookmarkRow(pinnedId, PINNED_TITLE);
        await home.expectBookmarkRowHidden(unpinnedId);
        await expect(home.emptyState("pinned-bookmarks")).toBeHidden();

        await home.reload();
        await home.expectBookmarkRow(pinnedId, PINNED_TITLE);
        await home.expectBookmarkRowHidden(unpinnedId);

        const removed = await bookmarks.deleteViaApiRaw(pinnedId);
        expect(removed.status(), `removing pinned bookmark ${pinnedId} failed`).toBeLessThan(400);

        await home.reload();
        await home.expectBookmarkRowHidden(pinnedId);
        await home.expectBookmarkRowHidden(unpinnedId);
        await expect(home.emptyState("pinned-bookmarks")).toBeVisible();
    });

    test("Should list a favorited project on Home and drop it when un-favorited", async () => {
        const favoriteId = await project.addNew({ name: FAVORITE_PROJECT_TITLE });
        const ordinaryId = await project.addNew({ name: ORDINARY_PROJECT_TITLE });
        if (!favoriteId) throw new Error(`project ${FAVORITE_PROJECT_TITLE} was not created`);
        if (!ordinaryId) throw new Error(`project ${ORDINARY_PROJECT_TITLE} was not created`);
        projectIds.push(favoriteId, ordinaryId);

        await project.goto(`/app/project/${favoriteId}`);
        await project.toggleFavorite();

        await home.open();
        await expect(home.view().getByText(FAVORITE_PROJECT_TITLE, { exact: true })).toBeVisible();
        await expect(home.view().getByText(ORDINARY_PROJECT_TITLE, { exact: true })).toBeHidden();
        await expect(home.emptyState("favorite-projects")).toBeHidden();

        await project.goto(`/app/project/${favoriteId}`);
        await project.toggleFavorite();

        await home.open();
        await expect(home.emptyState("favorite-projects")).toBeVisible();
        await expect(home.view().getByText(FAVORITE_PROJECT_TITLE, { exact: true })).toBeHidden();
    });

    test("Should show a favorited person and company on Home and empty once both are un-favorited", async () => {
        await people.open();
        const personId = await people.addPerson(
            FAVORITE_PERSON_FIRST,
            FAVORITE_PERSON_LAST,
            FAVORITE_PERSON_EMAIL
        );
        await people.goto("/app/people");
        const companyId = await people.addCompany(FAVORITE_COMPANY_TITLE);
        if (!personId) throw new Error("scenario person was not created");
        if (!companyId) throw new Error("scenario company was not created");
        personIds.add(personId);
        companyIds.add(companyId);

        await people.openPersonProfile(personId);
        await people.toggleFavoritePerson();
        await people.openCompanyProfile(companyId);
        await people.toggleFavoriteCompany();

        await home.open();
        await home.expectAvatar(personId);
        await expect(home.view().getByText(FAVORITE_COMPANY_TITLE, { exact: true })).toBeVisible();
        await expect(home.emptyState("favorite-people")).toBeHidden();

        await people.openPersonProfile(personId);
        await people.toggleFavoritePerson();
        await people.openCompanyProfile(companyId);
        await people.toggleFavoriteCompany();

        await home.open();
        await home.expectAvatarHidden(personId);
        await expect(home.view().getByText(FAVORITE_COMPANY_TITLE, { exact: true })).toBeHidden();
        await expect(home.emptyState("favorite-people")).toBeVisible();
    });

    test("Should keep typed private notes in the browser and drop them because the API does not persist them", async () => {
        await home.open();
        await home.typeNotes(NOTES_TEXT);
        await expect.poll(async () => (await home.notesText()).includes(NOTES_TEXT)).toBe(true);

        const served = await page.request.get("/api/home");
        expect(served.ok(), `home payload request failed (HTTP ${served.status()})`).toBeTruthy();
        expect((await served.json()).data?.notes, "the API serves no private notes").toBe("");

        await home.reload();
        await expect.poll(async () => await home.notesText()).toBe("");
    });
});
