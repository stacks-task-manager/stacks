import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

type SidebarView = "home" | "inbox" | "bookmarks" | "my-tasks" | "reports";
type CoreView = SidebarView | "tasks";

const NAVIGATION_TEST_IDS: Record<SidebarView, { pinned: string; menu: string }> = {
    home: { pinned: "home-button", menu: "home-menuitem" },
    inbox: { pinned: "inbox-button", menu: "inbox-menuitem" },
    bookmarks: { pinned: "bookmarks-button", menu: "bookmarks-menuitem" },
    "my-tasks": { pinned: "mytasks-button", menu: "mytasks-menuitem" },
    reports: { pinned: "reports-button", menu: "reports-menuitem" },
};

class CoreViews extends Base {
    private moreButton: Locator;

    constructor(page: Page) {
        super(page);
        this.moreButton = page.getByTestId("more-button");
    }

    public view(view: CoreView) {
        return this.page.getByTestId(`${view}-view`);
    }

    public async open(view?: CoreView) {
        if (!view) {
            await super.open();
            return;
        }

        if (view === "tasks") {
            await this.goto("/app/tasks");
        } else {
            const navigation = NAVIGATION_TEST_IDS[view];
            const pinnedButton = this.page.getByTestId(navigation.pinned);
            if (await pinnedButton.isVisible()) {
                await pinnedButton.click();
            } else {
                await this.moreButton.click();
                await this.page.getByTestId(navigation.menu).click();
            }
        }

        await expect(this.view(view)).toBeVisible();
    }
}

export default CoreViews;
