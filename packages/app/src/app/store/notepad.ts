// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Active notepad editor document.
 */
import { entity } from "app/hooks/store";
import { INotepad } from "@stacks/types";
export interface INotepadStore {
    isLoading: boolean;
    notepad?: INotepad;
    editingBy?: string;
}

export const NotepadStore = entity<INotepadStore>({
    isLoading: false,
});
