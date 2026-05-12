// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Generic workspace tags (projects/people/timebox).
 */
import request from "./request";
import { ITag } from "@stacks/types";

export const TagsAPI = {
    /** Lists tags. */
    async load(): Promise<ITag[]> {
        return request.get("/api/tags");
    },
    /** Creates a tag. */
    async add(tag: Partial<ITag>): Promise<ITag> {
        return request.post("/api/tags", tag);
    },
    /** PATCH a tag. */
    async update(tagId: string, tag: Partial<ITag>): Promise<ITag> {
        return request.patch(`/api/tags/${tagId}`, tag);
    },
    /** Deletes a tag. */
    async remove(tagId: string) {
        return request.delete(`/api/tags/${tagId}`);
    },
};
