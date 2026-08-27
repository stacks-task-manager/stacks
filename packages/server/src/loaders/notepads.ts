// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notepad documents with attachments, permissions, and search helpers.
 */
import { AttachmentEntity, DocumentEntity, NotepadEntity, PermissionEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import { INotepad, POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";
import { Op, Transaction } from "sequelize";
import { Errors } from "../errors";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { afterTransactionCommit, deleteOne, findAll, findOne, updateOne, withTransaction } from "./utils";
import { assertDocumentHierarchyVisible, getHierarchyVisibleDocumentIds } from "../utils/documentPermissions";

NotepadEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(NotepadEntity, { foreignKey: "id", constraints: false });

// Attachment relationships
if (!NotepadEntity.associations.attachments) {
    NotepadEntity.hasMany(AttachmentEntity, {
        foreignKey: "recordId",
        as: "attachments",
        constraints: false,
    });
}
if (!NotepadEntity.associations.document) {
    NotepadEntity.belongsTo(DocumentEntity, { foreignKey: "id", as: "document", constraints: false });
}

/**
 * Create a new notepad.
 * @param data The notepad data to create.
 * @param user The user creating the notepad.
 * @param transaction Optional transaction for database operations.
 * @returns The created notepad.
 */
async function create(data: any, extTransaction?: Transaction) {
    const user = getCurrentUser();
    return withTransaction(extTransaction, async transaction => {
        const newNotepad = await NotepadEntity.create(
            { ...data, tenant: user.tenant, createdBy: user.id, updatedBy: user.id },
            { transaction }
        );
        return newNotepad.toJSON();
    });
}

/**
 * Retrieve a notepad by its ID.
 * @param id The ID of the notepad to retrieve.
 * @param user The user requesting the notepad.
 * @returns The requested notepad.
 */
async function getOne(id: string, transaction?: Transaction) {
    const notepad = await findOne({
        entity: NotepadEntity,
        id,
        include: [
            {
                model: DocumentEntity,
                attributes: ["title", "id"],
                required: false,
                as: "document",
            },
        ],
        transaction,
    });

    if (!notepad) {
        throw Errors.notFound(translate("Notepad not found"));
    }

    await assertDocumentHierarchyVisible(id, transaction);

    return notepad;
}

async function getAll(filters: { query?: string }) {
    const filter: any = {};
    filter.id = { [Op.in]: await getHierarchyVisibleDocumentIds() };
    if (filters.query && filters.query.length) {
        filter[Op.and] = {
            content: {
                [Op.iLike]: `%${filters.query}%`,
            },
        };
    }

    const notepads: INotepad[] = await findAll({
        entity: NotepadEntity,
        filter,
        include: [
            {
                model: DocumentEntity,
                attributes: ["title", "id"],
                required: false,
                as: "document",
            },
        ],
    });

    return notepads;
}

async function update(id: string, data: any, transaction?: Transaction): Promise<INotepad> {
    try {
        const notepad = await getOne(id);

        const updatedNotepad = await updateOne<INotepad>({
            entity: NotepadEntity,
            id,
            data,
            transaction,
        });

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.NOTEPAD,
                record: id,
                action: POLLINGACTIONS.UPDATE,
                permissions: notepad.permissions,
            });
        });

        invalidateApiCacheForCurrentRequest();
        return updatedNotepad;
    } catch (error) {
        throw error;
    }
}

async function remove(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        return await deleteOne({
            entity: NotepadEntity,
            id,
            transaction,
        });
    });
}

export const NotepadsLoader = {
    create,
    getOne,
    getAll,
    update,
    remove,
};
