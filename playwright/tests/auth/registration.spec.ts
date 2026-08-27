import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import ActivationPage from "../../pages/activation";
import Auth from "../../pages/auth";
import RegisterPage from "../../pages/register";

// Requires REGISTRATION_ENABLED=true in packages/server/.env, otherwise GET
// /register returns a 403 plain-text body and every scenario here fails.

const PASSWORD = "TestPass123";
const EMAIL_PREFIX = "e2e-reg";

const uniqueEmail = () =>
    `${EMAIL_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe("User registration", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let register: RegisterPage;
    let auth: Auth;
    let activation: ActivationPage;

    const createdEmails: string[] = [];

    test.beforeAll(async () => {
        ({ browser, context, page } = await bootstrapContext({ ignoreAuth: true }));
        register = new RegisterPage(page);
        auth = new Auth(page);
        activation = new ActivationPage(page);
    });

    test.beforeEach(({ attachVideoContext }) => {
        attachVideoContext(context);
    });

    test.afterEach(() => {
        for (const email of createdEmails) {
            getDb()
                .cleanupUser(email)
                .catch(() => {});
        }
        createdEmails.length = 0;
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
        await closeDb();
    });

    const registerUser = async (email: string) => {
        await register.open();
        await register.fill(email, "E2E", "Registration", PASSWORD);
        await register.submit();
    };

    test("renders the account creation form with tenant options", async () => {
        await register.open();

        await expect(register.card).toBeVisible();
        await expect(register.emailField).toBeVisible();
        await expect(register.firstNameField).toBeVisible();
        await expect(register.lastNameField).toBeVisible();
        await expect(register.passwordField).toBeVisible();
        await expect(register.submitButton).toBeVisible();
        // There is always a placeholder option plus at least one real tenant.
        await expect(register.tenantSelect.locator("option")).toHaveCount(2);
    });

    test("successful registration queues an activation email and redirects to login", async () => {
        const email = uniqueEmail();
        createdEmails.push(email);

        await registerUser(email);

        await auth.loginCard.waitFor();
        await expect(auth.successMessages).toContainText("Check your email");

        const token = await getDb().getActivationToken(email);
        expect(token).toBeTruthy();
    });

    test("an already-registered email is rejected as a conflict", async () => {
        const email = uniqueEmail();
        createdEmails.push(email);

        await registerUser(email);
        await auth.loginCard.waitFor();

        // Submit the same account a second time.
        await register.open();
        await register.fill(email, "E2E", "Registration", PASSWORD);
        await register.submit();

        expect(await register.bodyText()).toContain("User already exists");
    });

    test("a new account can be activated and then logged in to", async () => {
        const email = uniqueEmail();
        createdEmails.push(email);

        await registerUser(email);
        await auth.loginCard.waitFor();

        const token = await getDb().getActivationToken(email);
        expect(token).toBeTruthy();

        await activation.openActivation(token as string);
        await activation.submitPasswords(PASSWORD, PASSWORD);

        await expect(activation.successMessage).toBeVisible();
        await expect(activation.successMessage).toContainText("successfully activated");

        // The activated account logs in with the password chosen at activation.
        await auth.login(email, PASSWORD);
        await page.getByTestId("profile-button").waitFor();
    });

    test("activation rejects mismatched passwords", async () => {
        const email = uniqueEmail();
        createdEmails.push(email);

        await registerUser(email);
        await auth.loginCard.waitFor();

        const token = await getDb().getActivationToken(email);
        expect(token).toBeTruthy();

        await activation.openActivation(token as string);
        await activation.submitPasswords("TestPass123", "Different123");

        await expect(activation.errorMessages).toBeVisible();
    });
});
