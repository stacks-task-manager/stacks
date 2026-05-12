// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { Editor } from "@tiptap/react";
import { Citation, Form, HeaderOne, HeaderThree, HeaderTwo, NumberedList } from "@blueprintjs/icons";
import React, { useEffect, useMemo, useState } from "react";

import { Icon } from "app/components/common";
import { getSelectionChain } from "./utils";
import { SeparatorItem } from "./SeparatorItem";

export const BlockItem = ({ editor, small }: { editor: Editor; small?: boolean }) => {
    const [block, setBlock] = useState("paragraph");

    useEffect(() => {
        if (!editor) return;

        const updateToolbar = () => {
            let blockType = "paragraph";

            if (editor.isActive("heading", { level: 1 })) {
                blockType = "heading-1";
            } else if (editor.isActive("heading", { level: 2 })) {
                blockType = "heading-2";
            } else if (editor.isActive("heading", { level: 3 })) {
                blockType = "heading-3";
            } else if (editor.isActive("bulletList")) {
                blockType = "bulletList";
            } else if (editor.isActive("orderedList")) {
                blockType = "orderedList";
            } else if (editor.isActive("taskList")) {
                blockType = "taskList";
            } else if (editor.isActive("codeBlock")) {
                blockType = "codeBlock";
            } else if (editor.isActive("blockquote")) {
                blockType = "blockquote";
            }

            setBlock(blockType);
        };

        editor.on("selectionUpdate", updateToolbar);
        editor.on("update", updateToolbar);

        return () => {
            editor.off("selectionUpdate", updateToolbar);
            editor.off("update", updateToolbar);
        };
    }, [editor]);

    const currentIcon = useMemo(() => {
        switch (block) {
            case "paragraph":
                return <Icon icon="menu-03" />;
            case "heading-1":
                return <HeaderOne />;
            case "heading-2":
                return <HeaderTwo />;
            case "heading-3":
                return <HeaderThree />;
            case "orderedList":
                return <NumberedList size={13} />;
            case "bulletList":
                return <Icon icon="dotpoints-02" />;
            case "taskList":
                return <Form />;
            case "codeBlock":
                return <Icon icon="brackets-ellipses" />;
            case "blockquote":
                return <Citation />;
            default:
                return <Icon icon="menu-03" />;
        }
    }, [block]);

    return (
        <>
            <Popover
                content={
                    <Menu>
                        <MenuItem
                            text="Paragraph"
                            icon={<Icon icon="menu-03" />}
                            labelElement={block === "paragraph" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).setParagraph().run()}
                        />
                        <MenuDivider title="Headings" />
                        <MenuItem
                            text="Heading 1"
                            icon="header-one"
                            labelElement={block === "heading-1" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleHeading({ level: 1 }).run()}
                        />
                        <MenuItem
                            text="Heading 2"
                            icon="header-two"
                            labelElement={block === "heading-2" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleHeading({ level: 2 }).run()}
                        />
                        <MenuItem
                            text="Heading 3"
                            icon="header-three"
                            labelElement={block === "heading-3" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleHeading({ level: 3 }).run()}
                        />

                        <MenuDivider title="Lists" />

                        <MenuItem
                            text="Ordered list"
                            labelElement={block === "orderedList" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleOrderedList().run()}
                            icon={<NumberedList size={13} />}
                        />
                        <MenuItem
                            text="Bullet list"
                            labelElement={block === "bulletList" ? <Icon icon="check" /> : null}
                            onClick={() => getSelectionChain(editor).toggleBulletList().run()}
                            icon={<Icon icon="dotpoints-02" />}
                        />
                        <MenuItem
                            text="Check list"
                            onClick={() => getSelectionChain(editor).toggleTaskList().run()}
                            icon={<Form size={14} />}
                        />

                        <MenuDivider title="Other" />
                        <MenuItem
                            text="Quote"
                            onClick={() => getSelectionChain(editor).toggleBlockquote().run()}
                            icon="citation"
                        />
                        <MenuItem
                            text="Code block"
                            onClick={() => getSelectionChain(editor).toggleCodeBlock().run()}
                            icon={<Icon icon="brackets-ellipses" />}
                        />
                    </Menu>
                }
                placement="bottom-start"
                minimal
            >
                <Button size={small ? "small" : undefined} variant="minimal" icon={currentIcon} />
            </Popover>

            {block === "taskList" ? (
                <>
                    <SeparatorItem />
                    <Button
                        size={small ? "small" : undefined}
                        variant="minimal"
                        icon={<Icon icon="left-indent-01" />}
                        onClick={() => getSelectionChain(editor).sinkListItem("taskItem").run()}
                        disabled={!editor.can().sinkListItem("taskItem")}
                    />
                    <Button
                        size={small ? "small" : undefined}
                        variant="minimal"
                        icon={<Icon icon="right-indent-01" />}
                        onClick={() => getSelectionChain(editor).liftListItem("taskItem").run()}
                        disabled={!editor.can().liftListItem("taskItem")}
                    />
                </>
            ) : null}
        </>
    );
};
