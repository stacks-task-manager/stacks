// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reminders hooks and selectors.
 */
import { useEffect, useState } from "react";

import Notifications from "app/utils/reminders";
import { useSubscribe } from "./event";
import { IReminder } from "@stacks/types";

/**
 * Loads and subscribes to the reminders for a given record, reloading them whenever a reminder event arrives.
 * @param {string} recordId - The id of the record whose reminders should be loaded.
 * @returns The list of reminders and a reload function that re-fetches them.
 */
export const useReminder = (recordId: string) => {
    const [reminders, setReminders] = useState<IReminder[]>([]);

    const reload = async () => {
        const availableReminders = await Notifications.load(recordId);
        setReminders(availableReminders);
    };

    useSubscribe("reminder", (reminderData: IReminder) => {
        if (reminderData.recordId === recordId) {
            reload();
        }
    });

    useEffect(() => {
        reload();
    }, [recordId]);

    return { reminders, reload };
};
