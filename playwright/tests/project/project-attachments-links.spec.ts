// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * W7 — Project Attachments and Links, populated.
 *
 * A task with an attachment shows a card in the Attachments view (card menu
 * downloads / previews / deletes through the file endpoints; "Open task..." opens the
 * owning task); a task with a link shows a row in the Links view (the row and its
 * menu open the URL in a new tab without hitting the network, the menu copies the URL).
 * Each view narrows to nothing via its own toolbar search input (500 ms debounce).
 *
 * Created records are destroyed before the test that created them ends (§5.1):
 * attachment file documents by captured id in `afterEach` (the helper re-selects the
 * row and throws if it remains); the scenario project with its tasks in `afterAll`.
 */
import type { Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Project from "../../pages/project";
import Preferences from "../../pages/preferences";
import TaskDetails from "../../pages/taskDetails";
import TasksTable from "../../pages/tasksTable";

const TOKEN = `e2e-w7-${Date.now()}`;
const LINK_URL = "https://example.com/w7-link";
const LINK_TITLE = `W7 link ${TOKEN}`;
const FILE_NAME = `e2e-w7-attachment-${TOKEN}.txt`;

test.describe("Project - Attachments and links (populated)", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let details: TaskDetails;
    let tasksTable: TasksTable;
    let preferences: Preferences;

    let projectId: string;
    let attachmentTaskId: string;
    let linkTaskId: string;
    let linkId: string;
    let filePath: string;
    // Attachment file documents created by the running test; destroyed in afterEach.
    let createdAttachmentIds: string[];
    // Original `dialogTask` mode; restored in afterAll so the run reverts it.
    let originalDialogTask = false;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        project = new Project(page);
        details = new TaskDetails(page);
        tasksTable = new TasksTable(page);
        preferences = new Preferences(page);

        // Task details tests assume the drawer (side panel) presentation. If the
        // `dialogTask` preference was left in dialog-window mode, pin it to the drawer
        // for the run and record the original value so afterAll reverts it.
        originalDialogTask = Boolean((await preferences.snapshotPreferences()).dialogTask);
        if (originalDialogTask) {
            await preferences.setPref("dialogTask", false);
        }

        projectId = await project.addNew({ name: `Attachments links ${TOKEN}` });
        // New projects only ship with board/list/overview; the Attachments and Links
        // views must be enabled before their tabs exist.
        await project.enableAllViews();
        const stackId = await tasksTable.createStackViaApi({ projectId, title: `W7 stack ${TOKEN}` });
        attachmentTaskId = await tasksTable.createTaskViaApi({
            projectId,
            stackId,
            title: `W7 attachment task ${TOKEN}`,
        });
        linkTaskId = await tasksTable.createTaskViaApi({
            projectId,
            stackId,
            title: `W7 link task ${TOKEN}`,
        });
        linkId = crypto.randomUUID();
        await tasksTable.setTaskLinksViaApi(linkTaskId, [{ id: linkId, url: LINK_URL, title: LINK_TITLE }]);

        filePath = path.join(os.tmpdir(), FILE_NAME);
        fs.writeFileSync(filePath, "attachment body".repeat(20));

        // The link popup must not hit the network: fulfill it from a local response.
        await page.route("https://example.com/**", route =>
            route.fulfill({
                status: 200,
                contentType: "text/html",
                body: "<html><head><title>W7</title></head><body>ok</body></html>",
            })
        );
    });

    test.beforeEach(() => {
        createdAttachmentIds = [];
    });

    test.afterEach(async () => {
        const errors: unknown[] = [];
        for (const id of createdAttachmentIds.splice(0)) {
            try {
                await getDb().cleanupDocument(id);
            } catch (error) {
                errors.push(new Error(`cleanupDocument(${id}): ${error}`));
            }
        }
        if (errors.length) throw new AggregateError(errors, "W7 afterEach cleanup failed");
    });

    test("a task attachment shows a card in the attachments view", async () => {
        await details.openProjectTask(projectId, attachmentTaskId);
        const attachmentId = await details.addTaskAttachment(filePath);
        createdAttachmentIds.push(attachmentId);
        // Close the drawer: the same card would otherwise render in both the drawer's
        // Files tab and the project Attachments view (strict-mode ambiguity).
        await details.close();

        await project.openAttachments();
        await project.expectAttachmentCardVisible(attachmentId);
        // The card title shows the uploaded original name.
        await expect(project.attachmentCard(attachmentId)).toContainText(FILE_NAME);
    });

    test("the attachment card menu downloads and previews through the file endpoints", async () => {
        await details.openProjectTask(projectId, attachmentTaskId);
        const attachmentId = await details.addTaskAttachment(filePath);
        createdAttachmentIds.push(attachmentId);
        await details.close();

        await project.openAttachments();
        await project.expectAttachmentCardVisible(attachmentId);

        const downloadUrl = await project.attachmentDownloadUrl(attachmentId);
        expect(downloadUrl).toContain(`/api/files/download/${attachmentId}`);

        const previewUrl = await project.attachmentPreviewUrl(attachmentId);
        expect(previewUrl).toContain(`/api/files/preview/${attachmentId}`);
    });

    test("the attachment card menu deletes the file and the card disappears", async () => {
        // A previous test may leave the project view on "attachments", which would render
        // the same card again behind the drawer. Switch to "board" so the card is unique
        // to the drawer, where delete is wired up.
        await project.goto(`/app/project/${projectId}`);
        await project.project.waitFor({ state: "visible" });
        await project.switchView("board");

        await details.openProjectTask(projectId, attachmentTaskId);
        const attachmentId = await details.addTaskAttachment(filePath);
        createdAttachmentIds.push(attachmentId);
        // The card renders in the task's Files tab, where delete is wired up (the
        // project Attachments view intentionally disables it), so the delete and its
        // assertion happen in the open drawer.
        await project.expectAttachmentCardVisible(attachmentId);

        await project.openAttachmentMenu(attachmentId);
        await project.attachmentMenuDelete().click();
        await project.confirmAttachmentDelete();

        await project.expectAttachmentCardAbsent(attachmentId);
        await details.close();
        // The UI delete already removed the row; cleanupDocument re-selects and must find nothing.
        await getDb().cleanupDocument(attachmentId);
        createdAttachmentIds = [];
    });

    test("'Open task...' opens the owning task", async () => {
        await details.openProjectTask(projectId, attachmentTaskId);
        const attachmentId = await details.addTaskAttachment(filePath);
        createdAttachmentIds.push(attachmentId);
        // Close the project-routed details so reopening proves the menu item navigates.
        await details.close();

        await project.openAttachments();
        await project.expectAttachmentCardVisible(attachmentId);

        await project.openAttachmentMenu(attachmentId);
        await project.attachmentOpenTask(attachmentId).click();

        // embeddedTask defaults to false: the app navigates to /task/:id with the details open.
        await details.waitUntilOpen();
        await details.expectTaskId(attachmentTaskId);
    });

    test("a task link shows a row in the links view", async () => {
        // The previous test ended on /task/:id with the drawer open; the toolbar
        // (and its view tabs) are only reachable from the project route.
        await project.goto(`/app/project/${projectId}`);
        await project.project.waitFor({ state: "visible" });
        await project.openLinks();
        await project.expectLinkRowVisible(linkId);
        await expect(project.linkRow(linkId)).toContainText(LINK_TITLE);
    });

    test("a link row opens the URL in a new tab and copies the URL", async () => {
        await project.openLinks();
        await project.expectLinkRowVisible(linkId);

        const rowUrl = await project.linkRowOpenUrl(linkId);
        expect(rowUrl).toBe(LINK_URL);

        await project.copyLinkUrl(linkId);
        await project.expectLinkCopiedToast();
        expect(await project.readClipboard()).toBe(LINK_URL);
    });

    test("the toolbar search narrows each view to nothing", async () => {
        // Seed one attachment so both views hold scenario data.
        await details.openProjectTask(projectId, attachmentTaskId);
        const attachmentId = await details.addTaskAttachment(filePath);
        createdAttachmentIds.push(attachmentId);
        await details.close();

        await project.openAttachments();
        await project.expectAttachmentCardVisible(attachmentId);
        await project.searchAttachments(`no-such-attachment-${TOKEN}`);
        await project.expectAttachmentCardCount(0);
        await project.searchAttachments("");
        await project.expectAttachmentCardVisible(attachmentId);

        await project.openLinks();
        await project.expectLinkRowVisible(linkId);
        await project.searchLinks(`no-such-link-${TOKEN}`);
        await project.expectLinkRowCount(0);
        await project.searchLinks("");
        await project.expectLinkRowVisible(linkId);
    });

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        // Attachment documents created by the last test, if any survived its afterEach.
        for (const id of createdAttachmentIds.splice(0)) {
            await attempt(() => getDb().cleanupDocument(id));
        }
        await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (page && !page.isClosed()) await attempt(() => project.deleteById(projectId));
        if (page && !page.isClosed())
            await attempt(() => preferences.setPref("dialogTask", originalDialogTask));
        await attempt(closeDb);
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (error) {
            errors.push(error);
        }
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "W7 scenario cleanup failed");
    });
});
