import { expect, Page } from "@playwright/test";
import Base from "./base";

const ROOT_DOCUMENT_ID = "00000000-0000-0000-0000-000000000000";

export class PermissionsPage extends Base {
    constructor(page: Page) {
        super(page);
    }

    async createDocument(title: string, type: "folder" | "project", parent = ROOT_DOCUMENT_ID) {
        const response = await this.page.request.post("/api/documents", {
            headers: await this.browserMutationHeaders(),
            data: {
                title,
                type,
                parent,
                data: {},
                permissions: { isPublic: true, visibleUsers: [], visibleRoles: [] },
            },
        });
        expect(
            response.ok(),
            `Document creation failed (${response.status()}): ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async createCalendarWithEvent(title: string) {
        const calendarResponse = await this.page.request.post("/api/calendars", {
            headers: await this.browserMutationHeaders(),
            data: { title, color: "#4455aa", isPublic: true },
        });
        expect(calendarResponse.ok()).toBeTruthy();
        const calendarId = (await calendarResponse.json()).data.id as string;
        try {
            const start = new Date();
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const eventResponse = await this.page.request.post("/api/events", {
                headers: await this.browserMutationHeaders(),
                data: {
                    title: `${title} event`,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    source: "local",
                    calendar: calendarId,
                },
            });
            expect(eventResponse.ok()).toBeTruthy();
            return { calendarId, eventId: (await eventResponse.json()).data.id as string };
        } catch (error) {
            try {
                await this.deleteCalendar(calendarId);
            } catch (cleanupError) {
                throw new AggregateError([error, cleanupError], "Calendar setup cleanup failed");
            }
            throw error;
        }
    }

    async reloadWorkspace() {
        await this.page.reload();
        await this.page.getByTestId("sidebar").waitFor({ state: "visible" });
    }

    async createStack(projectId: string, title: string) {
        const response = await this.page.request.post("/api/stacks", {
            headers: await this.browserMutationHeaders(),
            data: { project: projectId, title },
        });
        expect(
            response.ok(),
            `Stack creation failed (${response.status()}): ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async createTask(projectId: string, stackId: string, title: string) {
        const response = await this.page.request.post("/api/tasks", {
            headers: await this.browserMutationHeaders(),
            data: { task: { title, project: projectId, stack: stackId } },
        });
        expect(
            response.ok(),
            `Task creation failed (${response.status()}): ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async addComment(resourceId: string, content: string) {
        const response = await this.page.request.post("/api/activities", {
            headers: await this.browserMutationHeaders(),
            data: { resourceId, resourceType: "task", type: "message", content },
        });
        expect(
            response.ok(),
            `Comment creation failed (${response.status()}): ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async attachFile(recordId: string, fileName: string, contents: string) {
        const response = await this.page.request.post("/api/files/upload", {
            headers: {
                ...(await this.browserMutationHeaders()),
                "x-file-name": fileName,
                "x-file-type": "text/plain",
                "x-record-id": recordId,
                "x-file-category": "task_attachment",
            },
            data: Buffer.from(contents, "utf8"),
        });
        expect(response.ok(), `Upload failed (${response.status()}): ${await response.text()}`).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async deleteTask(taskId: string) {
        const response = await this.page.request.delete(`/api/tasks/${taskId}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `Task cleanup failed (${response.status()})`).toBeTruthy();
    }

    async deleteComment(resourceId: string, commentId: string) {
        const response = await this.page.request.delete(`/api/activities/${commentId}`, {
            headers: await this.browserMutationHeaders(),
            data: { resourceId },
        });
        expect(response.ok(), `Comment cleanup failed (${response.status()})`).toBeTruthy();
    }

    async deleteAttachment(attachmentId: string) {
        const response = await this.page.request.delete(`/api/files/attachment/${attachmentId}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `Attachment cleanup failed (${response.status()})`).toBeTruthy();
    }

    async makeFolderPrivate(folderId: string) {
        await this.openPermissionsMenu("folder", folderId);
        await this.toggleOpenDialogPermissions(folderId);
    }

    async makeDocumentPrivate(documentId: string) {
        await this.openPermissionsMenu("document", documentId);
        await this.toggleOpenDialogPermissions(documentId);
    }

    /** The permissions dialog toggle is symmetric, so this restores the public state. */
    async makeDocumentPublic(documentId: string) {
        await this.openPermissionsMenu("document", documentId);
        await this.toggleOpenDialogPermissions(documentId);
    }

    async makeCalendarPrivate(calendarId: string) {
        const pinnedCalendar = this.page.getByTestId("calendar-button");
        if (await pinnedCalendar.isVisible()) {
            await pinnedCalendar.click();
        } else {
            await this.page.getByTestId("more-button").click();
            await this.page.getByTestId("calendar-menuitem").click();
        }
        await this.page.getByTestId("calendar-surface").waitFor({ state: "visible" });
        await this.page.getByTestId("calendar-filter-button").click();
        await this.page.getByTestId("calendar-filters-sidebar").waitFor({ state: "visible" });
        await this.page.getByTestId(`calendar-actions-button-${calendarId}`).click();
        await this.page.getByTestId(`calendar-permissions-button-${calendarId}`).click();
        await this.toggleOpenDialogPermissions(calendarId);
    }

    async expectProjectDenied(projectId: string) {
        const response = await this.page.request.get(`/api/projects/${projectId}`);
        expect(response.status()).toBe(404);
    }

    async expectDocumentsHidden(...documentIds: string[]) {
        const response = await this.page.request.get("/api/documents");
        expect(response.ok()).toBeTruthy();
        const documents = (await response.json()).data.documents as Array<{ id: string }>;
        for (const id of documentIds) {
            expect(documents.some(document => document.id === id)).toBe(false);
            await expect(this.page.getByTestId(`sidebar-document-${id}`)).toHaveCount(0);
            await expect(this.page.getByTestId(`sidebar-folder-${id}`)).toHaveCount(0);
        }
    }

    async expectCalendarAndEventHidden(calendarId: string, eventId: string) {
        const calendarsResponse = await this.page.request.get("/api/calendars");
        expect(calendarsResponse.ok()).toBeTruthy();
        const calendars = (await calendarsResponse.json()).data as Array<{ id: string }>;
        expect(calendars.some(calendar => calendar.id === calendarId)).toBe(false);

        const now = Date.now();
        const eventsResponse = await this.page.request.get("/api/events", {
            params: {
                from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
                to: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
                calendars: calendarId,
            },
        });
        expect(eventsResponse.ok()).toBeTruthy();
        const events = (await eventsResponse.json()).data as Array<{ id: string }>;
        expect(events.some(event => event.id === eventId)).toBe(false);
    }

    async deleteDocument(id: string) {
        const response = await this.page.request.delete(`/api/documents/${id}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `Document cleanup failed (${response.status()})`).toBeTruthy();
    }

    async deleteCalendar(id: string) {
        const response = await this.page.request.delete(`/api/calendars/${id}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `Calendar cleanup failed (${response.status()})`).toBeTruthy();
    }

    async deleteEvent(id: string) {
        const response = await this.page.request.delete(`/api/events/${id}`, {
            headers: await this.browserMutationHeaders(),
        });
        expect(response.ok(), `Event cleanup failed (${response.status()})`).toBeTruthy();
    }

    private async openPermissionsMenu(kind: "folder" | "document", resourceId: string) {
        const item = this.page.getByTestId(`sidebar-${kind}-${resourceId}`);
        await item.hover();
        await item.getByTestId("sidebar-button-context-button").click();
        await this.page.getByTestId(`sidebar-${kind}-menu`).waitFor({ state: "visible" });
        await this.page.getByTestId(`sidebar-${kind}-permissions`).click();
    }

    private async toggleOpenDialogPermissions(resourceId: string) {
        const dialog = this.page.getByTestId("permissions-dialog");
        await dialog.waitFor({ state: "visible" });
        await this.page.getByTestId("permissions-public-toggle").click();
        const update = this.page.waitForResponse(
            response =>
                response.url().includes(`/api/permissions/${resourceId}`) &&
                response.request().method() === "PATCH" &&
                response.ok()
        );
        await this.page.getByTestId("permissions-update-button").click();
        await update;
        await this.page.locator(".bp6-dialog-close-button").click();
        await dialog.waitFor({ state: "hidden" });
    }

    async expectProjectLoaded(projectId: string) {
        const response = await this.page.request.get(`/api/projects/${projectId}`);
        expect(response.status()).toBe(200);
    }

    async expectPeopleListDenied() {
        const response = await this.page.request.get("/api/people");
        expect(response.status()).toBe(403);
    }

    async expectTaskHidden(projectId: string, taskId: string) {
        const list = await this.page.request.get(`/api/tasks?project=${projectId}`);
        expect(list.ok()).toBeTruthy();
        const tasks = (await list.json()).data as Array<{ id: string }>;
        expect(tasks.some(task => task.id === taskId)).toBe(false);

        const direct = await this.page.request.get(`/api/tasks/${taskId}`);
        expect(direct.status()).toBe(404);
    }

    async expectCommentHidden(resourceId: string, commentId: string) {
        const response = await this.page.request.get(`/api/activities/${resourceId}`);
        expect(response.ok()).toBeTruthy();
        const activities = (await response.json()).data as Array<{ id: string }>;
        expect(activities.some(activity => activity.id === commentId)).toBe(false);
    }

    async expectTaskVisible(projectId: string, taskId: string) {
        const list = await this.page.request.get(`/api/tasks?project=${projectId}`);
        expect(list.ok()).toBeTruthy();
        const tasks = (await list.json()).data as Array<{ id: string }>;
        expect(tasks.some(task => task.id === taskId)).toBe(true);

        const direct = await this.page.request.get(`/api/tasks/${taskId}`);
        expect(direct.ok()).toBeTruthy();
    }

    async expectCommentVisible(resourceId: string, commentId: string) {
        const response = await this.page.request.get(`/api/activities/${resourceId}`);
        expect(response.ok()).toBeTruthy();
        const activities = (await response.json()).data as Array<{ id: string }>;
        expect(activities.some(activity => activity.id === commentId)).toBe(true);
    }

    async expectAttachmentVisible(recordId: string, attachmentId: string) {
        const response = await this.page.request.get(`/api/files/attachments/${recordId}`, {
            params: { type: "task_attachment" },
        });
        expect(response.ok()).toBeTruthy();
        const attachments = (await response.json()).data as Array<{ id: string }>;
        expect(attachments.some(attachment => attachment.id === attachmentId)).toBe(true);
    }

    /** getAttachments guards on the parent record, so an inaccessible task answers 404. */
    async expectAttachmentDenied(recordId: string) {
        const response = await this.page.request.get(`/api/files/attachments/${recordId}`, {
            params: { type: "task_attachment" },
        });
        expect(response.status()).toBe(404);
    }

    async expectTaskWriteDenied(taskId: string) {
        const response = await this.page.request.patch(`/api/tasks/${taskId}`, {
            headers: await this.browserMutationHeaders(),
            data: { title: "Denied write" },
        });
        expect(response.status()).toBe(404);
    }

    async expectPeopleListLoaded() {
        const response = await this.page.request.get("/api/people");
        expect(response.status()).toBe(200);
    }
}
