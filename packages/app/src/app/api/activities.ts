// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task activity feed API (comments and logs).
 */
import { IActivity } from "@stacks/types";
import request from "./request";

export const ActivitiesAPI = {
    /** GET activities for a resource id. */
    async load(resourceId: string): Promise<IActivity[]> {
        return request.get(`/api/activities/${resourceId}`);
    },
    /** POST a new activity row. */
    async add(activity: Omit<IActivity, "id" | "created" | "updated">): Promise<IActivity> {
        return request.post("/api/activities", activity);
    },
    /** PATCH an owned comment. */
    async update(resourceId: string, activityId: string, content: string): Promise<IActivity> {
        return request.patch(`/api/activities/${activityId}`, { resourceId, content });
    },
    /** DELETE an owned comment. */
    async remove(resourceId: string, activityId: string): Promise<void> {
        return request.delete(`/api/activities/${activityId}`, { data: { resourceId } });
    },
};
