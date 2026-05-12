// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Colors,
    FormGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    NumericInput,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { COPYMOVETYPE, TASKSORTING } from "@stacks/types";
import { Icon } from "app/components/common";
import { TintPicker } from "app/components/project";
import { getCurrentProjectId, usePreferences, useStackMenu } from "app/hooks";
import { StacksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import { adjustColor, isLight } from "app/utils/colors";
import classnames from "classnames";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";

interface IStackHeaderMenuProps {
    title: string;
    isColumn: boolean;
    isCollapsed?: boolean;
    hasTasks: boolean;
    isOwner: boolean;
    stackId: string;
    index: number;
    maxTasks: number;
    tint?: string;
    completedCount: number;
    sorting?: TASKSORTING;
    onAdd: () => void;
}

const StackHeaderMenu: FunctionComponent<IStackHeaderMenuProps> = ({
    title,
    isColumn,
    isCollapsed,
    hasTasks,
    stackId,
    index,
    maxTasks,
    tint,
    completedCount,
    sorting,
    onAdd,
}) => {
    const maxTasksRef = useRef<HTMLInputElement>(null);

    const handleCopyMove = () => {
        CopyMoveActions.show({ title, type: COPYMOVETYPE.STACK, stack: stackId });
    };

    const handleSetMaxTasks = () => {
        if (maxTasksRef.current) {
            StacksActions.setMaxTasks(
                stackId,
                Number(maxTasksRef.current.value) <= 0 ? undefined : Number(maxTasksRef.current.value)
            );
        } else {
            StacksActions.setMaxTasks(stackId, undefined);
        }
    };

    const handleRemoveMaxTasks = () => {
        StacksActions.setMaxTasks(stackId, undefined);
        if (maxTasksRef.current) {
            maxTasksRef.current.value = "";
        }
    };

    const handleAddStackAtIndex = (position: number) => {
        StacksActions.add(
            {
                title: translate("Untitled stack"),
                project: getCurrentProjectId(),
            },
            position
        );
    };

    return (
        <Menu data-testid="column-menu">
            <MenuItem icon={<Icon icon="plus" />} text={translate("Add task")} onClick={onAdd} />
            <MenuDivider />

            <MenuItem icon={<Icon icon="switch-vertical-01" />} text={translate("Order tasks")}>
                <MenuItem
                    icon="hand"
                    text={translate("Manual")}
                    labelElement={sorting == null ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId)}
                />
                <MenuDivider />
                <MenuItem
                    icon="sort-alphabetical"
                    text={translate("Title asc")}
                    labelElement={sorting === TASKSORTING.TITLEASC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.TITLEASC)}
                />
                <MenuItem
                    icon="sort-alphabetical-desc"
                    text={translate("Title desc")}
                    labelElement={sorting === TASKSORTING.TITLEDESC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.TITLEDESC)}
                />
                <MenuDivider />
                <MenuItem
                    icon="sort-alphabetical"
                    text={translate("Priority asc")}
                    labelElement={sorting === TASKSORTING.PRIROITYASC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.PRIROITYASC)}
                />
                <MenuItem
                    icon="sort-alphabetical-desc"
                    text={translate("Priority desc")}
                    labelElement={sorting === TASKSORTING.PRIORITYDESC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.PRIORITYDESC)}
                />
                <MenuDivider />
                <MenuItem
                    icon="sort-numerical"
                    text={translate("Due Date asc")}
                    labelElement={sorting === TASKSORTING.DUEDATEASC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.DUEDATEASC)}
                />
                <MenuItem
                    icon="sort-numerical-desc"
                    text={translate("Due Date desc")}
                    labelElement={sorting === TASKSORTING.DUEDATEDESC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.DUEDATEDESC)}
                />
                <MenuDivider />
                <MenuItem
                    icon="sort-numerical"
                    text={translate("Start Date asc")}
                    labelElement={sorting === TASKSORTING.STARTDATEASC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.STARTDATEASC)}
                />
                <MenuItem
                    icon="sort-numerical-desc"
                    text={translate("Start Date desc")}
                    labelElement={sorting === TASKSORTING.STARTDATEDESC ? <Icon icon="check" /> : undefined}
                    onClick={() => StacksActions.orderTasks(stackId, TASKSORTING.STARTDATEDESC)}
                />
            </MenuItem>
            <MenuItem
                icon={<Icon icon="target-03" />}
                text={translate("Set tasks limit")}
                popoverProps={{ popoverClassName: "popover-padded-small" }}
            >
                <FormGroup
                    helperText={translate(
                        "The stack will be highlighted when you go over the max number of unfinished tasks."
                    )}
                    label={translate("Maximum tasks")}
                    labelFor="text-input"
                >
                    <NumericInput
                        defaultValue={maxTasks || undefined}
                        placeholder={translate("No limit set")}
                        min={1}
                        fill
                        inputRef={maxTasksRef}
                        data-testid="max-tasks-input"
                    />
                </FormGroup>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        variant="minimal"
                        size="small"
                        intent={Intent.DANGER}
                        onClick={handleRemoveMaxTasks}
                        data-testid="max-tasks-remove-button"
                    >
                        {translate("Remove")}
                    </Button>
                    <Button
                        size="small"
                        intent={Intent.SUCCESS}
                        onClick={handleSetMaxTasks}
                        data-testid="max-tasks-save-button"
                    >
                        {translate("Save")}
                    </Button>
                </div>
            </MenuItem>

            <MenuDivider />
            <MenuItem
                icon={<Icon icon={isColumn ? "align-left-01" : "arrow-up"} />}
                text={translate(isColumn ? "Add Stack to the left" : "Add tasklist above")}
                onClick={() => handleAddStackAtIndex(index)}
            />
            <MenuItem
                icon={<Icon icon={isColumn ? "align-right-01" : "arrow-down"} />}
                text={translate(isColumn ? "Add Stack to the right" : "Add tasklist below")}
                onClick={() => handleAddStackAtIndex(index + 1)}
            />

            <MenuDivider />
            <MenuItem
                icon={<Icon icon="clipboard" />}
                text={translate("Copy or Move")}
                onClick={handleCopyMove}
            />

            <MenuDivider />
            <MenuItem
                icon={<Icon icon="check-circle" />}
                text={translate("Mark all as done")}
                onClick={() => StacksActions.markAllDone(stackId)}
                disabled={!hasTasks}
            />
            <MenuItem
                icon={<Icon icon="placeholder" />}
                text={translate("Mark all as to do")}
                onClick={() => StacksActions.markAllToDo(stackId)}
                disabled={!hasTasks}
            />
            <MenuDivider />
            <MenuItem
                icon={<Icon icon="archive" />}
                text={translate("Archive all tasks")}
                onClick={() => StacksActions.archiveAll(stackId)}
                disabled={!hasTasks}
            />
            <MenuItem
                icon={<Icon icon="archive" />}
                text={translate("Archive completed tasks")}
                onClick={() => StacksActions.archiveDone(stackId)}
                disabled={!completedCount}
                label={completedCount ? completedCount.toString() : undefined}
            />
            <MenuDivider />
            <MenuItem
                icon={<Icon icon="minimize-01" />}
                text={translate(
                    isCollapsed ? "Uncollapse stack" : isColumn ? "Collapse stack" : "Collapse tasklist"
                )}
                onClick={() => StacksActions.toggleCollapse(stackId)}
            />
            <MenuItem
                icon={<Icon icon="palette" />}
                text={translate("Tint")}
                popoverProps={{ popoverClassName: "popover-padded-small" }}
            >
                <TintPicker
                    value={tint}
                    canClear
                    onChange={(color: string | undefined) => StacksActions.setTint(stackId, color)}
                />
            </MenuItem>

            <MenuDivider />

            <MenuItem
                icon={<Icon icon="trash" />}
                text={`${translate(isColumn ? "Delete stack" : "Delete tasklist")}...`}
                intent={Intent.DANGER}
                onClick={() => StacksActions.alertDelete(stackId)}
            />
        </Menu>
    );
};

