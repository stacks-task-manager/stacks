// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Icon } from "app/components/common";
import { FilesActions } from "app/store/actions";
import Dialog from "app/utils/dialog";

interface IFileMenuProps {
    attachmentId: string;
    canDelete?: boolean;
    append?: React.ReactNode;
    prepend?: React.ReactNode;
    onDelete?: () => void;
}
export const FileMenu: FunctionComponent<IFileMenuProps> = ({
    attachmentId,
    canDelete,
    append,
    prepend,
    onDelete,
}) => {
    const handleDelete = async () => {
        const response = await Dialog.confirm(
            `${translate("Delete file")}?`,
            "Are you sure you want to delete this file? This action cannot be undone!"
        );
        if (response) {
            const deleted = await FilesActions.remove(attachmentId);
            if (deleted && onDelete) {
                onDelete();
            }
        }
    };

    const handleDownload = () => {
        FilesActions.download(attachmentId);
    };

    const handlePreview = () => {
        FilesActions.preview(attachmentId);
    };

    return (
        <Menu data-testid="file-menu">
            {prepend}

            <MenuItem
                icon={<Icon icon="download-04" />}
                text="Download..."
                onClick={handleDownload}
                data-testid="file-menu-download"
            />
            <MenuItem
                icon={<Icon icon="eye" />}
                text="Preview..."
                onClick={handlePreview}
                data-testid="file-menu-preview"
            />

            {!canDelete ? (
                <>
                    <MenuDivider />
                    <MenuItem
                        icon={<Icon icon="trash" />}
                        text={translate("Delete")}
                        intent={Intent.DANGER}
                        onClick={handleDelete}
                        data-testid="file-menu-delete"
                    />
                </>
            ) : null}
            {append}
        </Menu>
    );
};
