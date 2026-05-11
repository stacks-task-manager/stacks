import { Locator, Page } from "@playwright/test";
import Base from "./base";
import Sidebar from "./sidebar";

class App extends Base {
    public sidebar: Sidebar;

    public profileButton: Locator;
    public profileMenu: Locator;
    public helpButton: Locator;
    public helpMenu: Locator;
    public globalSearchDialog: Locator;
    public globalSearchButton: Locator;
    public globalSearchInput: Locator;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);

        this.profileButton = page.getByTestId("profile-button");
        this.profileMenu = page.getByTestId("profile-menu");
        this.helpButton = page.getByTestId("help-button");
        this.helpMenu = page.getByTestId("help-menu");
        this.globalSearchButton = page.getByTestId("global-search-button");
        this.globalSearchDialog = page.locator('[aria-labelledby="search-dialog"]');
        this.globalSearchInput = page.getByTestId("global-search-input");
    }

    async clickMenuItem(name: string | RegExp) {
        const pinnedItem = this.sidebar.pinnedItems.filter({ hasText: name });
        if ((await pinnedItem.count()) > 0) {
            await pinnedItem.click();
        } else {
            await this.sidebar.moreButton.click();
            await this.sidebar.moreMenu.getByRole("menuitem", { name }).click();
        }
    }

    async logout() {
        await this.profileButton.click();
        await this.page.getByRole("menuitem", { name: "Log out" }).click();
    }
}
export default App;
