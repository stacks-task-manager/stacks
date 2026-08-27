import { Locator, Page } from "@playwright/test";
import Base from "./base";

class PasswordResetPage extends Base {
    public card: Locator;
    public password1Field: Locator;
    public password2Field: Locator;
    public submitButton: Locator;
    public errorMessages: Locator;

    constructor(page: Page) {
        super(page);

        this.card = page.getByTestId("password-reset-card");
        this.password1Field = page.getByTestId("password-reset-password1");
        this.password2Field = page.getByTestId("password-reset-password2");
        this.submitButton = page.getByTestId("password-reset-submit-button");
        this.errorMessages = page.getByTestId("password-reset-error-messages");
    }

    /** Navigates to the reset form using the token from the emailed link. */
    async openReset(token: string): Promise<void> {
        await this.page.goto(`/login/password-reset?token=${token}`);
        await this.card.waitFor();
    }

    /** Navigates to the reset URL without waiting for the form (used for invalid tokens). */
    async openResetRaw(token: string): Promise<void> {
        await this.page.goto(`/login/password-reset?token=${token}`);
    }

    async submitPasswords(password1: string, password2: string): Promise<void> {
        await this.password1Field.fill(password1);
        await this.password2Field.fill(password2);
        await this.submitButton.click();
    }

    /**
     * Bad/expired tokens are answered with a plain-text body (400), not a
     * rendered reset page, so assertions read the raw body.
     */
    async bodyText(): Promise<string> {
        return (await this.page.textContent("body")) ?? "";
    }
}
export default PasswordResetPage;
