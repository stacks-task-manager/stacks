// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-app notification inbox.
 */
import { INotification } from "@stacks/types";
import request from "./request";

export const NotificationsAPI = {
    /** Lists unread notifications. */
    async load(): Promise<INotification[]> {
        return request.get("/api/notifications");
    },
    /** Marks one as read. */
    async read(id: string): Promise<boolean> {
        return request.patch(`/api/notifications/${id}`);
    },
    /** Deletes a notification. */
    async remove(id: string): Promise<boolean> {
        return request.delete(`/api/notifications/${id}`);
    },
};
