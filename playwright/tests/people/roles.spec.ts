import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import { e2eBaseUrl } from "../../config/runtime";
import People from "../../pages/people";
import Auth from "../../pages/auth";

test.describe("People - Scenario role access", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let viewerContext: BrowserContext;
    let viewerPage: Page;
    let admin: People;
    let viewer: People;
    let roleId: string;
    const roleTitle = `E15 role ${crypto.randomUUID()}`;
    const userEmail = `e15-user-${crypto.randomUUID()}@example.com`;
    const contactEmail = `e15-contact-${crypto.randomUUID()}@example.com`;
    const deniedEmail = `e15-denied-${crypto.randomUUID()}@example.com`;
    let roleCreated = false;
    let duplicateRoleTitle: string | undefined;

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        if (viewerContext) await attempt(() => viewerContext.close());
        for (const email of [contactEmail, deniedEmail, userEmail])
            await attempt(() => getDb().cleanupUser(email));
        if (roleCreated) await attempt(() => getDb().cleanupRole(roleTitle));
        if (duplicateRoleTitle) {
            const duplicate = duplicateRoleTitle;
            await attempt(() => getDb().cleanupRole(duplicate));
        }
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Role scenario cleanup failed");
    });

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });
        admin = new People(page);
        const role = await admin.createRole(roleTitle, {
            people: { read: true, write: false },
            roles: { read: true },
        });
        roleCreated = true;
        roleId = role.id;
        await getDb().createActiveUser(userEmail, "RoleScenario123!", roleTitle);
        // The role was seeded through API, after this app tab's initial role load.
        await page.reload();
        viewerContext = await browser.newContext({ baseURL: e2eBaseUrl });
        viewerPage = await viewerContext.newPage();
        await new Auth(viewerPage).loginAndWaitForAuthenticatedRequest(userEmail, "RoleScenario123!");
        viewer = new People(viewerPage);
    });

    test.beforeEach(({ attachVideoContext }: any) => attachVideoContext(context));

    test("Should persist role edits and enforce granted and revoked person creation in another session", async () => {
        await admin.open();
        await admin.editRole(roleId);
        await admin.cancelRoleTitleEdit("Canceled role title");
        expect((await admin.loadRole(roleId)).title).toBe(roleTitle);

        await viewer.open();
        await viewer.expectPersonCreationAllowed(false);
        await viewer.expectPersonCreationDenied(deniedEmail, roleId);

        await admin.editRole(roleId);
        await admin.setRolePeopleWrite(true);
        await admin.saveRole(roleId);
        await page.reload();
        expect((await admin.loadRole(roleId)).access.people).toEqual({ read: true, write: true });
        await viewerPage.reload();
        await viewer.openContacts();
        await viewer.expectPersonCreationAllowed(true);
        const contactId = await viewer.addPerson("Role", "Contact", contactEmail);
        expect(contactId).toBeTruthy();
        await viewer.goto("/app/people");
        await viewer.waitForPersonSearchResult(contactId, "Role");

        await admin.openRoles();
        await admin.editRole(roleId);
        await admin.setRolePeopleWrite(false);
        await admin.saveRole(roleId);
        await page.reload();
        expect((await admin.loadRole(roleId)).access.people).toEqual({ read: true, write: false });
        await viewerPage.reload();
        await viewer.openContacts();
        await viewer.expectPersonCreationAllowed(false);
        await viewer.expectPersonCreationDenied(deniedEmail, roleId);
    });

    test("rejects a role body without a title and keeps duplicate role titles independent", async () => {
        await admin.open();
        await admin.expectRoleWithoutTitleRejected();

        const duplicateTitle = `E15 duplicate role ${crypto.randomUUID()}`;
        const first = await admin.createRole(duplicateTitle, { people: { read: true, write: false } });
        const second = await admin.createRole(duplicateTitle, { people: { read: false, write: false } });
        duplicateRoleTitle = duplicateTitle;
        expect(second.id !== first.id).toBe(true);
        expect((await admin.loadRole(first.id)).access.people).toEqual({ read: true, write: false });
        expect((await admin.loadRole(second.id)).access.people).toEqual({ read: false, write: false });
    });
});
