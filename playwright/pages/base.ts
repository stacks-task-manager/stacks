import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { e2eBaseUrl } from "../config/runtime";

/** Metadata and body of a `/api/export` response, captured by captureExport. */
export interface ExportResult {
    status: number;
    contentType: string;
    contentDisposition: string | undefined;
    requestBody: unknown;
    body: Buffer;
}

class Base {
    public page: Page;
    public tooltip: Locator;

    constructor(page: Page) {
        this.page = page;
        this.tooltip = page.locator('[class*="tooltip"] [class*="popover-content"]');
    }

    protected async browserMutationHeaders(): Promise<Record<string, string>> {
        const csrfResponse = await this.page.request.get("/auth/csrf");
        if (!csrfResponse.ok()) {
            throw new Error(`Could not obtain a CSRF token (HTTP ${csrfResponse.status()})`);
        }

        const csrfToken = (await csrfResponse.json()).data?.token;
        if (typeof csrfToken !== "string" || csrfToken.length === 0) {
            throw new Error("Could not obtain a CSRF token");
        }

        return { Origin: new URL(e2eBaseUrl).origin, "x-csrf-token": csrfToken };
    }

    async open(): Promise<void> {
        await this.page.goto("/");
    }

    async goto(slug: string) {
        return await this.page.goto(slug);
    }

    async getTitle() {
        return await this.page.title();
    }

    async getUrl() {
        return this.page.url();
    }

    async expectPath(pathname: string, searchParams?: Record<string, string>) {
        await expect
            .poll(() => {
                const url = new URL(this.page.url());
                const paramsMatch = Object.entries(searchParams ?? {}).every(
                    ([key, value]) => url.searchParams.get(key) === value
                );

                return url.pathname === pathname && paramsMatch;
            })
            .toBe(true);
    }

    /** Asserts the current URL no longer carries any of the given query parameters. */
    async expectParamsAbsent(keys: string[]) {
        await expect
            .poll(() => keys.every(key => new URL(this.page.url()).searchParams.get(key) === null))
            .toBe(true);
    }

    async wait() {
        return this.page.waitForTimeout(2000);
    }

    async waitForPageLoad() {
        return await this.page.waitForLoadState("domcontentloaded");
    }

    async waitAndClick(selector: string) {
        return await this.page.click(selector);
    }

    async waitAndFill(selector: string, text: string) {
        return await this.page.fill(selector, text);
    }

    async keyPress(selector: string, key: string) {
        return await this.page.press(selector, key);
    }

    async takeScreenShot() {
        return expect(await this.page.screenshot()).toMatchSnapshot("MyScreenShot.png");
    }

    async verifyElementText(selector: string, text: string) {
        const locatorText = await this.page.locator(selector);
        return await expect(locatorText).toHaveText(text);
    }

    async verifyElementContainsText(selector: string, text: string) {
        const locatorText = await this.page.locator(selector);
        return await expect(locatorText).toContainText(text);
    }

    async selectValueFromDropdown(selector: string, text: string) {
        const dropdown = await this.page.locator(selector);
        return await dropdown.selectOption({ value: text });
    }

    async verifyElementAttribute(selector: string, attribute: string, value: string) {
        const getAttribute = await this.page.locator(selector);
        return expect(getAttribute).toHaveAttribute(attribute, value);
    }

    async getFirstElementFromTheList(selector: string) {
        const rows = await this.page.locator(selector);
        const count = await rows.count();
        for (let i = 0; i < count; ++i) {
            const firstItem = await rows.nth(0).textContent();
            return firstItem;
        }
    }

    async getLastElementFromTheList(selector: string) {
        const rows = await this.page.locator(selector);
        const count = await rows.count();
        for (let i = 0; i < count; ++i) {
            const lastItem = await rows.nth(5).textContent();
            return lastItem;
        }
    }

    async clickAllElements(selector: string) {
        const rows = await this.page.locator(selector);
        const count = 2;
        for (let i = 0; i < count; ++i) {
            await rows.nth(i).click();
        }
    }

    async clickAllLinksInNewTabs(selector: string) {
        const rows = this.page.locator(selector);
        const count = await rows.count();
        for (let i = 0; i < count; i++) {
            await rows.nth(i).click({ modifiers: ["Control", "Shift"] });
        }
    }

    async isElementVisible(selector: string) {
        const element = this.page.locator(selector);
        return await expect(element).toBeVisible();
    }

    async isElementNotVisible(selector: string) {
        const element = this.page.locator(selector);
        return await expect(element).not.toBeVisible();
    }

    async isElementEnabled(selector: string) {
        const element = this.page.locator(selector);
        return await expect(element).toBeEnabled();
    }

    async isElementChecked(selector: string) {
        const element = this.page.locator(selector);
        return await expect(element).toBeChecked();
    }

    async getSelectorHTML(selector: Locator) {
        return await selector.evaluateAll(elements => elements.map(element => element.outerHTML));
    }

    /** Export format -> request `format` value and response content-type. */
    private static readonly EXPORT_META = {
        xlsx: {
            requestFormat: "excel",
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        json: { requestFormat: "json", contentType: "application/json" },
        pdf: { requestFormat: "pdf", contentType: "application/pdf" },
        html: { requestFormat: "html", contentType: "text/html" },
    } as const;

    /**
     * Intercepts the POST /api/export response triggered by running `click` (the caller
     * opens the menu first) and returns its metadata and body. PDF generation is slow, so
     * the wait is capped at 60s — a timeout here is a real failure, not a flake.
     */
    public async captureExport<T>(click: () => T | Promise<T>): Promise<ExportResult> {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes("/api/export") && response.request().method() === "POST",
            { timeout: 60000 }
        );
        await click();
        const response: Response = await responsePromise;
        return {
            status: response.status(),
            contentType: response.headers()["content-type"],
            contentDisposition: response.headers()["content-disposition"],
            requestBody: response.request().postDataJSON(),
            body: await response.body(),
        };
    }

    /**
     * Asserts a captured export is a successful attachment of the given format. `type`,
     * when given, is matched against the request payload's `type` field.
     */
    public expectExportResult(result: ExportResult, format: keyof typeof Base.EXPORT_META, type?: string) {
        const meta = Base.EXPORT_META[format];
        expect(result.status).toBe(200);
        expect(result.contentType).toContain(meta.contentType);
        expect(result.contentDisposition).toMatch(new RegExp(`\\.${format}$`, "i"));
        if (type) {
            expect(result.requestBody as Record<string, unknown>).toMatchObject({
                type,
                format: meta.requestFormat,
            });
        }
    }
}
export default Base;
