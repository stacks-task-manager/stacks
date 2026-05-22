// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Status tags (distinct endpoint from generic tags).
 */
import { ITag } from "@stacks/types";
import request from "./request";

export const StatusesAPI = {
    /** Lists status tags. */
    async load(): Promise<ITag[]> {
        return request.get("/api/statuses");
    },
    /** Creates a status tag. */
    async add(status: Partial<ITag>): Promise<ITag> {
        return request.post("/api/statuses", status);
    },
};
