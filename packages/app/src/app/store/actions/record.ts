// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Generic record hydration helpers.
 */
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import { produce } from "immer";
import cloneDeep from "lodash/cloneDeep";
import { IPermissions, IRecords, ITag, IUpdate, POLLINGACTIONS, RECORDTYPE, TreeNode } from "@stacks/types";
import { DocumentsAPI, NewDocument, PermissionsAPI, TagsAPI } from "app/api";
import { getDocument, nav } from "app/hooks";
import { IRecordsStore, RecordsStore } from "app/store/records";
import { SidebarStore } from "app/store/sidebar";
import Dialog from "app/utils/dialog";
import Log from "app/utils/log";
import { getStorage, setStorage } from "app/utils/storage";
import { cancelSelection } from "../navigation";
import toast from "app/utils/toast";

const ACTIVE_TIMERS = "active-timers";

const load = async () => {
    Log.info("[Store][Records]", "Loading records");

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = [];
            state.tags = [];
            state.isLoadingRecords = true;
            state.timers = {};
        })
    );

    const { documents, tags }: IRecords = await DocumentsAPI.load();
    const timers = getStorage(ACTIVE_TIMERS, true, {});

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = documents;
            state.tags = tags;
            state.isLoadingRecords = false;
            state.timers = timers;
        })
    );

    cancelSelection();
};

const reload = async (update: IUpdate) => {
    const { documents, tags }: IRecords = await DocumentsAPI.load();

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = documents;
            state.tags = tags;
            state.isLoadingRecords = false;
        })
    );

    if (update.action === POLLINGACTIONS.DELETED && window.location.href.includes(update.record)) {
        nav("/");
    }
};

const loadArchived = async () => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.isLoadingArchives = true;
        })
    );

    const records: IRecords = await DocumentsAPI.load({ archived: true });
    await upsertDocuments(records);
};

const upsertDocuments = async (records: IRecords) => {
    const { documents, tags } = records;

    const newDocumentsIds = documents.map(document => document.id);
    const newTagsIds = tags.map(tag => tag.id);

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = [
                ...state.documents.filter(document => !newDocumentsIds.includes(document.id)),
                ...documents,
            ];

            state.tags = [...state.tags.filter(tag => !newTagsIds.includes(tag.id)), ...tags];

            state.isLoadingArchives = false;
            state.isLoadingRecords = false;
        })
    );
};

const reset = () => {
    RecordsStore.set(
        produce(state => {
            state.documents = [];
            state.tags = [];
        })
    );
};

const hasDocument = (documentId: string | number) => {
    const { documents } = RecordsStore.get();
    return documents.some(document => document.id === documentId);
};

