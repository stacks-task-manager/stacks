// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Editor } from "@tiptap/react";

export function getSelectionChain(editor: Editor) {
    if (editor.state.selection.empty) {
        return editor.chain().focus().selectParentNode();
    }
    return editor.chain().focus();
}
