// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notifications hooks and selectors.
 */
import { NotificationsStore } from "app/store/notifications";
import { shallowEqual } from "./store";

export const useNotifications = () => {
    return NotificationsStore.use(state => state.notifications);
};

export const useUnreadCount = () => {
    return NotificationsStore.use(
        state => state.notifications.filter(notification => !notification.read).length,
        shallowEqual
    );
};
