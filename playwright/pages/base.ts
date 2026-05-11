import { expect, type Locator, type Page } from "@playwright/test";

class Base {
    public page: Page;
    public tooltip: Locator;

    constructor(page: Page) {
        this.page = page;
        this.tooltip = page.locator('[class*="tooltip"] [class*="popover-content"]');
    }

    async open() {
        return await this.page.goto("/");
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
}
export default Base;
