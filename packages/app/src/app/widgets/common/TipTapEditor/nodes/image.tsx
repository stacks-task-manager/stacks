// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { translate } from "@stacks/translations";
import {
    Button,
    ButtonGroup,
    Classes,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
} from "@blueprintjs/core";
import { mergeAttributes, Node, nodeInputRule, NodeViewProps, NodeViewRenderer } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import classNames from "classnames";
import React, { useMemo, useRef, useState } from "react";
// import { Plugin, PluginKey } from "@tiptap/pm/state";
// import { ReplaceStep } from "@tiptap/pm/transform";
import noop from "lodash/noop";
import { Icon } from "app/components/common";
import Dialog from "app/utils/dialog";
import { FilesActions } from "app/store/actions";

type ImageAlign = "left" | "center" | "right";

const ImageWrapper = ({ HTMLAttributes, updateAttributes, extension, deleteNode }: NodeViewProps) => {
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const dragHandleRef = useRef<HTMLDivElement | null>(null);
    const [align, setAlign] = useState(HTMLAttributes.align);
    const [width, setWidth] = useState(HTMLAttributes.width ?? "100%");
    const [error, setError] = useState(false);

    const hasInfoButton = useMemo(() => {
        return extension.options.onDelete != null || HTMLAttributes.src.startsWith("http");
    }, [extension.options, HTMLAttributes.src]);

    const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!resizeRef.current) return;
        event.preventDefault();

        if (dragHandleRef.current) {
            dragHandleRef.current.style.cursor = "grabbing";
        }

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = resizeRef.current.clientWidth;
        const containerWidth = resizeRef.current.parentElement?.clientWidth ?? 0;

        const onMouseMove = (moveEvent: MouseEvent) => {
            let newWidth;
            if (align === "left") {
                newWidth = startWidth + moveEvent.clientX - startX;
            } else if (align === "right") {
                newWidth = startWidth - (moveEvent.clientX - startX);
            } else if (align === "center") {
                const deltaY = moveEvent.clientY - startY;
                // Use deltaY to adjust width, scaling the effect for smoother resizing
                const scaleFactor = 2; // Adjust this value to change resize sensitivity
                newWidth = startWidth + deltaY * scaleFactor;
            }

            if (newWidth == null) {
                newWidth = containerWidth;
            }

            if (newWidth >= containerWidth) {
                newWidth = "100%";
            } else if (newWidth < 100) {
                newWidth = "100px";
            } else {
                newWidth = `${newWidth}px`;
            }

            resizeRef.current!.style.width = newWidth;

            updateAttributes({ width: newWidth, align: newWidth === "100%" ? "center" : align });
            setWidth(newWidth);
            if (newWidth === "100%") {
                setAlign("center");
            }
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            if (dragHandleRef.current) {
                dragHandleRef.current.style.cursor = "grab";
            }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleSetAlign = (align: ImageAlign) => {
        setAlign(align);
        updateAttributes({ align });
    };

    const handleImageNotLoading = () => {
        setError(true);
    };

    const handleDelete = async () => {
        const response = await Dialog.confirm(
            "Delete image?",
            `Are you sure you want to delete this image? ${HTMLAttributes.src.startsWith("http")
                ? ""
                : "The image will be removed from your workspace and cannot be undone."
            }`,
            Intent.DANGER
        );
        if (response) {
            deleteNode();
            if (!HTMLAttributes.src.startsWith("http")) {
                extension.options.onDelete(HTMLAttributes.id);
            }
        }
    };

    const alignIcon = useMemo(() => {
        if (align === "left") return "right";
        if (align === "right") return "left";
        return "center";
    }, [align]);

    return (
        <NodeViewWrapper className={classNames("tiptap-image-resize", `align-${align}`, { error })}>
            <div className="tiptap-image-resize-wrapper" style={{ width }} ref={resizeRef}>
                {width !== "100%" ? (
                    <div className={classNames(Classes.POPOVER, "tiptap-image-resize-align")}>
                        <div className={Classes.POPOVER_CONTENT}>
                            <ButtonGroup>
                                <Button
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="align-left" />}
                                    onClick={() => handleSetAlign("left")}
                                />
                                <Button
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="align-center" />}
                                    onClick={() => handleSetAlign("center")}
                                />
                                <Button
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="align-right" />}
                                    onClick={() => handleSetAlign("right")}
                                />
                            </ButtonGroup>
                        </div>
                    </div>
                ) : null}
                {error ? (
                    <Icon icon="image-x" size={28} />
                ) : (
                    <img src={HTMLAttributes.src} onError={handleImageNotLoading} />
                )}
                <div className="tiptap-resize-handle" onMouseDown={startResize} ref={dragHandleRef}>
                    <Icon icon={`drag-handle-${alignIcon}`} size="27" />
                </div>

                {hasInfoButton ? (
                    <Popover
                        placement="bottom-end"
                        content={
                            <Menu>
                                {HTMLAttributes.src.startsWith("http") ? (
                                    <>
                                        <MenuItem
                                            text="Open image URL..."
                                            icon={<Icon icon="compass-03" />}
                                            onClick={() => alert("open url")}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <MenuItem
                                            text="Preview..."
                                            icon={<Icon icon="eye" />}
                                            onClick={() => FilesActions.preview(HTMLAttributes.id)}
                                        />
                                        <MenuItem
                                            text="Download..."
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => FilesActions.download(HTMLAttributes.id)}
                                        />
                                    </>
                                )}
                                <MenuDivider />
                                <MenuItem
                                    text={translate("Delete")}
                                    icon={<Icon icon="trash" />}
                                    intent={Intent.DANGER}
                                    onClick={handleDelete}
                                />
                            </Menu>
                        }
                        renderTarget={({ isOpen, ...props }) => (
                            <Button
                                {...props}
                                active={isOpen}
                                small
                                icon={<Icon icon="info-circle" />}
                                className="tiptap-info-button"
                            />
                        )}
                    />
                ) : null}
            </div>
        </NodeViewWrapper>
    );
};

