// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useCallback, useRef, useState } from "react";
import { Editor as TTEditor } from "@tiptap/react";

import { TipTapEditor, TipTapEditorProps } from "./TipTapEditor";
import { TipTapToolbar } from "./toolbar";
import { useOnClickOutside } from "app/hooks";
import { IAttachment } from "@stacks/types";
import { Icon } from "app/components/common";

interface EditorProps extends TipTapEditorProps {
    maxHeight?: number;
    testId?: string;
    onLoadHistory?: () => Promise<IAttachment[]>;
    onFileAdd?: (callback: (files: IAttachment[]) => void) => void;
    onFileDelete?: (attachmentId: string) => void;
    onKeyDown?: (event: KeyboardEvent) => boolean | void;
}

export const Editor: FunctionComponent<EditorProps> = props => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [focused, setFocused] = useState(false);
    const [editor, setEditor] = useState<TTEditor | null>(null);
    const [showExpand, setShowExpand] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const resizeObserver = useRef<ResizeObserver | null>(null);

    useOnClickOutside(
        editorRef,
        () => {
            setFocused(false);
        },
        [`.${Classes.PORTAL}`]
    );

    const handleFocus = () => {
        setFocused(true);
        setIsExpanded(true);
        if (props.onFocus) props.onFocus();
    };

    const handleBlur = () => {
        setFocused(false);
        if (props.onBlur) props.onBlur();
    };

    const handleHeight = useCallback((wrapperRef: HTMLDivElement | null) => {
        if (wrapperRef && props.maxHeight != null) {
            const editorWrapper = wrapperRef.getElementsByClassName("editor-wrapper")[0] as HTMLDivElement;
            if (!editorWrapper) return;

            resizeObserver.current = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.contentRect) {
                        const height = editorWrapper.offsetHeight;
                        setShowExpand(height > props.maxHeight!);
                    }
                }
            });

            resizeObserver.current.observe(editorWrapper);
        } else {
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
                resizeObserver.current = null;
            }
        }

        editorRef.current = wrapperRef;
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            className={classNames("tiptap-wrapper", Classes.FILL, {
                [Classes.EDITABLE_TEXT_EDITING]: focused || props.editing,
                [Classes.EDITABLE_TEXT]: !Boolean(props.disabled),
            })}
            ref={handleHeight}
            data-testid={props.testId}
        >
            {props.maxHeight && showExpand && !isExpanded ? (
                <div className="tiptap-view-more">
                    <Tag round minimal icon={<Icon icon="chevron-down" />} onClick={toggleExpanded}>
                        Expand
                    </Tag>
                </div>
            ) : null}
            <div
                className="tiptap-inner-wrapper"
                style={{
                    maxHeight: props.maxHeight && !isExpanded ? props.maxHeight : undefined,
                    overflow: props.maxHeight && !isExpanded ? "hidden" : undefined,
                }}
            >
                <TipTapEditor {...props} onFocus={handleFocus} onBlur={handleBlur} onBoot={setEditor} />
                {focused || props.editing ? (
                    <TipTapToolbar
                        small
                        editor={editor}
                        showHelp={props.showHelp}
                        className={Classes.ELEVATION_2}
                        onLoadHistory={props.onLoadHistory}
                        onFileAdd={props.onFileAdd}
                        onFileDelete={props.onFileDelete}
                    >
                        {props.children}
                    </TipTapToolbar>
                ) : null}
            </div>
        </div>
    );
};
