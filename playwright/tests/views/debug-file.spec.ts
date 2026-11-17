import type { Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";

const FILE_NAME = `e2e-debug-${Date.now()}.txt`;

test.describe("debug file upload", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let filePath: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        filePath = path.join(os.tmpdir(), FILE_NAME);
        fs.writeFileSync(filePath, "x".repeat(512));

        page.on("console", msg => {
            if (msg.type() === "error") console.log(`[console:error] ${msg.text()}`);
        });
        page.on("pageerror", err => console.log(`[pageerror] ${err.message}`));

        page.on("response", async res => {
            const u = res.url();
            if (u.includes("/api/documents") || u.includes("/api/files/upload")) {
                let body = "";
                try {
                    body = (await res.text()).slice(0, 300);
                } catch {
                    body = "<no body>";
                }
                console.log(`[response] ${res.status()} ${res.request().method()} ${u} → ${body}`);
            }
        });
        page.on("requestfailed", req => {
            const u = req.url();
            if (u.includes("/api/documents") || u.includes("/api/files/upload")) {
                console.log(`[requestfailed] ${req.method()} ${u} → ${req.failure()?.errorText}`);
            }
        });
    });

    test.afterAll(async () => {
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
        await context?.close().catch(() => undefined);
        await browser?.close().catch(() => undefined);
    });

    test("trace quick-add file upload", async () => {
        console.log("start url:", page.url());
        // Make sure we are on an app page with the sidebar.
        await page.goto("/app");
        await page.waitForTimeout(1500);
        console.log("after goto /app url:", page.url());

        const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 15000 });
        const docPromise = page.waitForResponse(
            r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/documents",
            { timeout: 15000 }
        );

        await page.getByTestId("quick-add-button").click();
        await page.getByTestId("quick-add-menu").waitFor({ state: "visible" });
        await page.getByTestId("new-file-item").click();
        console.log("clicked new-file-item, waiting for filechooser + doc");

        const [fileChooser, docResponse] = await Promise.all([fileChooserPromise, docPromise]);
        const docBody = await docResponse.json();
        const docId = docBody?.data?.id;
        console.log("doc created:", docId);
        await fileChooser.setFiles(filePath);
        console.log("setFiles done, waiting for upload + navigation...");

        await page.waitForTimeout(8000);
        console.log("final url:", page.url());
        console.log("file-view visible?", await page.getByTestId("file-view").isVisible().catch(() => false));
        console.log("file-name visible?", await page.getByTestId("file-name").isVisible().catch(() => false));
        console.log("toast visible?", await page.getByText("not found").first().isVisible().catch(() => false));
    });
});
