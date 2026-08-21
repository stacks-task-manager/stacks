// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Documents hooks and selectors.
 */
import { RecordsStore } from "app/store/records";
import { shallowEqual } from "./store";

/**
 * Returns the workspace documents that are not archived, along with the loading state.
 * @returns The current loading state and the list of non-archived documents.
 */
export const useDocuments = () => {
    return RecordsStore.use(
        state => ({
            isLoading: state.isLoadingRecords,
            documents: state.documents.filter(document => document.archived === null),
        }),
        shallowEqual
    );
};

/**
 * Returns the document with the given id, or null while records are still loading.
 * @param {string} [documentId] - The id of the document to look up.
 * @returns The matching document, or null if it cannot be found (or while loading).
 */
export const useDocument = (documentId?: string) => {
    return RecordsStore.use(state => {
        if (state.isLoadingRecords) return null;

        return state.documents.find(document => document.id === documentId);
    }, shallowEqual);
};

/**
 * Synchronously reads the document with the given id from the records store.
 * @param {string} [documentId] - The id of the document to look up.
 * @returns The matching document, or undefined if the id is missing or not found.
 */
export const getDocument = (documentId?: string) => {
    if (!documentId) return undefined;
    return RecordsStore.get().documents.find(document => document.id === documentId);
};

/**
 * Returns all the project documents
 * @returns The project documents
 */
export const useProjectDocuments = () => {
    return RecordsStore.use(
        state => state.documents.filter(document => document.type === "project" && document.archived == null),
        shallowEqual
    );
};

/**
 * Returns all archived documents from the records store.
 * @returns The list of archived documents.
 */
export const useArchivedDocuments = () => {
    return RecordsStore.use(
        state => state.documents.filter(document => document.archived !== null),
        shallowEqual
    );
};
