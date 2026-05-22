// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

import { Button, Intent, Menu, MenuItem, Popover, Switch } from "@blueprintjs/core";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Icon, Scroller, SettingRow } from "app/components/common";
import { TASKDETAILMATRIX } from "@stacks/types";
import Log from "app/utils/log";
import classNames from "classnames";
import { produce } from "immer";
import { IPanelInterface } from ".";

type IDragItem = {
    label: string;
    id: string;
    icon: string;
};
const ITEMS: IDragItem[] = [
    { label: "Assignees", id: "assignees", icon: "users" },
    { label: "Priority", id: "priority", icon: "flag" },
    { label: "Status", id: "status", icon: "activity" },
    { label: "Repeats", id: "repeats", icon: "refresh-ccw" },
    { label: "Progress", id: "progress", icon: "percent-02" },
    { label: "Tags", id: "tags", icon: "tags" },
    { label: "Projects", id: "projects", icon: "check-circle-broken" },
    { label: "Estimate", id: "estimate", icon: "clock-check" },
    { label: "Stack", id: "stack", icon: "board-view" },
    { label: "Time Spent", id: "timespent", icon: "clock-stopwatch" },
    { label: "Start Date", id: "startdate", icon: "calendar-plus-02" },
    { label: "Due Date", id: "duedate", icon: "calendar-minus-02" },
    { label: "Do Date", id: "dodate", icon: "calendar-check-02" },
    { label: "Spent Progress", id: "spentprogress", icon: "clock-stopwatch" },
    { label: "Cover image", id: "cover", icon: "image-01" },
    { label: "Tint", id: "tint", icon: "palette" },
    { label: "Task Id", id: "id", icon: "hash-02" },
    { label: "Hourly rate", id: "hourlyRate", icon: "currency-dollar" },
];

export class TaskDetailsPanel extends React.Component<IPanelInterface> {
    private renderUnAssigned = (addIndex: number, row?: boolean) => {
        const { preferences } = this.props;
        const { taskDetailsMatrix, taskDetailsRows } = preferences;
        const items = [...taskDetailsMatrix, ...taskDetailsRows];

        return (
            <Popover
                key={addIndex}
                content={
                    <Menu>
                        {ITEMS.filter((item: IDragItem) => !items.includes(item.id as TASKDETAILMATRIX)).map(
                            item => (
                                <MenuItem
                                    text={item.label}
                                    key={item.id}
                                    icon={<Icon icon={item.icon} />}
                                    onClick={() =>
                                        row
                                            ? this.handleAddRow(item.id as TASKDETAILMATRIX, addIndex)
                                            : this.handleAddGrid(item.id as TASKDETAILMATRIX, addIndex)
                                    }
                                />
                            )
                        )}
                    </Menu>
                }
            >
                <div className={classNames("td-col unassigned", { small: row })} />
            </Popover>
        );
    };

