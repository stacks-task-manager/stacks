import { Locator, Page } from "@playwright/test";
import Base from "./base";

class RegisterPage extends Base {
    public card: Locator;
    public emailField: Locator;
    public firstNameField: Locator;
    public lastNameField: Locator;
    public passwordField: Locator;
    public tenantSelect: Locator;
    public submitButton: Locator;
    public logInLink: Locator;

    constructor(page: Page) {
        super(page);

        this.card = page.getByTestId("register-card");
        this.emailField = page.getByTestId("register-email");
        this.firstNameField = page.getByTestId("register-first-name");
        this.lastNameField = page.getByTestId("register-last-name");
        this.passwordField = page.getByTestId("register-password");
        this.tenantSelect = page.getByTestId("register-tenant");
        this.submitButton = page.getByTestId("register-submit-button");
        this.logInLink = page.getByTestId("register-login-link");
    }

    async open(): Promise<void> {
        await this.page.goto("/register");
        await this.card.waitFor();
    }

    /** Selects the first available tenant so the form passes its required select. */
    async selectFirstTenant(): Promise<void> {
        const options = this.tenantSelect.locator("option");
        const firstValue = await options.nth(1).getAttribute("value");
        await this.tenantSelect.selectOption(firstValue as string);
    }

    async fill(email: string, firstName: string, lastName: string, password: string): Promise<void> {
        await this.emailField.fill(email);
        await this.firstNameField.fill(firstName);
        await this.lastNameField.fill(lastName);
        await this.passwordField.fill(password);
        await this.selectFirstTenant();
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    /**
     * Registration failures are returned as plain-text bodies (e.g. 400 / 409),
     * not rendered into the register page, so assertions read the raw body.
     */
    async bodyText(): Promise<string> {
        return (await this.page.textContent("body")) ?? "";
    }
}
export default RegisterPage;
