// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Menu, MenuDivider, MenuItem, mergeRefs, Popover, Spinner, Tooltip } from "@blueprintjs/core";
import { Editor } from "@tiptap/react";
import React, { FunctionComponent, useState } from "react";
import { APPICONS, IAttachment } from "@stacks/types";
import { BlankSlate, Icon, Scroller } from "app/components/common";
import { humanFileSize } from "app/utils/string";

interface AttachmentItemProps {
    editor: Editor;
    small?: boolean;
    onFileAdd?: (callback: (files: IAttachment[]) => void) => void;
    onLoadHistory?: () => Promise<IAttachment[]>;
    onDelete?: (attachmentId: string) => void;
}

export const AttachmentItem: FunctionComponent<AttachmentItemProps> = ({
    editor,
    small,
    onFileAdd,
    onLoadHistory,
}) => {
    const [history, setHistory] = useState<IAttachment[]>([]);
    const [loading, setLoading] = useState(false);
    const hasHistoryLoader = onLoadHistory != null;

    const handleLoadHistory = async () => {
        if (!hasHistoryLoader) return;

        setHistory([]);
        setLoading(true);

        const files = await onLoadHistory();
        if (files) {
            setHistory(files);
        }
        setLoading(false);
    };

    const handleAttachFile = (attachment: IAttachment) => {
        editor
            .chain()
            .focus()
            .setAttachment({
                id: attachment.id,
                file: attachment.originalName,
                size: attachment.size,
            })
            .run();
    };

    const handleAddFile = async () => {
        if (!onFileAdd) return;

        onFileAdd((attachments: IAttachment[]) => {
            for (const attachment of attachments) {
                handleAttachFile(attachment);
            }
        });
    };

    return (
        <Popover
            minimal
            content={
                <Menu>
                    <MenuItem
                        text="From local file..."
                        icon={<Icon icon="file-plus-02" />}
                        onClick={handleAddFile}
                    />
                    {hasHistoryLoader ? (
                        <MenuItem
                            text="From history"
                            icon={<Icon icon="file-attachment-02" />}
                            popoverProps={{
                                onOpening: handleLoadHistory,
                            }}
                        >
                            <FileHistory files={history} loading={loading} onAdd={handleAttachFile} />
                        </MenuItem>
                    ) : null}
                </Menu>
            }
            placement="bottom-start"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content="Attachment"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            size={small ? "small" : undefined}
                            variant="minimal"
                            icon={<Icon icon={APPICONS.FILE} />}
                        />
                    )}
                />
            )}
        />
    );
};

interface FileHistoryProps {
    loading: boolean;
    files: IAttachment[];
    onAdd: (image: IAttachment) => void;
}

const FileHistory: FunctionComponent<FileHistoryProps> = ({ loading, files, onAdd }) => {
    return (
        <>
            <MenuDivider title={translate("Attachments")} />
            {loading && <Spinner size={32} style={{ padding: "20px 0" }} />}

            <Scroller vertical maxHeight={300} thin>
                {files.length > 0 ? (
                    files.map((file: IAttachment, i: number) => {
                        const icon = ["jpg", "png", "gif", "jpeg"].includes(file.extension)
                            ? "image-01"
                            : "file-04";
                        return (
                            <MenuItem
                                text={file.originalName}
                                key={`${file.originalName}-${i}`}
                                icon={<Icon icon={icon} />}
                                labelElement={<small>{humanFileSize(file.size)}</small>}
                                onClick={() => onAdd(file)}
                            />
                        );
                    })
                ) : (
                    <BlankSlate
                        icon="file-04"
                        title="History files"
                        description="There are no previously uploaded files."
                        small
                    />
                )}
            </Scroller>
        </>
    );
};
