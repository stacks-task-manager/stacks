// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PermissionEntity, sequelize } from "@stacks/db";
import { literal, Op, Transaction } from "sequelize";
import { Errors } from "../errors";
import { defaultPermissions } from "./permissions";
import { getCurrentUser } from "./context";
import { pgStringLiteral } from "./sqlLiteral";
import { IPermissions, POLLINGTYPE } from "@stacks/types";
import { translate } from "@stacks/translations";

export const sanitizeUpdate = <T = any>(newData: Partial<T>) => {
    const { tenant, createdBy, updatedBy, deletedBy, deleted, ...data } = newData as any;
    const sanitizedData: any = { ...data };
    return sanitizedData;
};

export const sanitizeWhere = (whereData?: object) => {
    const user = getCurrentUser();
    const where: any = {
        ...(whereData ?? {}),
        tenant: user.tenant,
        deleted: null,
    };
    return where;
};

/**
 * Sanitize the WHERE clause for permissions.
 * @param whereData The original WHERE clause data.
 * @param prefix Whether to prefix the fields with the PermissionEntity table name.
 * @returns The sanitized WHERE clause.
 */
export const sanitizeWherePermissions = (whereData?: object, prefix?: boolean) => {
    const user = getCurrentUser();
    const whereCondition: any = sanitizeWhere(whereData);

    const prefixWithDot = prefix ? `"PermissionEntity".` : "";

    if (!user.admin) {
        whereCondition[Op.or] = [
            literal(`${prefixWithDot}"isPublic" = true`),
            literal(`${prefixWithDot}"owner" = ${pgStringLiteral(user.id)}`),
            literal(`${prefixWithDot}"visibleRoles" ? ${pgStringLiteral(user.role)}`),
            literal(`${prefixWithDot}"visibleUsers" ? ${pgStringLiteral(user.id)}`),
            literal(`"PermissionEntity"."id" IS NULL`),
        ];
    }

    return whereCondition;
};

/**
 * Generating a where condition where a resource can be deleted if it's public or the owner
 * @param whereData The original WHERE clause data.
 * @param prefix Whether to prefix the fields with the PermissionEntity table name.
 * @returns The sanitized WHERE clause.
 */
export const sanitizeWhereDelete = (whereData?: object, prefix?: boolean) => {
    const user = getCurrentUser();
    const whereCondition: any = sanitizeWhere(whereData);

    const prefixWithDot = prefix ? `"PermissionEntity".` : "";

    if (!user.admin) {
        whereCondition[Op.or] = [
            literal(`${prefixWithDot}"isPublic" = true`),
            literal(`${prefixWithDot}"owner" = ${pgStringLiteral(user.id)}`),
        ];
    }

    return whereCondition;
};

/** Map joined `PermissionEntity` onto `permissions` for a single raw row (mutates `item`). */
export const attachPermissionsToRow = (item: any) => {
    const permissions = item.PermissionEntity.id !== null ? item.PermissionEntity : { ...defaultPermissions };
    delete item.PermissionEntity;
    item.permissions = {
        isPublic: permissions.isPublic,
        visibleUsers: permissions.visibleUsers,
        visibleRoles: permissions.visibleRoles,
        owner: permissions.owner,
    };
};

export const createOne = async <T>({
    entity,
    data,
    transaction,
}: {
    entity: any;
    data: object;
    transaction?: Transaction;
}): Promise<T> => {
    const user = getCurrentUser();
    const newItem = await entity.create(
        { ...data, tenant: user.tenant, createdBy: user.id, updatedBy: user.id },
        { transaction }
    );
    return newItem.toJSON() as T;
};

/**
 * Find a single item for a user by considering permissions.
 * @param entity The entity to find.
 * @param id The id of the item to find.
 * @param user The user making the request.
 * @param transaction The transaction to use.
 * @returns The item if found, null otherwise.
 */
export const findOne = async ({
    entity,
    id,
    include,
    attributes,
    group,
    transaction,
}: {
    entity: any;
    id: string;
    include?: any[];
    group?: string[];
    attributes?: object;
    transaction?: Transaction;
}) => {
    const where = sanitizeWherePermissions({ id }, true);
    const item = await entity.findOne({
        where,
        include: [
            {
                model: PermissionEntity,
                required: false,
            },
            ...(include || []),
        ],
        attributes,
        group,
        transaction,
        raw: true,
        nest: true,
    });

    if (!item) {
        return null;
    }

    attachPermissionsToRow(item);
    return item;
};

/**
 * Find all items for a user by considering permissions.
 * @param entity The entity to find.
 * @param filter The filter to apply.
 * @param order The order to apply.
 * @param transaction The transaction to use.
 * @returns The items if found, null otherwise.
 */
export const findAll = async <T>({
    entity,
    filter,
    order,
    include,
    group,
    attributes,
    transaction,
}: {
    entity: any;
    filter?: object;
    order?: object;
    include?: any[];
    group?: string[];
    attributes?: object;
    transaction?: Transaction;
}): Promise<T[]> => {
    const items = await entity.findAll({
        where: sanitizeWherePermissions(filter),
        order,
        include: [
            {
                model: PermissionEntity,
                required: false,
            },
            ...(include || []),
        ],
        attributes,
        group,
        transaction,
        raw: true,
        nest: true,
    });

    if (!items) {
        return [];
    }

    return items.map((item: any) => {
        attachPermissionsToRow(item);
        return item;
    });
};

