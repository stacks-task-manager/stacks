import type { Browser, BrowserContext, Page } from "@playwright/test";
import { setDate } from "date-fns";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Calendar from "../../pages/calendar";

test.describe("Calendar", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let calendar: Calendar;
    const createdEventIds: string[] = [];

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        calendar = new Calendar(page);
        await calendar.open();
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            for (const eventId of createdEventIds) {
                await calendar.deleteEventByApi(eventId);
            }
        }

        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("switches calendar views", async () => {
        for (const view of ["month", "week", "day"] as const) {
            await calendar.switchView(view);
            await calendar.expectView(view);
        }
    });

    test("moves backward and forward in each selected view", async () => {
        for (const view of ["month", "week", "day"] as const) {
            await calendar.switchView(view);
            await calendar.next();
            await calendar.previous();
            await calendar.previous();
            await calendar.next();
        }
    });

    test("jumps to today and a specific date across all calendar views", async () => {
        const targetDate = setDate(new Date(), 15);

        for (const view of ["month", "week", "day"] as const) {
            await calendar.switchView(view);
            await calendar.jumpToDate(targetDate);
            await calendar.expectCurrentDateForView(view, targetDate);

            await calendar.today();
            await calendar.expectCurrentDateForView(view, new Date());
        }
    });

    test("reloads events from the toolbar", async () => {
        const reload = calendar.waitForEventsReload();
        await calendar.reloadEvents();
        await reload;
    });

    test("creates and edits a local event through the details sidebar", async () => {
        const eventTitle = `E2E Calendar Event ${Date.now()}`;
        const description = `Calendar description ${Date.now()}`;
        const location = `Calendar room ${Date.now()}`;

        await calendar.switchView("day");
        await calendar.today();

        const eventId = await calendar.createEventFromVisibleSlot();
        createdEventIds.push(eventId);
        await calendar.expectDetailsVisible();

        const titlePatch = calendar.waitForEventPatch(eventId);
        await calendar.setTitle(eventTitle);
        await titlePatch;
        await calendar.expectPersistedEvent(eventId, { title: eventTitle });

        const descriptionPatch = calendar.waitForEventPatch(eventId);
        await calendar.setDescription(description);
        await descriptionPatch;
        await calendar.expectPersistedEvent(eventId, { title: eventTitle, description });

        const locationPatch = calendar.waitForEventPatch(eventId);
        await calendar.setLocation(location);
        await locationPatch;
        await calendar.expectPersistedEvent(eventId, { title: eventTitle, description, location });
    });
});
