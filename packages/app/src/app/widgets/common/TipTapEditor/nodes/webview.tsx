// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { translate } from "@stacks/translations";
import { Button, Classes, Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { mergeAttributes, Node, NodeViewProps, NodeViewRenderer } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "app/components/common";
import Toast from "app/utils/toast";

interface WebviewEventTarget extends EventTarget {
    getTitle: () => string;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
}

interface WebviewEvent extends Event {
    target: WebviewEventTarget;
}

const FrameWrapper = ({ HTMLAttributes, updateAttributes, deleteNode, selected }: NodeViewProps) => {
    const resizeRef = useRef<HTMLDivElement | null>(null);
    const webviewRef = useRef<HTMLWebViewElement | null>(null);
    const dragHandleRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState(HTMLAttributes.height ?? "500px");
    const [isResizing, setIsResizing] = useState(false);
    const [title, setTitle] = useState("");
    const [canGoBack, setCanGoBack] = useState(false);

    const getTitle = (e: Event) => {
        const { target } = e as WebviewEvent;
        if (target) {
            setTitle(target.getTitle());
        }
    };

    const handleNavigated = (e: Event) => {
        const { target } = e as WebviewEvent;
        if (target) {
            setCanGoBack(target.canGoBack());
        }
    };

    const handleGoBack = () => {
        if (webviewRef.current) {
            const webview = webviewRef.current as unknown as WebviewEventTarget;
            webview.goBack();
        }
    };

    useEffect(() => {
        if (webviewRef.current) {
            webviewRef.current.addEventListener("did-finish-load", getTitle);
            webviewRef.current.addEventListener("did-navigate-in-page", handleNavigated);
        }

        return () => {
            if (webviewRef.current) {
                webviewRef.current.removeEventListener("did-finish-load", getTitle);
                webviewRef.current.removeEventListener("did-navigate-in-page", handleNavigated);
            }
        };
    }, [HTMLAttributes.src]);

    const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (!resizeRef.current) return;
        setIsResizing(true);

        if (dragHandleRef.current) {
            dragHandleRef.current.style.cursor = "ns-resize";
        }

        const startY = event.clientY;
        const startHeight = parseInt(height, 10);

        const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();

            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(300, startHeight + deltaY);

            const heightStr = `${newHeight}px`;

            if (resizeRef.current) {
                resizeRef.current.style.height = heightStr;
            }

            // Update both local state and attributes
            setHeight(heightStr);
            updateAttributes({ height: heightStr });
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            setIsResizing(false);

            if (dragHandleRef.current) {
                dragHandleRef.current.style.cursor = "grab";
            }
        };

        // Add listeners to the whole document to handle cases where the mouse leaves the iframe
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleCoyLink = () => {
        navigator.clipboard.writeText(HTMLAttributes.src);
        Toast.show(translate("Link copied to clipboard"), "clipboard");
    };

    return (
        <NodeViewWrapper className={classNames("tiptap-iframe-resize", { resizing: isResizing })}>
            <div
                className={classNames("tiptap-iframe-resize-wrapper", Classes.DIALOG)}
                style={{ height }}
                ref={resizeRef}
            >
                <div className={classNames("tiptap-iframe-header", Classes.DIALOG_HEADER)}>
                    <h6 className={Classes.HEADING}>{title}</h6>
                    <div style={{ flexGrow: 2, minWidth: 50 }}>&nbsp;</div>
                    {canGoBack && (
                        <Button variant="minimal" icon={<Icon icon="chevron-left" />} onClick={handleGoBack}>
                            {translate("Back")}
                        </Button>
                    )}

                    {selected && (
                        <Popover
                            placement="bottom-end"
                            content={
                                <Menu>
                                    <MenuItem
                                        text={translate("Open link")}
                                        icon={<Icon icon="link-external-01" />}
                                        onClick={() => window.open(HTMLAttributes.src, "_blank")}
                                    />
                                    <MenuItem
                                        text={translate("Copy link")}
                                        icon={<Icon icon="clipboard" />}
                                        onClick={handleCoyLink}
                                    />
                                    <MenuDivider />
                                    <MenuItem
                                        text={translate("Delete")}
                                        icon={<Icon icon="trash" />}
                                        intent={Intent.DANGER}
                                        onClick={deleteNode}
                                    />
                                </Menu>
                            }
                            renderTarget={({ isOpen, ...props }) => (
                                <Button
                                    {...props}
                                    active={isOpen}
                                    minimal
                                    icon={<Icon icon="dots-vertical" />}
                                />
                            )}
                        />
                    )}
                </div>
                <div className="tiptap-iframe-mouse-block" />
                <webview src={HTMLAttributes.src} ref={webviewRef} />
                <div
                    className="tiptap-resize-handle"
                    onMouseDown={startResize}
                    ref={dragHandleRef}
                    style={{ cursor: "grab" }}
                >
                    <Icon icon="drag-handle-right" size="27" />
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export interface WebviewOptions {
    HTMLAttributes: {
        [key: string]: any;
    };
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        webview: {
            /**
             * Add an iframe
             */
            setWebview: (options: { src: string }) => ReturnType;
        };
    }
}

export const Webview = Node.create<WebviewOptions>({
    name: "webview",
    group: "block",
    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute("src") || null,
                renderHTML: (attributes: { src: string }) => ({
                    src: attributes.src,
                }),
            },
            height: {
                default: "500px",
                renderHTML: attributes => {
                    return {
                        height: attributes.height,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "iframe[src]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["iframe", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            setWebview:
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
        return ReactNodeViewRenderer(FrameWrapper);
    },
});
