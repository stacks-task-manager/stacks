import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { metaOrControl } from "../utils";

const VIEW_TEST_ID = "home-view";
const BOOKMARK_ROW_PREFIX = "home-bookmark-";
const AVATAR_PREFIX = "home-avatar-";
const EDITOR_TEST_ID = "tip-tap-editor";
const EMPTY_FAVORITE_PROJECTS = "home-empty-favorite-projects";
const EMPTY_PINNED_BOOKMARKS = "home-empty-pinned-bookmarks";
const EMPTY_FAVORITE_PEOPLE = "home-empty-favorite-people";

/**
 * Page object for the Home view at `/app/home`.
 *
 * The three favorite/pin widgets are app-owned, so every selector uses the testids added in
 * `packages/app/src/app/views/Home/Home.tsx`: the empty-state BlankSlates
 * (`home-empty-favorite-projects`, `home-empty-pinned-bookmarks`, `home-empty-favorite-people`),
 * the pinned-bookmark rows (`home-bookmark-<id>`) and the favorite-person avatars
 * (`home-avatar-<id>`). Favorite *projects* render through a third-party Blueprint `MenuItem`
 * with no testid, so the spec asserts them by their unique title text instead.
 *
 * The private-notes editor is a `TipTapWrapper` with no `testId`/`contentTestId`, so its inner
 * content carries `data-testid="tip-tap-editor"` (`TipTapEditor.tsx:243`), matching the notepad POM.
 */
class Home extends Base {
    constructor(page: Page) {
        super(page);
    }

    /** The rendered Home view. */
    public view(): Locator {
        return this.page.getByTestId(VIEW_TEST_ID);
    }

    /** The pinned-bookmark row for a bookmark id. */
    public bookmarkRow(bookmarkId: string): Locator {
        return this.page.getByTestId(`${BOOKMARK_ROW_PREFIX}${bookmarkId}`);
    }

    /** The favorite-person avatar for a person id. */
    public avatar(personId: string): Locator {
        return this.page.getByTestId(`${AVATAR_PREFIX}${personId}`);
    }

    /** The private-notes editor content. */
    public editor(): Locator {
        return this.page.getByTestId(EDITOR_TEST_ID);
    }

    /** An empty-state BlankSlate for a favorite/pin widget. */
    public emptyState(kind: "favorite-projects" | "pinned-bookmarks" | "favorite-people"): Locator {
        return this.page.getByTestId(
            {
                "favorite-projects": EMPTY_FAVORITE_PROJECTS,
                "pinned-bookmarks": EMPTY_PINNED_BOOKMARKS,
                "favorite-people": EMPTY_FAVORITE_PEOPLE,
            }[kind]
        );
    }

    /** Pinned bookmark ids currently rendered as rows, in DOM order. */
    public async renderedBookmarkIds(): Promise<string[]> {
        const testIds = await this.page
            .getByTestId(new RegExp(`^${BOOKMARK_ROW_PREFIX}`))
            .evaluateAll(elements => elements.map(element => element.getAttribute("data-testid") ?? ""));
        return testIds
            .filter(testId => testId.startsWith(BOOKMARK_ROW_PREFIX))
            .map(testId => testId.slice(BOOKMARK_ROW_PREFIX.length));
    }

    /** Favorite person ids currently rendered as avatars, in DOM order. */
    public async renderedAvatarIds(): Promise<string[]> {
        const testIds = await this.page
            .getByTestId(new RegExp(`^${AVATAR_PREFIX}`))
            .evaluateAll(elements => elements.map(element => element.getAttribute("data-testid") ?? ""));
        return testIds
            .filter(testId => testId.startsWith(AVATAR_PREFIX))
            .map(testId => testId.slice(AVATAR_PREFIX.length));
    }

    /** Navigates to Home and waits for a settled render. */
    public async open() {
        await this.goto("/app/home");
        await expect(this.view()).toBeVisible();
    }

    public async reload(): Promise<void> {
        await this.page.reload({ waitUntil: "networkidle" });
    }

    /** Types private notes into the editor (client-side only; see the notes gate). */
    public async typeNotes(text: string) {
        await this.editor().click();
        await this.page.keyboard.type(text);
    }

    /** Clears the editor so the empty state can be re-asserted. */
    public async clearNotes() {
        await this.editor().click();
        await this.page.keyboard.press(`${metaOrControl}+A`);
        await this.page.keyboard.press("Backspace");
    }

    /** The current editor text. */
    public async notesText(): Promise<string> {
        return await this.editor().evaluate(element => element.textContent ?? "");
    }

    /** Asserts a pinned-bookmark row renders with the given title. */
    public async expectBookmarkRow(bookmarkId: string, title: string) {
        const row = this.bookmarkRow(bookmarkId);
        await expect.poll(async () => (await row.count()) > 0).toBe(true);
        await expect(row.getByText(title, { exact: true })).toBeVisible();
    }

    /** Asserts no pinned-bookmark row is rendered for a bookmark id. */
    public async expectBookmarkRowHidden(bookmarkId: string) {
        await expect.poll(async () => (await this.bookmarkRow(bookmarkId).count()) === 0).toBe(true);
    }

    /** Asserts a favorite-person avatar renders. */
    public async expectAvatar(personId: string) {
        await expect.poll(async () => (await this.avatar(personId).count()) > 0).toBe(true);
    }

    /** Asserts no favorite-person avatar is rendered for a person id. */
    public async expectAvatarHidden(personId: string) {
        await expect.poll(async () => (await this.avatar(personId).count()) === 0).toBe(true);
    }
}
export default Home;
