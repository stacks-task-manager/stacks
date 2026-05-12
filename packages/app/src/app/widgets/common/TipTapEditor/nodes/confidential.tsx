// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Popover, PopoverInteractionKind, TextArea } from "@blueprintjs/core";
import { mergeAttributes, Node, NodeViewProps, NodeViewRenderer } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import { Icon } from "app/components/common";

const ConfidentialWrapper = ({ HTMLAttributes, updateAttributes }: NodeViewProps) => {
    const [text, setText] = useState(HTMLAttributes.text);

    const handleUpdateText = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.currentTarget.value);
        updateAttributes({ text: event.currentTarget.value });
    };

    return (
        <NodeViewWrapper as="span" className="tiptap-confidential">
            <Popover
                popoverClassName="popover-padded-small tiptap-confidential-popup"
                content={<TextArea value={text} onChange={handleUpdateText} />}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <span {...props}>
                        <Icon icon="lock-01" />
                    </span>
                )}
                interactionKind={PopoverInteractionKind.HOVER}
                placement="top"
            />
        </NodeViewWrapper>
    );
};

export interface ConfidentialOptions {
    HTMLAttributes: {
        [key: string]: any;
    };
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        confidential: {
            /**
             * Add an iframe
             */
            setConfidential: (options: { text: string }) => ReturnType;
        };
    }
}

export const Confidential = Node.create<ConfidentialOptions>({
    name: "confidential",
    group: "inline",
    inline: true,
    selectable: false,
    atom: true,
    priority: 1000,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            text: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("text") || null,
                renderHTML: (attributes: { text: string }) => ({
                    text: attributes.text,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "confidential[text]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["confidential", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            setConfidential:
                options =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: options,
                        });
                    },
        };
    },

    addNodeView(): NodeViewRenderer {
        return ReactNodeViewRenderer(ConfidentialWrapper);
    },
});
