import { Locator, Page } from "@playwright/test";
import Base from "./base";

class Auth extends Base {
    public loginCard: Locator;
    public passwordRecoveryCard: Locator;
    public errorMessages: Locator;
    public forgetPasswordLink: Locator;
    public passwordRecoveryFooter: Locator;

    constructor(page: Page) {
        super(page);

        this.loginCard = page.getByTestId("login-card");
        this.passwordRecoveryCard = page.getByTestId("password-recovery-card");
        this.errorMessages = this.loginCard.getByTestId("login-error-messages");
        this.forgetPasswordLink = this.loginCard.getByTestId("login-forget-password-link");
        this.passwordRecoveryFooter = page.getByTestId("password-recovery-footer");
    }
}
export default Auth;
