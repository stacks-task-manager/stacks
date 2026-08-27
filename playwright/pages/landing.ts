import type { Locator, Page } from "@playwright/test";

export default class Landing {
    readonly page: Page;
    readonly root: Locator;
    readonly mobileMenuButton: Locator;
    readonly mobileMenu: Locator;
    readonly productPreview: Locator;
    readonly registrationLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.root = page.getByTestId("landing-page");
        this.mobileMenuButton = page.getByTestId("landing-mobile-menu-button");
        this.mobileMenu = page.getByTestId("landing-mobile-menu");
        this.productPreview = page.getByTestId("landing-product-preview");
        this.registrationLink = page.getByTestId("landing-register-link");
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

    async configuredRegistrationState(): Promise<boolean> {
        return (await this.root.getAttribute("data-registration-enabled")) === "true";
    }

    async registrationLinkIsVisible(): Promise<boolean> {
        return this.registrationLink.isVisible();
    }

    async renderWithReducedMotion(): Promise<void> {
        await this.page.emulateMedia({ reducedMotion: "reduce" });
        await this.open();
    }
}
