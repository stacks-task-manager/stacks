import { Locator, Page } from "@playwright/test";
import Base from "./base";

class ActivationPage extends Base {
    public card: Locator;
    public password1Field: Locator;
    public password2Field: Locator;
    public submitButton: Locator;
    public errorMessages: Locator;
    public successMessage: Locator;
    public errorPage: Locator;

    constructor(page: Page) {
        super(page);

        this.card = page.getByTestId("activation-card");
        this.password1Field = page.getByTestId("activation-password1");
        this.password2Field = page.getByTestId("activation-password2");
        this.submitButton = page.getByTestId("activation-submit-button");
        this.errorMessages = page.getByTestId("activation-error-messages");
        this.successMessage = page.getByTestId("activation-success-message");
        this.errorPage = page.getByTestId("activation-error-page");
    }

    /** Navigates to the activation form using the raw token from the DB/email. */
    async openActivation(token: string): Promise<void> {
        await this.page.goto(`/auth/activate/${token}`);
        await this.card.waitFor();
    }

    async submitPasswords(password1: string, password2: string): Promise<void> {
        await this.password1Field.fill(password1);
        await this.password2Field.fill(password2);
        await this.submitButton.click();
    }
}
export default ActivationPage;
