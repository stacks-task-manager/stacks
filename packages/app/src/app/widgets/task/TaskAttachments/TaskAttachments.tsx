// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Popover, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useState } from "react";
import { IAttachment } from "@stacks/types";
import { Grid, Icon, RoundButton, Scroller } from "app/components/common";
import { useTaskAttachments } from "app/hooks";
import { AttachmentRow } from "app/widgets/files";

interface TaskAttachmentsProps {
    taskId: string;
    disabled?: boolean;
    asTag?: boolean;
}
export const TaskAttachments: FunctionComponent<TaskAttachmentsProps> = ({ taskId, disabled, asTag }) => {
    const attachments = useTaskAttachments(taskId);

    return (
        <Popover content={<TaskAttachmentsList taskId={taskId} />}>
            <Tooltip
                content={translate("This task has attachments", { count: attachments.length })}
                placement="top"
            >
                {asTag ? (
                    <RoundButton
                        disabled={disabled}
                        icon="attachment-02"
                        title={attachments.length}
                        minimal
                    />
                ) : (
                    <button className={classNames({ disabled })}>
                        <Icon icon="attachment-02" /> {attachments.length}
                    </button>
                )}
            </Tooltip>
        </Popover>
    );
};

interface TaskAttachmentsListProps {
    taskId: string;
}
const TaskAttachmentsList: FunctionComponent<TaskAttachmentsListProps> = ({ taskId }) => {
    const [files, setFiles] = useState<IAttachment[]>([]);

    const loadAttachments = async () => {
        // const files = await FilesAPI.load(taskId);
        // setFiles(files);
        console.log("TaskAttachmentsList load files not implemented");

    };

    useEffect(() => {
        loadAttachments();
    }, []);

    return (
        <Scroller className="popup-subtasks-view" thin vertical shadows maxHeight={300}>
            <Grid gap={10}>
                {files.map((file: IAttachment, i) => (
                    <AttachmentRow key={i} file={file} taskId={taskId} />
                ))}
            </Grid>
        </Scroller>
    );
};
