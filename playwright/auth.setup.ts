import { test as setup } from "@playwright/test";
import { doLogin } from "./fixtures/login";
import { bootstrapContext } from "./fixtures/bootstrapContext";
import fs from "fs";
import path from "path";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({}) => {
    // Ensure the directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const { page, context, browser } = await bootstrapContext({ ignoreAuth: true });
    await doLogin({ page, user: "admin" });

    // Wait for login to complete (e.g., check for profile button)
    await page.getByTestId("profile-button").waitFor();

    await page.context().storageState({ path: authFile });

    await browser.close();
});
