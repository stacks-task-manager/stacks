// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { ITask } from "@stacks/types";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common";
import { useTaskMenuActions } from "app/hooks";
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import { TasksActions } from "app/store/actions";
import { toggleNewBookmark } from "app/store/global";
import { share } from "app/utils/url";
import { StacksMenu } from "app/widgets";
import React, { FunctionComponent } from "react";

interface ITaskDetailsMenuProps {
    task: ITask;
    archived?: boolean;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
    onTogglePrivacy: () => void;
    onToggleParent: () => void;
}

/**
 * Renders the task-details overflow menu for a single task: export (xlsx/json/pdf),
 * copy-move, archive/delete, privacy, parent, bookmark, share, and stack sub-menus.
 */
export const TaskDetailsMenu: FunctionComponent<ITaskDetailsMenuProps> = ({
    task,
    archived,
    disabled,
    onClose,
    onTogglePrivacy,
    onToggleParent,
}) => {
    const {
        handleToggleComplete,
        handleArchive,
        handleUnarchive,
        handleDeleteTask,
        handleCopyMove,
        handleExport,
    } = useTaskMenuActions(task, { onClose });

    if (archived) {
        return (
            <Menu data-testid="task-details-menu">
                <MenuItem
                    text={translate("Unarchive")}
                    intent={Intent.SUCCESS}
                    icon={<Icon icon="archive" />}
                    onClick={() => handleUnarchive()}
                    data-testid="task-details-menu-unarchive"
                />
                <MenuItem
                    text={translate("Unarchive to")}
                    intent={Intent.SUCCESS}
                    icon={<Icon icon="archive" />}
                >
                    <StacksMenu
                        projectId={task.project}
                        showTitle
                        onClick={handleUnarchive}
                        selected={undefined}
                        nested
                    />
                </MenuItem>
                <MenuDivider />
                <MenuItem
                    text={translate("Delete task", { suffix: "..." })}
                    intent={Intent.DANGER}
                    icon={<Icon icon="trash" />}
                    onClick={handleDeleteTask}
                    data-testid="task-details-menu-delete"
                />
            </Menu>
        );
    }

    return (
        <Menu data-testid="task-details-menu">
            <MenuItem
                text={taskToggleDoneLabel(Boolean(task?.done))}
                intent={task?.done ? Intent.PRIMARY : Intent.SUCCESS}
                icon={<Icon icon={task?.done ? "circle" : "check-circle"} />}
                onClick={handleToggleComplete}
                data-testid="task-details-menu-toggle-complete"
            />

            <MenuDivider />
            <MenuItem
                text={translate("Bookmark")}
                icon={<Icon icon="bookmark" />}
                onClick={toggleNewBookmark}
                data-testid="task-details-menu-bookmark"
            />
            <MenuItem
                text={translate("Share link")}
                icon={<Icon icon="link-01" />}
                onClick={() => share(`t/${task.id}`)}
                data-testid="task-details-menu-share-link"
            />
            <MenuDivider />
            <MenuItem
                text={translate("Copy or Move")}
                icon={<Icon icon="clipboard" />}
                disabled={disabled}
                onClick={handleCopyMove}
                data-testid="task-details-menu-copy-move"
            />
            <MenuItem
                text={translate("Export")}
                icon={<Icon icon="download-04" />}
                data-testid="task-details-menu-export"
            >
                <MenuItem
                    text={translate("Export as", { type: ".xlsx" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("xlsx")}
                    data-testid="task-details-menu-export-xlsx"
                />
                <MenuItem
                    text={translate("Export as", { type: ".json" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("json")}
                    data-testid="task-details-menu-export-json"
                />
                <MenuItem
                    text={translate("Export as", { type: ".pdf" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("pdf")}
                    data-testid="task-details-menu-export-pdf"
                />
            </MenuItem>

            <MenuDivider />
            {task.parent == null ? (
                <MenuItem
                    text={translate("Attach task")}
                    icon={<Icon icon="git-branch-01" />}
                    disabled={disabled}
                    onClick={onToggleParent}
                    data-testid="task-details-menu-attach-parent"
                />
            ) : (
                <MenuItem
                    icon={<Icon icon="git-merge" />}
                    text={translate("Detach from parent")}
                    onClick={() => TasksActions.alertDetach(task.id)}
                    intent={Intent.WARNING}
                    disabled={disabled}
                    data-testid="task-details-menu-detach-parent"
                />
            )}

            <MenuDivider />

            <MenuItem
                text={`${translate("Privacy")}...`}
                icon={<Icon icon="lock-01" />}
                disabled={disabled}
                onClick={onTogglePrivacy}
                data-testid="task-details-menu-privacy"
            />
            <MenuDivider />

            <MenuItem
                text={translate("Archive task")}
                intent={Intent.WARNING}
                icon={<Icon icon="archive" />}
                onClick={handleArchive}
                data-testid="task-details-menu-archive"
            />
            <MenuItem
                text={translate("Delete task", { suffix: "..." })}
                intent={Intent.DANGER}
                icon={<Icon icon="trash" />}
                onClick={handleDeleteTask}
                data-testid="task-details-menu-delete"
            />
        </Menu>
    );
};
