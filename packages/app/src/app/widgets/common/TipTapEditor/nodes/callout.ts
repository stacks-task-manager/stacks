// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mergeAttributes, Node } from "@tiptap/core";

export interface CalloutOptions {
    intent: string[];
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        callout: {
            setCallout: (attributes: { intent: string }) => ReturnType;
            toggleCallout: (attributes: { intent: string }) => ReturnType;
        };
    }
}

export const Callout = Node.create<CalloutOptions>({
    name: "callout",
    group: "block",
    content: "inline*",
    draggable: true,
    defining: true,

    addOptions() {
        return {
            intent: ["primary", "success", "warning", "danger"],
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            intent: {
                default: null,
                parseHTML: element => {
                    const intent: string | null = element.getAttribute("data-intent");
                    return intent && this.options.intent.includes(intent) ? intent : null;
                },
                renderHTML: attributes => {
                    if (!attributes.intent) return {};

                    return {
                        "data-intent": attributes.intent,
                        class: `callout ${attributes.intent}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "div[data-callout]", // Only match divs explicitly marked as callouts
                getAttrs: node => {
                    if (!(node instanceof HTMLElement)) return false;

                    const intent = node.getAttribute("data-intent");
                    if (!intent || !this.options.intent.includes(intent)) {
                        return false;
                    }

                    return { intent };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(this.options.HTMLAttributes, { "data-callout": "true" }, HTMLAttributes, {
                class: "callout",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setCallout:
                attributes =>
                ({ commands }) => {
                    return commands.setNode(this.name, attributes);
                },
            toggleCallout:
                attributes =>
                ({ commands }) => {
                    if (!attributes?.intent || !this.options.intent.includes(attributes.intent)) {
                        return false;
                    }

                    return commands.toggleNode(this.name, "paragraph", attributes);
                },
        };
    },
});
