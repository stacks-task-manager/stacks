// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AttachmentEntity, DocumentEntity, PermissionEntity, sequelize } from "@stacks/db";
import { Errors } from "../errors";
import { FILES_TYPE, POLLINGACTIONS, POLLINGTYPE, RECORDTYPE, TreeNode } from "@stacks/types";
import { Op, Transaction } from "sequelize";
import { type IDocumentCreate } from "../types";
import { getCurrentUser } from "./context";
import { FilesLoader } from "./files";
import { NotepadsLoader } from "./notepads";
import { PermissionsLoader } from "./permissions";
import { ProjectsLoader } from "./projects";
import { createOne, deleteOne, findAll, findOne, sanitizeWhere, updateOne, withTransaction } from "./utils";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { translate } from "@stacks/translations";

DocumentEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(DocumentEntity, { foreignKey: "id", constraints: false });

// Attachment relationships
if (!DocumentEntity.associations.attachments) {
    DocumentEntity.hasMany(AttachmentEntity, {
        foreignKey: "recordId",
        as: "attachments",
        constraints: false,
    });
}

function sanitizeDocument(document: any): TreeNode {
    return {
        ...document,
        droppable: document.type === RECORDTYPE.FOLDER,
        parent: document.parent || "00000000-0000-0000-0000-000000000000",
    } as any;
}

function sanitizeDocuments(documents: any[]): TreeNode[] {
    return documents.map(document => sanitizeDocument(document));
}

/**
 * Create a new document.
 * @param data The document data to create.
 * @returns The created document.
 */
async function create(data: IDocumentCreate, extTransaction?: Transaction) {
    const user = getCurrentUser();
    return withTransaction(extTransaction, async transaction => {
        // fetch the document with the largest order value
        const maxOrderDoc: TreeNode | null = (await DocumentEntity.findOne({
            where: {
                tenant: user.tenant,
                parent: data.parent ?? "00000000-0000-0000-0000-000000000000",
            },
            order: [["order", "DESC"]],
            raw: true,
            transaction,
        })) as TreeNode | null;

        const order = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

        // create the document
        const newDocument = await createOne<TreeNode>({
            entity: DocumentEntity,
            data: {
                title: data.title,
                type: data.type,
                order,
                parent: data.parent ?? "00000000-0000-0000-0000-000000000000",
            },
            transaction,
        });

        let permissionType = POLLINGTYPE.DOCUMENT;

        // If the document is a Project, create the associated project data
        if (data.type === RECORDTYPE.PROJECT) {
            await ProjectsLoader.create({ id: newDocument.id, ...data.data }, transaction);
            permissionType = POLLINGTYPE.PROJECT;
        }
        // If the document is a Notepad, create the associated notepad data
        else if (data.type === RECORDTYPE.NOTEPAD) {
            await NotepadsLoader.create({ id: newDocument.id }, transaction);
            permissionType = POLLINGTYPE.NOTEPAD;
        }

        // create the permissions for the document
        const permissions = await PermissionsLoader.create(
            newDocument.id,
            {
                ...data.permissions,
                type: permissionType,
            },
            transaction
        );

        const document = sanitizeDocument(newDocument);
        document.permissions = permissions;

        sendRealtimeUpdate({
            type: POLLINGTYPE.DOCUMENTS,
            record: document.id,
            action: POLLINGACTIONS.CREATE,
            permissions: document.permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return document;
    });
}

/**
 * Retrieve a document by its ID.
 * @param id The ID of the document to retrieve.
 * @returns The requested document.
 */
async function getOne(id: string, transaction?: Transaction) {
    try {
        const document = await findOne({
            entity: DocumentEntity,
            id,
            transaction,
        });

        if (!document) {
            throw Errors.notFound(translate("Document not found"));
        }

        return sanitizeDocument(document);
    } catch (error) {
        throw error;
    }
}

/**
 * Retrieve all documents accessible to the user.
 * @returns An array of all accessible documents.
 */
async function getAll(): Promise<TreeNode[]> {
    const documents = await findAll({
        entity: DocumentEntity,
        order: [["order", "ASC"]],
    });
    return sanitizeDocuments(documents);
}

/**
 * Remove a document by its ID.
 * @param id The ID of the document to remove.
 * @returns A boolean indicating whether the removal was successful.
 */
async function remove(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        await getOne(id, transaction);
        const deletedDocument = await removeRecursive(id, transaction);

        if (deletedDocument) {
            await sendRealtimeUpdate({
                type: POLLINGTYPE.DOCUMENTS,
                record: id,
                action: POLLINGACTIONS.DELETED,
                permissions: deletedDocument.permissions,
            });
        }

        invalidateApiCacheForCurrentRequest();
        return deletedDocument;
    });
}

