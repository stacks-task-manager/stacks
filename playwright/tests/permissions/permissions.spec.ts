import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Auth from "../../pages/auth";
import { PermissionsPage } from "../../pages/permissions";
import { e2eBaseUrl } from "../../config/runtime";

async function cleanup(actions: Array<() => Promise<unknown>>) {
    const errors: unknown[] = [];
    for (const action of actions) {
        try {
            await action();
        } catch (error) {
            errors.push(error);
        }
    }
    if (errors.length) throw new AggregateError(errors, "Permissions scenario cleanup failed");
}

test.describe("Hierarchical permissions", () => {
    let browser: Browser;
    let adminContext: BrowserContext;
    let viewerContext: BrowserContext;
    let adminPage: Page;
    let viewerPage: Page;
    let adminPermissions: PermissionsPage;
    let viewerPermissions: PermissionsPage;
    let viewerRoleTitle: string | undefined;

    const viewerEmail = `permissions-viewer-${Date.now()}@example.com`;
    const viewerPassword = "Permissions123!";

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context: adminContext, page: adminPage } = await bootstrapContext());
        await login({ page: adminPage });
        viewerRoleTitle = await getDb().createActiveUserWithAccess(viewerEmail, viewerPassword, {
            people: { read: true },
            roles: { read: true },
            calendar: { read: true },
        });

        viewerContext = await browser.newContext({ baseURL: e2eBaseUrl });
        viewerPage = await viewerContext.newPage();
        await new Auth(viewerPage).loginAndWaitForAuthenticatedRequest(viewerEmail, viewerPassword);

        adminPermissions = new PermissionsPage(adminPage);
        viewerPermissions = new PermissionsPage(viewerPage);
        await viewerPermissions.reloadWorkspace();
    });

    test.afterAll(async () => {
        await cleanup([
            async () => {
                if (viewerContext) await viewerContext.close();
            },
            async () => {
                if (adminContext) await adminContext.close();
            },
            async () => {
                if (browser) await browser.close();
            },
            () => getDb().cleanupUser(viewerEmail),
            async () => {
                if (viewerRoleTitle) await getDb().cleanupRole(viewerRoleTitle);
            },
            closeDb,
        ]);
    });

    test("a private parent folder hides public nested folders and projects", async () => {
        const suffix = Date.now();
        const folderId = await adminPermissions.createDocument(`Permissions folder ${suffix}`, "folder");
        try {
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
            await cleanup([
                () => adminPermissions.deleteEvent(eventId),
                () => adminPermissions.deleteCalendar(calendarId),
            ]);
        }
    });

    test("a role without people read access cannot list people", async () => {
        const restrictedEmail = `permissions-restricted-${Date.now()}@example.com`;
        const restrictedPassword = "Restricted123!";
        const restrictedContext = await browser.newContext({ baseURL: e2eBaseUrl });
        const restrictedPage = await restrictedContext.newPage();
        let restrictedRoleTitle: string | undefined;

        try {
            restrictedRoleTitle = await getDb().createActiveUserWithAccess(
                restrictedEmail,
                restrictedPassword,
                { roles: { read: true } }
            );
            await new Auth(restrictedPage).loginAndWaitForAuthenticatedRequest(
                restrictedEmail,
                restrictedPassword
            );

            const restrictedPermissions = new PermissionsPage(restrictedPage);
            await restrictedPermissions.expectPeopleListDenied();
            await viewerPermissions.expectPeopleListLoaded();
        } finally {
            await cleanup([
                () => restrictedContext.close(),
                () => getDb().cleanupUser(restrictedEmail),
                async () => {
                    if (restrictedRoleTitle) await getDb().cleanupRole(restrictedRoleTitle);
                },
            ]);
        }
    });

    test("a user in another tenant cannot see the admin tenant's project", async () => {
        const suffix = Date.now();
        const projectId = await adminPermissions.createDocument(
            `Foreign tenant project ${suffix}`,
            "project"
        );
        const foreignEmail = `permissions-foreign-${suffix}@example.com`;
        const foreignPassword = "Foreign123!";
        const foreignContext = await browser.newContext({ baseURL: e2eBaseUrl });
        const foreignPage = await foreignContext.newPage();
        let foreignTenantId: string | undefined;
        let foreignRoleTitle: string | undefined;

        try {
            foreignTenantId = await getDb().createScenarioTenant(`E2E foreign tenant ${suffix}`);
            foreignRoleTitle = await getDb().createActiveUserWithAccess(
                foreignEmail,
                foreignPassword,
                { people: { read: true }, roles: { read: true }, calendar: { read: true } },
                foreignTenantId
            );
            await new Auth(foreignPage).loginAndWaitForAuthenticatedRequest(foreignEmail, foreignPassword);

            const foreignPermissions = new PermissionsPage(foreignPage);
            await foreignPermissions.reloadWorkspace();
            await foreignPermissions.expectDocumentsHidden(projectId);
            await foreignPermissions.expectProjectDenied(projectId);
        } finally {
            await cleanup([
                () => foreignContext.close(),
                () => adminPermissions.deleteDocument(projectId),
                () => getDb().cleanupUser(foreignEmail),
                async () => {
                    if (foreignRoleTitle) await getDb().cleanupRole(foreignRoleTitle);
                },
                async () => {
                    if (foreignTenantId) await getDb().cleanupTenant(foreignTenantId);
                },
            ]);
        }
    });

    test("making a private project public again restores the viewer's access", async () => {
        const projectId = await adminPermissions.createDocument(`Revoked project ${Date.now()}`, "project");

        try {
            await adminPermissions.reloadWorkspace();
            await adminPermissions.makeDocumentPrivate(projectId);
            await viewerPermissions.expectProjectDenied(projectId);

            await adminPermissions.makeDocumentPublic(projectId);
            await viewerPermissions.expectProjectLoaded(projectId);
        } finally {
            await adminPermissions.deleteDocument(projectId);
        }
    });

    test("a private project hides its task, comment and attachment from another user", async () => {
        const suffix = crypto.randomUUID();
        const projectId = await adminPermissions.createDocument(
            `Inherited access project ${suffix}`,
            "project"
        );
        let taskId: string | undefined;
        let commentId: string | undefined;
        let attachmentId: string | undefined;
        try {
            const stackId = await adminPermissions.createStack(projectId, "Inbox");
            taskId = await adminPermissions.createTask(projectId, stackId, `Inherited task ${suffix}`);
            commentId = await adminPermissions.addComment(taskId, "Inherited comment");
            attachmentId = await adminPermissions.attachFile(
                taskId,
                `inherited-${suffix}.txt`,
                "inherited payload"
            );

            await viewerPermissions.reloadWorkspace();
            await viewerPermissions.expectTaskVisible(projectId, taskId);
            await viewerPermissions.expectCommentVisible(taskId, commentId);
            await viewerPermissions.expectAttachmentVisible(taskId, attachmentId);

            await adminPermissions.reloadWorkspace();
            await adminPermissions.makeDocumentPrivate(projectId);
            await viewerPermissions.reloadWorkspace();

            await viewerPermissions.expectDocumentsHidden(projectId);
            await viewerPermissions.expectTaskHidden(projectId, taskId);
            await viewerPermissions.expectCommentHidden(taskId, commentId);
            await viewerPermissions.expectAttachmentDenied(taskId);
            await viewerPermissions.expectTaskWriteDenied(taskId);
        } finally {
            await cleanup([
                async () => {
                    if (taskId && commentId) await adminPermissions.deleteComment(taskId, commentId);
                },
                async () => {
                    if (attachmentId) await adminPermissions.deleteAttachment(attachmentId);
                },
                async () => {
                    if (taskId) await adminPermissions.deleteTask(taskId);
                },
                () => adminPermissions.deleteDocument(projectId),
            ]);
        }
    });
});
