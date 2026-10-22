import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { QuickTimelog } from "./components/QuickTimelog";
import Sidebar from "./sidebar";
import type { IRoleAccess, IRole } from "@stacks/types";

type MockTimesheetStatus = "approved" | "inreview" | "pending" | "rejected";

const MOCK_TIMELOG_IDS = ["11111111-1111-4111-8111-111111111111", "55555555-5555-4555-8555-555555555555"];
const MOCK_PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const MOCK_TASK_ID = "33333333-3333-4333-8333-333333333333";
const MOCK_PERSON_ID = "44444444-4444-4444-8444-444444444444";
const TIMESHEET_ROUTE = /\/api\/timelogs(?:\/review)?(?:\?.*)?$/;

class People extends Base {
    public sidebar: Sidebar;
    public toolbarMenuButton: Locator;
    public toolbarMenu: Locator;
    public contactsTab: Locator;
    public companiesTab: Locator;
    public rolesTab: Locator;
    public timesheetTab: Locator;
    public approvalsTab: Locator;
    public rolesView: Locator;
    public timesheetView: Locator;
    public approvalsView: Locator;
    public timesheetPreviousWeekButton: Locator;
    public timesheetNextWeekButton: Locator;
    public timesheetCurrentWeekButton: Locator;
    public timesheetToggleWeekendsButton: Locator;
    public timesheetSubmitReviewButton: Locator;
    public approvalsPreviousMonthButton: Locator;
    public approvalsNextMonthButton: Locator;
    public approvalsCurrentMonthButton: Locator;
    public approvalsPersonGroupingButton: Locator;
    public approvalsProjectGroupingButton: Locator;
    public approvalPersonGroups: Locator;
    public approvalProjectGroups: Locator;
    public approvalPersonToggles: Locator;
    public approvalProjectToggles: Locator;
    public searchInput: Locator;
    public groupingButton: Locator;
    public groupingMenu: Locator;
    public filtersButton: Locator;
    public filtersSidebar: Locator;
    public addPersonButton: Locator;
    public addCompanyButton: Locator;
    public newPersonFirstNameInput: Locator;
    public newPersonLastNameInput: Locator;
    public newPersonEmailInput: Locator;
    public newPersonAddButton: Locator;
    public companyTitleInput: Locator;
    public personEditButton: Locator;
    public personUpdateButton: Locator;
    public companyEditButton: Locator;
    public companyUpdateButton: Locator;
    public personEmbeddedDetails: Locator;
    public companyEmbeddedDetails: Locator;
    public quickTimelog: QuickTimelog;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.quickTimelog = new QuickTimelog(page);
        this.toolbarMenuButton = page.getByTestId("people-toolbar-menu-button");
        this.toolbarMenu = page.getByTestId("people-toolbar-menu");
        this.contactsTab = page.getByTestId("people-tab-contacts");
        this.companiesTab = page.getByTestId("people-tab-companies");
        this.rolesTab = page.getByTestId("people-tab-roles");
        this.timesheetTab = page.getByTestId("people-tab-timesheet");
        this.approvalsTab = page.getByTestId("people-tab-approvals");
        this.rolesView = page.getByTestId("people-roles-view");
        this.timesheetView = page.getByTestId("people-timesheet-view");
        this.approvalsView = page.getByTestId("people-approvals-view");
        this.timesheetPreviousWeekButton = page.getByTestId("people-timesheet-previous-week-button");
        this.timesheetNextWeekButton = page.getByTestId("people-timesheet-next-week-button");
        this.timesheetCurrentWeekButton = page.getByTestId("people-timesheet-current-week-button");
        this.timesheetToggleWeekendsButton = page.getByTestId("people-timesheet-toggle-weekends-button");
        this.timesheetSubmitReviewButton = page.getByTestId("people-timesheet-submit-review-button");
        this.approvalsPreviousMonthButton = page.getByTestId("people-approvals-previous-month-button");
        this.approvalsNextMonthButton = page.getByTestId("people-approvals-next-month-button");
        this.approvalsCurrentMonthButton = page.getByTestId("people-approvals-current-month-button");
        this.approvalsPersonGroupingButton = page.getByTestId("people-approvals-grouping-person");
        this.approvalsProjectGroupingButton = page.getByTestId("people-approvals-grouping-project");
        this.approvalPersonGroups = page.getByTestId("people-approvals-person-group");
        this.approvalProjectGroups = page.getByTestId("people-approvals-project-group");
        this.approvalPersonToggles = page.getByTestId("people-approvals-person-toggle");
        this.approvalProjectToggles = page.getByTestId("people-approvals-project-toggle");
        this.searchInput = page.getByTestId("people-search-input");
        this.groupingButton = page.getByTestId("people-grouping-button");
        this.groupingMenu = page.getByTestId("people-grouping-menu");
        this.filtersButton = page.getByTestId("people-filters-button");
        this.filtersSidebar = page.getByTestId("people-filters-sidebar");
        this.addPersonButton = page.getByTestId("people-add-person-button");
        this.addCompanyButton = page.getByTestId("people-add-company-button");
        this.newPersonFirstNameInput = page.getByTestId("new-person-first-name-input");
        this.newPersonLastNameInput = page.getByTestId("new-person-last-name-input");
        this.newPersonEmailInput = page.getByTestId("new-person-email-input");
        this.newPersonAddButton = page.getByTestId("new-person-add-button");
        this.companyTitleInput = page.getByTestId("company-details-title-input");
        this.personEditButton = page.getByTestId("person-details-edit-button");
        this.personUpdateButton = page.getByTestId("person-details-update-button");
        this.companyEditButton = page.getByTestId("company-details-edit-button");
        this.companyUpdateButton = page.getByTestId("company-details-update-button");
        this.personEmbeddedDetails = page.getByTestId("person-details-embedded");
        this.companyEmbeddedDetails = page.getByTestId("company-details-embedded");
    }

    public async open() {
        await this.resetTablePreferences();
        await this.sidebar.go("People");
        await this.contactsTab.waitFor({ state: "visible" });
    }

    public async resetTablePreferences() {
        await this.page.evaluate(() => {
            for (const key of Object.keys(window.localStorage)) {
                if (key.includes("table-people-") || key.includes("table-companies-")) {
                    window.localStorage.removeItem(key);
                }
            }
        });
    }

    public async openToolbarMenu() {
        await this.toolbarMenuButton.click();
        await this.toolbarMenu.waitFor({ state: "visible" });
    }

    public toolbarMenuItem(testId: string): Locator {
        return this.toolbarMenu.getByTestId(testId);
    }

    public async closeToolbarMenu() {
        await this.page.keyboard.press("Escape");
        await this.toolbarMenu.waitFor({ state: "hidden" });
    }

    public async openCompanies() {
        await this.companiesTab.click();
        await expect(this.companiesTab).toHaveClass(/active/);
        await expect(this.page.getByTestId("table-companies")).toBeVisible();
    }

    public async openContacts() {
        await this.contactsTab.click();
        await expect(this.contactsTab).toHaveClass(/active/);
        await expect(this.page.getByTestId("table-people")).toBeVisible();
    }

    public async openRoles() {
        await this.rolesTab.click();
        await expect(this.rolesTab).toHaveClass(/active/);
        await expect(this.rolesView).toBeVisible();
    }

    public async createRole(title: string, access: IRoleAccess): Promise<IRole> {
        const response = await this.page.request.post("/api/roles", {
            headers: await this.browserMutationHeaders(),
            data: { title, description: "Scenario role", access },
        });
        expect(
            response.ok(),
            `Role creation returned ${response.status()}: ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data;
    }

    /** Posts a role body missing the required title and asserts the server rejects it. */
    public async expectRoleWithoutTitleRejected(): Promise<void> {
        const response = await this.page.request.post("/api/roles", {
            headers: await this.browserMutationHeaders(),
            data: { description: "Scenario role", access: { people: { read: true } } },
        });
        expect(
            response.status(),
            `Role without a title returned ${response.status()}: ${await response.text()}`
        ).toBe(400);
    }

    public async loadRole(id: string): Promise<IRole> {
        const response = await this.page.request.get("/api/roles");
        expect(response.ok()).toBeTruthy();
        const role = (await response.json()).data.find((item: IRole) => item.id === id);
        expect(role, `Role ${id} should persist`).toBeDefined();
        return role;
    }

    public async editRole(id: string) {
        await this.openRoles();
        await this.page.getByTestId(`role-edit-${id}`).click();
        await expect(this.page.getByTestId("role-title-input")).toBeVisible();
    }

    public async setRolePeopleWrite(enabled: boolean) {
        // Blueprint's visible control indicator overlays its native input.
        // setChecked still verifies that the resulting native checked state changed.
        await this.page.getByTestId("role-access-people-write").setChecked(enabled, { force: true });
    }

    public async saveRole(id: string) {
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" &&
                new URL(response.url()).pathname === `/api/roles/${id}`
        );
        await this.page.getByTestId("role-edit-save-button").click();
        const response = await responsePromise;
        expect(
            response.ok(),
            `Role update returned ${response.status()}: ${await response.text()}`
        ).toBeTruthy();
        await expect(this.page.getByTestId("role-title-input")).toBeHidden();
    }

    public async cancelRoleTitleEdit(title: string) {
        await this.page.getByTestId("role-title-input").fill(title);
        await this.page.getByTestId("role-edit-cancel-button").click();
        await expect(this.page.getByTestId("role-title-input")).toBeHidden();
    }

    public async expectPersonCreationAllowed(allowed: boolean) {
        if (allowed) await expect(this.addPersonButton).toBeVisible();
        else await expect(this.addPersonButton).toBeHidden();
    }

    public async expectPersonCreationDenied(email: string, roleId: string) {
        const response = await this.page.request.post("/api/people", {
            headers: await this.browserMutationHeaders(),
            data: { email, role: roleId, firstName: "E2E", lastName: "Denied", real: false, gender: "other" },
        });
        expect(response.status()).toBe(403);
    }

    public async openTimesheet() {
        await this.timesheetTab.click();
        await expect(this.timesheetTab).toHaveClass(/active/);
        await expect(this.timesheetView).toBeVisible();
    }

    public async openApprovals() {
        await this.approvalsTab.click();
        await expect(this.approvalsTab).toHaveClass(/active/);
        await expect(this.approvalsView).toBeVisible();
    }

    public async navigateTimesheetInterval() {
        await this.timesheetPreviousWeekButton.click();
        await expect(this.timesheetCurrentWeekButton).toBeVisible();
        await this.timesheetCurrentWeekButton.click();
        await this.timesheetNextWeekButton.click();
        await this.timesheetCurrentWeekButton.click();
    }

    public async toggleTimesheetWeekends() {
        const originalLabel = await this.timesheetToggleWeekendsButton.textContent();
        await this.timesheetToggleWeekendsButton.click();
        await expect(this.timesheetToggleWeekendsButton).not.toHaveText(originalLabel ?? "");
        await this.timesheetToggleWeekendsButton.click();
        await expect(this.timesheetToggleWeekendsButton).toHaveText(originalLabel ?? "");
    }

    public async mockPendingTimesheet() {
        await this.mockTimesheet(["pending"]);
    }

    public async mockRejectedTimesheet() {
        await this.mockTimesheet(["rejected"]);
    }

    public async mockPartiallyReviewedTimesheet() {
        await this.mockTimesheet(["pending", "approved"]);
    }

    public async mockInReviewTimesheet() {
        await this.mockTimesheet(["inreview"]);
    }

    private async mockTimesheet(statuses: MockTimesheetStatus[]) {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        monday.setHours(12, 0, 0, 0);
        const date = monday.toISOString();
        let submitted = false;

        await this.page.route(TIMESHEET_ROUTE, async route => {
            const request = route.request();
            if (request.method() === "PATCH" && request.url().endsWith("/api/timelogs/review")) {
                submitted = true;
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ success: true, data: true }),
                });
                return;
            }

            if (request.method() === "GET") {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        success: true,
                        data: statuses.map((status, index) => {
                            const currentStatus = submitted && status === "pending" ? "inreview" : status;
                            return {
                                id: MOCK_TIMELOG_IDS[index],
                                project: MOCK_PROJECT_ID,
                                task: MOCK_TASK_ID,
                                person: MOCK_PERSON_ID,
                                date,
                                duration: 3600,
                                description: `E2E timesheet entry ${index + 1}`,
                                status: currentStatus,
                                approvedBy: null,
                                approvedOn: null,
                                rejectReason: currentStatus === "rejected" ? "Please add details" : null,
                                documentInfo: { title: "E2E project" },
                                taskInfo: { title: "E2E task" },
                                projectInfo: {},
                            };
                        }),
                    }),
                });
                return;
            }

            await route.continue();
        });
    }

    public async expectTimesheetGrouping() {
        const projectRow = this.page.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-row`);
        const taskRow = this.page.getByTestId(`people-timesheet-task-${MOCK_TASK_ID}-row`);

        await expect(projectRow).toBeVisible();
        await expect(taskRow).toHaveCount(0);
        await projectRow.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-toggle`).click();
        await expect(taskRow).toBeVisible();
    }

    public async openTimeEntryDialogFromEmptyDay() {
        const projectRow = this.page.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-row`);
        await projectRow
            .getByTestId(/^people-timesheet-day-.*-add$/)
            .first()
            .click();
        await expect(this.quickTimelog.timelog).toBeVisible();
        await this.quickTimelog.cancelButton.click();
        await expect(this.quickTimelog.timelog).toBeHidden();
    }

    public async openRejectedEntryForCorrection() {
        const projectRow = this.page.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-row`);
        await expect(projectRow.getByTestId("people-timesheet-status-rejected")).toBeVisible();
        await expect(this.timesheetSubmitReviewButton).toBeDisabled();
        await projectRow.getByTestId(/^people-timesheet-day-.*-entries$/).click();
        await this.page.getByTestId(`people-timesheet-timelog-${MOCK_TIMELOG_IDS[0]}`).click();
        await expect(this.quickTimelog.timelog).toBeVisible();
        await this.quickTimelog.cancelButton.click();
    }

    public async expectPartiallyReviewedStatus() {
        const projectRow = this.page.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-row`);
        await expect(projectRow.getByTestId("people-timesheet-status-partially-reviewed")).toBeVisible();
        await expect(this.timesheetSubmitReviewButton).toBeEnabled();
    }

    public async expectInReviewStatus() {
        const projectRow = this.page.getByTestId(`people-timesheet-project-${MOCK_PROJECT_ID}-row`);
        await expect(projectRow.getByTestId("people-timesheet-status-inreview")).toBeVisible();
        await expect(this.timesheetSubmitReviewButton).toBeDisabled();
    }

    public async clearTimesheetMock() {
        await this.page.unroute(TIMESHEET_ROUTE);
    }

    public async submitTimesheetForReview() {
        await expect(this.timesheetSubmitReviewButton).toBeEnabled();
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().endsWith("/api/timelogs/review")
        );
        await this.timesheetSubmitReviewButton.click();
        await expect(this.page.getByTestId("confirm-dialog-title")).toBeVisible();
        await this.page.getByTestId("confirm-dialog-confirm-button").click();
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        // submitReview reloads after PATCH. Keep the mock installed until that
        // reload renders, otherwise a real empty response can overwrite the next scenario.
        await this.expectInReviewStatus();
        return response.request().postDataJSON() as { start: string; end: string };
    }

    public async navigateApprovalInterval() {
        await this.approvalsPreviousMonthButton.click();
        await expect(this.approvalsCurrentMonthButton).toBeVisible();
        await this.approvalsCurrentMonthButton.click();
        await this.approvalsNextMonthButton.click();
        await this.approvalsCurrentMonthButton.click();
    }

    public async selectApprovalGrouping(grouping: "person" | "project") {
        const button =
            grouping === "person" ? this.approvalsPersonGroupingButton : this.approvalsProjectGroupingButton;
        await button.click();
    }

    public async search(term: string) {
        await this.searchInput.fill(term);
        await expect(this.searchInput).toHaveValue(term);
    }

    public async openGroupingMenu() {
        await this.groupingButton.click();
        await this.groupingMenu.waitFor({ state: "visible" });
    }

    public groupingMenuItem(testId: string): Locator {
        return this.groupingMenu.getByTestId(testId);
    }

    public async selectGrouping(testId: string) {
        await this.groupingMenuItem(testId).click();
    }

    public async toggleFilters() {
        await this.filtersButton.click();
    }

    public async fillNewCompanyTitle(title: string) {
        await this.page.getByTestId("popup-new-generic-input").fill(title);
    }

    public async submitNewCompany() {
        await this.page.getByTestId("popup-new-generic-button").click();
    }

    public async addPerson(firstName: string, lastName: string, email: string) {
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/people") && response.request().method() === "POST"
        );
        await this.openContacts();
        await this.search("");
        await this.addPersonButton.click();
        await this.newPersonFirstNameInput.fill(firstName);
        await this.newPersonLastNameInput.fill(lastName);
        await this.newPersonEmailInput.fill(email);
        await this.newPersonAddButton.click();
        const response = await responsePromise;
        const { data } = await response.json();
        return data?.id;
    }

    public async addCompany(title: string) {
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/companies") && response.request().method() === "POST"
        );
        await this.openCompanies();
        await this.search("");
        await this.addCompanyButton.click();
        await this.page.getByTestId("popup-new-generic-input").fill(title);
        await this.page.getByTestId("popup-new-generic-button").click();
        const response = await responsePromise;
        const { data } = await response.json();
        return data?.id;
    }

    public personRow(id: string): Locator {
        return this.page.getByTestId(`table-people-row-${id}`);
    }

    public personNameCell(id: string): Locator {
        return this.page.getByTestId(`table-people-cell-${id}-name`);
    }

    public companyRow(id: string): Locator {
        return this.page.getByTestId(`table-companies-row-${id}`);
    }

    public companyNameCell(id: string): Locator {
        return this.page.getByTestId(`table-companies-cell-${id}-title`);
    }

    public async waitForPersonRowLoaded(id: string) {
        await expect(this.personRow(id)).toBeVisible();
        await this.personRow(id).scrollIntoViewIfNeeded();
        await expect(this.personNameCell(id)).toBeVisible();
    }

    public async waitForCompanyRowLoaded(id: string) {
        await expect(this.companyRow(id)).toBeVisible();
        await this.companyRow(id).scrollIntoViewIfNeeded();
        await expect(this.companyNameCell(id)).toBeVisible();
    }

    public async openPerson(id: string) {
        await this.openContacts();
        await this.waitForPersonRowLoaded(id);
        await this.personNameCell(id).click();
        await this.personEditButton.waitFor({ state: "visible" });
    }

    public async openCompany(id: string) {
        await this.openCompanies();
        await this.waitForCompanyRowLoaded(id);
        await this.companyNameCell(id).click();
        await this.companyEditButton.waitFor({ state: "visible" });
    }

    /** Opens a person's details from their People contacts row and waits for the favorite star. */
    public async openPersonProfile(id: string) {
        await this.goto("/app/people");
        await this.openContacts();
        await this.waitForPersonRowLoaded(id);
        await this.personNameCell(id).click();
        await this.page.getByTestId("person-favorite-button").waitFor({ state: "visible" });
    }

    /**
     * Toggles a person's favorite state from their details toolbar. Client-side only
     * (`store/actions/people.ts` writes browser localStorage; no server route), so nothing
     * is awaited from the network here.
     */
    public async toggleFavoritePerson() {
        await this.page.getByTestId("person-favorite-button").click();
    }

    /** Opens a company's details from its People companies row and waits for the favorite star. */
    public async openCompanyProfile(id: string) {
        await this.goto("/app/people");
        await this.openCompanies();
        await this.waitForCompanyRowLoaded(id);
        await this.companyNameCell(id).click();
        await this.page.getByTestId("company-favorite-button").waitFor({ state: "visible" });
    }

    /** Toggles a company's favorite state from its details toolbar (client-side only). */
    public async toggleFavoriteCompany() {
        await this.page.getByTestId("company-favorite-button").click();
    }

    public async expectPersonDetailsMode(embedded: boolean) {
        await expect(this.personEditButton).toBeVisible();
        if (embedded) {
            await expect(this.personEmbeddedDetails).toBeVisible();
        } else {
            await expect(this.personEmbeddedDetails).toBeHidden();
        }
        await expect.poll(() => new URL(this.page.url()).pathname.includes("/people/person/")).toBe(embedded);
    }

    public async expectCompanyDetailsMode(embedded: boolean) {
        await expect(this.companyEditButton).toBeVisible();
        if (embedded) {
            await expect(this.companyEmbeddedDetails).toBeVisible();
        } else {
            await expect(this.companyEmbeddedDetails).toBeHidden();
        }
        await expect
            .poll(() => new URL(this.page.url()).pathname.includes("/people/company/"))
            .toBe(embedded);
    }

    public async waitForPersonSearchResult(id: string, term: string) {
        await this.openContacts();
        await this.search(term);
        await this.waitForPersonRowLoaded(id);
        await expect(this.personNameCell(id)).toContainText(term);
    }

    public async waitForCompanySearchResult(id: string, term: string) {
        await this.openCompanies();
        await this.search(term);
        await this.waitForCompanyRowLoaded(id);
        await expect(this.companyNameCell(id)).toContainText(term);
    }

    public async updatePerson(fields: {
        firstName?: string;
        lastName?: string;
        nickname?: string;
        email?: string;
        officePhone?: string;
        jobTitle?: string;
        notes?: string;
    }) {
        await this.personEditButton.click();
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/people/") && response.request().method() === "PATCH"
        );
        if (fields.firstName)
            await this.page.getByTestId("person-details-first-name-input").fill(fields.firstName);
        if (fields.lastName)
            await this.page.getByTestId("person-details-last-name-input").fill(fields.lastName);
        if (fields.nickname)
            await this.page.getByTestId("person-details-nickname-input").fill(fields.nickname);
        if (fields.email) await this.page.getByTestId("person-details-email-input").fill(fields.email);
        if (fields.officePhone)
            await this.page.getByTestId("person-details-office-phone-input").fill(fields.officePhone);
        if (fields.jobTitle)
            await this.page.getByTestId("person-details-job-title-input").fill(fields.jobTitle);
        if (fields.notes) await this.page.getByTestId("person-details-notes-input").fill(fields.notes);
        await this.personUpdateButton.click();
        await responsePromise;
        await this.personEditButton.waitFor({ state: "visible" });
    }

    public async updateCompany(fields: {
        title?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        notes?: string;
    }) {
        await this.companyEditButton.click();
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/companies/") &&
                response.request().method() === "PATCH" &&
                response.ok()
        );
        if (fields.title) await this.page.getByTestId("company-details-title-input").fill(fields.title);
        if (fields.notes) await this.page.getByTestId("company-details-notes-input").fill(fields.notes);
        if (fields.address) await this.page.getByTestId("company-details-address-input").fill(fields.address);
        if (fields.city) await this.page.getByTestId("company-details-city-input").fill(fields.city);
        if (fields.email) await this.page.getByTestId("company-details-email-input").fill(fields.email);
        if (fields.phone) await this.page.getByTestId("company-details-phone-input").fill(fields.phone);
        await this.companyUpdateButton.click();
        await responsePromise;
        await this.companyEditButton.waitFor({ state: "visible" });
    }
}

export default People;
