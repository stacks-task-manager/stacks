// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Colors, Intent, Menu, MenuDivider, MenuItem, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router-dom";

import { Icon } from "app/components/common";
import { nav } from "app/hooks";
import { APPICONS, RECORDTYPE, TreeNode } from "@stacks/types";
import { FilesActions, NotepadActions, ProjectsActions, RecordActions } from "app/store/actions";
import { RecentsActions } from "app/store/actions/recents";
import { setUnselectAll } from "app/store/sidebar";
import Toast from "app/utils/toast";
import { DocumentTintMenuItem } from "app/widgets/common";
import { SidebarButton } from "app/widgets/sidebar";
import { SymbolCircle } from "@blueprintjs/icons";

interface IDocumentProps {
    record: TreeNode;
    depth: number;
}
export const Document: FunctionComponent<IDocumentProps> = ({ record, depth }) => {
    const [editing, setEditing] = useState(false);
    const history = useNavigate();
    const location = useLocation();
    const type = record.type.toUpperCase();

    const icon = APPICONS[type.toUpperCase() as unknown as keyof typeof APPICONS] as string;

    const isSelected = useMemo(() => {
        const locationData = location.pathname.split("/");
        return locationData[2] === record.id;
    }, [location]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isSelected) return;
        event.stopPropagation();
        handleSelect();
    };

    const toggleEditing = () => {
        setEditing(!editing);
    };

    const handleRename = (newTitle: string) => {
        RecordActions.setTitle(newTitle, record.id);

        toggleEditing();
    };

    const handleSelect = () => {
        if (isSelected) return;

        setUnselectAll();

        const recordPath = `/${record.type}/${record.id}`;

        history(recordPath, { replace: true });
        RecentsActions.addVerbose(record.title, recordPath, record.type);
    };

    const handleArchive = async () => {
        const archived = await RecordActions.archiveDocumentAlert(record.id);
        if (archived) {
            Toast.success("Record archived successfully");
        }

        if (isSelected) {
            nav("/");
        }
    };

    const handleUnarchive = async () => {
        const unarchived = await RecordActions.unarchiveDocumentAlert(record.id);
        if (unarchived) {
            Toast.success("Record unarchived successfully");
        }
    };

    const handleDelete = async () => {
        const deletedRecord = await RecordActions.removeDocumentAlert(record.id);
        if (deletedRecord && record.id) {
            if (record.type === RECORDTYPE.PROJECT) {
                ProjectsActions.removeById(record.id);
            } else if (record.type === RECORDTYPE.NOTEPAD) {
                NotepadActions.removeById(record.id);
            } else if (record.type === RECORDTYPE.FILE) {
                Boolean(await FilesActions.removeByRecord(record.id));
            }

            Toast.success("Record deleted successfully");

            if (isSelected) {
                nav("/");
            }
        }
    };

    return (
        <SidebarButton
            title={record.title}
            icon={icon}
            isActive={isSelected}
            isEditing={editing}
            depth={depth + 1}
            menu={
                <Menu data-testid="sidebar-document-menu">
                    <MenuItem
                        text={translate("Rename")}
                        icon={<Icon icon="edit-05" />}
                        onClick={toggleEditing}
                    />
                    <DocumentTintMenuItem documentId={record.id} />

                    <MenuDivider />
                    {record.archived != null ? (
                        <MenuItem
                            text={
                                <>
                                    {translate("Unarchive")}
                                    ...
                                </>
                            }
                            icon={<Icon icon="archive" />}
                            intent={Intent.WARNING}
                            onClick={handleUnarchive}
                        />
                    ) : (
                        <MenuItem
                            text={
                                <>
                                    {translate("Archive")}
                                    ...
                                </>
                            }
                            icon={<Icon icon="archive" />}
                            intent={Intent.WARNING}
                            onClick={handleArchive}
                        />
                    )}
                    <MenuItem
                        text={
                            <>
                                {translate("Delete")}
                                ...
                            </>
                        }
                        icon={<Icon icon="trash" />}
                        intent={Intent.DANGER}
                        onClick={handleDelete}
                    />
                </Menu>
            }
            onClick={handleClick}
            onDoubleClick={toggleEditing}
            onChange={handleRename}
        >
            {record.tint ? <SymbolCircle color={record.tint} /> : null}
            {record.archived != null ? (
                <Tooltip
                    content="This record is archived"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <Icon {...props} icon="archive" size={12} color={Colors.BLUE3} />
                    )}
                />
            ) : null}

            {!record.permissions.isPublic && (
                <Tooltip
                    content="This document is private"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Icon {...props} ref={ref} icon="shield-tick" color={Colors.RED3} />
                    )}
                />
            )}
        </SidebarButton>
    );
};
