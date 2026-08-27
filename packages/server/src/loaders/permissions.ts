// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Permission rows keyed by resource id with realtime broadcast on update.
 */
import { PermissionEntity, RoleEntity, UserEntity } from "@stacks/db";
import { Errors } from "../errors";
import { POLLINGACTIONS, POLLINGTYPE, type IPermissions } from "@stacks/types";
import type { Transaction } from "sequelize";
import { getCurrentUser } from "./context";
import {
    afterTransactionCommit,
    createOne,
    sanitizeWhere,
    sanitizeWherePermissions,
    withTransaction,
} from "./utils";
import { sendRealtimeUpdate } from "../events";
import { translate } from "@stacks/translations";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";

export const defaultPermissions: Omit<IPermissions, "id" | "owner" | "type"> = {
    isPublic: true,
    visibleUsers: [],
    visibleRoles: [],
};

/** Input for creating permission rows (avoids fragile circular IPermissions + Omit inferences). */
type PermissionCreateInput = {
    isPublic?: boolean;
    visibleUsers?: string[];
    visibleRoles?: string[];
    type: POLLINGTYPE;
};

type PermissionUpdateInput = {
    isPublic: boolean;
    owner?: string;
    visibleUsers: string[];
    visibleRoles: string[];
};

/** Creates default+merged ACL for a resource id inside a transaction. */
async function create(id: string, permissions?: PermissionCreateInput, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();
        const visibleUsers = Array.from(new Set(permissions?.visibleUsers ?? []));
        const visibleRoles = Array.from(new Set(permissions?.visibleRoles ?? []));
        if (visibleUsers.length > 500 || visibleRoles.length > 500) {
            throw Errors.badRequest(translate("Permission audience is too large"));
        }
        await validateAudience(
            {
                isPublic: permissions?.isPublic ?? defaultPermissions.isPublic,
                visibleUsers,
                visibleRoles,
            },
            transaction
        );
        return await createOne<IPermissions>({
            entity: PermissionEntity,
            data: {
                owner: user.id,
                ...defaultPermissions,
                ...(permissions ?? {}),
                visibleUsers,
                visibleRoles,
                id,
            },
            transaction,
        });
    });
}

/** Loads ACL by resource id or throws not found. */
async function getOne(id: string, extTransaction?: Transaction): Promise<IPermissions> {
    return withTransaction(extTransaction, async transaction => {
        const permissionEntity = await PermissionEntity.findOne({
            where: sanitizeWherePermissions({ id }),
            transaction,
            lock: transaction ? true : undefined,
        });

        if (!permissionEntity) {
            throw Errors.notFound("Permission not found");
        }

        return permissionEntity.toJSON() as IPermissions;
    });
}

async function validateAudience(
    permissions: PermissionUpdateInput,
    transaction: Transaction
): Promise<PermissionUpdateInput> {
    const user = getCurrentUser();
    const visibleUsers = Array.from(new Set(permissions.visibleUsers));
    const visibleRoles = Array.from(new Set(permissions.visibleRoles));
    const owner = permissions.owner;
    const userIds = Array.from(new Set([...(owner ? [owner] : []), ...visibleUsers]));

    if (visibleUsers.length > 500 || visibleRoles.length > 500) {
        throw Errors.badRequest(translate("Permission audience is too large"));
    }

    if (userIds.length) {
        const count = await UserEntity.count({
            where: { id: userIds, tenant: user.tenant, deleted: null, disabled: false },
            transaction,
        });
        if (count !== userIds.length) {
            throw Errors.badRequest(translate("Permission users must belong to this workspace"));
        }
    }

    if (visibleRoles.length) {
        const count = await RoleEntity.count({
            where: { id: visibleRoles, tenant: user.tenant, deleted: null, disabled: false },
            transaction,
        });
        if (count !== visibleRoles.length) {
            throw Errors.badRequest(translate("Permission roles must belong to this workspace"));
        }
    }

    return { ...permissions, visibleUsers, visibleRoles };
}

/** Updates ACL visibility and emits polling updates for the resource and sometimes documents. */
async function update(id: string, permissions: PermissionUpdateInput, transaction?: Transaction) {
    return withTransaction(transaction, async activeTransaction => {
        const user = getCurrentUser();
        const currentPermissions = await getOne(id, activeTransaction);

        if (!user.admin && currentPermissions.owner !== user.id) {
            throw Errors.forbidden(translate("Permission update not allowed"));
        }

        const validated = await validateAudience(permissions, activeTransaction);
        const [affectedCount, updatedPermissions] = await PermissionEntity.update(
            {
                isPublic: validated.isPublic,
                owner: validated.owner ?? currentPermissions.owner,
                visibleUsers: validated.visibleUsers,
                visibleRoles: validated.visibleRoles,
            },
            {
                where: sanitizeWhere({ id }),
                returning: true,
                transaction: activeTransaction,
            }
        );

        if (affectedCount === 0) {
            return false;
        }

        afterTransactionCommit(activeTransaction, () => {
            invalidateApiCacheForCurrentRequest();
        });

        if (updatedPermissions && updatedPermissions.length) {
            const updatedRow = updatedPermissions[0].toJSON() as IPermissions & { type: POLLINGTYPE };
            afterTransactionCommit(activeTransaction, () => {
                sendRealtimeUpdate({
                    type: updatedRow.type,
                    action: POLLINGACTIONS.UPDATE,
                    record: id,
                    permissions: updatedRow,
                });

                if ([POLLINGTYPE.PROJECT, POLLINGTYPE.NOTEPAD].includes(updatedRow.type)) {
                    sendRealtimeUpdate({
                        type: POLLINGTYPE.DOCUMENTS,
                        action: POLLINGACTIONS.UPDATE,
                        record: id,
                        permissions: updatedRow,
                    });
                }

                if (updatedRow.type === POLLINGTYPE.CALENDAR) {
                    sendRealtimeUpdate({
                        type: POLLINGTYPE.EVENT,
                        action: POLLINGACTIONS.UPDATE,
                        record: id,
                        permissions: updatedRow,
                    });
                }
            });
        }

        return true;
    });
}

/** Soft-deletes when the current user owns the permission row. */
async function remove(id: string, transaction?: Transaction): Promise<boolean> {
    return withTransaction(transaction, async activeTransaction => {
        const user = getCurrentUser();
        const permission = await getOne(id, activeTransaction);
        if (!user.admin && permission.owner !== user.id) {
            throw Errors.forbidden(translate("Permission delete not allowed"));
        }

        const [affectedCount] = await PermissionEntity.update(
            { deleted: new Date(), deletedBy: user.id },
            {
                where: sanitizeWhere({ id }),
                transaction: activeTransaction,
            }
        );

        if (affectedCount > 0) {
            afterTransactionCommit(activeTransaction, () => {
                invalidateApiCacheForCurrentRequest();
            });
        }
        return affectedCount > 0;
    });
}

export const PermissionsLoader = {
    create,
    update,
    remove,
};
