// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Quick search query and results.
 */
import { entity } from "app/hooks/store";
import { produce } from "immer";

import { ISearchResult } from "@stacks/types";
import { SearchAPI } from "app/api";

interface ISearchStore {
    query: string;
    results: ISearchResult[];
    isRebuilding: boolean;
    isSearching: boolean;
}

export const SearchStore = entity<ISearchStore>({
    query: "",
    results: [],
    isRebuilding: false,
    isSearching: true,
});

export const setQuery = async (query: string) => {
    SearchStore.set(
        produce((state: ISearchStore) => {
            state.query = query;
            state.isSearching = true;
        })
    );

    if (query.length >= 2) {
        const results: ISearchResult[] = await SearchAPI.search(query);
        SearchStore.set(
            produce((state: ISearchStore) => {
                state.results = results;
                state.isSearching = false;
            })
        );
    }
};

export const clear = (): void => {
    SearchStore.set(
        produce((state: ISearchStore) => {
            state.query = "";
            state.results = [];
            state.isSearching = false;
        })
    );
};
