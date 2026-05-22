// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, EditableText, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { useDocument } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { TintPicker } from "app/components/project";
import { Icon } from "app/components/common";

interface ToolbarTitleProps {
    documentId?: string;
}
export const ToolbarTitle: FunctionComponent<ToolbarTitleProps> = ({ documentId }) => {
    const [title, setTitle] = useState("Loading...");
    const document = useDocument(documentId);
    const oldTitleRef = useRef("");

    useEffect(() => {
        if (document != null && document.title !== title) {
            setTitle(document.title);
        }
    }, [document]);

    const handleSetTitle = async (title: string) => {
        if (!document) return;
        await RecordActions.setTitle(title, document.id);
    };

    const handleEditing = () => {
        oldTitleRef.current = title;
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
            <h1>
                <EditableText
                    value={title}
                    onChange={setTitle}
                    onConfirm={handleSetTitle}
                    minWidth={0}
                    disabled={!document}
                    onEdit={handleEditing}
                />
            </h1>
        </>
    );
};