// this is called by the tree component when a document was reallocated
const setDocuments = async (documentId: string, parent: string, destinationIndex: number) => {
    const documents = cloneDeep(RecordsStore.get().documents);
    const movedDocument = documents.find(document => document.id === documentId);
    const sourceIndex = movedDocument?.order ?? -1;
    const sourceParent = movedDocument?.parent;

    // No-op: dropping onto itself
    if (documentId === parent) return;
    // Not found or missing order
    if (!movedDocument || sourceIndex === -1) return;

    const sameParent = sourceParent === parent;
    // No-op: same parent & same index
    if (sameParent && sourceIndex === destinationIndex) return;

    let targetIndex = destinationIndex;

    if (sameParent) {
        // Reorder within the same parent: clamp destination to valid range
        const siblingCount = documents.filter(d => d.parent === sourceParent).length;
        targetIndex = Math.max(0, Math.min(destinationIndex, siblingCount - 1));

        if (sourceIndex < targetIndex) {
            // Move down: shift siblings between (sourceIndex, targetIndex] up by 1
            documents.forEach(d => {
                if (
                    d.parent === sourceParent &&
                    d.id !== documentId &&
                    (d.order ?? 0) > sourceIndex &&
                    (d.order ?? 0) <= targetIndex
                ) {
                    d.order = (d.order ?? 0) - 1;
                }
            });
        } else {
            // Move up: shift siblings between [targetIndex, sourceIndex) down by 1
            documents.forEach(d => {
                if (
                    d.parent === sourceParent &&
                    d.id !== documentId &&
                    (d.order ?? 0) >= targetIndex &&
                    (d.order ?? 0) < sourceIndex
                ) {
                    d.order = (d.order ?? 0) + 1;
                }
            });
        }
        movedDocument.order = targetIndex;
    } else {
        // Move across parents
        // Clamp destination to valid range in destination parent
        const destSiblingCount = documents.filter(d => d.parent === parent).length;
        targetIndex = Math.max(0, Math.min(destinationIndex, destSiblingCount));

        // Close gap in source parent: shift down siblings with order > sourceIndex
        documents.forEach(d => {
            if (d.parent === sourceParent && d.id !== documentId && (d.order ?? 0) > sourceIndex) {
                d.order = (d.order ?? 0) - 1;
            }
        });

        // Open slot in destination parent: shift up siblings with order >= targetIndex
        documents.forEach(d => {
            if (d.parent === parent && (d.order ?? 0) >= targetIndex) {
                d.order = (d.order ?? 0) + 1;
            }
        });

        // Reassign moved document
        movedDocument.parent = parent;
        movedDocument.order = targetIndex;
    }

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = documents.sort((a, b) => a.order - b.order);
        })
    );

    await DocumentsAPI.update(documentId, { order: movedDocument.order, parent });
};

const addDocument = async <T>(documentData: NewDocument<T>) => {
    const document = await DocumentsAPI.add(documentData);

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents.push(document);
        })
    );

    return document;
};

const removeFolder = async (documentId: string) => {
    const deletedRecords: TreeNode[] = getChildren(documentId);
    const deletedRecordsIds: (string | number)[] = [
        documentId,
        ...deletedRecords.map((record: TreeNode) => record.id),
    ];

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.filter(
                (record: TreeNode) => !deletedRecordsIds.includes(record.id)
            );
        })
    );

    await removeById(documentId);
};

const removeById = async (documentId: string) => {
    return await DocumentsAPI.delete(documentId);
};

const removeDocument = async (documentId: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.filter((record: TreeNode) => record.id !== documentId);
        })
    );

    return await removeById(documentId);
};

const removeDocumentAlert = async (documentId: string) => {
    const response = await Dialog.confirm(
        "Delete record",
        translate("Are you sure you want to delete this record This action cannot be undone"),
        Intent.DANGER
    );

    if (response) {
        return await removeDocument(documentId);
    }

    return false;
};

const archiveById = async (documentId: string) => {
    return await DocumentsAPI.archive(documentId);
};

const unarchiveById = async (documentId: string) => {
    return await DocumentsAPI.unarchive(documentId);
};

const archiveDocument = async (documentId: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.map((record: TreeNode) => {
                if (record.id === documentId) {
                    record.archived = new Date().toJSON();
                }
                return record;
            });
        })
    );

    return await archiveById(documentId);
};

const archiveDocumentAlert = async (documentId: string) => {
    const response = await Dialog.confirm(
        "Archive record",
        translate("Are you sure you want to archive this record"),
        Intent.WARNING
    );

    if (response) {
        return await archiveDocument(documentId);
    }

    return false;
};

const unarchiveDocument = async (documentId: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.map((record: TreeNode) => {
                if (record.id === documentId) {
                    record.archived = null;
                }
                return record;
            });
        })
    );

    return await unarchiveById(documentId);
};

const unarchiveDocumentAlert = async (documentId: string) => {
    const response = await Dialog.confirm(
        "Unarchive record",
        translate("Are you sure you want to unarchive this record")
    );

    if (response) {
        return await unarchiveDocument(documentId);
    }

    return false;
};

const setTitle = async (title: string, recordId: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.map(document => {
                if (document.id === recordId) {
                    document.title = title;
                }
                return document;
            });
        })
    );

    return await DocumentsAPI.update(recordId, { title });
};

const getSelected = (): TreeNode | undefined => {
    const { selectedRecord } = SidebarStore.get();
    if (!selectedRecord) return undefined;
    return getDocument(selectedRecord);
};

