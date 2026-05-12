// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

interface IPopupAttachmentsViewProps {
    attachments: null;
}

export class PopupAttachmentsView extends React.PureComponent<IPopupAttachmentsViewProps> {
    render() {
        const { attachments } = this.props;

        if (!attachments) {
            return null;
        }

        return (
            <div className="popup-attachments-view">
                {/* {attachments.content.map((attachment: ITaskAttachment, i: number) => {
                    return (
                        <div key={i} className="popup-attachments-view-attachment">
                            <div className="popup-attachments-view-attachment-preview">
                                {attachment.extension?.toUpperCase()}
                            </div>
                            <div className="popup-attachments-view-attachment-info">
                                <span
                                    className="link bp4-popover-dismiss"
                                    onClick={() => this.handleOpenFile(attachment)}
                                >
                                    {truncateCenter(attachment.title, 35)}
                                    {attachment.size &&
                                        attachment.type === "file" &&
                                        ` - ${humanFileSize(attachment.size)}`}
                                    &nbsp;
                                    <Icon icon="arrow-top-right" iconSize={9} />
                                </span>
                                <Tooltip
                                    content={format(new Date(attachment.created), "MMM do, yyyy - p")}
                                    wrapperTagName="div"
                                    className="popup-attachments-view-attachment-date"
                                    openOnTargetFocus={false}
                                >
                                    <React.Fragment>
                                        {" "}
                                        {formatDistanceToNow(new Date(attachment.created), { addSuffix: true })}
                                    </React.Fragment>
                                </Tooltip>
                            </div>
                            {attachment.type === "file" && (
                                <div className="popup-attachments-view-attachment-download">
                                    <Tooltip
                                        content={translate("Download")}
                                        position={Position.TOP}
                                        usePortal
                                        openOnTargetFocus={false}
                                    >
                                        <Button
                                            small
                                            minimal
                                            icon={<Icon icon="cloud-download" iconSize={12} />}
                                            onClick={() => this.handleDownloadFile(attachment)}
                                        />
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    );
                })} */}
            </div>
        );
    }

    private handleDownloadFile = (attachment: null) => {
        // if (attachment.type === "link") {
        //     shell.openExternal(attachment.content);
        //     return;
        // }
        // const { task } = this.props;
        // Dialog.showSaveDialog({
        //     title: t("tasks.select-save-destination"),
        //     buttonLabel: t("common.save"),
        //     defaultPath: attachment.content,
        // }).then((info: IElectronSaveDialog) => {
        //     if (!info.canceled && info.filePath) {
        //         TasksAPI.dettach(task.id, attachment.content, info.filePath);
        //     }
        // });
    };

    private handleOpenFile = (attachment: null) => {
        // if (attachment.type === "link") {
        //     shell.openExternal(attachment.content);
        //     return;
        // }
        // const { task } = this.props;
        // TasksAPI.open(task.id, attachment);
    };
}
