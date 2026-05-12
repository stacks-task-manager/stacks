// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { TaskInfo } from "app/widgets/task";
import { useDocument, useTask } from "app/hooks";
import { stripMd, truncateEnd } from "app/utils/string";
import { useNavigate } from "react-router-dom";
import { Icon } from "app/components/common";
import { APPICONS } from "@stacks/types";

interface DocumentTaskProps {
    taskId: string;
}
const DocumentTask: FunctionComponent<DocumentTaskProps> = ({ taskId }) => {
    const { task } = useTask(taskId);
    if (!task) return null;

    return (
        <Popover
            content={<TaskInfo taskId={taskId} />}
            popoverClassName="popover-padded"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <span {...props} className="document">
                    <Icon icon={APPICONS.TASK} size={13} />
                    {truncateEnd(stripMd(task.title), 20)}
                </span>
            )}
        />
    );
};

interface DocumentProjectProps {
    projectId: string;
}
const DocumentProject: FunctionComponent<DocumentProjectProps> = ({ projectId }) => {
    const document = useDocument(projectId);
    const navigate = useNavigate();

    const handleOpenProject = () => {
        navigate(`/project/${projectId}`);
    };

    return (
        <a className="document" onClick={handleOpenProject}>
            <Icon icon={APPICONS.PROJECT} size={13} />
            {document?.text}
        </a>
    );
};

interface DocumentNotepadProps {
    notepadId: string;
}
const DocumentNotepad: FunctionComponent<DocumentNotepadProps> = ({ notepadId }) => {
    const document = useDocument(notepadId);
    const navigate = useNavigate();

    const handleOpenNotepad = () => {
        navigate(`/notepad/${notepadId}`);
    };

    return (
        <a className="document" onClick={handleOpenNotepad}>
            <Icon icon={APPICONS.NOTEPAD} size={13} />
            {document?.text}
        </a>
    );
};

export interface DocumentProps {
    id: string;
    type: string;
}

export const Document: FunctionComponent<DocumentProps> = ({ id, type }) => {
    if (type === "task") {
        return <DocumentTask taskId={id} />;
    } else if (type === "project") {
        return <DocumentProject projectId={id} />;
    } else if (type === "notepad") {
        return <DocumentNotepad notepadId={id} />;
    }

    return null;
};
