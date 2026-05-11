import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Auth from "../../pages/auth";

test.describe("Auth", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let auth: Auth;

    test.beforeAll(async () => {
        ({ browser, context, page } = await bootstrapContext());

        auth = new Auth(page);
    });

    test.beforeEach(({ attachVideoContext }) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }

        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    });

    test("Login with invalid username should show error", async ({ loginWithUser }) => {
        await loginWithUser({ page, user: "invalid" });
        await expect(auth.errorMessages).toBeVisible();
        await expect(auth.errorMessages).toHaveText("Invalid email or password");
    });

    // login with a blocked user

    test("Should show forget password link", async () => {
        await page.goto("/login");
        await expect(auth.forgetPasswordLink).toBeVisible();

        await test.step("Click on forget password link", async () => {
            await auth.forgetPasswordLink.click();
            await expect(auth.passwordRecoveryCard).toBeVisible();
        });

        await test.step("Return back to the login", async () => {
            await auth.passwordRecoveryFooter.getByRole("link", { name: "Log in" }).click();
            await expect(auth.loginCard).toBeVisible();
        });
    });
});
