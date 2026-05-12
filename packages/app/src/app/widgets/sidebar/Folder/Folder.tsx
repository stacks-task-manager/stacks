// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useState } from "react";
import { Intent, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { useMatch, useNavigate } from "react-router-dom";
import { useDragOver } from "@minoru/react-dnd-treeview";
import { shallowEqual } from "app/hooks/store";

import { TreeNode } from "@stacks/types";
import Log from "app/utils/log";
import { RecordActions } from "app/store/actions";
import { Confirm, Icon } from "app/components/common";
import { SidebarButton } from "app/widgets/sidebar";
import { setSelectedRecord, SidebarStore } from "app/store/sidebar";

interface IFolder2Props {
    folder: TreeNode;
    depth: number;
    isOpen: boolean;
    onClick: () => void;
}
export const Folder: FunctionComponent<IFolder2Props> = ({ folder, depth, isOpen, onClick }) => {
    const selectedRecord = SidebarStore.use(state => state.selectedRecord, shallowEqual);
    const dragOverProps = useDragOver(folder.id, isOpen, onClick);
    const navigate = useNavigate();
    const match = useMatch("/:type/:id");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = () => {
        setTimeout(async () => {
            const { answer } = await Confirm({
                title: "Delete folder",
                description: translate("Are you sure you want to delete this folder All boards stacks and tasks will also be deleted This action cannot be undone"),
                intent: Intent.DANGER,
            });

            if (answer) {
                setIsLoading(true);
                if (isOpen) {
                    onClick();
                }

                if (match && match.params) {
                    const childRecords = RecordActions.getChildren(folder.id);
                    const currentRecord = childRecords.find(
                        (record: TreeNode) => record.id === match.params.id
                    );
                    if (currentRecord) {
                        navigate("/");
                    }
                }

                RecordActions.removeFolder(folder.id);
            } else {
                setIsLoading(false);
            }
        });
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        Log.info("[Component][SidebarNested]", "handleFolderSelect", folder.id);

        if (!isEditing) {
            setSelectedRecord(folder.id);
            onClick();
        }
    };

    const handleSave = (title: string) => {
        if (title.trim() !== folder.title) {
            RecordActions.setTitle(title.trim(), folder.id);
        }
        setIsEditing(false);
    };

    return (
        <SidebarButton
            title={folder.title}
            icon={isOpen ? "folder-minus" : "folder-plus"}
            depth={depth + 1}
            onClick={handleClick}
            isEditing={isEditing}
            isSelected={Boolean(selectedRecord && selectedRecord === folder.id)}
            menu={
                <Menu data-testid="sidebar-folder-menu">
                    <MenuItem
                        icon={<Icon icon="edit-05" />}
                        text={`${translate("Edit folder")}...`}
                        onClick={() => setIsEditing(true)}
                    />
                    <MenuDivider />
                    <MenuItem
                        icon={<Icon icon="trash" />}
                        text={`${translate("Delete folder")}...`}
                        intent={Intent.DANGER}
                        onClick={handleDelete}
                    />
                </Menu>
            }
            isLoading={isLoading}
            disabled={isLoading}
            onChange={handleSave}
            {...dragOverProps}
        ></SidebarButton>
    );
};
