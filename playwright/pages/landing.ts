import type { Locator, Page } from "@playwright/test";

export default class Landing {
    readonly page: Page;
    readonly root: Locator;
    readonly mobileMenuDisclosure: Locator;
    readonly mobileMenuButton: Locator;
    readonly mobileMenu: Locator;
    readonly productPreview: Locator;
    readonly registrationLink: Locator;
    readonly registrationDisabledMessage: Locator;
    readonly primaryLogin: Locator;
    readonly workflowSection: Locator;
    readonly controlSection: Locator;
    readonly instanceStatus: Locator;
    readonly healthStatusLink: Locator;
    readonly pingStatusLink: Locator;
    readonly statusDialog: Locator;
    readonly statusDialogIcon: Locator;
    readonly statusSpinner: Locator;
    readonly statusDialogTitle: Locator;
    readonly statusDialogMessage: Locator;
    readonly statusDialogVersion: Locator;
    readonly statusDialogClose: Locator;

    constructor(page: Page) {
        this.page = page;
        this.root = page.getByTestId("landing-page");
        this.mobileMenuDisclosure = page.getByTestId("landing-mobile-menu-disclosure");
        this.mobileMenuButton = page.getByTestId("landing-mobile-menu-button");
        this.mobileMenu = page.getByTestId("landing-mobile-menu");
        this.productPreview = page.getByTestId("landing-product-preview");
        this.registrationLink = page.getByTestId("landing-register-link");
        this.registrationDisabledMessage = page.getByTestId("landing-registration-disabled");
        this.primaryLogin = page.getByTestId("landing-primary-login");
        this.workflowSection = page.getByTestId("landing-workflow");
        this.controlSection = page.getByTestId("landing-control");
        this.instanceStatus = page.getByTestId("landing-instance-status");
        this.healthStatusLink = page.getByTestId("landing-health-link");
        this.pingStatusLink = page.getByTestId("landing-ping-link");
        this.statusDialog = page.getByTestId("landing-status-dialog");
        this.statusDialogIcon = page.getByTestId("landing-status-dialog-icon");
        this.statusSpinner = page.getByTestId("landing-status-spinner");
        this.statusDialogTitle = page.getByTestId("landing-status-dialog-title");
        this.statusDialogMessage = page.getByTestId("landing-status-dialog-message");
        this.statusDialogVersion = page.getByTestId("landing-status-dialog-version");
        this.statusDialogClose = page.getByTestId("landing-status-dialog-close");
    }

    async open(viewport = { width: 1280, height: 800 }): Promise<void> {
        await this.page.setViewportSize(viewport);
        await this.page.goto("/");
        await this.root.waitFor();
    }

    async openMobileMenu(): Promise<void> {
        await this.mobileMenuButton.click();
        await this.mobileMenu.waitFor({ state: "visible" });
    }

    async mobileMenuIsOpen(): Promise<boolean> {
        return this.mobileMenuDisclosure.evaluate(element => (element as HTMLDetailsElement).open);
    }

    async configuredRegistrationState(): Promise<boolean> {
        return (await this.root.getAttribute("data-registration-enabled")) === "true";
    }

    async registrationLinkIsVisible(): Promise<boolean> {
        return this.registrationLink.isVisible();
    }

    async registrationDisabledMessageIsVisible(): Promise<boolean> {
        return this.registrationDisabledMessage.isVisible();
    }

    async primaryLoginPath(): Promise<string | null> {
        return this.primaryLogin.getAttribute("href");
    }

    async renderWithReducedMotion(): Promise<void> {
        await this.page.emulateMedia({ reducedMotion: "reduce" });
        await this.open();
    }

    async hasHorizontalOverflow(): Promise<boolean> {
        return this.page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
    }

    async placeholderLinkCount(): Promise<number> {
        return this.page.locator('a[href="#"]').count();
    }

    async openPingStatus(): Promise<void> {
        await this.pingStatusLink.click();
        await this.statusDialog.waitFor({ state: "visible" });
    }

    async openHealthStatus(): Promise<void> {
        await this.healthStatusLink.click();
        await this.statusDialog.waitFor({ state: "visible" });
    }

    async closeStatusDialog(): Promise<void> {
        await this.statusDialogClose.click();
        await this.statusDialog.waitFor({ state: "hidden" });
    }

    async mockStatusEndpoint(
        endpoint: "health" | "ping",
        payload: Record<string, unknown>,
        delay = 0
    ): Promise<void> {
        await this.page.route(`**/${endpoint}`, async route => {
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(payload),
            });
        });
    }

    async clearStatusMocks(): Promise<void> {
        await this.page.unroute("**/health");
        await this.page.unroute("**/ping");
    }
}
