import { join, normalize } from "path";
import type { BrowserContext, TestInfo } from "@playwright/test";

export const TEMP_VIDEOS_DIR = normalize(`pw-videos`);

export const attachVideoContextFixtures = {
    // provide a mechanism to establish a reference to the active
    // browser context and use it to extract the recorded video
    // files to attach to the generated HTML report
    attachVideoContext: [
        async (
            {},
            use: (value: (activeContext: BrowserContext) => void) => Promise<void>,
            testInfo: TestInfo
        ) => {
            let ctx: BrowserContext | null = null;

            await use((activeContext: BrowserContext) => {
                ctx = activeContext;
            });

            if (testInfo.status && ["failed", "timedOut", "interrupted"].includes(testInfo.status)) {
                if (!ctx) {
                    return;
                }

                const videoPath = `${join(TEMP_VIDEOS_DIR, testInfo.testId)}.webm`;

                const context = ctx as BrowserContext;
                const page = context.pages()[0];

                await context.close();

                await page?.video()?.saveAs(videoPath);

                await testInfo.attach("video", { path: videoPath });
            }
        },
        { scope: "test" },
    ],
};
