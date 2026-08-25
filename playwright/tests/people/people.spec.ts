import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import People from "../../pages/people";
import Preferences from "../../pages/preferences";

test.describe("People and Companies", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let people: People;
    let preferences: Preferences;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        people = new People(page);
        preferences = new Preferences(page);
        await people.open();
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterEach(async () => {
        await people.clearTimesheetMock();
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("Should navigate tabs, search, group, filter, and open toolbar menu", async () => {
        await people.openToolbarMenu();
        await expect(people.toolbarMenuItem("people-toolbar-menu-tags-statuses")).toBeVisible();
        await people.closeToolbarMenu();

        await people.search("Admin");
        await expect(people.searchInput).toHaveValue("Admin");
        await people.search("");

        await people.openGroupingMenu();
        await expect(people.groupingMenuItem("people-grouping-company")).toBeVisible();
        await people.selectGrouping("people-grouping-company");

        await people.toggleFilters();
        await expect(people.filtersSidebar).toBeVisible();
        await people.toggleFilters();
        await expect(people.filtersSidebar).toBeHidden();

        await people.openCompanies();
        await people.openContacts();
    });

    test("Should navigate roles, timesheet, and approvals views", async () => {
        await people.openRoles();
        await people.openTimesheet();
        await people.navigateTimesheetInterval();
        await people.toggleTimesheetWeekends();
        await people.openApprovals();
        await people.navigateApprovalInterval();
        await people.openContacts();
    });

    test("Should switch approval grouping", async () => {
        await people.openApprovals();

        await people.selectApprovalGrouping("project");
        await expect(people.approvalsProjectGroupingButton).toHaveClass(/bp6-active/);

        await people.selectApprovalGrouping("person");
        await expect(people.approvalsPersonGroupingButton).toHaveClass(/bp6-active/);
    });

    test("Should submit the full weekly timesheet for review", async () => {
        await people.openContacts();
        await people.mockPendingTimesheet();
        await people.openTimesheet();

        const submission = await people.submitTimesheetForReview();
        const start = new Date(`${submission.start}T00:00:00`);
        const end = new Date(`${submission.end}T00:00:00`);

        expect((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)).toBe(6);
    });

    test("Should group timesheet entries by project and task", async () => {
        await people.openContacts();
        await people.mockPendingTimesheet();
        await people.openTimesheet();

        await people.expectTimesheetGrouping();
    });

    test("Should open the time entry dialog from an empty day", async () => {
        await people.openContacts();
        await people.mockPendingTimesheet();
        await people.openTimesheet();

        await people.openTimeEntryDialogFromEmptyDay();
    });

    test("Should open a rejected time entry for correction", async () => {
        await people.openContacts();
        await people.mockRejectedTimesheet();
        await people.openTimesheet();

        await people.openRejectedEntryForCorrection();
    });

    test("Should show a partially reviewed weekly status", async () => {
        await people.openContacts();
        await people.mockPartiallyReviewedTimesheet();
        await people.openTimesheet();

        await people.expectPartiallyReviewedStatus();
    });

    test("Should disable submission while the timesheet is in review", async () => {
        await people.openContacts();
        await people.mockInReviewTimesheet();
        await people.openTimesheet();

        await people.expectInReviewStatus();
    });

    test("Should create and update a person", async () => {
        const suffix = Date.now();
        const firstName = `E2E${suffix}`;
        const lastName = "Person";
        const updatedFirstName = `Edited${suffix}`;

        const personId = await people.addPerson(firstName, lastName, `e2e-person-${suffix}@example.com`);
        await people.updatePerson({
            firstName: updatedFirstName,
            lastName,
            nickname: `nick-${suffix}`,
            email: `edited-person-${suffix}@example.com`,
            officePhone: "555-0100",
            jobTitle: "QA contact",
            notes: "Created by Playwright",
        });

        await people.goto("/app/people");
        await people.waitForPersonSearchResult(personId, updatedFirstName);
    });

    test("Should create and update a company", async () => {
        const suffix = Date.now();
        const companyName = `E2E Company ${suffix}`;
        const updatedCompanyName = `Edited Company ${suffix}`;

        const companyId = await people.addCompany(companyName);
        await expect(people.companyRow(companyId)).toBeVisible();

        await people.openCompany(companyId);
        await people.updateCompany({
            title: updatedCompanyName,
            email: `company-${suffix}@example.com`,
            phone: "555-0101",
            address: "100 Test Street",
            city: "Testville",
            notes: "Created by Playwright",
        });

        await people.goto("/app/people");
        await people.waitForCompanySearchResult(companyId, updatedCompanyName);
    });

    test("Should apply embedded person and company preferences", async () => {
        const suffix = Date.now();
        const originalPreferences = await preferences.snapshotPreferences();

        try {
            const personId = await people.addPerson(
                `Embedded${suffix}`,
                "Person",
                `embedded-person-${suffix}@example.com`
            );
            await people.goto("/app/people");
            const companyId = await people.addCompany(`Embedded Company ${suffix}`);

            await preferences.setPref("peopleEmbeddedPerson", true);
            await people.goto("/app/people");
            await people.openPerson(personId);
            await people.expectPersonDetailsMode(true);

            await people.goto("/app/people");
            await preferences.setPref("peopleEmbeddedPerson", false);
            await people.goto("/app/people");
            await people.openPerson(personId);
            await people.expectPersonDetailsMode(false);

            await people.goto("/app/people");
            await preferences.setPref("peopleEmbeddedCompany", true);
            await people.goto("/app/people");
            await people.openCompany(companyId);
            await people.expectCompanyDetailsMode(true);

            await people.goto("/app/people");
            await preferences.setPref("peopleEmbeddedCompany", false);
            await people.goto("/app/people");
            await people.openCompany(companyId);
            await people.expectCompanyDetailsMode(false);
        } finally {
            await preferences.restorePreferences(originalPreferences);
        }
    });
});
