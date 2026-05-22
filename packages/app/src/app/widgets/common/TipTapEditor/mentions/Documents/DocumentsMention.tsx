// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import {
    Editor,
    mergeAttributes,
    NodeViewProps,
    NodeViewWrapper,
    ReactNodeViewRenderer,
    ReactRenderer,
} from "@tiptap/react";
import { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import tippy, { GetReferenceClientRect, Instance as TippyInstance } from "tippy.js";

import { SearchAPI } from "app/api";
import { ISearchResult } from "@stacks/types";
import { Document, DocumentProps } from "./Document";
import { MentionList } from "./DocumentMentionsList";

const DocumentWrapper = (props: NodeViewProps) => {
    return (
        <NodeViewWrapper as="span">
            <Document {...(props.node.attrs as DocumentProps)} />
        </NodeViewWrapper>
    );
};

let debounce: NodeJS.Timeout | null = null;
const suggestion: Partial<SuggestionOptions<ISearchResult>> = {
    char: "#",
    pluginKey: new PluginKey("stacks-documents"),
    allowSpaces: true,
    items: async ({ query, editor }: { query: string; editor: Editor }) => {
        if (query.length < 2 || !editor.isFocused) return [];

        return new Promise(resolve => {
            if (debounce) {
                clearTimeout(debounce);
                debounce = null;
            }

            debounce = setTimeout(async () => {
                const results: ISearchResult[] = await SearchAPI.search(query);

                resolve(
                    results.filter(item => {
                        return ["task", "notepad", "project"].includes(item.type);
                    })
                );
            }, 500);
        });
    },
    render: () => {
        let reactRenderer: ReactRenderer;
        let popup: TippyInstance[];

        return {
            onStart: (props: SuggestionProps) => {
                if (!props.clientRect) return;

                reactRenderer = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                popup = tippy("body", {
                    getReferenceClientRect: props.clientRect as null | GetReferenceClientRect,
                    appendTo: () => document.body,
                    content: reactRenderer.element,
                    showOnCreate: false,
                    interactive: true,
                    trigger: "manual",
                    placement: "bottom-start",
                });
            },

            onUpdate(props: SuggestionProps) {
                reactRenderer?.updateProps(props);

                if (!props.clientRect) return;

                if (popup && popup[0]) {
                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect as null | GetReferenceClientRect,
                    });

                    if (props.query.length > 1) {
                        popup[0].show();
                    } else {
                        popup[0].hide();
                    }
                }
            },

            onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === "Escape") {
                    popup[0].hide();
                    reactRenderer?.destroy();
                    return true;
                }

                return (reactRenderer?.ref as any)?.onKeyDown(props);
            },

            onExit() {
                if (popup && popup[0]) {
                    popup[0].destroy();
                }
                if (reactRenderer) {
                    reactRenderer.destroy();
                }
            },
        };
    },
};

export const DocumentsMention = Mention.extend({
    name: "document",
    group: "inline",
    inline: true,
    selectable: false,
    atom: true,
    priority: 1000,
    addAttributes() {
        return {
            id: {
                default: 0,
                isRequired: true,
            },
            type: {
                isRequired: true,
            },
            label: {
                default: "",
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: "document",
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ["document", mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
        return ReactNodeViewRenderer(DocumentWrapper);
    },
}).configure({
    suggestion,
});
