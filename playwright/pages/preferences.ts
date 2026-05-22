import { Locator, Page } from "@playwright/test";
import Base from "./base";

class Preferences extends Base {
    public preferencesButton: Locator;
    public preferencesDialog: Locator;
    public preferencesTabList: Locator;
    public closeButton: Locator;

    constructor(page: Page) {
        super(page);

        this.preferencesButton = page.getByTestId("preferences-button");
        this.preferencesDialog = page.getByRole("dialog", { name: "Preferences" });
        this.preferencesTabList = this.preferencesDialog.getByRole("tablist");
        this.closeButton = this.preferencesDialog.getByRole("button", { name: "Close" });
    }

    public async openPreferences() {
        await this.preferencesButton.click();
    }

    public getTab(name: string): Locator {
        return this.preferencesTabList.getByRole("tab", { name });
    }

    public getPreferenceRow(label: string): Locator {
        const preferencePane = this.preferencesDialog.getByRole("tabpanel");
        const preferenceRow = preferencePane.locator(".settings-row");
        return preferenceRow.filter({
            has: this.page.locator(".settings-row-title").filter({ hasText: label }),
        });
    }

    public async toggleSetting(tab: string, label: string, checkbox: boolean) {
        if (!(await this.preferencesDialog.isVisible())) {
            await this.openPreferences();
        }

        const tabLocator = this.getTab(tab);
        await tabLocator.click();

        const preferenceRow = this.getPreferenceRow(label);

        await preferenceRow.getByRole("checkbox").setChecked(checkbox, { force: true });

        await this.closeButton.click();
        await this.preferencesDialog.waitFor({ state: "hidden" });
    }
}

export default Preferences;
