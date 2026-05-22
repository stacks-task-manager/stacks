// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-app notification list.
 */
import { entity } from "app/hooks/store";
import { INotification } from "@stacks/types";

export interface INotificationsStore {
    isLoading: boolean;
    notifications: INotification[];
}

export const NotificationsStore = entity<INotificationsStore>({
    isLoading: false,
    notifications: [],
});
