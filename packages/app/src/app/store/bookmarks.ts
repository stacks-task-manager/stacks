// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Pinned bookmarks state.
 */
import { entity } from "app/hooks/store";
import { IBookmark } from "@stacks/types";

export interface IBookmarksStore {
    isLoading: boolean;
    bookmarks: IBookmark[];
    query: string;
}

export const BookmarksStore = entity<IBookmarksStore>({
    isLoading: false,
    bookmarks: [],
    query: "",
});
