// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Documents hooks and selectors.
 */
import { RecordsStore } from "app/store/records";
import { shallowEqual } from "./store";

export const useDocuments = () => {
    return RecordsStore.use(
        state => ({
            isLoading: state.isLoadingRecords,
            documents: state.documents.filter(document => document.archived === null),
        }),
        shallowEqual
    );
};

export const useDocument = (documentId?: string) => {
    return RecordsStore.use(state => {
        if (state.isLoadingRecords) return null;

        return state.documents.find(document => document.id === documentId);
    }, shallowEqual);
};

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

export const useArchivedDocuments = () => {
    return RecordsStore.use(
        state => state.documents.filter(document => document.archived !== null),
        shallowEqual
    );
};
