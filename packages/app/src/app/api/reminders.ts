// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task-linked reminders.
 */
import { IReminder } from "@stacks/types";
import request from "./request";

export const RemindersAPI = {
    /** Lists reminders for a record. */
    async load(recordId: string): Promise<IReminder[]> {
        return request.get(`/api/reminders/${recordId}`);
    },
    /** Creates a reminder. */
    async schedule(reminder: Omit<IReminder, "id">): Promise<void> {
        return request.post(`/api/reminders`, reminder);
    },
    /** Deletes by id. */
    async remove(id: string): Promise<void> {
        return request.delete(`/api/reminders/${id}`);
    },
    /** Deletes all reminders for a record. */
    async removeByRecord(recordId: string): Promise<void> {
        return request.delete(`/api/reminders/record/${recordId}`);
    },
};
