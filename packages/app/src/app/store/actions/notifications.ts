// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Mark read / remove notifications.
 */
import { produce } from "immer";

import { INotification } from "@stacks/types";
import { NotificationsAPI } from "app/api";
import { runStoreLoad } from "../actionHelpers";
import { INotificationsStore, NotificationsStore } from "../notifications";

const load = async () => {
    await runStoreLoad<INotificationsStore, INotification[]>({
        set: fn => NotificationsStore.set(produce(fn)),
        onStart: state => {
            state.notifications = [];
            state.isLoading = true;
        },
        load: () => NotificationsAPI.load(),
        onSuccess: (state, notifications) => {
            state.notifications = notifications;
            state.isLoading = false;
        },
    });
};

const read = async (id: string) => {
    NotificationsStore.set(
        produce((state: INotificationsStore) => {
            state.notifications = state.notifications.map(notification => {
                if (notification.id === id) {
                    notification.read = true;
                }
                return notification;
            });
        })
    );

    await NotificationsAPI.read(id);
};

const remove = async (id: string) => {
    NotificationsStore.set(
        produce((state: INotificationsStore) => {
            state.notifications = state.notifications.filter(notification => notification.id !== id);
        })
    );

    await NotificationsAPI.remove(id);
};

export const NotificationsActions = {
    load,
    read,
    remove,
};
