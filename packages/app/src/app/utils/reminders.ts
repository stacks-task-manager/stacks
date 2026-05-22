// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IReminder } from "@stacks/types";
import { RemindersAPI } from "app/api";

const load = async (recordId: string): Promise<IReminder[]> => {
    return await RemindersAPI.load(recordId);
};

const schedule = async (notification: Omit<IReminder, "id">) => {
    await RemindersAPI.schedule(notification);
};

const removeByRecord = async (recordId: string) => {
    await RemindersAPI.removeByRecord(recordId);
};

const removeById = async (id: string) => {
    await RemindersAPI.remove(id);
};

export default {
    load,
    schedule,
    removeByRecord,
    removeById,
};
