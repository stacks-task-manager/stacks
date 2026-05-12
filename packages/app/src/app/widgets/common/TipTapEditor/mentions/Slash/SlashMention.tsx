// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from "@tiptap/core";
import Suggestion, { SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import tippy, { GetReferenceClientRect, Instance as TippyInstance } from "tippy.js";

import { MentionList } from "./SlashMentionList";
import Commands from "./commands";

const suggestion = {
    pluginKey: new PluginKey("slash-commands"),
    items: ({ query }: { query: string }) => {
        return Commands.filter(item => {
            if (query.length === 0) return true;
            return item.title.toLowerCase().includes(query.toLowerCase());
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
                    showOnCreate: true,
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
                }
            },

            onKeyDown(props: any) {
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

export const SlashMention = Extension.create({
    name: "commands",
    priority: 1000,
    addOptions() {
        return {
            suggestion: {
                char: "/",
                // @ts-expect-error ***
                command: ({ editor, range, props }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
}).configure({
    priority: 1000,
    suggestion,
});
