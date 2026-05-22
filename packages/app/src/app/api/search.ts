// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Global workspace search.
 */
import { ISearchResult } from "@stacks/types";
import request from "./request";

export const SearchAPI = {
    /** GET search results for a query string. */
    async search(query: string): Promise<ISearchResult[]> {
        return request.get("/api/search", { params: { query } });
    },
};
