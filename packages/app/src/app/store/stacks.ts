// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Per-project stack columns and order.
 */
import { entity } from "app/hooks/store";
import { IStack } from "@stacks/types";

export interface IStacksStore {
    stacks: IStack[];
}

export const StacksStore = entity<IStacksStore>({
    stacks: [],
});
