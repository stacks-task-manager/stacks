// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";
import API from "app/api";
import { Icon } from "app/components/common";
import { IAttachment, IElectronSaveDialog } from "@stacks/types";
import { formatDate } from "app/utils/date";
import Dialog from "app/utils/dialog";
import { humanFileSize } from "app/utils/string";

interface AttachmentRowProps {
    file: IAttachment;
    taskId: string;
}
export const AttachmentRow: FunctionComponent<AttachmentRowProps> = ({ file, taskId }) => {
    const handleOpenFile = () => {
        API("tasks/fileOpen", taskId, file.originalName);
    };

    const handleSaveTo = useCallback(() => {
        Dialog.showSaveDialog({
            title: translate("Select where you want to save the file"),
            buttonLabel: translate("Save"),
            defaultPath: file.originalName,
        }).then((info: IElectronSaveDialog) => {
            if (!info.canceled && info.filePath) {
                API("tasks/fileSave", taskId, file.originalName, info.filePath);
            }
        });
    }, []);

    return (
        <div className="attachment-row">
            <div className="attachment-row__icon">
                {!file.thumbnailUrl && <Icon icon="file" />}
                {file.thumbnailUrl && <img src={file.thumbnailUrl} loading="lazy" />}
                <small>{file.extension}</small>
            </div>
            <div className="attachment-row__content">
                <div className="attachment-row__title" onClick={handleOpenFile}>
                    {file.originalName}
                </div>
                <div className="attachment-row__date">
                    {formatDate(file.created)} - {humanFileSize(file.size)}
                </div>
            </div>
            <div className="attachment-row__action">
                <Tooltip content={`${translate("Save to")}...`} placement="top">
                    <Button size="small" variant="minimal" icon={<Icon icon="save-02" />} onClick={handleSaveTo} />
                </Tooltip>
            </div>
        </div>
    );
};
