// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * W2 — Calendar recurring-event delete (single vs. series vs. cancel).
 *
 * The RecurringDeleteDialog (recurring-delete-single / -series / -cancel) is
 * only reachable for Google-sourced recurring instances
 * (`source === "google"` and `original.google.isRecurringInstance === true`);
 * local recurring events use a plain confirm. This spec therefore simulates a
 * Google integration by mocking the network boundary:
 *   - GET /api/boot                            → integrations.google.isAuthenticated = true
 *   - GET /api/integrations/google/calendars   → one primary mock calendar
 *   - GET /api/events                          → the current mock series
 *   - DELETE /api/events/:id?scope=…           → mutates the mock series by scope
 *
 * No server state is touched (all endpoints are mocked in the browser context),
 * so cleanup is limited to unrouting the mocks.
 */
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Calendar from "../../pages/calendar";

const GOOGLE_CALENDAR = {
    id: "e2e-google-primary",
    title: "E2E Google Calendar",
    color: "#4c80ff",
    source: "google",
    primary: true,
    readOnly: false,
};

const SERIES_ID = "e2e-recurring-series";

const makeInstance = (day: number, index: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), day, 10, 0, 0);
    const eventId = `${SERIES_ID}-${index}`;
    return {
        id: `google_${GOOGLE_CALENDAR.id}_${eventId}`,
        title: `E2E Recurring ${index}`,
        description: "",
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        assignees: [],
        source: "google",
        calendar: GOOGLE_CALENDAR.id,
        original: {
            google: {
                calendarId: GOOGLE_CALENDAR.id,
                eventId,
                recurringEventId: SERIES_ID,
                isRecurringInstance: true,
            },
        },
    };
};

const createFreshSeries = () => [makeInstance(1, 1), makeInstance(2, 2), makeInstance(3, 3)];

const INST1 = `google_${GOOGLE_CALENDAR.id}_${SERIES_ID}-1`;
const INST2 = `google_${GOOGLE_CALENDAR.id}_${SERIES_ID}-2`;
const INST3 = `google_${GOOGLE_CALENDAR.id}_${SERIES_ID}-3`;

let instances = createFreshSeries();

let browser: Browser;
let context: BrowserContext;
let page: Page;
let calendar: Calendar;

const setupMocks = async (ctx: BrowserContext) => {
    await ctx.route("**/api/boot", async route => {
        const response = await route.fetch();
        let body: Record<string, unknown> = {};
        try {
            body = (await response.json()) as Record<string, unknown>;
        } catch {
            body = {};
        }
        const data = (body.data as Record<string, unknown> | undefined) ?? {};
        data.integrations = { google: { isAuthenticated: true } };
        body.data = data;
        body.success = true;
        await route.fulfill({ response, json: body });
    });

    await ctx.route("**/api/integrations/google/calendars", route =>
        route.fulfill({ json: { success: true, data: [GOOGLE_CALENDAR] } })
    );

    await ctx.route(
        url => {
            const u = new URL(url);
            return u.pathname === "/api/events" || u.pathname.startsWith("/api/events/");
        },
        async route => {
            const request = route.request();
            const u = new URL(request.url());

            if (u.pathname === "/api/events/count") {
                return route.fulfill({ json: { success: true, data: 0 } });
            }

            if (request.method() === "GET") {
                return route.fulfill({ json: { success: true, data: instances } });
            }

            if (request.method() === "DELETE") {
                const scope = u.searchParams.get("scope");
                const googleEventId = u.searchParams.get("googleEventId");
                const recurringEventId = u.searchParams.get("recurringEventId");

                if (scope === "series" && recurringEventId) {
                    instances = instances.filter(
                        inst => inst.original?.google?.recurringEventId !== recurringEventId
                    );
                } else {
                    instances = instances.filter(inst => inst.original?.google?.eventId !== googleEventId);
                }

                return route.fulfill({ json: { success: true, data: true } });
            }

            return route.fallback();
        }
    );
};

test.beforeAll(async ({ login: loginPage }: any) => {
    ({ browser, context, page } = await bootstrapContext());
    await loginPage({ page });
    await setupMocks(context);
    // Re-run boot so the mocked Google auth is picked up before the calendar loads.
    await page.reload();
    calendar = new Calendar(page);
    await calendar.open();
});

test.beforeEach(({ attachVideoContext }: any) => {
    attachVideoContext(context);
});

test.beforeEach(async () => {
    instances = createFreshSeries();
    await page.reload();
    await calendar.open();
    await calendar.expectEventVisible(INST1);
});

test("deleting a single occurrence removes only that instance and survives reload", async () => {
    await calendar.openRecurringDeleteDialog(INST1);
    await calendar.chooseRecurringDelete("single");

    await calendar.expectEventAbsent(INST1);
    await calendar.expectEventVisible(INST2);
    await calendar.expectEventVisible(INST3);

    await page.reload();
    await calendar.open();
    await calendar.expectEventAbsent(INST1);
    await calendar.expectEventVisible(INST2);
    await calendar.expectEventVisible(INST3);
});

test("deleting the entire series removes every instance and survives reload", async () => {
    await calendar.openRecurringDeleteDialog(INST1);
    await calendar.chooseRecurringDelete("series");

    await calendar.expectEventAbsent(INST1);
    await calendar.expectEventAbsent(INST2);
    await calendar.expectEventAbsent(INST3);

    await page.reload();
    await calendar.open();
    await calendar.expectEventAbsent(INST1);
    await calendar.expectEventAbsent(INST2);
    await calendar.expectEventAbsent(INST3);
});

test("cancelling leaves the whole series intact", async () => {
    await calendar.openRecurringDeleteDialog(INST1);
    await calendar.chooseRecurringDelete("cancel");

    await calendar.expectEventVisible(INST1);
    await calendar.expectEventVisible(INST2);
    await calendar.expectEventVisible(INST3);

    await page.reload();
    await calendar.open();
    await calendar.expectEventVisible(INST1);
    await calendar.expectEventVisible(INST2);
    await calendar.expectEventVisible(INST3);
});

test.afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    if (context) {
        try {
            await context.unrouteAll();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (page && !page.isClosed()) {
        try {
            await page.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (context) {
        try {
            await context.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (browser) {
        try {
            await browser.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (cleanupErrors.length > 0) {
        throw new Error(cleanupErrors.map(error => String(error)).join("; "));
    }
});
