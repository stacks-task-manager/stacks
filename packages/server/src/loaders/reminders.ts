// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reminders on records with soft-delete via `deleted` timestamp.
 */
import { ReminderEntity } from "@stacks/db";
import { Transaction } from "sequelize";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { sanitizeWhere } from "./utils";

/** All reminders for a record id in the current tenant. */
async function getAll(recordId: string) {
    const user = getCurrentUser();
    const reminders = await ReminderEntity.findAll({
        where: sanitizeWhere({ recordId }),
    });

    return reminders.map(reminder => reminder.toJSON());
}

/** Persists a reminder; optional Sequelize transaction for batch flows. */
async function create(data: any, transaction?: Transaction) {
    const user = getCurrentUser();
    try {
        const newReminder = await ReminderEntity.create(
            { ...data, tenant: user.tenant, createdBy: user.id, updatedBy: user.id },
            {
                transaction,
            }
        );
        invalidateApiCacheForCurrentRequest();
        return newReminder.toJSON();
    } catch (error) {
        throw error;
    }
}

/** Soft-deletes by id; returns whether a row was updated. */
async function remove(id: string, transaction?: Transaction) {
    const user = getCurrentUser();
    const [affectedCount] = await ReminderEntity.update(
        {
            deleted: new Date(),
            deletedBy: user.id,
        },
        {
            where: sanitizeWhere({ id }),
            transaction,
        }
    );
    invalidateApiCacheForCurrentRequest();
    return affectedCount > 0;
}

export const RemindersLoader = {
    create,
    getAll,
    remove,
};
