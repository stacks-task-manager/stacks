// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { BookmarkEntity, PermissionEntity } from "@stacks/db";
import { Errors } from "../errors";
import { POLLINGACTIONS, POLLINGTYPE, type IBookmark } from "@stacks/types";
import type { Transaction } from "sequelize";
import { getCurrentUser } from "./context";
import { createOne, deleteOne, findAll, findOne, sanitizeWherePermissions, withTransaction } from "./utils";
import { PermissionsLoader } from "./permissions";
import { sendRealtimeUpdateToUser } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";

BookmarkEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(BookmarkEntity, { foreignKey: "id", constraints: false });

/**
 * Create a new bookmark.
 * @param data The data to create.
 * @param user The user making the request.
 * @param extTransaction The transaction to use.
 * @returns The new bookmark.
 */
async function create(data: any, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const newBookmark = await createOne<IBookmark>({
            entity: BookmarkEntity,
            data,
        });
        const user = getCurrentUser();

        const permissions = await PermissionsLoader.create(
            newBookmark.id,
            {
                isPublic: false,
                visibleUsers: [],
                visibleRoles: [],
                type: POLLINGTYPE.BOOKMARKS,
            },
            transaction
        );

        sendRealtimeUpdateToUser(user.id, {
            type: POLLINGTYPE.BOOKMARKS,
            record: newBookmark.id,
            action: POLLINGACTIONS.CREATE,
            permissions: permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return newBookmark;
    });
}

/**
 * Get all bookmarks.
 * @returns The bookmarks.
 */
async function getAll(extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        return await findAll({
            entity: BookmarkEntity,
            transaction: transaction,
        });
    });
}

/**
 * Get a bookmark by id.
 * @param id The id of the bookmark to get.
 * @returns The bookmark.
 */
async function getOne(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const bookmark = await findOne({
            entity: BookmarkEntity,
            id,
            transaction,
        });

        if (!bookmark) {
            throw Errors.notFound("Bookmark not found");
        }

        return bookmark;
    });
}

/**
 * Update a bookmark.
 * @param id The id of the bookmark to update.
 * @param data The data to update.
 * @returns True if the bookmark was updated, false otherwise.
 */
async function update(id: string, data: Partial<IBookmark>) {
    const user = getCurrentUser();
    try {
        const bookmark = await getOne(id);

        const [affectedCount] = await BookmarkEntity.update(data, {
            where: sanitizeWherePermissions({ id }),
        });

        if (affectedCount === 0) {
            return false;
        }

        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Remove a bookmark.
 * @param id The id of the bookmark to remove.
 * @param user The user making the request.
 * @param extTransaction The transaction to use.
 * @returns True if the bookmark was removed, false otherwise.
 */
async function remove(id: string, extTransaction?: Transaction): Promise<IBookmark> {
    return withTransaction(extTransaction, async transaction => {
        const deletedBookmark = await deleteOne<IBookmark>({
            entity: BookmarkEntity,
            id,
            transaction,
        });

        const user = getCurrentUser();

        // sendRealtimeUpdateToUser(user.id, {
        //     type: POLLINGTYPE.BOOKMARKS,
        //     record: deletedBookmark.id,
        //     action: POLLINGACTIONS.DELETED,
        // });

        invalidateApiCacheForCurrentRequest();
        return deletedBookmark;
    });
}

export const BookmarksLoader = {
    create,
    remove,
    getAll,
};
