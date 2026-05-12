// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactRenderer } from "@tiptap/react";
import { SuggestionProps } from "@tiptap/suggestion";
import tippy, { GetReferenceClientRect, Instance as TippyInstance } from "tippy.js";
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji";

import { MentionList } from "./EmojiMentionsList";

export const suggestion = {
    allowSpaces: false,
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

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect as null | GetReferenceClientRect,
                });
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
                if (popup[0]) {
                    popup[0].destroy();
                }
                reactRenderer.destroy();
            },
        };
    },
};

export const EmojiMention = Emoji.extend({
    priority: 1000,
}).configure({
    emojis: gitHubEmojis,
    enableEmoticons: true,
    suggestion,
});
