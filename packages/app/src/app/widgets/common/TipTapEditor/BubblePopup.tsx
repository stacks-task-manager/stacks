// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, ButtonGroup, Classes, Colors, InputGroup, Intent, Tooltip } from "@blueprintjs/core";
import { Editor, isTextSelection } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import classNames from "classnames";
import React, { useEffect, useState } from "react";

import { getSelectionChain } from "./toolbar/utils";
import { Icon } from "app/components/common";
import { SeparatorItem } from "./toolbar/SeparatorItem";

export const BubblePopup = ({ editor }: { editor: Editor }) => {
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrike, setIsStrike] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [url, setUrl] = useState("");
    const [edit, setEdit] = useState(false);
    const [showMark, setShowMark] = useState(false);

    useEffect(() => {
        if (!editor) return;

        const updateToolbar = () => {
            const link = editor.isActive("link") && editor.state.selection.empty;

            setIsBold(editor.isActive("bold"));
            setIsItalic(editor.isActive("italic"));
            setIsUnderline(editor.isActive("underline"));
            setIsStrike(editor.isActive("strike"));
            setIsLink(link);
            setUrl(editor.getAttributes("link").href?.trim());

            if (!link) {
                setEdit(false);
            }
        };

        editor.on("selectionUpdate", updateToolbar);
        editor.on("update", updateToolbar);

        return () => {
            editor.off("selectionUpdate", updateToolbar);
            editor.off("update", updateToolbar);
        };
    }, [editor]);

    const handleUpdateUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.currentTarget.value);
    };

    const handleRemoveUrl = () => {
        getSelectionChain(editor).unsetLink().run();
        getSelectionChain(editor).setTextSelection(editor.state.selection.to).run();
        setIsLink(false);
    };

    const handleUpdateLink = () => {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
        setEdit(false);
    };

    return (
        <BubbleMenu
            className={classNames(Classes.POPOVER, "popover-padded-tiny tiptap-bubble-menu")}
            style={{ zIndex: 10 }}
            options={{
                placement: "top",
                offset: 6,
            }}
            editor={editor}
            shouldShow={({ editor, view, state, from, to }) => {
                if (!editor.isFocused) return false;
                if (editor.isActive("image") || editor.isActive("webview")) return false;

                const { doc, selection } = state;
                const { empty } = selection;

                const isEmptyTextBlock =
                    !doc.textBetween(from, to).length && isTextSelection(state.selection);

                const hasEditorFocus = view.hasFocus();

                if ((empty || isEmptyTextBlock) && editor.isActive("link")) {
                    return true;
                }

                if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) {
                    return false;
                }

                return true;
            }}
        >
            <div className={Classes.POPOVER_CONTENT}>
                {isLink ? (
                    edit ? (
                        <InputGroup
                            defaultValue={url}
                            onChange={handleUpdateUrl}
                            rightElement={
                                <Button size="small" onClick={handleUpdateLink}>
                                    Update
                                </Button>
                            }
                        />
                    ) : (
                        <div className="tiptap-bubble-menu-link">
                            <Tooltip
                                hoverOpenDelay={1000}
                                content={url}
                                placement="top"
                                disabled={url.length < 20}
                            >
                                <a href={url} target="_blank" rel="noreferrer">
                                    {url}
                                </a>
                            </Tooltip>
                            <ButtonGroup>
                                <Tooltip content="Edit link" placement="top">
                                    <Button
                                        small
                                        minimal
                                        icon={<Icon icon="edit-04" />}
                                        onClick={() => setEdit(true)}
                                    />
                                </Tooltip>
                                <Tooltip content="Remove link" placement="top">
                                    <Button
                                        small
                                        minimal
                                        icon={<Icon icon="trash" />}
                                        onClick={handleRemoveUrl}
                                    />
                                </Tooltip>
                            </ButtonGroup>
                        </div>
                    )
                ) : (
                    <ButtonGroup>
                        <Button
                            small
                            minimal
                            active={isBold}
                            intent={isBold ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).toggleBold().run()}
                            icon={<Icon icon="bold-01" />}
                        />
                        <Button
                            small
                            minimal
                            active={isUnderline}
                            intent={isUnderline ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).toggleUnderline().run()}
                            icon={<Icon icon="underline-01" />}
                        />
                        <Button
                            small
                            minimal
                            active={isItalic}
                            intent={isItalic ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).toggleItalic().run()}
                            icon={<Icon icon="italic-01" />}
                        />
                        <Button
                            small
                            minimal
                            active={isStrike}
                            intent={isStrike ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => getSelectionChain(editor).toggleStrike().run()}
                            icon={<Icon icon="strikethrough-01" />}
                        />
                        <SeparatorItem />

                        {showMark ? (
                            <>
                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.GOLD5} />}
                                    onClick={() => getSelectionChain(editor).toggleHighlight().run()}
                                />

                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.GREEN3} />}
                                    onClick={() =>
                                        getSelectionChain(editor)
                                            .toggleHighlight({ color: Colors.GREEN5 })
                                            .run()
                                    }
                                />
                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.BLUE3} />}
                                    onClick={() =>
                                        getSelectionChain(editor)
                                            .toggleHighlight({ color: Colors.BLUE5 })
                                            .run()
                                    }
                                />
                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.VERMILION3} />}
                                    onClick={() =>
                                        getSelectionChain(editor)
                                            .toggleHighlight({ color: Colors.VERMILION5 })
                                            .run()
                                    }
                                />
                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.INDIGO3} />}
                                    onClick={() =>
                                        getSelectionChain(editor)
                                            .toggleHighlight({ color: Colors.INDIGO5 })
                                            .run()
                                    }
                                />
                                <Button
                                    minimal
                                    small
                                    icon={<Icon icon="circle-filled" color={Colors.ORANGE3} />}
                                    onClick={() =>
                                        getSelectionChain(editor)
                                            .toggleHighlight({ color: Colors.ORANGE5 })
                                            .run()
                                    }
                                />
                                <Button
                                    small
                                    minimal
                                    icon={<Icon icon="x-close" />}
                                    onClick={() => setShowMark(false)}
                                />
                            </>
                        ) : (
                            <Button
                                small
                                minimal
                                icon={<Icon icon="roller-brush" />}
                                onClick={() => setShowMark(true)}
                            />
                        )}
                    </ButtonGroup>
                )}
            </div>
        </BubbleMenu>
    );
};
