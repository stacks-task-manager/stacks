// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { RECORDTYPE } from "./record.js";

export interface IBookmark {
    id: string;
    type: RECORDTYPE;
    title: string;
    resourceId: string;
    url?: string;
    pinned: boolean;
}

export interface IBookmarkGoup {
    [type: string]: IBookmark[];
}
