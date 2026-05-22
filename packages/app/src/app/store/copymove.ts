// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Copy vs move modal state.
 */
import { entity } from "app/hooks/store";
import { COPYMOVEACTION, COPYMOVETYPE } from "@stacks/types";

export interface ICopyMoveStore {
    isVisible: boolean;
    title?: string;
    action?: COPYMOVEACTION;
    type?: COPYMOVETYPE;
    tasks: string[];
    project?: string;
    stack?: string;
    after: boolean;
    cover: boolean;
    attachments: boolean;
    timelogs: boolean;
    comments: boolean;
    subtasks: boolean;
    keepSettings: boolean;
}

export const CopyMoveStore = entity<ICopyMoveStore>({
    isVisible: false,
    after: false,
    tasks: [],
    cover: false,
    attachments: false,
    timelogs: false,
    comments: false,
    subtasks: false,
    keepSettings: false,
});
