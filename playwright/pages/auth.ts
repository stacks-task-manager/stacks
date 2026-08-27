import { Locator, Page } from "@playwright/test";
import Base from "./base";

class Auth extends Base {
    public loginCard: Locator;
    public passwordRecoveryCard: Locator;
    public errorMessages: Locator;
    public successMessages: Locator;
    public forgetPasswordLink: Locator;
    public passwordRecoveryFooter: Locator;
    public emailField: Locator;
    public passwordField: Locator;
    public submitButton: Locator;

    constructor(page: Page) {
        super(page);

        this.loginCard = page.getByTestId("login-card");
        this.passwordRecoveryCard = page.getByTestId("password-recovery-card");
        this.errorMessages = this.loginCard.getByTestId("login-error-messages");
        this.successMessages = this.loginCard.getByTestId("login-success-messages");
        this.forgetPasswordLink = this.loginCard.getByTestId("login-forget-password-link");
        this.passwordRecoveryFooter = page.getByTestId("password-recovery-footer");
        this.emailField = this.loginCard.locator('input[name="email"]');
        this.passwordField = this.loginCard.locator('input[name="password"]');
        this.submitButton = this.loginCard.getByTestId("login-button");
    }

    async gotoLogin(): Promise<void> {
        await this.page.goto("/login");
        await this.loginCard.waitFor();
    }

    async login(email: string, password: string): Promise<void> {
        await this.gotoLogin();
        await this.emailField.fill(email);
        await this.passwordField.fill(password);
        await this.submitButton.click();
    }
}
export default Auth;