const getProjects = (): TreeNode[] => {
    return RecordsStore.get().documents.filter(
        document => document.type === "project" && document.archived == null
    );
};

const hasChildren = (documentId: string | number) => {
    const { documents } = RecordsStore.get();
    for (const document of documents) {
        if (document.parent === documentId) return true;
    }

    return false;
};

const getChildren = (folderId: string | number): TreeNode[] => {
    const { documents } = RecordsStore.get();
    const children: TreeNode[] = [];

    for (const document of documents) {
        if (document.parent === folderId) {
            if (document.type === RECORDTYPE.FOLDER) {
                const subChildren = getChildren(document.id);
                for (const subChild of subChildren) {
                    children.push(subChild);
                }
            } else {
                children.push(document);
            }
        }
    }

    return children;
};

const addTag = async (newTag: Partial<ITag>) => {
    const existingTag = RecordsStore.get().tags.find(tag => tag.title === newTag.title);
    if (existingTag) {
        toast.warn("A tag with the same title already exists");
        return;
    }

    const tag = await TagsAPI.add(newTag);
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.tags.push(tag);
        })
    );
};

const updateTag = async (updatedTag: Partial<ITag>) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.tags = state.tags.map((tag: ITag) => {
                if (tag.id === updatedTag.id) return { ...tag, ...updatedTag };
                return tag;
            });
        })
    );
    if (updatedTag.id) {
        await TagsAPI.update(updatedTag.id, updatedTag);
    }
};

const removeTag = async (tagId: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.tags = state.tags.filter((tag: ITag) => tag.id !== tagId);
        })
    );

    await TagsAPI.remove(tagId);
};

const orderTags = async (tags: string[]) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.tags = tags.map((tagId: string) => {
                return state.tags.find((tag: ITag) => tag.id === tagId)!;
            });
        })
    );
    console.log("REORDERING OF TAGS IS MISSING");
};

const getDocumentCount = (type: RECORDTYPE) => {
    return RecordsStore.get().documents.filter(document => document.type === type).length;
};

/**
 * Toggling the public option of the project along side the visible people and roles
 * This is mainly used in combination with a remote workspace
 * @param documentId The ID of the document to update
 * @param permissions IPermissions
 * @returns Promise
 */
const updatePermissions = async (documentId: string, permissions: IPermissions) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.map((record: TreeNode) => {
                if (record.id === documentId) {
                    return { ...record, permissions };
                }
                return record;
            });
        })
    );
    await PermissionsAPI.update(documentId, permissions);
};

/* TIMERS */
const startTimer = (taskId: string) => {
    const now = Math.floor(Date.now() / 1000);

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.timers[taskId] = now;
        })
    );
    setStorage(ACTIVE_TIMERS, RecordsStore.get().timers);

    return now;
};

const removeTimer = async (taskId: string) => {
    const { timers } = RecordsStore.get();
    if (timers[taskId] == null) return;

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            delete state.timers[taskId];
        })
    );

    setStorage(ACTIVE_TIMERS, RecordsStore.get().timers);
};

const setTint = async (documentId: string, tint?: string) => {
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = state.documents.map(document => {
                if (document.id === documentId) {
                    document.tint = tint;
                }
                return document;
            });
        })
    );

    const document = getDocument(documentId);
    if (!document) return;

    DocumentsAPI.update(documentId, { tint });
};

export const RecordActions = {
    load,
    reload,
    loadArchived,
    reset,
    hasDocument,
    setDocuments,
    addDocument,
    removeFolder,
    removeDocument,
    removeDocumentAlert,
    archiveDocument,
    archiveDocumentAlert,
    unarchiveDocument,
    unarchiveDocumentAlert,
    setTitle,
    getSelected,
    getProjects,
    hasChildren,
    getChildren,
    addTag,
    updateTag,
    removeTag,
    orderTags,
    getDocumentCount,
    // permissions
    updatePermissions,
    // timer
    startTimer,
    removeTimer,
    setTint,
};
