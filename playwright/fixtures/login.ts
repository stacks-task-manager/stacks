import { expect } from "@playwright/test";
import users from "../config/users";

export const doLogin = async ({ page, user }: { page: any; user: keyof typeof users }) => {
    await page.goto("/login");

    const emailField = page.locator(`[placeholder="Your email"]`);
    const passwordField = page.locator(`[placeholder="Password"]`);

    await emailField.click();
    await emailField.fill(users[user].username);
    await passwordField.click();
    await passwordField.fill(users[user].password);
    await page.locator(`button:has-text("Login")`).click();

    return page;
};

export const loginFixture = {
    login: async ({}, use: any) => {
        await use(async ({ page }: { page: any }) => {
            await page.goto("/app");
            try {
                await page.getByTestId("profile-button").waitFor({ state: "visible", timeout: 5000 });
                console.log("[loginFixture] Already logged in");
                return;
            } catch (e) {
                console.log("[loginFixture] Not logged in, performing login...", e);
                await doLogin({ page, user: "admin" });
            }
        });
    },
    loginWithUser: async ({}, use: any) => {
        await use(async (options: any) => {
            await doLogin(options);
        });
    },
    logout: async ({}, use: any) => {
        await use(async ({ page }: { page: any }) => {
            await page.getByTestId("profile-button").click();
            await page.getByRole("menuitem", { name: "Log out" }).click();
            await expect(page.locator(`button:has-text("Login")`)).toBeVisible();
        });
    },
};
