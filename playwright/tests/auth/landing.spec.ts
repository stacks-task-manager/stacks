import { expect, test } from "@playwright/test";
import Landing from "../../pages/landing";

test.describe("Public landing page", () => {
    test("navigation adapts to a mobile viewport", async ({ page }) => {
        const landing = new Landing(page);
        await landing.open({ width: 390, height: 844 });

        expect(await landing.mobileMenuIsOpen()).toBe(false);
        await landing.openMobileMenu();
        expect(await landing.mobileMenuIsOpen()).toBe(true);
        await expect(landing.mobileMenu).toBeVisible();
    });

    test("entry actions reflect the server feature flags", async ({ page }) => {
        const landing = new Landing(page);
        await landing.open();
        const registrationEnabled = await landing.configuredRegistrationState();

        expect(await landing.primaryLoginPath()).toBe("/login");
        expect(await landing.registrationLinkIsVisible()).toBe(registrationEnabled);
        expect(await landing.registrationDisabledMessageIsVisible()).toBe(!registrationEnabled);
    });

    test("renders all primary content with reduced motion", async ({ page }) => {
        const landing = new Landing(page);
        await landing.renderWithReducedMotion();

        await expect(landing.productPreview).toBeVisible();
        await expect(landing.workflowSection).toBeVisible();
        await expect(landing.controlSection).toBeVisible();
        await expect(landing.instanceStatus).toBeVisible();
    });

    test("status dialog checks ping and shows the health version", async ({ page }) => {
        const landing = new Landing(page);
        await landing.open();
        await landing.mockStatusEndpoint("ping", { message: "pong" }, 500);
        await landing.mockStatusEndpoint("health", { status: "ok", version: "9.8.7" }, 500);

        try {
            await landing.openPingStatus();
            await expect(landing.statusDialog).toBeVisible();
            await expect(landing.statusDialogIcon).toHaveAttribute("data-state", "loading");
            await expect(landing.statusSpinner).toBeVisible();
            await expect(landing.statusDialog).toHaveAttribute("data-state", "success");
            await expect(landing.statusDialogTitle).toHaveText("Server is reachable");
            await expect(landing.statusDialogMessage).toContainText("pong");
            await expect(landing.statusDialogVersion).toBeHidden();
            await landing.closeStatusDialog();

            await landing.openHealthStatus();
            await expect(landing.statusDialogIcon).toHaveAttribute("data-state", "loading");
            await expect(landing.statusSpinner).toBeVisible();
            await expect(landing.statusDialog).toHaveAttribute("data-state", "success");
            await expect(landing.statusDialogTitle).toHaveText("Instance is healthy");
            await expect(landing.statusDialogVersion).toHaveText("Version 9.8.7");
            await landing.closeStatusDialog();
        } finally {
            await landing.clearStatusMocks();
        }
    });

    test("fits supported viewports without placeholder links", async ({ page }) => {
        const landing = new Landing(page);
        for (const viewport of [
            { width: 320, height: 720 },
            { width: 390, height: 844 },
            { width: 768, height: 1024 },
            { width: 1024, height: 768 },
            { width: 1440, height: 1000 },
        ]) {
            await landing.open(viewport);
            expect(await landing.hasHorizontalOverflow(), `overflow at ${viewport.width}px`).toBe(false);
            expect(await landing.placeholderLinkCount()).toBe(0);
        }
    });
});
