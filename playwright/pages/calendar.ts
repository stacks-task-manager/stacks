import { expect, Locator, Page, Route } from "@playwright/test";
import { addDays, format, subDays } from "date-fns";
import Base from "./base";
import Sidebar from "./sidebar";

type CalendarView = "month" | "week" | "day";

class Calendar extends Base {
    public sidebar: Sidebar;
    public surface: Locator;
    public currentDate: Locator;
    public todayButton: Locator;
    public previousButton: Locator;
    public nextButton: Locator;
    public reloadButton: Locator;
    public jumpDateButton: Locator;
    public slotMenu: Locator;
    public slotAddEvent: Locator;
    public details: Locator;
    public detailsTitle: Locator;
    public detailsDescription: Locator;
    public detailsLocation: Locator;
    public detailsCloseButton: Locator;
    public detailsMenuButton: Locator;
    public detailsDeleteMenuItem: Locator;
    public integrationsButton: Locator;
    public connectMenuItem: Locator;
    public googleConnectButton: Locator;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.surface = page.getByTestId("calendar-surface");
        this.currentDate = page.getByTestId("calendar-current-date");
        this.todayButton = page.getByTestId("calendar-today-button");
        this.previousButton = page.getByTestId("calendar-prev-button");
        this.nextButton = page.getByTestId("calendar-next-button");
        this.reloadButton = page.getByTestId("calendar-reload-button");
        this.jumpDateButton = page.getByTestId("calendar-jump-date-button");
        this.slotMenu = page.getByTestId("calendar-slot-menu");
        this.slotAddEvent = page.getByTestId("calendar-slot-add-event");
        this.details = page.getByTestId("calendar-event-details");
        this.detailsTitle = this.details.getByTestId("calendar-event-title");
        this.detailsDescription = this.details.getByTestId("calendar-event-description");
        this.detailsLocation = this.details.getByTestId("calendar-event-location");
        this.detailsCloseButton = this.details.getByTestId("calendar-event-details-close");
        this.detailsMenuButton = this.details.getByTestId("calendar-event-menu-button");
        this.detailsDeleteMenuItem = page.getByTestId("calendar-event-delete-menu-item");
        this.integrationsButton = page.getByTestId("calendar-integrations-button");
        this.connectMenuItem = page.getByTestId("calendar-integrations-menu");
        this.googleConnectButton = page.getByTestId("calendar-google-connect");
    }

    async open() {
        await this.sidebar.go("Calendar");
        await this.surface.waitFor({ state: "visible" });
    }

    async denyGoogleOAuth(): Promise<{
        callbackStatus: number;
        popupClosed: boolean;
        isAuthenticated: boolean;
    }> {
        let callbackWasMocked = false;
        const providerRoute = async (route: Route) => {
            const authUrl = new URL(route.request().url());
            const redirectUri = authUrl.searchParams.get("redirect_uri");
            const state = authUrl.searchParams.get("state");
            if (authUrl.hostname !== "accounts.google.com" || !redirectUri || !state) {
                await route.abort();
                return;
            }

            const callbackUrl = new URL(redirectUri);
            if (
                callbackUrl.origin !== new URL(this.page.url()).origin ||
                callbackUrl.pathname !== "/api/google/callback"
            ) {
                await route.abort();
                return;
            }

            callbackUrl.searchParams.set("error", "access_denied");
            callbackUrl.searchParams.set("state", state);
            callbackWasMocked = true;
            const safeHref = callbackUrl.toString().replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
            await route.fulfill({
                contentType: "text/html",
                body: `<a data-testid="oauth-consent-deny" href="${safeHref}">Deny access</a>`,
            });
        };

        await this.page.context().route("https://accounts.google.com/**", providerRoute);
        try {
            await this.integrationsButton.click();
            await this.connectMenuItem.click();
            const popupPromise = this.page.waitForEvent("popup");
            await this.googleConnectButton.click();
            const popup = await popupPromise;
            const closePromise = popup.waitForEvent("close");
            const callbackResponsePromise = popup.waitForResponse(response => {
                return new URL(response.url()).pathname === "/api/google/callback";
            });
            const denialClick = popup.getByTestId("oauth-consent-deny").click({ noWaitAfter: true });
            const callbackResponse = await callbackResponsePromise;
            await closePromise;
            await denialClick;

            const statusResponse = await this.page
                .context()
                .request.get(new URL("/api/integrations/google/status", this.page.url()).toString());
            const statusBody = await statusResponse.json();
            return {
                callbackStatus: callbackResponse.status(),
                popupClosed: callbackWasMocked && popup.isClosed(),
                isAuthenticated: statusBody?.data?.isAuthenticated ?? statusBody?.isAuthenticated ?? true,
            };
        } finally {
            await this.page.context().unroute("https://accounts.google.com/**", providerRoute);
        }
    }

    viewButton(view: CalendarView) {
        return this.page.getByTestId(`calendar-view-${view}-button`);
    }

    async switchView(view: CalendarView) {
        await this.viewButton(view).click();
        await expect(this.viewButton(view)).toHaveClass(/active/);
    }

    async expectView(view: CalendarView) {
        await expect(this.viewButton(view)).toHaveClass(/active/);
        const fullCalendarView = view === "day" ? "one" : view;
        await expect(this.surface).toHaveAttribute("data-calendar-view", fullCalendarView);
    }

    async expectCurrentDateForView(view: CalendarView, date: Date) {
        const expected =
            view === "month"
                ? format(date, "LLLL yyyy")
                : view === "week"
                ? new RegExp(`Week \\d+, ${format(date, "MMM yyyy")}`)
                : format(date, "eee, MMM do yyyy");

        await expect(this.currentDate).toHaveText(expected);
    }

    async previous() {
        const before = await this.currentDate.textContent();
        await this.previousButton.click();
        await expect(this.currentDate).not.toHaveText(before ?? "");
    }

    async next() {
        const before = await this.currentDate.textContent();
        await this.nextButton.click();
        await expect(this.currentDate).not.toHaveText(before ?? "");
    }

    async today() {
        await this.todayButton.click();
    }

    async jumpToDate(date: Date) {
        await this.jumpDateButton.click();
        const day = this.page.getByRole("gridcell", { name: format(date, "d"), exact: true }).first();
        await day.click();
        await this.page.keyboard.press("Escape");
    }

    async reloadEvents() {
        await expect(this.reloadButton).toBeEnabled({ timeout: 5000 });
        await this.reloadButton.click();
    }

    waitForEventsReload() {
        return this.page.waitForResponse(
            response => response.url().includes("/api/events") && response.request().method() === "GET"
        );
    }

    waitForEventPatch(eventId: string) {
        return this.page.waitForResponse(
            response =>
                response.url().includes(`/api/events/${eventId}`) &&
                response.request().method() === "PATCH" &&
                response.ok()
        );
    }

    async createEventFromVisibleSlot(): Promise<string> {
        const createResponse = this.page.waitForResponse(
            response => response.url().includes("/api/events") && response.request().method() === "POST"
        );
        await this.selectVisibleSlot();
        await this.slotMenu.waitFor({ state: "visible" });
        await this.slotAddEvent.click();
        const response = await createResponse;
        const payload = await response.json();
        await this.details.waitFor({ state: "visible" });
        await this.detailsTitle.locator("textarea, input").first().waitFor({ state: "visible" });
        return payload?.data?.id ?? payload?.id;
    }

    async openEvent(eventId: string) {
        await this.page.getByTestId(`calendar-event-${eventId}`).click();
        await this.details.waitFor({ state: "visible" });
    }

    async setTitle(title: string) {
        await this.setEditableText(this.detailsTitle, title);
    }

    async setDescription(description: string) {
        await this.setEditableText(this.detailsDescription, description);
    }

    async setLocation(location: string) {
        await this.setEditableText(this.detailsLocation, location);
    }

    async closeDetails() {
        await this.detailsCloseButton.click();
        await this.details.waitFor({ state: "hidden" });
    }

    async expectDetailsVisible() {
        await expect(this.details).toBeVisible();
    }

    async expectDetailsTitle(title: string) {
        await this.expectEditableText(this.detailsTitle, title);
    }

    async expectDetailsDescription(description: string) {
        await this.expectEditableText(this.detailsDescription, description);
    }

    async expectDetailsLocation(location: string) {
        await this.expectEditableText(this.detailsLocation, location);
    }

    async deleteEventFromDetails() {
        await this.detailsMenuButton.click();
        await this.detailsDeleteMenuItem.click();
        await this.details.waitFor({ state: "hidden" });
    }

    async deleteEventByApi(eventId: string) {
        const csrfResponse = await this.page
            .context()
            .request.get(new URL("/auth/csrf", this.page.url()).toString());
        expect(csrfResponse.ok()).toBe(true);
        const csrfToken = (await csrfResponse.json())?.data?.token;
        expect(typeof csrfToken).toBe("string");

        const response = await this.page
            .context()
            .request.delete(new URL(`/api/events/${eventId}`, this.page.url()).toString(), {
                headers: { "x-csrf-token": csrfToken },
            });
        expect(response.ok()).toBe(true);
    }

    async expectPersistedEvent(eventId: string, expected: Record<string, unknown>) {
        await expect
            .poll(async () => {
                const event = await this.getEventByApi(eventId);
                return Object.fromEntries(Object.keys(expected).map(key => [key, event[key]]));
            })
            .toEqual(expected);
    }

    async expectEventVisible(eventId: string) {
        await expect(this.page.getByTestId(`calendar-event-${eventId}`)).toBeVisible();
    }

    async expectEventTitle(eventId: string, title: string) {
        await expect(this.page.getByTestId(`calendar-event-${eventId}`)).toHaveAttribute(
            "data-calendar-event-title",
            title
        );
    }

    private async selectVisibleSlot() {
        const box = await this.surface.boundingBox();
        if (!box) throw new Error("Calendar surface is not visible");

        const x = box.x + box.width * 0.55;
        const startY = box.y + Math.min(220, box.height * 0.45);
        const endY = startY + 60;
        await this.page.mouse.move(x, startY);
        await this.page.mouse.down();
        await this.page.mouse.move(x, endY);
        await this.page.mouse.up();
    }

    private async setEditableText(wrapper: Locator, value: string) {
        await wrapper.click();
        const editor = wrapper.locator("textarea, input").first();
        await editor.waitFor({ state: "visible" });
        await editor.fill(value);
        await editor.blur();
    }

    private async getEventByApi(eventId: string): Promise<Record<string, unknown>> {
        const now = new Date();
        const response = await this.page.request.get("/api/events", {
            params: {
                from: subDays(now, 2).toISOString(),
                to: addDays(now, 2).toISOString(),
                calendars: "local",
            },
        });
        expect(response.ok()).toBeTruthy();

        const payload = await response.json();
        const event = payload.data?.find((item: Record<string, unknown>) => item.id === eventId);
        if (event == null) {
            throw new Error(`Calendar event ${eventId} was not returned by /api/events`);
        }

        return event;
    }

    private async expectEditableText(wrapper: Locator, value: string) {
        const editor = wrapper.locator("textarea, input").first();
        if (await editor.isVisible()) {
            await expect(editor).toHaveValue(value);
            return;
        }

        await expect(wrapper).toContainText(value);
    }
}

export default Calendar;
