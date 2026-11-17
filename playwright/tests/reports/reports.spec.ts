// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * W8 — Reports rendering.
 *
 * A deep link renders a grid report with headers and at least one row for a seeded
 * project (a completed task with a due date); switching the span re-requests the
 * payload (asserted on the request query, not a screenshot); an unknown report type
 * shows the "No report found" blank slate; a chart report (mocked payload) renders its
 * chart container.
 *
 * The seeded project (and its task) is destroyed before the suite's last test ends
 * (§5.1): `cleanupProjectTaskRecords` then `project.deleteById` in `afterAll`.
 */
import type { Browser, BrowserContext, Page, Route } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Project from "../../pages/project";
import Reports from "../../pages/reports";
import TasksTable from "../../pages/tasksTable";

// A report type that does not exist in the real catalog; its payload is mocked to a
// chart so the chart rendering path is exercised deterministically.
const CHART_REPORT = "e2e_chart_report";

test.describe("Reports", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let reports: Reports;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let seededTaskId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        reports = new Reports(page);
        project = new Project(page);
        tasksTable = new TasksTable(page);

        // Seed a completed task with a due date so the planned_vs_actual grid report
        // has at least one row.
        projectId = await project.addNew({ name: `Reports ${randomUUID()}` });
        const stackId = await tasksTable.createStackViaApi({ projectId, title: "R" });
        seededTaskId = await tasksTable.createTaskViaApi({ projectId, stackId, title: "R task" });
        await tasksTable.setTaskDueDateAndProgressViaApi(
            seededTaskId,
            format(addDays(new Date(), 1), "yyyy-MM-dd"),
            100
        );
        await tasksTable.setTaskDoneViaApi(seededTaskId, true);
    });

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (page && !page.isClosed() && projectId) await attempt(() => project.deleteById(projectId));
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Reports fixture cleanup failed");
    });

    test("a deep link renders a grid report with headers and rows", async () => {
        await reports.openReport("planned_vs_actual");
        await reports.expectGrid();
        await reports.expectGridHeaders(["Task", "Project", "Status"]);
        await reports.expectGridRowCountAtLeast(1);
    });

    test("switching the span re-requests the report payload", async () => {
        await reports.openReport("planned_vs_actual");
        await reports.expectGrid();
        await reports.setSpan("week");
        // The span change re-rendered the grid with the new payload.
        await reports.expectGrid();
    });

    test("an unknown report type shows the No report found slate", async () => {
        await reports.openReport("definitely_not_a_report");
        await reports.expectBlankSlate();
    });

    test("a chart report renders the chart container", async () => {
        const handler = (route: Route) =>
            route.fulfill({
                status: 200,
                contentType: "application/json",
                // Mirrors the server `{ data: <payload> }` envelope the app unwraps.
                body: JSON.stringify({ data: { type: "chart", size: "100" } }),
            });
        await page.route(`**/api/reports/${CHART_REPORT}`, handler);
        try {
            await reports.openReport(CHART_REPORT);
            await reports.expectChart();
        } finally {
            await page.unroute(`**/api/reports/${CHART_REPORT}`);
        }
    });
});
