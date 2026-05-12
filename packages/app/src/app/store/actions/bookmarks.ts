// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Bookmark API sync.
 */
import { produce } from "immer";

import { IBookmark, IUpdate } from "@stacks/types";
import api, { BookmarksAPI, ExportAPI } from "app/api";
import { getMe } from "app/hooks";
import { runStoreLoad, createDebouncedCallback } from "../actionHelpers";
import { BookmarksStore, IBookmarksStore } from "../bookmarks";

const load = async () => {
    await runStoreLoad<IBookmarksStore, IBookmark[]>({
        set: fn => BookmarksStore.set(produce(fn)),
        onStart: state => {
            state.isLoading = true;
            state.bookmarks = [];
        },
        load: () => BookmarksAPI.load(),
        onSuccess: (state, bookmarks) => {
            state.isLoading = false;
            state.bookmarks = bookmarks;
        },
    });
};

const reload = async (update: IUpdate) => {
    const me = getMe();
    if (update.user !== me?.id) return;
    await load();
};

const add = async (bookmarkData: Partial<IBookmark>) => {
    const bookmark = await BookmarksAPI.add(bookmarkData);
    BookmarksStore.set(
        produce((state: IBookmarksStore) => {
            state.bookmarks.push(bookmark);
        })
    );
};

const togglePinned = async (bookmarkId: string) => {
    let pinned = false;
    BookmarksStore.set(
        produce((state: IBookmarksStore) => {
            state.bookmarks = state.bookmarks.map(bookmark => {
                if (bookmark.id === bookmarkId) {
                    bookmark.pinned = !bookmark.pinned;
                    pinned = bookmark.pinned;
                }
                return bookmark;
            });
        })
    );

    await api("bookmarks/update", { bookmarkId, data: { pinned } });
};

const remove = async (bookmarkId: string) => {
    BookmarksStore.set(
        produce((state: IBookmarksStore) => {
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
        })
    );

    await BookmarksAPI.delete(bookmarkId);
};

const removeResource = async (resourceId: string) => {
    const bookmark = getBookmarkByResource(resourceId);
    if (!bookmark) return;

    BookmarksStore.set(
        produce((state: IBookmarksStore) => {
            state.bookmarks = state.bookmarks.filter(bmrk => bmrk.id !== bookmark.id);
        })
    );

    await api("bookmarks/remove", { bookmarkId: bookmark.id });
};

const getBookmarkByResource = (resourceId: string): IBookmark | undefined => {
    return BookmarksStore.get().bookmarks.find(bookmark => bookmark.resourceId === resourceId);
};

const debouncedQuery = createDebouncedCallback(500);
const setQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.currentTarget.value;
    debouncedQuery(() => {
        BookmarksStore.set(
            produce((state: IBookmarksStore) => {
                state.query = query;
            })
        );
    });
};

const exportBookmarks = async (format: "json" | "pdf" | "excel") => {
    await ExportAPI.export({
        title: "bookmarks",
        data: BookmarksStore.get().bookmarks,
        type: "bookmark",
        format,
    });
};

export const BookmarksActions = {
    load,
    reload,
    add,
    togglePinned,
    remove,
    removeResource,
    setQuery,
    exportBookmarks,
};
