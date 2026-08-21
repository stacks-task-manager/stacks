// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notifications hooks and selectors.
 */
import { NotificationsStore } from "app/store/notifications";
import { shallowEqual } from "./store";

/**
 * Returns the full list of in-app notifications.
 * @returns The array of notifications.
 */
export const useNotifications = () => {
    return NotificationsStore.use(state => state.notifications);
};

/**
 * Returns the number of notifications that have not been read yet.
 * @returns The count of unread notifications.
 */
export const useUnreadCount = () => {
    return NotificationsStore.use(
        state => state.notifications.filter(notification => !notification.read).length,
        shallowEqual
    );
};
