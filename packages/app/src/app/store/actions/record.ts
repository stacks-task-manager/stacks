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
import { updateById } from "../actionHelpers";
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
/**
 * Children of one parent in the order the sidebar renders them: by `order`, then by sequence.
 * Archived children are included - they are hidden in the tree but keep their `order`.
 */
const siblingsOf = (documents: TreeNode[], parent: string) =>
    documents
        .filter(document => String(document.parent) === String(parent))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const setDocuments = async (documentId: string, parent: string, destinationIndex: number) => {
    const documents = cloneDeep(RecordsStore.get().documents);
    const movedDocument = documents.find(document => document.id === documentId);

    // No-op: dropping onto itself
    if (!movedDocument || documentId === parent) return;

    const sourceParent = movedDocument.parent;
    const current = siblingsOf(documents, parent);
    // The tree draws the visible children and keeps the dragged row in that list, so its slot counts
    // that row. Translate it into the sibling sequence without it: a slot below the dragged row shifts
    // up by one, which is exactly the downward move that would otherwise land one row too low.
    const rendered = current.filter(document => document.archived === null);
    const sourceSlot = rendered.findIndex(document => document.id === documentId);
    const destination = current.filter(document => document.id !== documentId);
    const visible = destination.filter(document => document.archived === null);

    const renderedSlot = Math.max(
        0,
        Math.min(destinationIndex, visible.length + (sourceSlot === -1 ? 0 : 1))
    );
    const slot = Math.max(
        0,
        Math.min(
            sourceSlot !== -1 && sourceSlot < renderedSlot ? renderedSlot - 1 : renderedSlot,
            visible.length
        )
    );

    // No-op: the row already occupies that slot
    if (sourceParent === parent && sourceSlot === slot) return;

    // Resolve the slot in the full sibling sequence so a hidden child can never shift the row past
    // where it was dropped.
    const insertAt = slot < visible.length ? destination.indexOf(visible[slot]) : destination.length;

    destination.splice(insertAt, 0, movedDocument);
    movedDocument.parent = parent;

    // `order` is a dense 0..n-1 sequence per parent: the tree renders it and the API persists it.
    destination.forEach((document, index) => {
        document.order = index;
    });
    if (sourceParent !== parent) {
        siblingsOf(documents, sourceParent).forEach((document, index) => {
            document.order = index;
        });
    }

    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = documents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
            state.documents = updateById(state.documents, documentId, { archived: new Date().toJSON() });
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
            state.documents = updateById(state.documents, documentId, { archived: null });
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
            state.documents = updateById(state.documents, recordId, { title });
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
    await PermissionsAPI.update(documentId, permissions);
    RecordsStore.set(
        produce((state: IRecordsStore) => {
            state.documents = updateById(state.documents, documentId, { permissions });
        })
    );
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
            state.documents = updateById(state.documents, documentId, { tint });
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
