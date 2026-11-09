import { expect, Locator, Page } from "@playwright/test";

export class TaskComments {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    private async openComments(): Promise<void> {
        await this.page.getByTestId("task-details-scroll-area").evaluateAll(elements => {
            for (const element of elements) element.scrollTop = element.scrollHeight;
        });
        const toggle = this.page.getByTestId("comments-toggle-logs");
        await toggle.waitFor({ state: "visible" });
        const list = this.page.getByTestId("comments-list");
        if (!(await list.isVisible())) await toggle.click();
    }

    private comment(id: string): Locator {
        return this.page.getByTestId(`task-comment-${id}`);
    }

    public async addComment(text: string): Promise<string> {
        await this.openComments();
        const editor = this.page.getByTestId("task-comment-content");
        await editor.fill(text);
        const send = this.page.getByTestId("comment-send-button");
        const response = this.page.waitForResponse(
            item => item.request().method() === "POST" && item.url().includes("/api/activities")
        );
        await send.click();
        const result = await response;
        expect(result.ok()).toBeTruthy();
        const body = await result.json();
        for (const line of text.split("\n")) {
            await expect(this.page.getByTestId("comments-list")).toContainText(line);
        }
        return (body.data ?? body).id;
    }

    public async expectComment(text: string, visible: boolean): Promise<void> {
        await this.openComments();
        const list = this.page.getByTestId("comments-list");
        for (const line of text.split("\n")) {
            if (visible) await expect(list).toContainText(line);
            else await expect(list).not.toContainText(line);
        }
    }

    public async expectCommentMarkupInert(id: string, markup: string): Promise<void> {
        await expect(this.comment(id)).toContainText(markup);
        const probe = await this.page.evaluate(
            () => (window as Window & { __commentProbe?: boolean }).__commentProbe
        );
        expect(probe).toBeUndefined();
    }

    public async expectOtherAuthorActionsHidden(id: string): Promise<void> {
        const comment = this.comment(id);
        await expect(comment).toBeVisible();
        await expect(comment.getByTestId(`task-comment-menu-${id}`)).toHaveCount(0);
    }

    public async expectCommentAuthor(id: string, name: string): Promise<void> {
        await expect(this.comment(id).getByTestId(`task-comment-author-${id}`)).toContainText(name);
    }

    public async expectOtherAuthorMutationsDenied(resourceId: string, id: string): Promise<void> {
        const csrfResponse = await this.page.request.get("/auth/csrf");
        expect(csrfResponse.ok()).toBeTruthy();
        const { data } = await csrfResponse.json();
        const headers = {
            Origin: new URL(this.page.url()).origin,
            "x-csrf-token": data.token,
        };
        const update = await this.page.request.patch(`/api/activities/${id}`, {
            headers,
            data: { resourceId, content: "Unauthorized edit" },
        });
        expect(update.status()).toBe(404);
        const remove = await this.page.request.fetch(`/api/activities/${id}`, {
            method: "DELETE",
            headers,
            data: { resourceId },
        });
        expect(remove.status()).toBe(404);
    }

    public async editComment(id: string, nextText: string): Promise<void> {
        const comment = this.comment(id);
        await comment.hover();
        await comment.getByTestId(`task-comment-menu-${id}`).click();
        await this.page.getByTestId("comment-edit-menu-item").click();
        const editor = this.page.getByTestId(`task-comment-content-${id}`);
        await editor.fill(nextText);
        const update = this.page.waitForResponse(
            item =>
                ["PATCH", "POST"].includes(item.request().method()) &&
                (item.url().includes("/api/activities") ||
                    item.request().postData()?.includes("activities/update") === true)
        );
        await comment.getByTestId("comment-update-button").click();
        expect((await update).ok()).toBeTruthy();
        await expect(comment).toContainText(nextText);
    }

    public async cancelEdit(id: string, originalText: string, draft: string): Promise<void> {
        const comment = this.comment(id);
        await comment.hover();
        await comment.getByTestId(`task-comment-menu-${id}`).click();
        await this.page.getByTestId("comment-edit-menu-item").click();
        await this.page.getByTestId(`task-comment-content-${id}`).fill(draft);
        await comment.getByTestId("comment-cancel-button").click();
        for (const line of originalText.split("\n")) await expect(comment).toContainText(line);
        await expect(comment).not.toContainText(draft);
    }

    public async deleteComment(id: string, confirm: boolean): Promise<void> {
        const comment = this.comment(id);
        await comment.hover();
        await comment.getByTestId(`task-comment-menu-${id}`).click();
        await this.page.getByTestId("comment-delete-menu-item").click();
        const confirmation = this.page.getByTestId("confirm-dialog-confirm-button");
        if (confirm) await confirmation.click();
        else await this.page.getByTestId("confirm-dialog-cancel-button").click();
        if (confirm) await expect(comment).toHaveCount(0);
        else await expect(comment).toBeVisible();
    }
}
