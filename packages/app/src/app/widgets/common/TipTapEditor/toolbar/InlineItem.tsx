// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Menu, MenuDivider, MenuItem, mergeRefs, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { IAttachment } from "@stacks/types";
import { TipTapToolbarItem } from ".";
import { AttachmentItem } from "./AttachmentItem";
import { ColorItem } from "./ColorItem";
import { ImageItem } from "./ImageItem";
import { LinkItem } from "./LinkItem";
import { MarkItem } from "./MarkItem";
import { getSelectionChain } from "./utils";

interface InlineItemProps extends TipTapToolbarItem {
    onLoadHistory?: () => Promise<IAttachment[]>;
    onFileAdd?: (callback: (files: IAttachment[]) => void) => void;
    onDelete?: (attachmentId: string) => void;
}

export const InlineItem: FunctionComponent<InlineItemProps> = ({
    editor,
    small,
    onLoadHistory,
    onFileAdd,
    onDelete,
    ...rest
}) => {
    const { isSuperscript, isSubscript } = rest;

    const handleSetConfidential = () => {
        const text = editor.state.doc.textBetween(
            editor.state.selection.from, // Start of selection
            editor.state.selection.to // End of selection
        );

        editor.chain().focus().setConfidential({ text }).run();
    };

    return (
        <>
            <ImageItem
                editor={editor}
                small={small}
                onImageAdd={onFileAdd}
                onLoadHistory={onLoadHistory}
                onDelete={onDelete}
            />

            {onFileAdd != null ? (
                <AttachmentItem
                    editor={editor}
                    small={small}
                    onFileAdd={onFileAdd}
                    onLoadHistory={onLoadHistory}
                    onDelete={onDelete}
                />
            ) : null}

            <LinkItem editor={editor} small={small} {...rest} />

            <Tooltip
                content="Code"
                placement="top"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <Button
                        {...props}
                        size={small ? "small" : "medium"}
                        variant="minimal"
                        intent={editor.isActive("code") ? Intent.PRIMARY : Intent.NONE}
                        onClick={() => getSelectionChain(editor).toggleCode().run()}
                        disabled={!editor.can().chain().focus().toggleCode().run()}
                        icon={<Icon icon="code-02" />}
                    />
                )}
            />

            <MarkItem editor={editor} {...rest} small={small} />
            <ColorItem editor={editor} {...rest} small={small} />

            <Popover
                minimal
                placement="bottom-end"
                content={
                    <Menu>
                        <MenuItem
                            text="Subscript"
                            icon={<Icon icon="subscript" />}
                            labelElement={isSubscript ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleSubscript().run()}
                        />
                        <MenuItem
                            text="Superscript"
                            icon={<Icon icon="superscript" />}
                            labelElement={isSuperscript ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleSuperscript().run()}
                        />
                        <MenuDivider />
                        <MenuItem
                            text="Confidential text"
                            icon={<Icon icon="lock-01" />}
                            labelElement={isSuperscript ? <Icon icon="check" /> : null}
                            onClick={handleSetConfidential}
                        />
                        <MenuDivider />
                        <MenuItem
                            text="Clear formatting"
                            icon={<Icon icon="eraser" />}
                            onClick={() => getSelectionChain(editor).clearNodes().unsetAllMarks().run()}
                        />
                    </Menu>
                }
                renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                    <Tooltip
                        content="More"
                        placement="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen: openTooltip, ref: tooltipRef, ...tooltipProps }) => (
                            <Button
                                {...popoverProps}
                                {...tooltipProps}
                                active={isOpen}
                                ref={mergeRefs(popoverRef, tooltipRef)}
                                minimal
                                small={small}
                                icon={<Icon icon="dots-vertical" />}
                            />
                        )}
                    />
                )}
            />
        </>
    );
};
