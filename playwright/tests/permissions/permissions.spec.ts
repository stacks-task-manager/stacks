import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Auth from "../../pages/auth";
import { PermissionsPage } from "../../pages/permissions";

test.describe("Hierarchical permissions", () => {
    let browser: Browser;
    let adminContext: BrowserContext;
    let viewerContext: BrowserContext;
    let adminPage: Page;
    let viewerPage: Page;
    let adminPermissions: PermissionsPage;
    let viewerPermissions: PermissionsPage;

    const viewerEmail = `permissions-viewer-${Date.now()}@example.com`;
    const viewerPassword = "Permissions123!";

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context: adminContext, page: adminPage } = await bootstrapContext());
        await login({ page: adminPage });
        await getDb().createActiveUser(viewerEmail, viewerPassword);

        viewerContext = await browser.newContext();
        viewerPage = await viewerContext.newPage();
        await new Auth(viewerPage).login(viewerEmail, viewerPassword);

        adminPermissions = new PermissionsPage(adminPage);
        viewerPermissions = new PermissionsPage(viewerPage);
        await viewerPermissions.reloadWorkspace();
    });

    test.afterAll(async () => {
        if (viewerContext) await viewerContext.close();
        if (adminContext) await adminContext.close();
        if (browser) await browser.close();
        await getDb().cleanupUser(viewerEmail);
        await closeDb();
    });

    test("a private parent folder hides public nested folders and projects", async () => {
        const suffix = Date.now();
        const folderId = await adminPermissions.createDocument(`Permissions folder ${suffix}`, "folder");
        const nestedFolderId = await adminPermissions.createDocument(
            `Public nested folder ${suffix}`,
            "folder",
            folderId
        );
        const projectId = await adminPermissions.createDocument(
            `Public child project ${suffix}`,
            "project",
            nestedFolderId
        );

        try {
            await adminPermissions.reloadWorkspace();
            await adminPermissions.makeFolderPrivate(folderId);
            await viewerPermissions.reloadWorkspace();
            await viewerPermissions.expectDocumentsHidden(folderId, nestedFolderId, projectId);
            await viewerPermissions.expectProjectDenied(projectId);
        } finally {
            await adminPermissions.deleteDocument(folderId);
        }
    });

    test("the document sidebar permissions menu can make a project private", async () => {
        const projectId = await adminPermissions.createDocument(`Private project ${Date.now()}`, "project");

        try {
            await adminPermissions.reloadWorkspace();
            await adminPermissions.makeDocumentPrivate(projectId);
            await viewerPermissions.expectProjectDenied(projectId);
        } finally {
            await adminPermissions.deleteDocument(projectId);
        }
    });

    test("a private calendar hides its otherwise public events", async () => {
        const { calendarId, eventId } = await adminPermissions.createCalendarWithEvent(
            `Private calendar ${Date.now()}`
        );

        try {
            await adminPermissions.reloadWorkspace();
            await adminPermissions.makeCalendarPrivate(calendarId);
            await viewerPermissions.expectCalendarAndEventHidden(calendarId, eventId);
        } finally {
            await adminPermissions.deleteCalendar(calendarId);
        }
    });
});
