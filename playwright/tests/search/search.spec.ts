import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Search from "../../pages/search";
import TaskDetails from "../../pages/taskDetails";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";
import Notepad from "../../pages/notepad";
import People from "../../pages/people";
import { closeDb, getDb } from "../../fixtures/db";

/**
 * Global search (`/app` search dialog) against the real federated loader: rows must come from
 * the API, not from what the seeded fixtures happen to render. The server searches people,
 * tasks (title OR description, limit 20) and notepads (content only) — Files, Bookmarks,
 * Timebox, Attachments and Comments are unreachable and are recorded as a scope gate in the
 * ledger rather than asserted here. People rows are seeded with a scenario-owned contact whose
 * name carries its own token, so the seeded users never make the free-text query deterministic.
 *
 * Reproduce: `yarn test:e2e:headed playwright/tests/search/search.spec.ts --retries=0 --project=chrome --no-deps`
 */
const SEARCH_TOKEN = `e2e-search-${Date.now()}`;
const PERSON_TOKEN = `e2e-person-${Date.now()}`;
const PROJECT_NAME = `Search project ${Date.now()}`;
const PERSON_FIRST_NAME = `Searchable ${PERSON_TOKEN}`;
const PERSON_LAST_NAME = "Rows";
const PERSON_EMAIL = `${PERSON_TOKEN}@example.com`;
const MAIN_COLUMN = "Column 1";
const TITLE_TASK = `Search title hit ${SEARCH_TOKEN}`;
const DESCRIPTION_TASK = `Search description hit ${Date.now()}`;
const NOTEPAD_NAME = `Search notepad ${Date.now()}`;
const NOTEPAD_BODY = `Notepad body that mentions ${SEARCH_TOKEN} in its content only.`;
const NO_MATCH_TOKEN = "zzsearchabsent";

test.describe("Search - Global search results", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let search: Search;
    let taskDetails: TaskDetails;
    let project: Project;
    let tasksTable: TasksTable;
    let notepad: Notepad;
    let people: People;
    let projectId: string;
    let titleTaskId: string;
    let descriptionTaskId: string;
    let notepadDocId: string;
    let personId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        search = new Search(page);
        taskDetails = new TaskDetails(page);
        project = new Project(page);
        tasksTable = new TasksTable(page);
        notepad = new Notepad(page);
        people = new People(page);

        projectId = await project.addNew({ name: PROJECT_NAME });
        await tasksTable.createStackViaApi({ projectId, title: MAIN_COLUMN });

        await project.addTask({
            project: PROJECT_NAME,
            column: MAIN_COLUMN,
            task: { title: TITLE_TASK },
        });
        titleTaskId = await tasksTable.waitForTaskViaApi({ projectId, title: TITLE_TASK });

        await project.addTask({
            project: PROJECT_NAME,
            column: MAIN_COLUMN,
            task: { title: DESCRIPTION_TASK, description: `Hidden ${SEARCH_TOKEN} in the description` },
        });
        descriptionTaskId = await tasksTable.waitForTaskViaApi({ projectId, title: DESCRIPTION_TASK });

        // notepad id === document id, so the returned id is the id a search row would carry
        notepadDocId = await notepad.addNew(NOTEPAD_NAME);
        await notepad.openByName(NOTEPAD_NAME);
        await notepad.setContent(NOTEPAD_BODY);

        // a scenario-owned contact so the people branch of the loader has a deterministic hit
        await people.open();
        personId = await people.addPerson(PERSON_FIRST_NAME, PERSON_LAST_NAME, PERSON_EMAIL);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        const cleanupErrors: string[] = [];

        try {
            if (personId) await getDb().cleanupPerson(personId);
        } catch (error) {
            cleanupErrors.push(`person cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed()) await search.close();
        } catch (error) {
            cleanupErrors.push(`search dialog left open: ${error}`);
        }
        try {
            if (page && !page.isClosed() && titleTaskId) await tasksTable.deleteTaskViaApi(titleTaskId);
        } catch (error) {
            cleanupErrors.push(`title task cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed() && descriptionTaskId)
                await tasksTable.deleteTaskViaApi(descriptionTaskId);
        } catch (error) {
            cleanupErrors.push(`description task cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed() && notepadDocId) await project.deleteById(notepadDocId);
        } catch (error) {
            cleanupErrors.push(`notepad cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed() && projectId) await project.deleteById(projectId);
        } catch (error) {
            cleanupErrors.push(`project cleanup failed: ${error}`);
        }
        try {
            await closeDb();
        } catch (error) {
            cleanupErrors.push(`db pool not released: ${error}`);
        }
        try {
            if (page && !page.isClosed()) await page.close();
        } catch (error) {
            cleanupErrors.push(`page close failed: ${error}`);
        }
        try {
            if (context) await context.close();
        } catch (error) {
            cleanupErrors.push(`context close failed: ${error}`);
        }
        try {
            if (browser) await browser.close();
        } catch (error) {
            cleanupErrors.push(`browser close failed: ${error}`);
        }

        if (cleanupErrors.length) throw new Error(cleanupErrors.join("; "));
    });

    test("Should return tasks and notepads that match the query", async () => {
        await search.open();
        await search.setQuery(SEARCH_TOKEN);
        await search.waitForOutcome();

        // the title hit, the description-only hit, and the notepad whose content matches
        await search.expectRowsFor([titleTaskId, descriptionTaskId, notepadDocId]);
        await search.expectResultCount(3);
    });

    test("Should return people whose name matches the query", async () => {
        await search.open();
        await search.setQuery(PERSON_TOKEN);
        await search.waitForOutcome();

        await search.expectRowsFor([personId]);
        await search.expectResultCount(1);
    });

    test("Should narrow the results with a type filter and restore them", async () => {
        await search.open();
        await search.setQuery(SEARCH_TOKEN);
        await search.waitForOutcome();

        await search.narrowToType("task");
        await search.expectNoRowsFor([notepadDocId]);
        await search.expectResultCount(2);

        await search.narrowToType("all");
        await search.expectRowsFor([titleTaskId, descriptionTaskId, notepadDocId]);
        await search.expectResultCount(3);
    });

    test("Should open the selected result with the keyboard", async () => {
        await search.open();
        await search.setQuery(SEARCH_TOKEN);
        await search.waitForOutcome();

        const firstId = await search.firstResultId();
        await search.openResultWithKeyboard(1);

        await search.expectPath(`/app/project/${projectId}/${firstId}`);
        await taskDetails.drawer.waitFor({ state: "visible" });
        await expect(search.dialog).toHaveCount(0);
    });

    test("Should replace stale results with the empty state", async () => {
        await search.open();
        await search.setQuery(SEARCH_TOKEN);
        await search.waitForOutcome();
        await search.expectRowsFor([titleTaskId, descriptionTaskId, notepadDocId]);

        await search.setQuery(NO_MATCH_TOKEN);
        await search.waitForOutcome();
        await search.expectEmptyState();
    });

    test("Should ignore single-character queries", async () => {
        await search.open();
        await search.setQuery("s");
        await search.expectNoSearchSurface();
    });

    test("Should clear the query and close with Escape", async () => {
        await search.open();
        await search.setQuery(SEARCH_TOKEN);
        await search.waitForOutcome();

        await search.clearQuery();
        await search.closeWithKeyboard();
    });
});
