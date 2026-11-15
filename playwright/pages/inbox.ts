import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

const NOTIFICATION_PREFIX = "inbox-notification-";
const DETAIL_TEST_ID = "inbox-detail";
const DETAIL_SUBJECT_TEST_ID = "inbox-detail-subject";
const DETAIL_MESSAGE_TEST_ID = "inbox-detail-message";
const DETAIL_ACTION_TEST_ID = "inbox-detail-action";
const DETAIL_EMPTY_TEST_ID = "inbox-detail-empty";
const BLANK_SLATE_TEST_ID = "inbox-blank-slate";

/**
 * Page object for the Inbox at `/app/inbox`.
 *
 * Notifications are rendered by `packages/app/src/app/views/Inbox/Inbox.tsx` with the
 * `inbox-*` test ids: one `inbox-notification-<notificationId>` card per row, carrying a
 * `data-unread` attribute, and the selected notification's detail pane with subject,
 * message and record action.
 */
class Inbox extends Base {
    constructor(page: Page) {
        super(page);
    }

    /** Navigates to the Inbox and waits for either the list or the blank slate. */
    public async open(): Promise<void> {
        await this.goto("/app/inbox");
        await expect(this.page.getByTestId("inbox-view")).toBeVisible();
    }

    public notification(notificationId: string): Locator {
        return this.page.getByTestId(`${NOTIFICATION_PREFIX}${notificationId}`);
    }

    public get notifications(): Locator {
        return this.page.getByTestId(new RegExp(`^${NOTIFICATION_PREFIX}`));
    }

    public get blankSlate(): Locator {
        return this.page.getByTestId(BLANK_SLATE_TEST_ID);
    }

    public get detail(): Locator {
        return this.page.getByTestId(DETAIL_TEST_ID);
    }

    public get detailEmpty(): Locator {
        return this.page.getByTestId(DETAIL_EMPTY_TEST_ID);
    }

    public get detailAction(): Locator {
        return this.page.getByTestId(DETAIL_ACTION_TEST_ID);
    }

    /** Notification ids currently rendered as rows, in DOM order. */
    public async renderedNotificationIds(): Promise<string[]> {
        const testIds = await this.notifications.evaluateAll(elements =>
            elements.map(element => element.getAttribute("data-testid") ?? "")
        );
        return testIds
            .filter(testId => testId.startsWith(NOTIFICATION_PREFIX))
            .map(testId => testId.slice(NOTIFICATION_PREFIX.length));
    }

    /** Asserts the notification row is not rendered (read notifications leave the unread list). */
    public async expectNotificationAbsent(notificationId: string): Promise<void> {
        await expect(this.notification(notificationId)).toHaveCount(0);
    }

    /**
     * Id of the notification whose row carries the given message (the notification's
     * `message` is the task title for assignment notifications).
     */
    public async notificationIdForMessage(message: string): Promise<string> {
        await expect(this.notifications.first()).toBeVisible();
        const notificationIds = await this.renderedNotificationIds();
        for (const notificationId of notificationIds) {
            if ((await this.notification(notificationId).innerText()).includes(message)) {
                return notificationId;
            }
        }
        throw new Error(`No notification row contains the message "${message}"`);
    }

    /** Asserts the row still shows as unread (the server has not recorded the read). */
    public async expectUnread(notificationId: string): Promise<void> {
        await expect(this.notification(notificationId)).toHaveAttribute("data-unread", "true");
    }

    /** Asserts the row shows as read. */
    public async expectRead(notificationId: string): Promise<void> {
        await expect(this.notification(notificationId)).toHaveAttribute("data-unread", "false");
    }

    /** Selects a notification row, which also marks it read on the server. */
    public async select(notificationId: string): Promise<void> {
        await this.notification(notificationId).click();
        await expect(this.detail).toBeVisible();
    }

    public async expectDetailSubject(subject: string): Promise<void> {
        await expect(this.page.getByTestId(DETAIL_SUBJECT_TEST_ID)).toHaveText(subject);
    }

    public async expectDetailMessage(message: string): Promise<void> {
        await expect(this.page.getByTestId(DETAIL_MESSAGE_TEST_ID)).toHaveText(message);
    }

    public async expectDetailActionVisible(): Promise<void> {
        await expect(this.detailAction).toBeVisible();
    }

    /** Opens the notification's record action and returns the resulting path. */
    public async clickDetailAction(): Promise<string> {
        await this.detailAction.click();
        await this.page.waitForURL(url => !new URL(url).pathname.endsWith("/inbox"));
        return new URL(this.page.url()).pathname;
    }

    public async expectDetailEmpty(): Promise<void> {
        await expect(this.detailEmpty).toBeVisible();
    }

    public async expectBlankSlate(): Promise<void> {
        await expect(this.blankSlate).toBeVisible();
        await expect(this.notifications).toHaveCount(0);
    }
}

export default Inbox;