interface IStackHeaderProps {
    stackId: string;
    isCollapsed: boolean;
    index: number;
    onShowNew: () => void;
}
export const StackHeader: FunctionComponent<IStackHeaderProps> = ({
    stackId,
    isCollapsed,
    index,
    onShowNew,
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const stackMenu = useStackMenu(stackId);
    const [isEditing, setIsEditing] = useState(false);
    const { showStackProgress, biggerStackHeader } = usePreferences([
        "showStackProgress",
        "biggerStackHeader",
    ]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(0, inputRef.current.value.length);
        }
    }, [isEditing]);

    const largeHeader = useMemo(() => biggerStackHeader && stackMenu != null, [biggerStackHeader, stackMenu]);
    const textColor = useMemo(() => {
        if (!largeHeader) return undefined;
        const backgroundColor = stackMenu!.tint || Colors.GRAY3;
        return isLight(backgroundColor, 227) ? Colors.DARK_GRAY5 : "#fff";
    }, [biggerStackHeader, stackMenu?.tint]);

    const headerStyles = useMemo(() => {
        if (!largeHeader) return {};
        return {
            backgroundColor: stackMenu!.tint || Colors.GRAY3,
            borderColor: adjustColor(stackMenu!.tint ?? Colors.GRAY3, -20),
            textShadow: `0 1px 1px ${adjustColor(stackMenu!.tint ?? Colors.GRAY3, -50)}`,
            color: textColor,
        };
    }, [biggerStackHeader, stackMenu?.tint]);

    if (!stackMenu) return null;

    const { title, progress, completedCount, uncompleteCount, tasksCount, maxTasks, tint, limit, sorting } =
        stackMenu;

    const handleSetEditing = () => {
        if (isCollapsed) {
            StacksActions.toggleCollapse(stackId);
            return;
        }

        setIsEditing(true);
    };

    const handleToggleCollapse = () => {
        StacksActions.toggleCollapse(stackId);
    };

    const handleBlur = () => {
        if (inputRef.current && inputRef.current.value !== title) {
            StacksActions.setTitle(stackId, inputRef.current.value);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();

            if (inputRef.current) {
                if (e.key === "Escape") {
                    inputRef.current.value = title;
                }
                inputRef.current.blur();
            }
        }
    };

    return (
        <div
            className={classnames("stack-header", {
                large: largeHeader,
                "draggable-stack": !isEditing,
            })}
            style={headerStyles}
            data-testid="column-header"
        >
            {limit && (
                <Tooltip
                    content={`This stack reached the set limit of ${maxTasks} uncompleted tasks`}
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props} className="stack-limit" data-testid="task-stack-limit-indicator">
                            !
                        </span>
                    )}
                />
            )}

            {!isEditing && !biggerStackHeader && (
                <Popover
                    content={
                        <TintPicker
                            value={tint}
                            canClear
                            onChange={(color: string | undefined) => StacksActions.setTint(stackId, color)}
                        />
                    }
                    popoverClassName="popover-padded-medium"
                    placement="bottom"
                >
                    <div
                        className="stack-tint"
                        style={{ backgroundColor: tint || Colors.LIGHT_GRAY1 }}
                        data-testid="column-header-tint-button"
                    />
                </Popover>
            )}

            {showStackProgress && <div className="stack-header-progress">{progress || 0}%</div>}
            <div
                className={classnames("stack-header-title-wrapper", {
                    isEditing,
                })}
                data-testid="column-header-wrapper"
                onDoubleClick={handleSetEditing}
            >
                {!isEditing && (
                    <span className="stack-header-title" data-testid="column-header-title">
                        {title}
                    </span>
                )}
                {isEditing && !isCollapsed && (
                    <input
                        defaultValue={title}
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        data-testid="column-header-title-input"
                    />
                )}
                {!isEditing && (
                    <Tooltip
                        content={`${completedCount} completed out of ${tasksCount}`}
                        placement="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...props }) => (
                            <span
                                {...props}
                                className="stack-header-counter"
                                data-testid="columns-task-counter"
                            >
                                {completedCount + uncompleteCount}
                            </span>
                        )}
                    />
                )}
            </div>
            {!isEditing && (
                <div className="stack-options">
                    {/* {maxTasks > 0 && (
                        <span className="stack-max-tasks">
                            {uncompleteCount}/{maxTasks}
                        </span>
                    )} */}

                    <Tooltip
                        content={translate(isCollapsed ? "Uncollapse stack" : "Collapse stack")}
                        className="stack-header-toggle"
                        placement="top"
                    >
                        <Button
                            icon={
                                <Icon
                                    icon={isCollapsed ? "chevron-right" : "chevron-left"}
                                    color={textColor}
                                />
                            }
                            variant="minimal"
                            size="small"
                            intent={Intent.NONE}
                            onClick={handleToggleCollapse}
                            data-testid="column-header-collapse-button"
                        />
                    </Tooltip>

                    {!isCollapsed && (
                        <Popover
                            content={
                                <StackHeaderMenu
                                    title={title}
                                    stackId={stackId}
                                    hasTasks={completedCount + uncompleteCount > 0}
                                    maxTasks={maxTasks}
                                    tint={tint}
                                    isColumn={true}
                                    isCollapsed={isCollapsed}
                                    isOwner={true}
                                    index={index}
                                    completedCount={completedCount}
                                    sorting={sorting}
                                    onAdd={onShowNew}
                                />
                            }
                            placement="bottom-end"
                            autoFocus={false}
                            className="stack-header-menu"
                        >
                            <Button
                                icon={<Icon icon="dots-vertical" color={textColor} />}
                                variant="minimal"
                                size="small"
                                data-testid="column-header-menu-button"
                            />
                        </Popover>
                    )}

                    {!isCollapsed && (
                        <Tooltip content={translate("Add a task on top")} placement="top">
                            <Button
                                icon={<Icon icon="plus" color={textColor} />}
                                variant="minimal"
                                size="small"
                                onClick={onShowNew}
                                data-testid="column-header-add-button"
                            />
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
};
