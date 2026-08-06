import { chromium } from "@playwright/test";
import { TEMP_VIDEOS_DIR } from "./attachVideoContext";
import fs from "fs";
import path from "path";

const authFile = path.resolve(__dirname, "../../playwright/.auth/user.json");
const shouldRecordVideo = process.env.E2E_RECORD_VIDEO !== "false";
let hasLoggedAuthStateLoaded = false;

export const bootstrapContext = async (options?: { ignoreAuth?: boolean }) => {
    const browser = await chromium.launch();

    let storageState;
    if (!options?.ignoreAuth) {
        if (fs.existsSync(authFile)) {
            storageState = JSON.parse(fs.readFileSync(authFile, "utf-8"));
            if (!hasLoggedAuthStateLoaded) {
                console.log(`[bootstrapContext] Loaded auth state from ${authFile}`);
                hasLoggedAuthStateLoaded = true;
            }
        } else {
            console.log(`[bootstrapContext] Auth file not found at ${authFile}`);
        }
    }

    const context = await browser.newContext({
        recordVideo: shouldRecordVideo ? { dir: TEMP_VIDEOS_DIR } : undefined,
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
