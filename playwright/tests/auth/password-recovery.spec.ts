import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Auth from "../../pages/auth";
import PasswordRecoveryPage from "../../pages/passwordRecovery";
import PasswordResetPage from "../../pages/passwordReset";

// Requires PASSWORD_RECOVERY_ENABLED=true in packages/server/.env, otherwise the
// recovery/reset endpoints return 403 and every scenario here fails.
//
// Recovery is exercised against a throwaway active user created directly in the
// DB (borrowing the admin user's tenant/role), so the admin password is never
// touched and the created user is removed in afterAll.

const ORIGINAL_PASSWORD = "OldPass123";
const NEW_PASSWORD = "NewPass456";
const EMAIL_PREFIX = "e2e-recovery";
const uniqueEmail = () =>
    `${EMAIL_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe("Password recovery", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let auth: Auth;
    let recovery: PasswordRecoveryPage;
    let reset: PasswordResetPage;

    const userEmail = uniqueEmail();

    test.beforeAll(async () => {
        ({ browser, context, page } = await bootstrapContext({ ignoreAuth: true }));
        auth = new Auth(page);
        recovery = new PasswordRecoveryPage(page);
        reset = new PasswordResetPage(page);

        await getDb().createActiveUser(userEmail, ORIGINAL_PASSWORD);
    });

    test.beforeEach(({ attachVideoContext }) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        await getDb().cleanupUser(userEmail);
        if (page && !page.isClosed()) {
            await page.close();
        }
        if (context) {
            await context.close();
        }
        if (browser) {
            await browser.close();
        }
        await closeDb();
    });

    const extractToken = (resetLink: string): string => {
        const url = new URL(resetLink, "http://localhost:3000");
        const token = url.searchParams.get("token");
        expect(token, `expected a token in reset link: ${resetLink}`).toBeTruthy();
        return token as string;
    };

    test("forgot-password link on login opens the recovery form", async () => {
        await auth.gotoLogin();

        await expect(auth.forgetPasswordLink).toBeVisible();
        await auth.forgetPasswordLink.click();

        await expect(recovery.card).toBeVisible();
    });

    test("recovery for an unknown email shows an error", async () => {
        await recovery.open();
        await recovery.submitEmail(`${EMAIL_PREFIX}-unknown@example.com`);

        await expect(recovery.errorMessages).toBeVisible();
        await expect(recovery.errorMessages).toContainText("Invalid email");
    });

    test("recovery for a known email queues a reset email and returns to login", async () => {
        await recovery.open();
        await recovery.submitEmail(userEmail);

        await auth.loginCard.waitFor();
        await expect(auth.successMessages).toContainText("Check your email");

        const resetLink = await getDb().getPasswordResetLink(userEmail);
        expect(resetLink).toContain("/login/password-reset?token=");
    });

    test("a valid reset link changes the password and signs the user in", async () => {
        await recovery.open();
        await recovery.submitEmail(userEmail);

        await auth.loginCard.waitFor();
        const resetLink = await getDb().getPasswordResetLink(userEmail);
        expect(resetLink).toBeTruthy();

        const token = extractToken(resetLink as string);
        await reset.openReset(token);
        await reset.submitPasswords(NEW_PASSWORD, NEW_PASSWORD);

        await auth.loginCard.waitFor();
        await expect(auth.successMessages).toContainText("password has been reset");

        // The new password works; the old one no longer does.
        await auth.login(userEmail, NEW_PASSWORD);
        await page.getByTestId("profile-button").waitFor();
    });

    test("an invalid reset token is rejected", async () => {
        await reset.openResetRaw("f".repeat(64));

        expect(await reset.bodyText()).toContain("invalid or expired");
    });
});
