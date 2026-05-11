// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { RECORDTYPE } from "./record.js";

export interface ISearchResult {
    id: string;
    type: RECORDTYPE;
    title: string;
    subtitle?: string;
    parentId: string;
    parentType: RECORDTYPE;
    parentTitle: string;
    data: object;
    url: string;
    thumbnail?: string;
}
