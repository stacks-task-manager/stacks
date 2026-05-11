// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPermissions } from "./permissions.js";
import { ITag } from "./tags.js";

export interface ISimpleDocument {
    id: string;
    title: string;
}

export type NodeModel<T = unknown> = {
    id: number | string;
    parent: number | string;
    text: string;
    droppable?: boolean;
    data?: T;
};

export interface TreeNode extends NodeModel {
    id: string;
    parent: string;
    title: string;
    tint?: string;
    type: RECORDTYPE;
    hidden: boolean;
    order: number;
    created: Date;
    updated: Date;
    archived: string | null;
    createdBy: string;
    updatedBy: string;
    permissions: IPermissions;
}

export enum RECORDTYPE {
    FOLDER = "folder",
    PROJECT = "project",
    NOTEPAD = "notepad",
    GOAL = "goal",
    KEEP = "keep",
    PEOPLE = "people",
    TIMEBOX = "timebox",
    FILE = "file",
    TASK = "task",
    ARCHIVED = "archived",
    PERSON = "person",
    COMPANY = "company",
    ATTACHMENT = "attachment",
    COMMENT = "comment",
    BOOKMARK = "bookmark",
    URL = "url",
}

export enum PROJECTVIEW {
    DEFAULT = "default",
    BOARD = "board",
    LIST = "list",
    WORLD = "world",
    OVERVIEW = "overview",
    ATTACHMENTS = "attachments",
    LINKS = "links",
    TIME = "time",
    GANTT = "gantt",
    NOTES = "notes",
}

export interface IRecordParams {
    id: string;
}

export interface IRecords {
    documents: TreeNode[];
    tags: ITag[];
    todos: string;
}
