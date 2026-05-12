// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Transaction } from "@tiptap/pm/state";
import { Editor, EditorContent, JSONContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import React, { useEffect, useRef } from "react";

import { Classes } from "@blueprintjs/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import Document from "@tiptap/extension-document";
import FontFamily from "@tiptap/extension-font-family";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { CharacterCount, Focus, Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { all, createLowlight } from "lowlight";

import { BubblePopup } from "./BubblePopup";
import { DocumentsMention, EmojiMention, PeopleMention, SlashMention } from "./mentions";
import { Attachment, Callout, Code, Confidential, ControlClickLink, Image, Webview } from "./nodes";

const lowlight = createLowlight(all);

export interface TipTapEditorContent {
    json: JSONContent;
    html: string;
    string: string;
}

export interface TipTapEditorProps {
    value?: string | null;
    placeholder?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    showHelp?: boolean;
    editing?: boolean;
    onUpdate: (content: TipTapEditorContent) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onFileDelete?: (attachmentId: string) => void;
}

interface TipTapEditorPropsExtended extends TipTapEditorProps {
    spellCheck?: boolean;
    onBoot: (editor: Editor) => void;
    onKeyDown?: (event: KeyboardEvent) => boolean | void;
}

interface UpdatePayload {
    editor: Editor;
    transaction: Transaction;
}

export const TipTapEditor: React.FC<TipTapEditorPropsExtended> = ({
    value,
    placeholder,
    disabled,
    spellCheck,
    onUpdate,
    onFocus,
    onBlur,
    onBoot,
    onFileDelete,
    onKeyDown,
}) => {
    const preventUpdateRef = useRef(false);
    const editor = useEditor({
        immediatelyRender: true,
        extensions: [
            Callout,
            Document,
            Heading.configure({
                levels: [1, 2, 3],
            }),
            StarterKit.configure({
                document: false,
                heading: false,
                link: false,
                underline: false,
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
            Focus.configure({
                className: "focus",
            }),
            CharacterCount,
            ControlClickLink,
            Underline,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            TextStyle,
            FontSize,
            Color,
            FontFamily.configure({
                types: ["textStyle"],
            }),
            Image.configure({
                onDelete: onFileDelete,
            }),
            Youtube.configure({
                controls: false,
                nocookie: true,
            }),
            PeopleMention,
            DocumentsMention,
            SlashMention,
            Highlight.configure({ multicolor: true }),
            Subscript,
            Superscript,
            EmojiMention,
            Table.configure({
                resizable: true,
            }),
            TableCell,
            TableRow,
            TableHeader,
            Webview,
            Confidential,
            Attachment.configure({
                onDelete: onFileDelete,
            }),
            Typography,
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(Code);
                },
            }).configure({ lowlight }),
        ],
        content: null,
        editorProps: {
            attributes: {
                class: "",
            },
            handleKeyDown: (view, event) => {
                return onKeyDown && onKeyDown(event);
            },
        },
        editable: disabled != null ? !disabled : true,
        onUpdate: ({ editor }: UpdatePayload) => {
            if (preventUpdateRef.current) {
                preventUpdateRef.current = false;
                return;
            }

            const json = editor.getJSON();
            const html = editor.getHTML();
            const string = editor.getText();

            if (html !== value) {
                onUpdate({ json, html, string });
            }

        }
    });

    useEffect(() => {
        if (editor && value != null) {
            const html = editor.getHTML();

            try {
                if (html !== value) {
                    preventUpdateRef.current = true;
                    editor.commands.setContent(value ?? "", { emitUpdate: true });
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("Error setting initial content in editor", error);
            }
        }
    }, [editor, value]);

    useEffect(() => {
        if (editor) {
            onBoot(editor); // Set the editor in the context when it's created

            const handleFocus = () => {
                if (onFocus) onFocus();
            };

            const handleBlur = ({ event }: { event: FocusEvent }) => {
                const relatedTarget = event.relatedTarget as Element | null;

                const isIntended =
                    relatedTarget?.closest(".tiptap-toolbar") ||
                    relatedTarget?.closest(".tippy-content") ||
                    relatedTarget?.closest(".tiptap-bubble-menu") ||
                    relatedTarget?.closest(`.${Classes.POPOVER}`);

                if (relatedTarget && isIntended) {
                    //
                } else {
                    if (onBlur) onBlur();
                }
            };

            editor.on("focus", handleFocus);
            editor.on("blur", handleBlur);

            return () => {
                editor.off("focus", handleFocus);
                editor.off("blur", handleBlur);
            };
        }
    }, [editor]);

    useEffect(() => {
        if (editor) {
            preventUpdateRef.current = true;
            editor.setEditable(!Boolean(disabled));
        }
    }, [disabled, editor]);

    if (!editor) return null;

    return (
        <>
            <span>
                <BubblePopup editor={editor} />
            </span>
            <EditorContent className="editor-wrapper" editor={editor} spellCheck={spellCheck} data-testid="tip-tap-editor" />
        </>
    );
};
