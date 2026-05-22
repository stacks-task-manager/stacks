import { defineConfig, devices } from "@playwright/test";

import globals from "./playwright/config/globals";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: "./playwright",
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    timeout: 300000,
    expect: {
        timeout: 10000,
    },
    retries: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ["list"],
        ["junit", { outputFile: "results/reports/playwright.xml" }],
        ["html", { outputFolder: "html-report", open: "never" }],
        ["json", { outputFile: "playwright.json" }],
    ],
    use: {
        actionTimeout: 10000,
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
        },
        {
            name: "chrome",
            use: {
                ...devices["Desktop Chrome"],
                viewport: globals.viewport.desktop,
                storageState: "playwright/.auth/user.json",
            },
            dependencies: ["setup"],
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: "yarn dev:app",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
    },
});
