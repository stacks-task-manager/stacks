// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-app notifications for the signed-in recipient (read/delete scoped to owner).
 */
import { NotificationEntity, UserEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import { INotification, POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import { Transaction } from "sequelize";
import { Errors } from "../errors";
import { sendRealtimeUpdateToUser } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { afterTransactionCommit, withTransaction } from "./utils";
import { sanitizeWhere } from "./utils";

/** Unread notifications for the current user, newest first. */
async function getAll() {
    const user = getCurrentUser();
    const notifications = await NotificationEntity.findAll({
        where: sanitizeWhere({
            read: false,
            recipient: user.id,
        }),
        order: [["created", "DESC"]],
    });

    return notifications.map(notification => notification.toJSON());
}

type NotificationData = Omit<
    INotification,
    "id" | "read" | "created" | "updated" | "createdBy" | "updatedBy" | "tenant"
>;

/** Creates a notification row inside an optional outer transaction. */
async function add(data: NotificationData, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const user = getCurrentUser();

        const recipient = await UserEntity.findOne({
            where: { id: data.recipient, tenant: user.tenant, deleted: null },
            attributes: ["id"],
            transaction,
        });

        if (!recipient) {
            throw Errors.notFound(translate("Notification not found"));
        }

        const newNotificationEntity = await NotificationEntity.create(
            { ...data, tenant: user.tenant, createdBy: user.id, updatedBy: user.id },
            {
                transaction,
            }
        );

        const newNotification = newNotificationEntity.toJSON();

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdateToUser(data.recipient, {
                type: POLLINGTYPE.NOTIFICATION,
                record: `${newNotification.id}`,
                action: POLLINGACTIONS.CREATE,
            });
        });

        return newNotification;
    });
}

/** Marks a notification read if it belongs to the current user. */
async function read(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const user = getCurrentUser();

        const notification = await NotificationEntity.findOne({
            where: sanitizeWhere({
                id,
            }),
            transaction,
        });

        if (!notification) {
            throw Errors.notFound(translate("Notification not found"));
        }

        if (notification?.get("recipient") !== user.id) {
            throw Errors.notFound(translate("Notification not found"));
        }

        await notification.update(
            {
                read: true,
                readOn: new Date(),
            },
            {
                transaction,
                returning: false, // Optimize for performance
            }
        );

        invalidateApiCacheForCurrentRequest();
    });
}

/** Soft-deletes a notification owned by the current user. */
async function remove(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const user = getCurrentUser();

        const notification = await NotificationEntity.findOne({
            where: sanitizeWhere({
                id,
            }),
            transaction,
        });

        if (!notification) {
            throw Errors.notFound(translate("Notification not found"));
        }

        if (notification?.get("recipient") !== user.id) {
            throw Errors.notFound(translate("Notification not found"));
        }

        await notification.destroy({ transaction });

        invalidateApiCacheForCurrentRequest();
    });
}

export const NotificationsLoader = {
    add,
    getAll,
    read,
    remove,
};
