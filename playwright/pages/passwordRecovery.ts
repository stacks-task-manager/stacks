import { Locator, Page } from "@playwright/test";
import Base from "./base";

class PasswordRecoveryPage extends Base {
    public card: Locator;
    public emailField: Locator;
    public submitButton: Locator;
    public errorMessages: Locator;
    public logInLink: Locator;

    constructor(page: Page) {
        super(page);

        this.card = page.getByTestId("password-recovery-card");
        this.emailField = page.getByTestId("password-recovery-email");
        this.submitButton = page.getByTestId("password-recovery-submit-button");
        this.errorMessages = page.getByTestId("password-recovery-error-messages");
        this.logInLink = page.getByTestId("password-recovery-footer").getByRole("link", { name: "Log in" });
    }

    async open(): Promise<void> {
        await this.page.goto("/login/password-recovery");
        await this.card.waitFor();
    }

    async submitEmail(email: string): Promise<void> {
        await this.emailField.fill(email);
        await this.submitButton.click();
    }
}
export default PasswordRecoveryPage;
