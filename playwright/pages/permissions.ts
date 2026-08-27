import { expect, Page } from "@playwright/test";

const ROOT_DOCUMENT_ID = "00000000-0000-0000-0000-000000000000";

export class PermissionsPage {
    constructor(private readonly page: Page) {}

    async createDocument(title: string, type: "folder" | "project", parent = ROOT_DOCUMENT_ID) {
        const response = await this.page.request.post("/api/documents", {
            data: {
                title,
                type,
                parent,
                data: {},
                permissions: { isPublic: true, visibleUsers: [], visibleRoles: [] },
            },
        });
        expect(response.ok()).toBeTruthy();
        return (await response.json()).data.id as string;
    }

    async createCalendarWithEvent(title: string) {
        const calendarResponse = await this.page.request.post("/api/calendars", {
            data: { title, color: "#4455aa", isPublic: true },
        });
        expect(calendarResponse.ok()).toBeTruthy();
        const calendarId = (await calendarResponse.json()).data.id as string;
        const start = new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const eventResponse = await this.page.request.post("/api/events", {
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
    }

    async reloadWorkspace() {
        await this.page.reload();
        await this.page.getByTestId("sidebar").waitFor({ state: "visible" });
    }

    async makeFolderPrivate(folderId: string) {
        const folder = this.page.getByTestId(`sidebar-folder-${folderId}`);
        await folder.hover();
        await folder.getByTestId("sidebar-button-context-button").click();
        await this.page.getByTestId("sidebar-folder-menu").waitFor({ state: "visible" });
        await this.page.getByTestId("sidebar-folder-permissions").click();
        await this.makeOpenDialogPrivate(folderId);
    }

    async makeDocumentPrivate(documentId: string) {
        const document = this.page.getByTestId(`sidebar-document-${documentId}`);
        await document.hover();
        await document.getByTestId("sidebar-button-context-button").click();
        await this.page.getByTestId("sidebar-document-menu").waitFor({ state: "visible" });
        await this.page.getByTestId("sidebar-document-permissions").click();
        await this.makeOpenDialogPrivate(documentId);
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
        await this.makeOpenDialogPrivate(calendarId);
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
        await this.page.request.delete(`/api/documents/${id}`);
    }

    async deleteCalendar(id: string) {
        await this.page.request.delete(`/api/calendars/${id}`);
    }

    private async makeOpenDialogPrivate(resourceId: string) {
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
    }
}
