// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Bookmarks hooks and selectors.
 */
import { BookmarksStore } from "app/store/bookmarks";
import { useMemo } from "react";

export const useBookmark = (bookmarkId: string) => {
    const bookmarks = BookmarksStore.use(state => state.bookmarks);

    return useMemo(() => {
        return bookmarks.find(bookmark => bookmark.id === bookmarkId);
    }, [bookmarks, bookmarkId]);
};
