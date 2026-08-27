// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, EditableText, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { useDocument } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { TintPicker } from "app/components/project";
import { Icon } from "app/components/common";

interface ToolbarTitleProps {
    documentId?: string;
    disabled?: boolean;
}
export const ToolbarTitle: FunctionComponent<ToolbarTitleProps> = ({ documentId, disabled }) => {
    const [title, setTitle] = useState("Loading...");
    const [isEditing, setIsEditing] = useState(false);
    const document = useDocument(documentId);
    const oldTitleRef = useRef("");

    useEffect(() => {
        if (!isEditing && document != null && document.title !== title) {
            setTitle(document.title);
        }
    }, [document, isEditing, title]);

    const handleSetTitle = async (title: string) => {
        if (document) {
            await RecordActions.setTitle(title, document.id);
        }
        setTitle(title);
        setIsEditing(false);
    };

    const handleEditing = () => {
        oldTitleRef.current = title;
        setIsEditing(true);
    };

    const handleCancel = () => {
        setTitle(oldTitleRef.current);
        setIsEditing(false);
    };

    return (
        <>
            {document && document.tint ? (
                <Popover
                    content={
                        <TintPicker
                            value={document.tint}
                            onChange={(tint?: string) => RecordActions.setTint(document.id, tint)}
                        />
                    }
                    popoverClassName="popover-padded-medium"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Button
                            {...props}
                            ref={ref}
                            size="small"
                            variant="minimal"
                            icon={<Icon icon="circle-filled" color={document.tint} />}
                        />
                    )}
                />
            ) : null}
            <h1 data-testid="toolbar-title">
                <EditableText
                    value={title}
                    onChange={setTitle}
                    onConfirm={handleSetTitle}
                    onCancel={handleCancel}
                    isEditing={isEditing}
                    minWidth={0}
                    disabled={!document || disabled}
                    onEdit={handleEditing}
                    customInputAttributes={
                        {
                            "data-testid": "toolbar-title-input",
                        } as React.InputHTMLAttributes<HTMLInputElement> &
                        React.TextareaHTMLAttributes<HTMLTextAreaElement>
                    }
                />
            </h1>
        </>
    );
};
