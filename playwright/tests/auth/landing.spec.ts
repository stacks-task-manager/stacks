import { expect, test } from "@playwright/test";
import Landing from "../../pages/landing";

test.describe("Public landing page", () => {
    test("navigation adapts to a mobile viewport", async ({ page }) => {
        const landing = new Landing(page);
        await landing.open({ width: 390, height: 844 });
        await landing.openMobileMenu();
        await expect(landing.mobileMenu).toBeVisible();
    });

    test("registration CTA reflects the server feature flag", async ({ page }) => {
        const landing = new Landing(page);
        await landing.open();
        expect(await landing.registrationLinkIsVisible()).toBe(await landing.configuredRegistrationState());
    });

    test("renders its local product preview with reduced motion", async ({ page }) => {
        const landing = new Landing(page);
        await landing.renderWithReducedMotion();
        await expect(landing.productPreview).toBeVisible();
    });
});