export interface ImageOptions {
    /**
     * Controls if the image node should be inline or not.
     * @default false
     * @example true
     */
    inline: boolean;

    /**
     * Controls if base64 images are allowed. Enable this if you want to allow
     * base64 image urls in the `src` attribute.
     * @default false
     * @example true
     */
    allowBase64: boolean;

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
        image: {
            /**
             * Add an image
             * @param options The image attributes
             * @example
             * editor
             *   .commands
             *   .setImage({ src: 'https://tiptap.dev/logo.png', alt: 'tiptap', title: 'tiptap logo' })
             */
            setImage: (options: {
                id: string;
                src: string;
                alt?: string;
                title?: string;
                width?: string | number;
                align?: ImageAlign;
            }) => ReturnType;
        };
    }
}

/**
 * Matches an image to a ![image](src "title") on input.
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const Image = Node.create<ImageOptions>({
    name: "image",

    addOptions() {
        return {
            inline: false,
            allowBase64: false,
            onDelete: () => {
                noop();
            },
            HTMLAttributes: {},
        };
    },

    inline() {
        return this.options.inline;
    },

    group() {
        return this.options.inline ? "inline" : "block";
    },

    draggable: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: "100%",
                renderHTML: attributes => {
                    return {
                        width: attributes.width,
                    };
                },
            },
            id: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("id") || null,
                renderHTML: (attributes: { id: string }) => ({
                    id: attributes.id,
                }),
            },
            src: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("src") || null,
                renderHTML: (attributes: { src: string }) => ({
                    src: attributes.src,
                }),
            },
            align: {
                default: "center",
                parseHTML: (element: HTMLElement) => element.getAttribute("align") || "center",
                renderHTML: (attributes: { align: ImageAlign }) => ({
                    align: attributes.align,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: this.options.allowBase64 ? "img[src]" : 'img[src]:not([src^="data:"])',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            setImage:
                options =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: options,
                        });
                    },
        };
    },

    addInputRules() {
        return [
            nodeInputRule({
                find: inputRegex,
                type: this.type,
                getAttributes: match => {
                    const [, , alt, src, title, width, align] = match;

                    return { src, alt, title, width, align };
                },
            }),
        ];
    },

    addNodeView(): NodeViewRenderer {
        return ReactNodeViewRenderer(ImageWrapper);
    },

    // addProseMirrorPlugins() {
    //     const plugin: Plugin<any> = new Plugin({
    //         key: new PluginKey("trackDeletedImages"),
    //         state: {
    //             init: () => [],
    //             apply: transaction => {
    //                 const deletedImages: { pos: number; attrs: any }[] = [];

    //                 // Iterate over transaction steps
    //                 transaction.steps.forEach(step => {
    //                     // Check if step is a ReplaceStep
    //                     if (step instanceof ReplaceStep) {
    //                         const { from, to } = step;

    //                         // Inspect the range in the document before the transaction
    //                         transaction.before.nodesBetween(from, to, (node, pos) => {
    //                             if (node.type.name === this.name && node.attrs) {
    //                                 // Collect the deleted node's attributes
    //                                 deletedImages.push({
    //                                     pos,
    //                                     attrs: node.attrs,
    //                                 });
    //                             }
    //                         });
    //                     }
    //                 });

    //                 // Trigger `onDelete` for each deleted node
    //                 if (deletedImages.length > 0) {
    //                     for (const image of deletedImages) {
    //                         if (this.options.onDelete) {
    //                             this.options.onDelete({ type: "image", src: image.attrs.src });
    //                         }
    //                     }
    //                 }

    //                 return deletedImages;
    //             },
    //         },
    //     });

    //     return [plugin];
    // },
});
