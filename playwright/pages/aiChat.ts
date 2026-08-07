import { expect, type Locator, type Page } from "@playwright/test";
import Base from "./base";

export type ChoiceControl = "buttons" | "radio" | "checkbox";
export type SeedChoiceWidget = {
    id: string;
    question: string;
    control: ChoiceControl;
    options: Array<{ id: string; label: string }>;
    submitLabel?: string;
};
export type SeedChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    widgets?: Array<{ type: "choice" } & SeedChoiceWidget>;
};

class AiChat extends Base {
    public page: Page;
    public assistantButton: Locator;
    public panel: Locator;

    constructor(page: Page) {
        super(page);
        this.page = page;
        this.assistantButton = page.getByLabel("Open AI assistant");
        this.panel = page.getByTestId("ai-chat-panel");
    }

    choice(id: string): Locator {
        return this.page.getByTestId(`ai-chat-choice-${id}`);
    }

    option(id: string): Locator {
        return this.page.getByTestId(`ai-chat-choice-option-${id}`);
    }

    next(id: string): Locator {
        return this.page.getByTestId(`ai-chat-choice-next-${id}`);
    }

    /** AI chat only renders when the server reports it configured; call before asserting widgets. */
    async isAvailable(): Promise<boolean> {
        try {
            await this.assistantButton.waitFor({ state: "visible", timeout: 4000 });
            return true;
        } catch {
            return false;
        }
    }

    async open() {
        await this.assistantButton.click();
        await this.panel.waitFor({ state: "visible" });
    }

    /**
     * Seed a persisted choice-widget conversation into localStorage (the same key the chat store
     * reads on boot), then reload so the widgets render without needing a live AI round-trip.
     */
    async seed(messages: SeedChatMessage[]) {
        await this.page.evaluate(payload => {
            const tenant = document.cookie.match(/(?:^|; )tenant=([^;]*)/)?.[1] ?? "";
            window.localStorage.setItem(`${tenant}/ai-chat-messages`, JSON.stringify(payload));
        }, { messages });
        await this.page.reload();
        await this.open();
    }

    async expectQuestion(id: string, question: string) {
        await expect(this.choice(id)).toContainText(question);
    }

    async expectOption(id: string, label: string) {
        await expect(this.option(id)).toContainText(label);
    }

    async select(id: string) {
        await this.option(id).click();
    }

    async expectNext(enabled: boolean, id: string) {
        const button = this.next(id);
        if (enabled) {
            await expect(button).toBeEnabled();
        } else {
            await expect(button).toBeDisabled();
        }
    }

    async submit(id: string) {
        await this.next(id).click();
    }

    async expectDisabled(id: string) {
        const root = this.option(id);
        const input = root.locator("input");
        if (await input.count()) {
            await expect(input).toBeDisabled();
        } else {
            await expect(root).toBeDisabled();
        }
    }
}

export default AiChat;