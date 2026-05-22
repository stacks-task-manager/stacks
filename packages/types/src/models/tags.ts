// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum TAGSECTION {
    PROJECTS = "projects",
    PEOPLE = "people",
    TIMEBOX = "timebox",
}

export enum TAGTYPE {
    TAG = "tag",
    STATUS = "status"
}

export interface ITag {
    id: string;
    title: string;
    color: string;
    section: TAGSECTION;
    type: TAGTYPE;
    parent: string | null;
}