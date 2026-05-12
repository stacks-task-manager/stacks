// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Sidebar bookmarks.
 */
import { IBookmark } from "@stacks/types";
import request from "./request";

export const BookmarksAPI = {
    /** Lists bookmarks for the current user. */
    async load(): Promise<IBookmark[]> {
        return request.get("/api/bookmarks");
    },
    /** Creates a bookmark. */
    async add(bookmark: Partial<IBookmark>): Promise<IBookmark> {
        return request.post("/api/bookmarks", bookmark);
    },
    /** Removes a bookmark by id. */
    async delete(bookmarkId: string): Promise<boolean> {
        return request.delete(`/api/bookmarks/${bookmarkId}`);
    },
};