// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import chunk from "lodash/chunk";
import React, { FunctionComponent, useEffect } from "react";
import { APPICONS, FILES_TYPE, IAttachment } from "@stacks/types";
import { BlankSlate, Col, Grid, RoundButton, Row } from "app/components/common";
import { useElementHotkey, useTaskAttachments } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { AttachmentsActions } from "app/store/actions";
import { Attachment } from "app/widgets";

interface ITaskDetailsAttachmentsProps {
    taskId: string;
    disabled?: boolean;
}
export const TaskDetailsAttachments: FunctionComponent<ITaskDetailsAttachmentsProps> = ({
    taskId,
    disabled,
}) => {
    const { pickFiles } = useUpload();
    const attachments = useTaskAttachments(taskId);
    useElementHotkey("shift+f", "td-attachments");

    useEffect(() => {
        AttachmentsActions.load(taskId)
    }, [])

    const handleAttacheFiles = () => {
        const { onProgress } = pickFiles({
            recordId: taskId, type: FILES_TYPE.TASK_ATTACHMENT, onUploaded: (attachments: IAttachment[]) => {
                AttachmentsActions.appendAttachments(taskId, attachments);
            }
        });

        onProgress((progress) => {
            // console.log("onProgress", progress);
        })
    }

    const handleDeleteFile = (attachment: IAttachment) => {
        AttachmentsActions.deleteAttachment(taskId, attachment.id);
    }

    if (attachments.length === 0) {
        return (
            <Row>
                <Col justify="center">
                    <BlankSlate
                        icon={APPICONS.FILE}
                        title={translate("No attachments")}
                        description={translate("This task does not have any attachments yet Click the button below to add the first one or drag and drop any files here")}
                        small
                        maxWidth={250}
                    >
                        {!disabled && (<RoundButton
                            id="td-attachments"
                            minimal
                            title={translate("Select files")}
                            icon="file-plus-02"
                            disabled={disabled}
                            onClick={handleAttacheFiles}
                        />)}
                    </BlankSlate>
                </Col>
            </Row>
        );
    }

    return (
        <Grid gap={20}>
            {chunk(attachments, 2).map(([file1, file2], i) => (
                <Row padding={30} gutter={10} key={i}>
                    <Col align="stretch">
                        <Attachment file={file1} onDeleted={handleDeleteFile} />
                    </Col>
                    <Col>{file2 && <Attachment file={file2} onDeleted={handleDeleteFile} />}</Col>
                </Row>
            ))}

            {!disabled ? (
                <Row padding={30}>
                    <Col>
                        <RoundButton
                            id="td-attachments"
                            minimal
                            title={translate("Select files")}
                            icon="file-plus-02"
                            onClick={handleAttacheFiles}
                        />
                    </Col>
                </Row>
            ) : null}
        </Grid>
    );
};
