// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Permission rows keyed by resource id with realtime broadcast on update.
 */
import { PermissionEntity } from "@stacks/db";
import { Errors } from "../errors";
import { POLLINGACTIONS, POLLINGTYPE, type IPermissions } from "@stacks/types";
import type { Transaction } from "sequelize";
import { getCurrentUser } from "./context";
import { createOne, sanitizeWhere, sanitizeWherePermissions, withTransaction } from "./utils";
import { sendRealtimeUpdate } from "../events";
import { translate } from "@stacks/translations";

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

/** Creates default+merged ACL for a resource id inside a transaction. */
async function create(id: string, permissions?: PermissionCreateInput, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();
        return await createOne<IPermissions>({
            entity: PermissionEntity,
            data: {
                owner: user.id,
                ...defaultPermissions,
                ...(permissions ?? {}),
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
        });

        if (!permissionEntity) {
            throw Errors.notFound("Permission not found");
        }

        return permissionEntity.toJSON() as IPermissions;
    });
}

/** Replaces ACL and emits polling updates for the resource and sometimes documents. */
async function update(id: string, permissions: IPermissions, transaction?: Transaction) {
    try {
        await getOne(id);

        const [affectedCount, updatedPermissions] = await PermissionEntity.update(permissions, {
            where: sanitizeWhere({ id }),
            returning: true,
        });

        if (affectedCount === 0) {
            return false;
        }

        if (updatedPermissions && updatedPermissions.length) {
            const updatedRow = updatedPermissions[0].toJSON() as IPermissions & { type: POLLINGTYPE };
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
        }

        return true;
    } catch (error) {
        throw error;
    }
}

/** Soft-deletes when the current user owns the permission row. */
async function remove(id: string, transaction?: Transaction): Promise<boolean> {
    const user = getCurrentUser();
    try {
        const permission = await getOne(id);
        if (permission.owner !== user.id) {
            throw Errors.forbidden(translate("Permission delete not allowed"));
        }

        const [affectedCount] = await PermissionEntity.update(
            { deleted: new Date(), deletedBy: user.id },
            {
                where: sanitizeWhere({ id }),
                transaction,
            }
        );

        return affectedCount > 0;
    } catch (error) {
        throw error;
    }
}

export const PermissionsLoader = {
    create,
    update,
    remove,
};
