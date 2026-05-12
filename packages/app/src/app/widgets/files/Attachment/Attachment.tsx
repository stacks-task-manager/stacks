// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, MenuDivider, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";
import { Icon } from "app/components/common";
import { IAttachment } from "@stacks/types";
import { formatDate } from "app/utils/date";
import { isCenterTruncated, truncateCenter } from "app/utils/string";
import { FileMenu } from "app/widgets/common";
import { FilesActions } from "app/store/actions";

interface IAttachmentProps {
    file: IAttachment;
    canDelete?: boolean;
    onOpenTask?: () => void;
    onDeleted?: (file: IAttachment) => void;
}
export const Attachment: FunctionComponent<IAttachmentProps> = ({ file, canDelete, onOpenTask, onDeleted }) => {
    const handleDelete = useCallback(() => {
        if (!onDeleted) return;
        onDeleted(file);
    }, [file, onDeleted])

    return (
        <div className="attachment">
            <div className="attachment__toolbar">
                <Popover
                    popoverClassName="popover-padded-medium"
                    content={
                        <div className={Classes.TEXT_MUTED}>
                            <div>
                                {translate("Created on")}{" "}
                                <strong>{formatDate(file.created)}</strong>
                            </div>
                            <div>
                                {translate("Updated on")}{" "}
                                <strong>{formatDate(file.updated)}</strong>
                            </div>
                        </div>
                    }
                >
                    <Button variant="minimal" size="small" icon={<Icon icon="info-circle" size={14} />} />
                </Popover>
                <Popover
                    content={
                        <FileMenu
                            attachmentId={file.id}
                            canDelete={canDelete}
                            onDelete={handleDelete}
                            prepend={
                                <>
                                    {Boolean(onOpenTask) ? (
                                        <React.Fragment>
                                            <MenuItem
                                                text="Open task..."
                                                icon={<Icon icon="link-external-01" />}
                                                onClick={onOpenTask}
                                            />
                                            <MenuDivider />
                                        </React.Fragment>
                                    ) : null}
                                </>
                            }
                        />
                    }
                    placement="bottom-end"
                >
                    <Button variant="minimal" size="small" icon={<Icon icon="dots-vertical" size={14} />} />
                </Popover>
            </div>
            <div className="attachment__icon">
                {!file.thumbnailUrl && <Icon icon="file" size={24} />}
                {file.thumbnailUrl && <img src={file.thumbnailUrl} loading="lazy" />}
                <small>{file.extension}</small>
            </div>
            <div className="attachment__content">
                <Tooltip
                    content={file.originalName}
                    disabled={isCenterTruncated(file.originalName, 50)}
                    placement="top"
                    hoverOpenDelay={1000}
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <div {...props} className="attachment__title" onClick={() => FilesActions.preview(file.id)}>
                            {truncateCenter(file.originalName, 50)}
                        </div>
                    )}
                />
            </div>
            <div className="attachment__footer">
                <div className="attachment__size">{file.humanSize}</div>
                <div className="attachment__actions">
                    <Tooltip content={translate("Download")} placement="top">
                        <Button size="small" variant="minimal" icon={<Icon icon="save-02" />} onClick={() => FilesActions.download(file.id)} />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
