import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import Sidebar from "./sidebar";

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
    public approvalsPreviousMonthButton: Locator;
    public approvalsNextMonthButton: Locator;
    public approvalsCurrentMonthButton: Locator;
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

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
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
        this.approvalsPreviousMonthButton = page.getByTestId("people-approvals-previous-month-button");
        this.approvalsNextMonthButton = page.getByTestId("people-approvals-next-month-button");
        this.approvalsCurrentMonthButton = page.getByTestId("people-approvals-current-month-button");
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

    public async navigateApprovalInterval() {
        await this.approvalsPreviousMonthButton.click();
        await expect(this.approvalsCurrentMonthButton).toBeVisible();
        await this.approvalsCurrentMonthButton.click();
        await this.approvalsNextMonthButton.click();
        await this.approvalsCurrentMonthButton.click();
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
