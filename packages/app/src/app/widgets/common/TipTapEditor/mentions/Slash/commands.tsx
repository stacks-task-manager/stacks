// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Editor, Range } from "@tiptap/core";
import { HeaderOne, HeaderTwo, HeaderThree, Form, NumberedList, Citation } from "@blueprintjs/icons";
import { Icon } from "app/components/common";
import React from "react";

interface Command {
    editor: Editor;
    range: Range;
}

export interface CommandItem {
    title: string;
    command: (command: Command) => void;
    icon: React.ReactNode;
}

export default [
    {
        title: "Paragraph",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
        },
        icon: <Icon icon="menu-03" />,
    },
    {
        title: "Heading 1",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
        },
        icon: <HeaderOne />,
    },
    {
        title: "Heading 2",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
        },
        icon: <HeaderTwo />,
    },
    {
        title: "Heading 3",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
        },
        icon: <HeaderThree />,
    },
    {
        title: "Check list",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
        icon: <Form size={14} />,
    },
    {
        title: "Ordered list",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
        icon: <NumberedList size={13} />,
    },
    {
        title: "Unordered list",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
        icon: <Icon icon="dotpoints-02" />,
    },
    {
        title: "Table",
        command: ({ editor, range }: Command) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
        },
        icon: <Icon icon="table" />,
    },
    {
        title: "Quote",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
        icon: <Citation />,
    },
    {
        title: "Divider",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
        icon: <Icon icon="minus" />,
    },
    {
        title: "Block code",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
        icon: <Icon icon="brackets-ellipses" />,
    },
    {
        title: "Primary callout",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setCallout({ intent: "primary" }).run();
        },
        icon: <Icon icon="plus-circle" />,
    },
    {
        title: "Success callout",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setCallout({ intent: "success" }).run();
        },
        icon: <Icon icon="check-circle" />,
    },
    {
        title: "Warning callout",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setCallout({ intent: "warning" }).run();
        },
        icon: <Icon icon="alert-triangle" />,
    },
    {
        title: "Error callout",
        command: ({ editor, range }: Command) => {
            editor.chain().focus().deleteRange(range).setCallout({ intent: "danger" }).run();
        },
        icon: <Icon icon="alert-circle" />,
    },
] as CommandItem[];