/**
 * Update a single item for a user by considering permissions.
 * @param entity The entity to update.
 * @param id The id of the item to update.
 * @param data The data to update.
 * @param transaction The transaction to use.
 * @returns The updated item if found, null otherwise.
 */
export const updateOne = async <T>({
    entity,
    id,
    data,
    transaction,
}: {
    entity: any;
    id: string;
    data: any;
    transaction?: Transaction;
}): Promise<T> => {
    const record = await findOne({ entity, id, transaction });

    if (!record) {
        throw Errors.notFound(translate("Record not found"));
    }

    const user = getCurrentUser();

    // Then update the found record
    const [, updatedRecords] = await entity.update(data, {
        where: {
            id: record.id,
            tenant: user.tenant,
            deleted: null,
        },
        transaction,
        returning: true,
        raw: true,
        nest: true,
    });

    if (!updatedRecords[0]) {
        throw Errors.internal(translate("Could not update record"));
    }

    return updatedRecords[0];
};

/**
 * Update all items for a user by considering permissions.
 * @param entity The entity to update.
 * @param data The data to update.
 * @param filter The filter to apply.
 * @param transaction The transaction to use.
 * @returns The updated items if found, an empty array otherwise.
 */
export const updateAll = async <T>({
    entity,
    data,
    filter,
    transaction,
}: {
    entity: any;
    data: any;
    filter?: object;
    transaction?: Transaction;
}): Promise<T[]> => {
    const items = await findAll({ entity, filter, transaction });
    if (items === null || items.length === 0) {
        return [];
    }

    const user = getCurrentUser();

    // Extract IDs from the items returned by findAll
    const itemIds = items.map((item: any) => item.id);

    const [, updatedRecords] = await entity.update(data, {
        where: {
            id: itemIds,
            tenant: user.tenant,
            deleted: null,
        },
        transaction,
        returning: true,
        raw: true,
    });

    return updatedRecords;
};

/**
 * Delete a single item for a user by considering permissions.
 * @param entity The entity to delete.
 * @param id The id of the item to delete.
 * @param transaction The transaction to use.
 * @returns The deleted item if found, an empty array otherwise.
 */
export const deleteOne = async <T>({
    entity,
    id,
    transaction,
}: {
    entity: any;
    id: string;
    transaction?: Transaction;
}): Promise<T> => {
    const user = getCurrentUser();
    return await updateOne<T>({
        entity,
        id,
        data: { deleted: new Date(), deletedBy: user.id },
        transaction,
    });
};

/**
 * Delete all items for a user by considering permissions.
 * @param entity The entity to delete.
 * @param filter The filter to apply.
 * @param transaction The transaction to use.
 * @returns True if the items were deleted, false otherwise.
 */
export const deleteAll = async <T>({
    entity,
    filter,
    transaction,
}: {
    entity: any;
    filter?: object;
    transaction?: Transaction;
}): Promise<T[]> => {
    const user = getCurrentUser();
    return updateAll({
        entity,
        data: { deleted: new Date(), deletedBy: user.id },
        filter,
        transaction,
    });
};

/**
 * Helper function to manage transaction lifecycle
 * @param extTransaction The external transaction to use.
 * @param operation The operation to perform.
 * @returns The result of the operation.
 */
export async function withTransaction<T>(
    extTransaction: Transaction | undefined,
    operation: (transaction: Transaction) => Promise<T>
): Promise<T> {
    if (extTransaction) {
        // Use existing transaction, don't manage lifecycle
        return operation(extTransaction);
    }

    // Create and manage new transaction
    const transaction = await sequelize.transaction();
    try {
        const result = await operation(transaction);
        await transaction.commit(); // ✅ Automatic commit
        return result;
    } catch (error) {
        await transaction.rollback(); // ✅ Automatic rollback
        throw error;
    }
}

/**
 * Merge two permissions objects, considering visibility rules.
 * @param permissionA The first permission object.
 * @param permissionB The second permission object.
 * @returns The merged permission object.
 */
export function mergePermissions(permissionA?: IPermissions, permissionB?: IPermissions): IPermissions {
    const user = getCurrentUser();
    const type = permissionA?.type ?? permissionB?.type ?? POLLINGTYPE.TASK;
    const basePermission: IPermissions = {
        ...defaultPermissions,
        id: "",
        owner: user.id,
        type,
    };

    if (!permissionA && !permissionB) {
        return basePermission;
    }

    if (!permissionA && permissionB) {
        return permissionB || basePermission;
    }

    if (!permissionB && permissionA) {
        return permissionA || basePermission;
    }

    const a = permissionA!;
    const b = permissionB!;

    const isPublic = Boolean(a.isPublic) && Boolean(b.isPublic);

    const visibleUsers =
        a.isPublic && b.isPublic
            ? []
            : a.isPublic
            ? b.visibleUsers ?? []
            : b.isPublic
            ? a.visibleUsers ?? []
            : (a.visibleUsers ?? []).filter(userId => (b.visibleUsers ?? []).includes(userId));

    const visibleRoles =
        a.isPublic && b.isPublic
            ? []
            : a.isPublic
            ? b.visibleRoles ?? []
            : b.isPublic
            ? a.visibleRoles ?? []
            : (a.visibleRoles ?? []).filter(roleId => (b.visibleRoles ?? []).includes(roleId));

    return {
        id: a.id,
        owner: a.owner,
        type,
        isPublic,
        visibleUsers: Array.from(new Set(visibleUsers)),
        visibleRoles: Array.from(new Set(visibleRoles)),
    };
}
