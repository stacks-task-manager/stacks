import { Locator, Page } from "@playwright/test";
import Base from "./base";
import Sidebar from "./sidebar";
import { NewNotepadDialog } from "./components/NewNotepadDialog";
import { metaOrControl } from "../utils";

class Notepad extends Base {
    public sidebar: Sidebar;
    public newNotepadDialog: NewNotepadDialog;
    public view: Locator;
    public toolbar: Locator;
    public titleInput: Locator;
    public editor: Locator;
    public wideToggleButton: Locator;
    public addCoverButton: Locator;
    public menuButton: Locator;
    public menu: Locator;
    public infoButton: Locator;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.newNotepadDialog = new NewNotepadDialog(page);
        this.view = page.getByTestId("notepad-view");
        this.toolbar = page.getByTestId("notepad-toolbar");
        this.titleInput = page.getByTestId("toolbar-title-input");
        this.editor = page.getByTestId("tip-tap-editor");
        this.wideToggleButton = page.getByTestId("notepad-wide-toggle-button");
        this.addCoverButton = page.getByTestId("notepad-add-cover-button");
        this.menuButton = page.getByTestId("notepad-menu-button");
        this.menu = page.getByTestId("notepad-menu");
        this.infoButton = page.getByTestId("notepad-info-button");
    }

    public async addNew(notepadName: string) {
        await this.sidebar.addNew("notepad");
        await this.newNotepadDialog.dialog.waitFor({ state: "visible" });
        await this.newNotepadDialog.titleInput.fill(notepadName);

        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/documents") && response.request().method() === "POST"
        );

        await this.newNotepadDialog.saveButton.click();
        const response = await responsePromise;
        await this.newNotepadDialog.dialog.waitFor({ state: "hidden" });

        const { data } = await response.json();
        return data?.id;
    }

    public async delete(notepadName: string) {
        await this.sidebar.deleteDocument(notepadName);
    }

    public async openByName(notepadName: string) {
        await this.sidebar.documentsTree.getByRole("treeitem", { name: notepadName, exact: true }).click();
        await this.view.waitFor({ state: "visible" });
        await this.editor.waitFor({ state: "visible" });
    }

    public async setContent(content: string) {
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.url().includes("/api/notepads/") && response.request().method() === "PATCH"
        );
        await this.editor.click();
        await this.page.keyboard.press(`${metaOrControl}+A`);
        await this.page.keyboard.press("Backspace");
        await this.page.keyboard.type(content);
        await responsePromise;
    }

    public async getContent() {
        return this.editor.textContent();
    }

    public async toggleWide() {
        await this.wideToggleButton.click();
    }

    public async openMenu() {
        await this.menuButton.click();
        await this.menu.waitFor({ state: "visible" });
    }

    public menuItem(testId: string): Locator {
        return this.menu.getByTestId(testId);
    }

    public async closeMenu() {
        await this.page.keyboard.press("Escape");
        await this.menu.waitFor({ state: "hidden" });
    }
}

export default Notepad;