    render() {
        Log.info("[Component][TaskDetailsPanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <Scroller className="preference-panel" vertical thin>
                <DragDropContext onDragEnd={this.handleDragEnd}>
                    <div className="td-grid">
                        <SettingRow
                            title="Task details grid sections"
                            description="Configure the look and feel of the task details."
                            last
                        >
                            <div className="td-grid">
                                <div className="td-row">
                                    {preferences.taskDetailsMatrix.map((item, itemIndex) => {
                                        if (!item) return this.renderUnAssigned(itemIndex);
                                        return (
                                            <div
                                                key={itemIndex}
                                                className={classNames("td-col", {
                                                    unassigned: !item,
                                                    assigned: item,
                                                })}
                                            >
                                                {this.renderAssigned(item)}
                                                {item && (
                                                    <Button
                                                        small
                                                        icon={<Icon icon="trash" />}
                                                        intent={Intent.DANGER}
                                                        onClick={() => this.handleRemoveGrid(itemIndex)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {this.renderUnAssigned(preferences.taskDetailsMatrix.length)}
                                </div>
                            </div>
                        </SettingRow>

                        <SettingRow title="Task details rows sections" last>
                            <div
                                className={classNames("td-rows", {
                                    unassigned: preferences.taskDetailsRows.length === 0,
                                })}
                            >
                                <Droppable droppableId="rows">
                                    {provided => (
                                        <div
                                            className="td-rows-wrapper"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {preferences.taskDetailsRows.map((row, rowIndex) => (
                                                <Draggable key={row} draggableId={row} index={rowIndex}>
                                                    {provided => (
                                                        <div
                                                            className="td-row-item"
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            {this.renderAssigned(row)}{" "}
                                                            <Button
                                                                small
                                                                icon={<Icon icon="trash" />}
                                                                intent={Intent.DANGER}
                                                                onClick={() => this.handleRemoveRow(rowIndex)}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {this.renderUnAssigned(preferences.taskDetailsRows.length, true)}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        </SettingRow>
                    </div>
                </DragDropContext>

                <SettingRow
                    title="Show attachments"
                    description="When turned on, the attachments will be shown in task details tabs."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsAttachments}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsAttachments", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show subtasks"
                    description="When turned on, the subtasks will be shown in task details."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsSubtasks}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsSubtasks", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show dependencies"
                    description="When turned on, the dependencies will be shown in task details tabs."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsDependencies}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsDependencies", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show locations"
                    description="When turned on, the locations will be shown in task details tabs."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsLocations}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsLocations", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show links"
                    description="When turned on, the links will be shown in task details tabs."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsLinks}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsLinks", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show time entries"
                    description="When turned on, the time entries will be shown in task details tabs."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsTime}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsTime", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show comments"
                    description="When turned on, the comments will be shown in task details."
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsComments}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsComments", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title="Show completed subtasks"
                    description="When turned on, the completed subtasks will be shown in task details. (By default completed subtasks are hidden)"
                    rightElement={
                        <Switch
                            checked={preferences.taskDetailsShowCompletedSubtasks}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("taskDetailsShowCompletedSubtasks", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />
            </Scroller>
        );
    }

    private renderAssigned = (id?: string) => {
        if (!id) return null;
        const item = ITEMS.find((item: IDragItem) => item.id === id);
        return (
            <>
                <Icon icon={item!.icon} />
                {item!.label}
            </>
        );
    };

    private handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        const rows = [...this.props.preferences.taskDetailsRows];
        const movedRow = this.props.preferences.taskDetailsRows[source.index];
        rows.splice(source.index, 1);
        rows.splice(destination.index, 0, movedRow);
        this.props.onChange("taskDetailsRows", rows);
    };

    private handleAddGrid = (item: TASKDETAILMATRIX, index: number) => {
        const matrix = produce(this.props.preferences.taskDetailsMatrix, draftMatrix => {
            draftMatrix.splice(index, 1, item);
        });
        this.props.onChange("taskDetailsMatrix", matrix);
    };

    private handleAddRow = (item: TASKDETAILMATRIX, index: number) => {
        const matrix = produce(this.props.preferences.taskDetailsRows, draftRows => {
            draftRows.splice(index, 1, item);
        });
        this.props.onChange("taskDetailsRows", matrix);
    };

    private handleRemoveGrid = (index: number) => {
        const matrix = produce(this.props.preferences.taskDetailsMatrix, draftMatrix => {
            if (draftMatrix.length - 1 === index) {
                draftMatrix.splice(index, 1);
            } else {
                draftMatrix.splice(index, 1, undefined);
            }
        });
        this.props.onChange("taskDetailsMatrix", matrix);
    };

    private handleRemoveRow = (index: number) => {
        const rows = [...this.props.preferences.taskDetailsRows];
        rows.splice(index, 1);
        this.props.onChange("taskDetailsRows", rows);
    };
}
