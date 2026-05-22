// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Document tree and tags for the workspace.
 */
import { entity } from "app/hooks/store";

import { TreeNode, ITag, ITaskTimers } from "@stacks/types";

export interface IRecordsStore {
    documents: TreeNode[];
    tags: ITag[];
    isLoadingRecords: boolean;
    isLoadingArchives: boolean;
    isShowingCopyMove: boolean;
    timers: ITaskTimers;
}

export const RecordsStore = entity<IRecordsStore>({
    documents: [],
    tags: [],
    isLoadingRecords: false,
    isLoadingArchives: false,
    isShowingCopyMove: false,
    timers: {},
});
