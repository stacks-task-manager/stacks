import { Page } from "@playwright/test";
import Base from "./base";
import Sidebar from "./sidebar";
import { NewNotepadDialog } from "./components/NewNotepadDialog";

class Notepad extends Base {
    public sidebar: Sidebar;
    public newNotepadDialog: NewNotepadDialog;

    constructor(page: Page) {
        super(page);

        this.sidebar = new Sidebar(page);
        this.newNotepadDialog = new NewNotepadDialog(page);
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
}

export default Notepad;
