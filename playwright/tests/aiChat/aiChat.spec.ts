import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import AiChat, { type SeedChatMessage } from "../../pages/aiChat";

const seedMessages: SeedChatMessage[] = [
    {
        id: "seed-btn",
        role: "assistant",
        content: "Which workspace would you like?",
        widgets: [
            {
                type: "choice",
                id: "btn-workspace",
                question: "Choose a workspace",
                control: "buttons",
                options: [
                    { id: "ws-a", label: "Team Alpha" },
                    { id: "ws-b", label: "Team Beta" },
                ],
            },
        ],
    },
    {
        id: "seed-radio",
        role: "assistant",
        content: "What priority?",
        widgets: [
            {
                type: "choice",
                id: "rad-priority",
                question: "Pick a priority",
                control: "radio",
                submitLabel: "Confirm",
                options: [
                    { id: "prio-low", label: "Low" },
                    { id: "prio-high", label: "High" },
                ],
            },
        ],
    },
    {
        id: "seed-checkbox",
        role: "assistant",
        content: "Select any labels",
        widgets: [
            {
                type: "choice",
                id: "chk-tags",
                question: "Select tags",
                control: "checkbox",
                submitLabel: "Apply",
                options: [
                    { id: "tag-frontend", label: "Frontend" },
                    { id: "tag-backend", label: "Backend" },
                    { id: "tag-ops", label: "Ops" },
                ],
            },
        ],
    },
];

test.describe("AI Chat interactive widgets", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let aiChat: AiChat;
    let aiEnabled = false;

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        aiChat = new AiChat(page);
        if (await aiChat.isAvailable()) {
            aiEnabled = true;
            await aiChat.seed(seedMessages);
        }
    });

    test.beforeEach(async ({ attachVideoContext }: any) => {
        attachVideoContext(context);
        if (aiEnabled) {
            // A submitted widget fires a real sendMessage and flips isAiWaitingReply
            // globally; reloading resets that so each test starts from clean widget state.
            await page.reload();
            await aiChat.open();
        }
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("renders button, radio, and checkbox choice widgets", async () => {
        test.skip(!aiEnabled, "AI chat is not enabled on the running server");

        await aiChat.expectQuestion("btn-workspace", "Choose a workspace");
        await aiChat.expectOption("ws-a", "Alpha");
        await aiChat.expectOption("ws-b", "Beta");

        await aiChat.expectQuestion("rad-priority", "Pick a priority");
        await aiChat.expectOption("prio-low", "Low");
        await aiChat.expectOption("prio-high", "High");

        await aiChat.expectQuestion("chk-tags", "Select tags");
        await aiChat.expectOption("tag-frontend", "Frontend");
    });

    test("button options are disabled after selection", async () => {
        test.skip(!aiEnabled, "AI chat is not enabled on the running server");

        await aiChat.select("ws-a");
        await aiChat.expectDisabled("ws-a");
        await aiChat.expectDisabled("ws-b");
    });

    test("radio shows a disabled Next until one option is selected", async () => {
        test.skip(!aiEnabled, "AI chat is not enabled on the running server");

        await aiChat.expectNext(false, "rad-priority");
        await aiChat.select("prio-high");
        await aiChat.expectNext(true, "rad-priority");
        await aiChat.submit("rad-priority");
        await aiChat.expectDisabled("prio-low");
        await aiChat.expectDisabled("prio-high");
    });

    test("checkbox requires at least one selection before Next", async () => {
        test.skip(!aiEnabled, "AI chat is not enabled on the running server");

        await aiChat.expectNext(false, "chk-tags");
        await aiChat.select("tag-frontend");
        await aiChat.select("tag-backend");
        await aiChat.expectNext(true, "chk-tags");
        await aiChat.submit("chk-tags");
        await aiChat.expectDisabled("tag-frontend");
        await aiChat.expectDisabled("tag-backend");
        await aiChat.expectDisabled("tag-ops");
    });

    test("answered widgets stay disabled after reload", async () => {
        test.skip(!aiEnabled, "AI chat is not enabled on the running server");

        await aiChat.expectDisabled("ws-a");
        await aiChat.expectDisabled("prio-high");
        await aiChat.expectDisabled("tag-frontend");
    });
});