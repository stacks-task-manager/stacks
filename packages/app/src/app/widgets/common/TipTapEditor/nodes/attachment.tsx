// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { translate } from "@stacks/translations";
import { Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { mergeAttributes, Node, NodeViewProps, NodeViewRenderer } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import noop from "lodash/noop";
import React from "react";
import { Icon } from "app/components/common";
import { APPICONS } from "@stacks/types";
import Dialog from "app/utils/dialog";
import { humanFileSize, truncateEnd } from "app/utils/string";
import { FilesActions } from "app/store/actions";

const AttachmentWrapper = ({ HTMLAttributes, extension, deleteNode }: NodeViewProps) => {
    const handleDelete = async () => {
        const response = await Dialog.confirm(
            "Delete attachment?",
            "Are you sure you want to delete this attachment? The attachment will be removed from your workspace and cannot be undone."
        );
        if (response) {
            deleteNode();
            extension.options.onDelete(HTMLAttributes.id);
        }
    };

    return (
        <NodeViewWrapper as="span">
            <Popover
                content={
                    <Menu>
                        <MenuItem icon={<Icon icon="eye" />} text="Preview..." onClick={() => FilesActions.preview(HTMLAttributes.id)} />
                        <MenuItem icon={<Icon icon="download-04" />} text="Download..." onClick={() => FilesActions.download(HTMLAttributes.id)} />
                        <MenuDivider />
                        <MenuItem
                            text={translate("Delete")}
                            icon={<Icon icon="trash" />}
                            intent={Intent.DANGER}
                            onClick={handleDelete}
                        />
                    </Menu>
                }
                placement="bottom"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <span {...props} className="file-attachment">
                        <Icon icon={APPICONS.FILE} size={13} />
                        {truncateEnd(HTMLAttributes.file, 20)}
                        <small>{humanFileSize(HTMLAttributes.size)}</small>
                    </span>
                )}
            />
        </NodeViewWrapper>
    );
};

export interface AttachmentOptions {
    /**
     * HTML attributes to add to the image element.
     * @default {}
     * @example { class: 'foo' }
     */
    HTMLAttributes: Record<string, any>;

    onDelete: (attachmentId: string) => void | null;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        attachment: {
            setAttachment: (options: { id: string; file: string; size: number }) => ReturnType;
        };
    }
}

export const Attachment = Node.create<AttachmentOptions>({
    name: "attachment",
    group: "inline",
    inline: true,
    selectable: false,
    atom: true,
    priority: 1000,

    addOptions() {
        return {
            onDelete: () => {
                noop();
            },
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            size: {
                default: 0,
                parseHTML: (element: HTMLElement) => element.getAttribute("size") || null,
                renderHTML: (attributes: { size: number }) => ({
                    size: attributes.size,
                }),
            },
            id: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("id") || null,
                renderHTML: (attributes: { id: string }) => ({
                    id: attributes.id,
                }),
            },
            file: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("file") || null,
                renderHTML: (attributes: { file: string }) => ({
                    file: attributes.file,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "attachment",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["attachment", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            setAttachment:
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
        return ReactNodeViewRenderer(AttachmentWrapper);
    },

    // addProseMirrorPlugins() {
    //     const plugin: Plugin<any> = new Plugin({
    //         key: new PluginKey("trackDeletedAttachment"),
    //         state: {
    //             init: () => [],
    //             apply: transaction => {
    //                 const deletedAttachments: { pos: number; attrs: any }[] = [];

    //                 // Iterate over transaction steps
    //                 transaction.steps.forEach(step => {
    //                     // Check if step is a ReplaceStep
    //                     if (step instanceof ReplaceStep) {
    //                         const { from, to } = step;

    //                         // Inspect the range in the document before the transaction
    //                         transaction.before.nodesBetween(from, to, (node, pos) => {
    //                             if (node.type.name === this.name && node.attrs) {
    //                                 // Collect the deleted node's attributes
    //                                 deletedAttachments.push({
    //                                     pos,
    //                                     attrs: node.attrs,
    //                                 });
    //                             }
    //                         });
    //                     }
    //                 });

    //                 // Trigger `onDelete` for each deleted node
    //                 if (deletedAttachments.length > 0) {
    //                     for (const attachment of deletedAttachments) {
    //                         if (this.options.onDelete) {
    //                             this.options.onDelete({ type: "attachment", src: attachment.attrs.file });
    //                         }
    //                     }
    //                 }

    //                 return deletedAttachments;
    //             },
    //         },
    //     });

    //     return [plugin];
    // },
});
