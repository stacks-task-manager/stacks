// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    mergeRefs,
    Popover,
    Spinner,
    Tooltip,
} from "@blueprintjs/core";
import { Editor } from "@tiptap/react";
import React, { FunctionComponent, useState } from "react";

import { BlankSlate, Grid, Icon, Scroller } from "app/components/common";
import { IAttachment } from "@stacks/types";
import Dialog from "app/utils/dialog";
import { FromUrlMenuItem } from "app/widgets";
import { getSelectionChain } from "./utils";

interface ImageItemProps {
    editor: Editor;
    small?: boolean;
    onImageAdd?: (callback: (files: IAttachment[]) => void) => void;
    onLoadHistory?: () => Promise<IAttachment[]>;
    onDelete?: (attachmentId: string) => void;
}

export const ImageItem: FunctionComponent<ImageItemProps> = ({
    editor,
    small,
    onImageAdd,
    onLoadHistory,
    onDelete,
}) => {
    const [history, setHistory] = useState<IAttachment[]>([]);
    const [loading, setLoading] = useState(false);
    const hasHistoryLoader = onLoadHistory != null;

    const handleAddImageFromURL = (url: string) => {
        getSelectionChain(editor).setImage({ id: "", src: url }).run();
    };

    const handleAddImage = (file: IAttachment) => {
        if (!file.thumbnailUrl) return;
        editor.chain().focus().setImage({ id: file.id, src: file.thumbnailUrl }).run();
    };

    const handleUploadImage = async () => {
        if (!onImageAdd) return;

        await onImageAdd((files: IAttachment[]) => {
            for (const file of files) {
                handleAddImage(file);
            }
        });
    };

    const handleLoadHistory = async () => {
        if (!hasHistoryLoader) return;

        setHistory([]);
        setLoading(true);

        const files = await onLoadHistory();
        setHistory((files ?? []).filter(file => ["jpg", "jpeg", "gif", "png"].includes(file.extension)));
        setLoading(false);
    };

    const handleDeleteImage = async (image: IAttachment) => {
        const response = await Dialog.confirm("Delete image", "Are you sure you want to delete this image?");

        if (response) {
            onDelete && onDelete(image.id);
        }
    };

    return (
        <Popover
            content={
                <Menu>
                    <MenuItem
                        text="Upload image..."
                        icon={<Icon icon="image-plus" />}
                        onClick={handleUploadImage}
                        disabled={onImageAdd == null}
                    />
                    <FromUrlMenuItem onUrlAdd={handleAddImageFromURL} />
                    {hasHistoryLoader ? (
                        <MenuItem
                            text="From history"
                            icon={<Icon icon="image-check" />}
                            popoverProps={{
                                onOpening: handleLoadHistory,
                            }}
                        >
                            <ImageHistory
                                images={history}
                                loading={loading}
                                onAdd={handleAddImage}
                                onDelete={handleDeleteImage}
                            />
                        </MenuItem>
                    ) : null}
                </Menu>
            }
            placement="bottom-start"
            minimal
            renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content="Image"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen: isOpenTooltip, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            active={isOpen}
                            small={small}
                            minimal
                            icon={<Icon icon="image-01" />}
                        />
                    )}
                />
            )}
        />
    );
};

interface ImageHistoryProps {
    loading: boolean;
    images: IAttachment[];
    onAdd: (image: IAttachment) => void;
    onDelete: (image: IAttachment) => void;
}

const ImageHistory: FunctionComponent<ImageHistoryProps> = ({ loading, images, onAdd, onDelete }) => {
    return (
        <>
            <MenuDivider title="Images" />
            {loading && <Spinner size={32} style={{ padding: "20px 0" }} />}

            <Scroller vertical maxHeight={300} thin>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: 250 }}>
                    {images.length > 0 ? (
                        images.map((image: IAttachment, i: number) => {
                            return (
                                image.thumbnailUrl ? <Popover
                                    key={i}
                                    interactionKind="hover"
                                    placement="top"
                                    content={
                                        <Grid>
                                            <img src={image.thumbnailUrl} height={200} />
                                            <Button
                                                icon={<Icon icon="trash" />}
                                                intent={Intent.DANGER}
                                                className={Classes.POPOVER_DISMISS}
                                                onClick={() => onDelete(image)}
                                            >
                                                {translate("Delete")}
                                            </Button>
                                        </Grid>
                                    }
                                    hoverOpenDelay={500}
                                    popoverClassName="popover-padded-medium"
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    renderTarget={({ isOpen, ...props }) => (
                                        <div
                                            {...props}
                                            style={{
                                                height: 80,
                                                width: 80,
                                                cursor: "pointer",
                                            }}
                                            onClick={() => onAdd(image)}
                                        >
                                            <img
                                                style={{
                                                    objectFit: "cover",
                                                    height: "100%",
                                                    width: "100%",
                                                }}
                                                src={image.thumbnailUrl!}
                                            />
                                        </div>
                                    )}
                                /> : null
                            );
                        })
                    ) : (
                        <BlankSlate
                            icon="image-01"
                            title="History images"
                            description="There are no previously uploaded images."
                            small
                        />
                    )}
                </div>
            </Scroller>
        </>
    );
};
