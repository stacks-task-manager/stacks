// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Recent items ring buffer.
 */
import { entity } from "app/hooks/store";

import { IRecentItem } from "@stacks/types";

export interface IRecentsStore {
    items: IRecentItem[];
}

export const RecentsStore = entity<IRecentsStore>({
    items: [],
});
