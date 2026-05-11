import { chromium } from "@playwright/test";
import { TEMP_VIDEOS_DIR } from "./attachVideoContext";
import fs from "fs";
import path from "path";

const authFile = path.resolve(__dirname, "../../playwright/.auth/user.json");

export const bootstrapContext = async (options?: { ignoreAuth?: boolean }) => {
    const browser = await chromium.launch();

    let storageState;
    if (!options?.ignoreAuth) {
        if (fs.existsSync(authFile)) {
            storageState = JSON.parse(fs.readFileSync(authFile, "utf-8"));
            console.log(`[bootstrapContext] Loaded auth state from ${authFile}`);
        } else {
            console.log(`[bootstrapContext] Auth file not found at ${authFile}`);
        }
    }

    const context = await browser.newContext({
        recordVideo: { dir: TEMP_VIDEOS_DIR },
        storageState,
        baseURL: "http://localhost:3000",
    });
    const page = await context.newPage();

    return {
        browser,
        context,
        page,
    };
};
