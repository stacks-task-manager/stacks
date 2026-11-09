// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reminders on records with soft-delete via `deleted` timestamp.
 */
import { ReminderEntity } from "@stacks/db";
import { Transaction } from "sequelize";
import { Errors } from "../errors";
import { translate } from "@stacks/translations";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { sanitizeWhere } from "./utils";
import { TasksLoader } from "./tasks";

/** Resolve visibility and owner-write policy through the canonical task loader. */
async function assertTaskWritable(recordId: string, transaction?: Transaction) {
    const task = await TasksLoader.getOne(recordId, transaction);
    const user = getCurrentUser();
    if (!user.admin && task.permissions?.owner !== user.id) {
        throw Errors.forbidden(translate("Record update not allowed"));
    }
    return task;
}

/** All reminders for a record id in the current tenant. */
async function getAll(recordId: string) {
    await TasksLoader.getOne(recordId);
    const reminders = await ReminderEntity.findAll({
        where: sanitizeWhere({ recordId }),
    });

    return reminders.map(reminder => reminder.toJSON());
}

/** Persists a reminder; optional Sequelize transaction for batch flows. */
async function create(data: any, transaction?: Transaction) {
    const user = getCurrentUser();
    await assertTaskWritable(data.recordId, transaction);
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
    const reminder = await ReminderEntity.findOne({
        where: sanitizeWhere({ id }),
        transaction,
    });
    if (!reminder) return false;

    await assertTaskWritable(String(reminder.get("recordId")), transaction);
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
