import { expect, Locator, Page, APIRequestContext, Route } from "@playwright/test";
import Base from "./base";

export default class Gantt extends Base {
    readonly chart: Locator;
    constructor(page: Page) {
        super(page);
        this.chart = page.getByTestId("gantt-chart");
    }
    bar(id: string) {
        return this.page.getByTestId(`gantt-bar-${id}`);
    }
    async seedTask(project: string, stack: string, title: string, parent?: string): Promise<string> {
        const response = await this.page.request.post("/api/tasks", {
            headers: await this.browserMutationHeaders(),
            data: { task: { title, project, stack, ...(parent ? { parent } : {}) } },
        });
        expect(
            response.ok(),
            `Task creation returned ${response.status()}: ${await response.text()}`
        ).toBeTruthy();
        return (await response.json()).data.id;
    }
    async editDates(id: string, start: string, end: string, succeeds = true) {
        const bar = this.bar(id);
        if (await bar.count()) {
            await bar.focus();
            await this.page.keyboard.press("F2");
        } else {
            const schedule = this.page.getByTestId(`gantt-schedule-${id}`);
            await schedule.focus();
            await this.page.keyboard.press("Enter");
        }
        await this.page.getByTestId("gantt-date-start").fill(start);
        await this.page.getByTestId("gantt-date-end").fill(end);
        const response = this.page.waitForResponse(
            r => new URL(r.url()).pathname === `/api/tasks/${id}` && r.request().method() === "PATCH"
        );
        await this.page.getByTestId("gantt-date-save").click();
        expect((await response).ok()).toBe(succeeds);
        if (succeeds) await expect(this.page.getByTestId("gantt-date-editor")).toBeHidden();
        else await this.page.getByTestId("gantt-date-cancel").click();
    }
    async expectDates(id: string, start: string, end: string) {
        await expect(this.bar(id)).toHaveAttribute("data-start", start);
        await expect(this.bar(id)).toHaveAttribute("data-end", end);
    }
    async reload() {
        await this.page.reload();
        await expect(this.chart).toBeVisible();
    }
    async reveal(id: string) {
        const reveal = this.page.getByTestId(`gantt-reveal-${id}`);
        if (await reveal.isVisible()) await reveal.click();
        await expect(this.bar(id)).toBeVisible();
    }
    async drag(id: string, days: number, kind: "move" | "left" | "right" = "move", cancel = false) {
        const locator = kind === "move" ? this.bar(id) : this.page.getByTestId(`gantt-resize-${kind}-${id}`);
        const box = await locator.boundingBox();
        if (!box) throw new Error("Gantt bar not rendered");
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
        await this.page.mouse.move(x + days * 30, y, { steps: 8 });
        if (cancel) {
            await this.page.keyboard.press("Escape");
            await this.page.mouse.up();
        } else {
            const saved = this.page.waitForResponse(
                r => new URL(r.url()).pathname === `/api/tasks/${id}` && r.request().method() === "PATCH"
            );
            await this.page.mouse.up();
            expect((await saved).ok()).toBeTruthy();
        }
    }
    async scheduleByPointer(id: string) {
        const box = await this.page.getByTestId(`gantt-schedule-${id}`).boundingBox();
        if (!box) throw new Error("Unscheduled row not rendered");
        const x = box.x + 24;
        const y = box.y + box.height / 2;
        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
        await this.page.mouse.move(x + 72, y, { steps: 8 });
        const saved = this.page.waitForResponse(
            r => new URL(r.url()).pathname === `/api/tasks/${id}` && r.request().method() === "PATCH"
        );
        await this.page.mouse.up();
        expect((await saved).ok()).toBeTruthy();
    }
    async expectBarOpensWithoutSaving(id: string, scale: "day" | "week" | "month" | "quarter" | "halfYear") {
        await this.setScale(scale);
        let saves = 0;
        const record = (request: import("@playwright/test").Request) => {
            if (new URL(request.url()).pathname === `/api/tasks/${id}` && request.method() === "PATCH")
                saves++;
        };
        this.page.on("request", record);
        try {
            const box = await this.bar(id).boundingBox();
            if (!box) throw new Error("Short bar not rendered");
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await this.page.mouse.down();
            // Deliberately hold past multiple animation frames to catch unintended edge auto-scroll.
            await this.page.waitForTimeout(150);
            await this.page.mouse.up();
            await expect.poll(() => new URL(this.page.url()).pathname.endsWith(`/${id}`)).toBeTruthy();
            expect(saves).toBe(0);
            await this.page.goBack();
            await expect(this.chart).toBeVisible();
        } finally {
            this.page.off("request", record);
        }
    }
    async expectParentConnection(parent: string, child: string) {
        const arrow = this.page.getByTestId(`gantt-link-${parent}-${child}`);
        await expect(arrow).toHaveAttribute("marker-end", /^url\(#gantt-arrow-/);
        await expect(arrow).toHaveAttribute("d", /V [0-9.]+ H -?[0-9.]+$/);
        const linksLayer = await this.page
            .getByTestId("gantt-links")
            .evaluate(element => Number(getComputedStyle(element).zIndex));
        const gridLayer = await this.page
            .getByTestId("gantt-grid")
            .evaluate(element => Number(getComputedStyle(element).zIndex));
        expect(linksLayer).toBeGreaterThan(gridLayer);
        await this.page.getByTestId(`gantt-toggle-${parent}`).click();
        await expect(arrow).toHaveCount(0);
        await this.page.getByTestId(`gantt-toggle-${parent}`).click();
        await expect(arrow).toHaveAttribute("d", /^M /);
    }
    async hierarchy(parent: string, child: string) {
        await expect(this.page.getByTestId(`gantt-tree-arrow-${child}`)).toBeVisible();
        await expect(this.page.getByTestId(`gantt-row-${child}`)).toBeVisible();
        await this.page.getByTestId(`gantt-toggle-${parent}`).click();
        await expect(this.page.getByTestId(`gantt-row-${child}`)).toBeHidden();
        await this.page.getByTestId("gantt-toggle-all").click();
        await expect(this.page.getByTestId(`gantt-row-${child}`)).toBeVisible();
        await this.page.getByTestId("gantt-toggle-all").click();
        await expect(this.page.getByTestId(`gantt-row-${child}`)).toBeHidden();
        await this.page.getByTestId("gantt-toggle-all").click();
    }
    async setScale(scale: "day" | "week" | "month" | "quarter" | "halfYear") {
        await this.page.getByTestId("gantt-scale-picker").click();
        await this.page.getByTestId(`gantt-scale-option-${scale}`).click();
    }
    async scalesAndPane() {
        for (const scale of ["week", "month", "quarter", "halfYear", "day"] as const) {
            await this.setScale(scale);
        }
        const divider = this.page.getByTestId("gantt-divider-handle");
        const initial = Number(await divider.getAttribute("aria-valuenow"));
        await divider.focus();
        await this.page.keyboard.press("ArrowRight");
        await expect(divider).toHaveAttribute("aria-valuenow", String(initial + 20));
        await this.page.getByTestId("gantt-pane-toggle").click();
        await expect(divider).not.toHaveAttribute("role", "separator");
        await this.page.getByTestId("gantt-pane-toggle").click();
        await expect(divider).toHaveAttribute("role", "separator");
        await this.page.getByTestId("gantt-viewport").evaluate(element => {
            element.scrollLeft = 0;
        });
        await this.page.getByTestId("gantt-today").click();
        await expect(this.page.getByTestId("gantt-today")).toHaveCount(0);
    }
    async expectTaskNavigation(id: string) {
        await this.page.getByTestId(`gantt-task-${id}`).click();
        await expect.poll(() => new URL(this.page.url()).pathname.endsWith(`/${id}`)).toBeTruthy();
    }
    async backToChart() {
        await this.page.goBack();
        await expect(this.chart).toBeVisible();
    }
    async cleanupOwned(request: APIRequestContext, project: string, ids: string[]) {
        const csrf = await request.get("/auth/csrf");
        const token = (await csrf.json()).data.token;
        const headers = { Origin: new URL(this.page.url()).origin, "x-csrf-token": token };
        const errors: string[] = [];
        for (const id of ids.filter(Boolean)) {
            const response = await request.delete(`/api/tasks/${id}`, { headers });
            if (!response.ok()) errors.push(`Task ${id}: HTTP ${response.status()}`);
        }
        const response = await request.delete(`/api/documents/${project}`, { headers });
        if (!response.ok()) errors.push(`Project ${project}: HTTP ${response.status()}`);
        if (errors.length) throw new Error(errors.join("; "));
    }
    async narrowScreenshot(path: string) {
        const viewport = this.page.viewportSize()!;
        const filtersOpen = await this.page.getByTestId("project-filters-sidebar").isVisible();
        if (filtersOpen) await this.page.keyboard.press("Control+f");
        await this.page.getByTestId("toggle-sidebar-button").click();
        try {
            await this.page.setViewportSize({ width: 390, height: 844 });
            await expect.poll(async () => (await this.chart.boundingBox())?.width ?? 0).toBeGreaterThan(250);
            await this.chart.screenshot({ path });
        } finally {
            await this.page.setViewportSize(viewport);
            await this.page.getByTestId("toggle-sidebar-button").click();
            if (filtersOpen) await this.page.keyboard.press("Control+f");
        }
    }
    async visualSettings(request: APIRequestContext): Promise<{ darkMode: boolean; embeddedTask: boolean }> {
        const response = await request.get("/api/boot");
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        const prefs = (body.data ?? body).preferences;
        return { darkMode: prefs.darkMode, embeddedTask: prefs.embeddedTask };
    }
    async setVisualSettings(
        request: APIRequestContext,
        settings: { darkMode?: boolean; embeddedTask?: boolean }
    ) {
        const boot = await request.get("/api/boot");
        const body = await boot.json();
        const preferences = (body.data ?? body).preferences;
        const csrf = await request.get("/auth/csrf");
        const headers = {
            Origin: new URL(this.page.url()).origin,
            "x-csrf-token": (await csrf.json()).data.token,
        };
        const response = await request.patch("/api/preferences", {
            headers,
            data: { ...preferences, ...settings },
        });
        expect(response.ok()).toBeTruthy();
    }
    async expectBoundedRendering(projectId: string, templateId: string) {
        const handler = async (route: Route) => {
            const url = new URL(route.request().url());
            if (
                url.pathname !== "/api/tasks" ||
                !url.search.includes(projectId) ||
                route.request().method() !== "GET"
            ) {
                await route.continue();
                return;
            }
            const response = await route.fetch();
            const body = await response.json();
            const template = body.data.find((item: { id: string }) => item.id === templateId);
            if (!template) throw new Error("Load fixture template not found");
            await route.fulfill({
                response,
                json: {
                    ...body,
                    data: [
                        ...body.data,
                        ...Array.from({ length: 1000 }, (_, index) => ({
                            ...template,
                            id: `load-${index}`,
                            title: `Load ${String(index).padStart(4, "0")}`,
                            parent: null,
                        })),
                    ],
                },
            });
        };
        await this.page.route("**/api/tasks?*", handler);
        try {
            await this.reload();
            await expect(this.page.getByTestId("gantt-row-load-0")).toBeVisible();
            await expect.poll(() => this.page.getByTestId(/^gantt-row-/).count()).toBeLessThan(40);
            const viewport = this.page.getByTestId("gantt-viewport");
            await viewport.focus();
            await viewport.hover();
            await this.page.mouse.wheel(0, 100000);
            await expect(this.page.getByTestId("gantt-row-load-999")).toBeVisible();
            await expect.poll(() => this.page.getByTestId(/^gantt-row-/).count()).toBeLessThan(40);
            await this.page.getByTestId("gantt-scroll-top").click();
            await expect(this.page.getByTestId("gantt-row-load-0")).toBeVisible();
        } finally {
            await this.page.unroute("**/api/tasks?*", handler);
            await this.reload();
        }
    }
    async screenshot(path: string) {
        await this.chart.screenshot({ path });
    }
}
