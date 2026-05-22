// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Colors,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";

import { Avatar, Icon, ToolbarButton } from "app/components/common";
import { useNav } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { NotepadActions, PeopleActions, RecordActions } from "app/store/actions";
import { showPermissions, toggleNewBookmark } from "app/store/global";
import { NotepadStore } from "app/store/notepad";
import { PeopleStore } from "app/store/people";
import { formatDate } from "app/utils/date";
import toast from "app/utils/toast";
import { share } from "app/utils/url";
import { DocumentTintMenuItem, ToolbarTitle } from "app/widgets";

export const ToolbarNotepad = () => {
    const { isLoading, editingBy } = NotepadStore.use(
        state => ({
            isLoading: state.isLoading,
            editingBy: state.editingBy,
        }),
        shallowEqual
    );
    const params = useParams();
    const nav = useNav();
    const notepadId = params.id;

    const handleExport = useCallback((type: "pdf" | "html") => {
        NotepadActions.exportNotepad(NotepadStore.get().notepad?.content ?? "", type);
    }, []);

    const isSomebodyEditing = useMemo(() => {
        if (!Boolean(editingBy)) return false;
        const { me } = PeopleStore.get();
        if (me && me === editingBy) return false;
        return true;
    }, [editingBy]);

    const editingPerson = useMemo(() => {
        if (!isSomebodyEditing) return null;
        const person = PeopleActions.getPerson(editingBy!);
        if (!person) return null;

        return (
            <Tooltip
                content={`${person.firstName} ${person.lastName} is editing this notepad`}
                placement="left"
            >
                <Avatar person={person} small />
            </Tooltip>
        );
    }, [isSomebodyEditing]);

    const handleDelete = async () => {
        if (!notepadId) {
            return;
        }

        const deleted = await RecordActions.removeDocumentAlert(notepadId);

        if (deleted) {
            NotepadActions.removeById(notepadId);
            toast.success("Notepad deleted successfully");
            nav("/");
        }
    };

    const handleToggleVisibility = () => {
        const { notepad } = NotepadStore.get();
        if (!notepad) return;
        showPermissions(notepad.permissions, updatedPermissions => {
            NotepadActions.updatePermissions(notepad.id, updatedPermissions);
        });
    };

    if (isLoading) return <ToolbarNotepadLoading />;

    return (
        <div className="main-toolbar single">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <ToolbarTitle documentId={notepadId} />
                    </div>
                    <div className="section-toolbar-options">
                        <Popover
                            content={
                                <Menu>
                                    <MenuItem
                                        text={translate("Bookmark")}
                                        icon={<Icon icon="bookmark" />}
                                        onClick={toggleNewBookmark}
                                    />
                                    <MenuItem text={translate("Export")} icon={<Icon icon="download-04" />}>
                                        <MenuItem
                                            text={translate("Export as", { type: ".pdf" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("pdf")}
                                        />
                                        <MenuItem
                                            text={translate("Export as", { type: ".html" })}
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("html")}
                                        />
                                        {/* <MenuItem
                                            text="Export to .md"
                                            icon={<Icon icon="download-04" />}
                                            onClick={() => handleExport("md")}
                                        /> */}
                                    </MenuItem>
                                    <MenuItem
                                        text={translate("Copy notepad link")}
                                        icon={<Icon icon="link-external-01" />}
                                        onClick={() => share(`n/${notepadId}`)}
                                    />
                                    <MenuItem
                                        text={translate("Duplicate notepad")}
                                        icon={<Icon icon="copy" />}
                                        disabled
                                    />
                                    <MenuDivider />
                                    {notepadId && <DocumentTintMenuItem documentId={notepadId} />}

                                    <MenuItem
                                        text={`${translate("Privacy")}...`}
                                        icon={<Icon icon="lock-01" />}
                                        onClick={handleToggleVisibility}
                                    />

                                    <MenuDivider />
                                    <MenuItem
                                        text={`${translate("Delete notepad")}...`}
                                        intent={Intent.DANGER}
                                        icon={<Icon icon="trash" />}
                                        onClick={handleDelete}
                                    />
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                        </Popover>

                        <NotepadInfoButton />

                        <NotepadPrivacyIcon onClick={handleToggleVisibility} />
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    {editingPerson}

                    {/* <ToolbarButton
                        icon="lock-unlocked-01"
                        title="Take control"
                        active
                        intent={Intent.WARNING}
                        tooltip="You will overwrite everything the other person is writing if you take control."
                        onClick={NotepadActions.toggleEditing}
                    /> */}
                </div>
            </div>
        </div>
    );
};

interface INotepadPrivacyIconProps {
    onClick: () => void;
}
const NotepadPrivacyIcon: FunctionComponent<INotepadPrivacyIconProps> = ({ onClick }) => {
    const { notepad } = NotepadStore.use();

    if (notepad?.permissions.isPublic) return null;

    return (
        <ToolbarButton
            icon="shield-tick"
            tooltip={translate("This notepad is private")}
            placement="bottom"
            iconColor={Colors.RED3}
            onClick={onClick}
        />
    );
};

const ToolbarNotepadLoading = () => {
    return (
        <div className="main-toolbar single">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <InputGroup className={Classes.SKELETON} />
                    </div>
                    <div className="section-toolbar-options">
                        <Button className={Classes.SKELETON} />
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <Button className={Classes.SKELETON}>Lorem ipsum</Button>
                </div>
            </div>
        </div>
    );
};

const NotepadInfoButton = () => {
    const { notepad } = NotepadStore.use();

    return (
        <Popover
            content={
                <div className={Classes.TEXT_MUTED}>
                    <div>
                        {translate("Created on")} <strong>{formatDate(notepad?.created)}</strong>
                    </div>
                    <div>
                        {translate("Updated on")} <strong>{formatDate(notepad?.updated)}</strong>
                    </div>
                </div>
            }
            placement="bottom"
            popoverClassName="popover-padded-medium"
        >
            <ToolbarButton icon="info-circle" tooltip="View notepad info" placement="bottom" />
        </Popover>
    );
};
