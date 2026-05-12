// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, mergeAttributes, NodeViewProps } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import tippy, { GetReferenceClientRect, Instance as TippyInstance } from "tippy.js";

import { IPerson } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { MentionList } from "./PeopleMentionList";
import { Person } from "./Person";

const PersonWrapper = (props: NodeViewProps) => {
    return (
        <NodeViewWrapper className="person" as="span">
            <Person {...props.node.attrs} />
        </NodeViewWrapper>
    );
};

const suggestion: Partial<SuggestionOptions<IPerson>> = {
    char: "@",
    pluginKey: new PluginKey("stacks-people"),
    items: ({ query, editor }: { query: string; editor: Editor }) => {
        if (query.length < 1 || !editor.isFocused) return [];
        const sanitizedQuery = query.trim().toLowerCase();
        const people = PeopleStore.get().people.filter((person: IPerson) => {
            const firstName = person.firstName?.toLowerCase() || "";
            const lastName = person.lastName?.toLowerCase() || "";
            return firstName.includes(sanitizedQuery) || lastName.includes(sanitizedQuery);
        });

        return people;
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

                    if (props.query.length > 0) {
                        popup[0].show();
                    } else {
                        popup[0].hide();
                    }
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

export const PeopleMention = Mention.extend({
    name: "person",
    group: "inline",
    inline: true,
    selectable: false,
    atom: true,
    priority: 1000,
    addAttributes() {
        return {
            id: {
                default: 0,
            },
            label: {
                default: "",
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: "person",
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ["person", mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
        return ReactNodeViewRenderer(PersonWrapper);
    },
}).configure({
    suggestion,
});
