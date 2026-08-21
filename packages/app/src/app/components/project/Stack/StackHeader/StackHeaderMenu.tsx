// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    FormGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    NumericInput,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { COPYMOVETYPE, TASKSORTING } from "@stacks/types";
import { Icon } from "app/components/common";
import { TintPicker } from "app/components/project";
import { getCurrentProjectId } from "app/hooks";
import { StacksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import React, { FunctionComponent, useRef } from "react";

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

/**
 * Renders the stack-header overflow menu: rename, reorder, sort, tint, task
 * limits, copy/move, and delete actions for a board stack.
 */
export const StackHeaderMenu: FunctionComponent<IStackHeaderMenuProps> = ({
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
                    helperText={translate("Max tasks limit hint")}
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
