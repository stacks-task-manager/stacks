// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tenant roles: CRUD and bulk seed helpers.
 */
import { RoleEntity } from "@stacks/db";
import { Errors } from "../errors";
import { IRole, UUID } from "@stacks/types";
import { getCurrentUser } from "./context";
import { createOne, sanitizeWhere, withTransaction } from "./utils";
import { Transaction } from "sequelize";

/** All roles in the tenant ordered by title. */
async function getAll() {
    const roles = await RoleEntity.findAll({
        where: sanitizeWhere(),
        order: [["title", "ASC"]],
    });

    return roles.map(role => role.toJSON());
}

/** Inserts one role via {@link createOne} inside a transaction boundary. */
async function create(role: IRole, extTransaction?: Transaction): Promise<IRole> {
    return withTransaction(extTransaction, async transaction => {
        return await createOne<IRole>({
            entity: RoleEntity,
            data: role,
            transaction,
        });
    });
}

/** Admin-only patch of title, description, or access JSON. */
async function update(id: UUID, data: Pick<IRole, "access" | "title" | "description">) {
    const user = getCurrentUser();

    if (!user.admin) {
        throw Errors.forbidden("User not authorized");
    }

    try {
        const [affectedCount] = await RoleEntity.update(
            { ...data, updatedBy: user.id },
            {
                where: {
                    id,
                    tenant: user.tenant,
                },
            }
        );
        return affectedCount > 0;
    } catch (error) {
        throw error;
    }
}

/** Seeds multiple roles with tenant and audit columns. */
async function bulkCreate(roles: IRole[]) {
    const user = getCurrentUser();
    try {
        const newRoles = await RoleEntity.bulkCreate(
            roles.map(role => ({ ...role, tenant: user.tenant, createdBy: user.id, updatedBy: user.id }))
        );
        return newRoles.map(role => role.toJSON());
    } catch (error) {
        throw error;
    }
}

/** Current-tenant role by id or throws not found. */
async function getOne(id: string) {
    const user = getCurrentUser();
    const role = await RoleEntity.findOne({
        where: {
            id,
            tenant: user.tenant,
        },
    });

    if (!role) {
        throw Errors.notFound("Role not found");
    }

    return role.toJSON();
}

/** Cross-tenant lookup (e.g. registration) without `getCurrentUser` scoping. */
async function getById(id: string, tenant: string) {
    const role = await RoleEntity.findOne({
        where: {
            id,
            tenant,
        },
    });

    if (!role) {
        throw Errors.notFound("Role not found");
    }

    return role.toJSON();
}

export const RolesLoader = {
    create,
    update,
    getAll,
    bulkCreate,
    getOne,
    getById,
};