/**
 * Recursively remove a document and its children.
 * @param id The ID of the document to remove.
 * @returns A boolean indicating whether the removal was successful.
 */
async function removeRecursive(id: string, extTransaction?: Transaction): Promise<TreeNode | null> {
    return withTransaction(extTransaction, async transaction => {
        const document = await getOne(id, transaction);

        if (document.type === RECORDTYPE.FOLDER) {
            const children = await getChildren(id, transaction);
            for (const child of children) {
                await removeRecursive(child.id, transaction);
            }
        } else if (document.type === RECORDTYPE.PROJECT) {
            await ProjectsLoader.remove(id, transaction);
        } else if (document.type === RECORDTYPE.NOTEPAD) {
            await NotepadsLoader.remove(id, transaction);
        } else if (document.type === RECORDTYPE.FILE) {
            await FilesLoader.deleteByRecord(id, FILES_TYPE.FILE, transaction);
        }

        // lastly, delete the document entry
        const deleted = await deleteOne<TreeNode>({
            entity: DocumentEntity,
            id,
            transaction,
        });

        return deleted;
    });
}

/**
 * Retrieve all children of a document.
 * @param parent The ID of the parent document.
 * @param transaction The database transaction.
 * @returns An array of child documents.
 */
async function getChildren(parent: string, transaction?: Transaction): Promise<TreeNode[]> {
    return await findAll<TreeNode>({
        entity: DocumentEntity,
        transaction,
        filter: {
            parent,
        },
    });
}

/**
 * Update a document by its ID.
 * @param id The ID of the document to update.
 * @param data The new data for the document.
 * @returns The updated document.
 */
async function update(id: string, data: any, extTransaction?: Transaction): Promise<TreeNode> {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const document = await getOne(id, transaction);
        const oldParent = document.parent;
        const oldPosition = document.order;
        const newParent = data.parent ?? oldParent;
        let newPosition = data.order ?? oldPosition;

        // Clamp destination index to valid sibling range
        if (data.order != null) {
            const destCount = await DocumentEntity.count({
                where: sanitizeWhere({ parent: newParent }),
                transaction,
            });
            if (oldParent === newParent) {
                newPosition = Math.max(0, Math.min(newPosition, Math.max(destCount - 1, 0)));
            } else {
                newPosition = Math.max(0, Math.min(newPosition, destCount));
            }
            data.order = newPosition;
        }

        await getOne(id, transaction);

        const updatedDocument = await updateOne({
            entity: DocumentEntity,
            id,
            data,
            transaction,
        });

        if (data.order != null) {
            if (oldParent === newParent) {
                // Same parent reorder: adjust only siblings in the same parent
                if (oldPosition < newPosition) {
                    // Move forward: shift siblings (oldPosition, newPosition] up by 1
                    await DocumentEntity.update(
                        {
                            order: sequelize.literal(`"order" - 1`),
                        },
                        {
                            where: sanitizeWhere({
                                parent: oldParent,
                                id: { [Op.ne]: id },
                                order: { [Op.gt]: oldPosition, [Op.lte]: newPosition },
                            }),
                            transaction,
                            returning: false,
                        }
                    );
                } else if (oldPosition > newPosition) {
                    // Move backward: shift siblings [newPosition, oldPosition) down by 1
                    await DocumentEntity.update(
                        {
                            order: sequelize.literal(`"order" + 1`),
                        },
                        {
                            where: sanitizeWhere({
                                parent: oldParent,
                                id: { [Op.ne]: id },
                                order: { [Op.gte]: newPosition, [Op.lt]: oldPosition },
                            }),
                            transaction,
                            returning: false,
                        }
                    );
                }
            } else {
                // Cross-parent move
                // 1) Open slot in destination parent: shift siblings at/after newPosition up by 1
                await DocumentEntity.update(
                    {
                        order: sequelize.literal(`"order" + 1`),
                    },
                    {
                        where: sanitizeWhere({
                            parent: newParent,
                            id: { [Op.ne]: id },
                            order: { [Op.gte]: newPosition },
                        }),
                        transaction,
                        returning: false,
                    }
                );

                // 2) Close gap in source parent: shift siblings above oldPosition down by 1
                await DocumentEntity.update(
                    {
                        order: sequelize.literal(`"order" - 1`),
                    },
                    {
                        where: sanitizeWhere({
                            parent: oldParent,
                            id: { [Op.ne]: id },
                            order: { [Op.gt]: oldPosition },
                        }),
                        transaction,
                        returning: false,
                    }
                );
            }
        }

        await sendRealtimeUpdate({
            type: POLLINGTYPE.DOCUMENTS,
            record: id,
            action: POLLINGACTIONS.UPDATE,
            permissions: document.permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return sanitizeDocument(updatedDocument);
    });
}

export const DocumentsLoader = {
    create,
    getOne,
    getAll,
    remove,
    update,
};
