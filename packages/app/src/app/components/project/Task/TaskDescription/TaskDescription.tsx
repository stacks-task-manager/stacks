// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { FILES_TYPE, IAttachment } from "@stacks/types";
import { AttachmentsActions, FilesActions, TasksActions } from "app/store/actions";
import { AttachmentsStore } from "app/store/attachments";
import { Editor, TipTapEditorContent } from "app/widgets";
import { useUpload } from "app/hooks/fileUpload";

interface ITaskDescriptionProps {
    taskId: string;
    value: string;
    disabled?: boolean;
    placeholder?: string;
}

export const TaskDescription: FunctionComponent<ITaskDescriptionProps> = ({
    taskId,
    value,
    disabled,
    placeholder,
}) => {
    const [description, setDescription] = useState(value);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const { pickFiles } = useUpload();

    useEffect(() => {
        if (value !== description) {
            setDescription(value);
        }
    }, [value, taskId]);

    const handleChange = ({ html }: TipTapEditorContent) => {
        setDescription(() => html);

        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            TasksActions.setDescription(taskId, html);
        }, 300);
    };

    const handleSave = () => {
        if (value !== description) {
            if (debounce.current) {
                clearTimeout(debounce.current);
                debounce.current = null;
            }

            TasksActions.setDescription(taskId, description);
        }
    };

    const handleAddAttachments = async (cb: (files: IAttachment[]) => void) => {
        await pickFiles({
            recordId: taskId, type: FILES_TYPE.TASK_ATTACHMENT, onUploaded: async (attachments: IAttachment[]) => {
                cb(attachments);
                AttachmentsActions.appendAttachments(taskId, attachments);
            }
        });
    };

    const handleLoadHistory = async (): Promise<IAttachment[]> => {
        return AttachmentsStore.get().attachments[taskId];
    };

    const handleFileDeleted = async (attachmentId: string) => {
        await FilesActions.remove(attachmentId);
        AttachmentsActions.deleteAttachment(taskId, attachmentId);
    };

    return (
        <Editor
            onUpdate={handleChange}
            value={description}
            placeholder={placeholder}
            disabled={disabled}
            onFileAdd={handleAddAttachments}
            onLoadHistory={handleLoadHistory}
            onFileDelete={handleFileDeleted}
            onBlur={handleSave}
            maxHeight={200}
            testId="task-details-description"
        />
    );
};
