// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, ButtonGroup } from "@blueprintjs/core";
import { Editor } from "@tiptap/react";
import classNames from "classnames";
import { produce } from "immer";
import React, { FunctionComponent, useEffect, useState } from "react";

import { Icon } from "app/components/common";
import { TipTapHelpPopover } from "../TipTapHelpPopover";
import { AlignmentItem } from "./AlignmentItem";
import { BlockItem } from "./BlockItem";
import { ClearItem } from "./ClearItem";
import { InlineItem } from "./InlineItem";
import { PlusItem } from "./PlusItem";
import { SeparatorItem } from "./SeparatorItem";
import { SpringItem } from "./SpringItem";
import { TableItem } from "./TableItem";
import { TextStyleItem } from "./TextStyleItem";
import { getSelectionChain } from "./utils";
import { IAttachment } from "@stacks/types";

export interface TipTapToolbarState {
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrike: boolean;
    textAlign: "center" | "left" | "right" | "justify";
    isHighlighted: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
    isTable: boolean;
    isColored: boolean;
    isCallout: boolean;
    isLink: boolean;
}

export interface TipTapToolbarItem extends TipTapToolbarState {
    editor: Editor;
    small?: boolean;
}

interface TipTapToolbarProps {
    small?: boolean;
    editor: Editor | null;
    showHelp?: boolean;
    children?: React.ReactNode;
    className?: string;
    onLoadHistory?: () => Promise<IAttachment[]>;
    onFileAdd?: (callback: (files: IAttachment[]) => void) => void;
    onFileDelete?: (attachmentId: string) => void;
}

export const TipTapToolbar: FunctionComponent<TipTapToolbarProps> = ({
    small,
    editor,
    showHelp,
    children,
    className,
    onLoadHistory,
    onFileAdd,
    onFileDelete,
}) => {
    const [state, setState] = useState<TipTapToolbarState>({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrike: false,
        textAlign: "left",
        isHighlighted: false,
        isSuperscript: false,
        isSubscript: false,
        isTable: false,
        isColored: false,
        isCallout: false,
        isLink: false,
    });

    useEffect(() => {
        if (!editor) return;

        const updateToolbar = () => {
            setState(
                produce((state: TipTapToolbarState) => {
                    state.isBold = editor.isActive("bold");
                    state.isItalic = editor.isActive("italic");
                    state.isUnderline = editor.isActive("underline");
                    state.isStrike = editor.isActive("strike");
                    state.isHighlighted = editor.isActive("highlight");
                    state.isSuperscript = editor.isActive("superscript");
                    state.isSubscript = editor.isActive("subscript");
                    state.isTable = editor.can().deleteTable();
                    state.isColored = editor.getAttributes("textStyle").color;
                    state.isCallout = editor.isActive("callout");
                    state.isLink = editor.isActive("link");

                    if (editor.isActive({ textAlign: "center" })) {
                        state.textAlign = "center";
                    } else if (editor.isActive({ textAlign: "left" })) {
                        state.textAlign = "left";
                    } else if (editor.isActive({ textAlign: "right" })) {
                        state.textAlign = "right";
                    } else if (editor.isActive({ textAlign: "justify" })) {
                        state.textAlign = "justify";
                    }
                })
            );
        };

        editor.on("selectionUpdate", updateToolbar);
        editor.on("update", updateToolbar);

        return () => {
            editor.off("selectionUpdate", updateToolbar);
            editor.off("update", updateToolbar);
        };
    }, [editor]);

    if (!editor) return <div>No editor</div>;

    return (
        <div className={classNames("tiptap-toolbar", className)} data-testid="tip-tap-toolbar">
            {!small && (
                <>
                    <ButtonGroup>
                        <Button
                            variant="minimal"
                            onClick={() => getSelectionChain(editor).undo().run()}
                            icon={<Icon icon="refresh-ccw-01" />}
                            disabled={!editor.can().chain().focus().undo().run()}
                        />
                        <Button
                            variant="minimal"
                            onClick={() => getSelectionChain(editor).redo().run()}
                            disabled={!editor.can().chain().focus().redo().run()}
                            icon={<Icon icon="refresh-cw-01" />}
                        />
                    </ButtonGroup>
                    <SeparatorItem />
                </>
            )}

            <BlockItem editor={editor} small={small} />

            <SeparatorItem />

            <TextStyleItem editor={editor} {...state} small={small} />

            <AlignmentItem editor={editor} {...state} small={small} />

            <SeparatorItem />

            <InlineItem
                editor={editor}
                onLoadHistory={onLoadHistory}
                onFileAdd={onFileAdd}
                onDelete={onFileDelete}
                {...state}
                small={small}
            />

            <SeparatorItem />

            <PlusItem editor={editor} {...state} small={small} />

            <TableItem editor={editor} {...state} small={small} />

            <ClearItem editor={editor} {...state} small={small} />

            <SpringItem />

            {showHelp !== false ? <TipTapHelpPopover /> : null}

            {children}
        </div>
    );
};

/* 

<SeparatorItem /> 
*/
