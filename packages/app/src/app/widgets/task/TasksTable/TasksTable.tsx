// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Colors, Intent, Tag } from "@blueprintjs/core";
import { DropResult } from "@hello-pangea/dnd";
import React, { CSSProperties, FunctionComponent, useMemo } from "react";
import { GROUPING_TYPE, ITableColumns, ITask } from "@stacks/types";
import {
    Avatar,
    DatePickerButton,
    Icon,
    TablePersistent,
    TablePersistentCellProps,
    TablePersistentData,
    TablePersistentGroupData,
    TablePersistentGroupProps,
} from "app/components/common";
import { OverflowTextCell } from "app/components/common/Table/Cells";
import {
    PriorityPicker,
    TaskEstimates,
    TaskParent,
    TaskProgressCell,
    TaskSpentProgress,
    TaskStackPicker,
    TaskState,
    TaskSubtasks,
    TaskTags,
    TimeTracker,
} from "app/components/project";
import { getDocument, getStack, useNav, usePreferences } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { shallowEqual } from "app/hooks/store";
import { TasksActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { PreferencesStore } from "app/store/preferences";
import { getTextColor } from "app/utils/colors";
import { formatDate, formatDuration } from "app/utils/date";
import { stripMd } from "app/utils/string";
import { TableStore } from "app/views/Project/Table/store";
import { TaskAttachments, TaskStatusBar } from "app/widgets";
import { TaskStatus } from "app/widgets/status";
import { TaskAssignees } from "../TaskAssignees/TaskAssignees";
import { Link } from "react-router-dom";

const defaultVisibleColumns = ["title", "startdate", "duedate", "progress", "tags", "stack"];

interface TasksTableProps {
    tasks: TablePersistentGroupData<ITask>[] | TablePersistentData<ITask>[];
    id: string;
    isDraggable?: boolean;
    extraColumns?: ITableColumns<ITask>;
    defaultColumns?: string[];
    selected?: string[];
    selectedGroups?: string[];
    onDrop?: (result: DropResult) => void;
    onSelect?: (task: ITask) => void;
    onGroupSelect?: (groupId: string) => void;
}

export const TasksTable: FunctionComponent<TasksTableProps> = ({
    tasks,
    id,
    isDraggable,
    extraColumns,
    defaultColumns,
    selected,
    selectedGroups,
    onDrop,
    onSelect,
    onGroupSelect,
}) => {
    const { taskLazyLoad } = usePreferences(["taskLazyLoad"]);

    const tableColumns: ITableColumns<ITask> = useMemo(
        () => ({
            title: {
                title: translate("Title"),
                width: 400,
                minWidth: 150,
                isSortable: true,
                unhideable: true,
                resizable: true,
            },
            content: {
                title: translate("Description"),
                width: 200,
                minWidth: 100,
                isSortable: false,
                resizable: true,
            },
            project: {
                title: translate("Project"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            assignees: { title: translate("Assignees"), width: 150, minWidth: 100, isSortable: false },
            startdate: {
                title: translate("Start date"),
                width: 200,
                minWidth: 150,
                maxWidth: 250,
                isSortable: true,
                resizable: true,
            },
            dodate: {
                title: translate("Do date"),
                width: 200,
                minWidth: 150,
                maxWidth: 250,
                isSortable: true,
                resizable: true,
            },
            duedate: {
                title: translate("Due Date"),
                width: 200,
                minWidth: 150,
                maxWidth: 250,
                isSortable: true,
                resizable: true,
            },
            progress: {
                title: translate("Progress"),
                width: 200,
                minWidth: 100,
                isSortable: true,
            },
            priority: {
                title: translate("Priority"),
                width: 120,
                minWidth: 100,
                isSortable: true,
                sortAccessor: row => {
                    const map = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
                    return map[row.priority || "none"];
                },
            },
            status: {
                title: translate("Status"),
                width: 150,
                minWidth: 100,
                maxWidth: 200,
                isSortable: false,
                resizable: true,
            },
            tags: {
                title: translate("Tags"),
                width: 200,
                minWidth: 100,
                maxWidth: 350,
                isSortable: false,
                resizable: true,
            },
            subtasks: {
                title: translate("Subtasks"),
                width: 200,
                minWidth: 100,
                isSortable: false,
            },
            stack: {
                title: translate("Stack"),
                width: 200,
                minWidth: 100,
                isSortable: false,
                resizable: true,
            },
            attachments: { title: translate("Attachments"), width: 200, minWidth: 100, isSortable: false },
            spentprogress: {
                title: translate("Spent Progress"),
                width: 200,
                minWidth: 100,
                isSortable: false,
            },
            estimatedtime: {
                title: translate("Estimated Time"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                sortAccessor: row => row.estimate ?? null,
            },
            spenttime: {
                title: translate("Spent Time"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                sortAccessor: row => row.timeSpent,
            },
            completed: {
                title: translate("Completed date"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            created: {
                title: translate("Date created"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            updated: {
                title: translate("Updated Date"),
                width: 200,
                minWidth: 100,
                isSortable: true,
                resizable: true,
            },
            ...(extraColumns ?? {}),
        }),
        [extraColumns]
    );

    return (
        <TablePersistent<ITask>
            id={id}
            sticky
            lazy={taskLazyLoad}
            columns={tableColumns}
            defaultVisibleColumns={defaultColumns ?? defaultVisibleColumns}
            data={tasks}
            components={{
                cell: TableCell,
                groupAppend: TableGroup,
            }}
            draggable={isDraggable}
            selected={selected}
            selectedGroups={selectedGroups}
            onDragEnd={onDrop}
            onSelect={onSelect}
            onGroupSelect={onGroupSelect}
        />
    );
};

const TableCellPure: FunctionComponent<TablePersistentCellProps<ITask>> = ({ row, column, tableId }) => {
    const navigate = useNav();
    const disabled = row.archived !== null || row.done;

    const handleOpenTask = (taskId: string, projectId: string) => {
        if (tableId === "mytasks") {
            navigate(`/mytasks/${taskId}`);
        } else if (tableId === "home-my-tasks") {
            navigate(`/project/${projectId}/${taskId}`);
        } else if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${projectId}/${taskId}`);
        } else {
            navigate(`/task/${taskId}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    const handleSetStartDate = (date: Date | null) => {
        TasksActions.setStartDate(row.id, date);
    };

    const handleSetDoDate = (date: Date | null) => {
        TasksActions.setDoDate(row.id, date);
    };

    const handleSetDueDate = (date: Date | null) => {
        TasksActions.setDueDate(row.id, date);
    };

    if (column === "title") {
        return (
            <>
                <TaskStatusBar taskId={row.id} value={row.status} variant="table" />
                <TaskState taskId={row.id} />
                <OverflowTextCell faded onClick={() => handleOpenTask(row.id, row.project)}>
                    {stripMd(row.title)}
                </OverflowTextCell>
            </>
        );
    } else if (column === "content") {
        return <OverflowTextCell faded>{stripMd(row.description)}</OverflowTextCell>;
    } else if (column === "assignees") {
        return (
            <TaskAssignees
                assignees={row.assignees || []}
                taskId={row.id}
                max={5}
                showEmpty
                minimal
                disabled={disabled}
            />
        );
    } else if (column === "startdate") {
        return (
            <DatePickerButton
                value={row.startdate}
                disabled={disabled}
                extendedFormat
                minimal
                maxDate={row.duedate ?? undefined}
                onChange={handleSetStartDate}
            />
        );
    } else if (column === "dodate") {
        return (
            <DatePickerButton
                value={row.dodate}
                disabled={disabled}
                minDate={row.startdate}
                maxDate={row.duedate}
                extendedFormat
                minimal
                onChange={handleSetDoDate}
            />
        );
    } else if (column === "duedate") {
        return (
            <DatePickerButton
                value={row.duedate}
                disabled={disabled}
                extendedFormat
                minimal
                minDate={row.startdate}
                onChange={handleSetDueDate}
            />
        );
    } else if (column === "progress") {
        return <TaskProgressCell taskId={row.id} value={row.progress || 0} interactive disabled={disabled} />;
    } else if (column === "priority") {
        return (
            <PriorityPicker
                value={row.priority}
                taskId={row.id}
                showEmpty
                minimal
                tooltip={translate("Add priority")}
                disabled={disabled}
            />
        );
    } else if (column === "status") {
        return <TaskStatus taskId={row.id} value={row.status} minimal disabled={disabled} />;
    } else if (column === "tags") {
        return (
            <TaskTags
                value={row.tags || []}
                minimal
                onChange={(tagIds: string[]) => TasksActions.setTags(row.id, tagIds)}
                nowrap
                disabled={disabled}
            />
        );
    } else if (column === "status") {
        return (
            <TaskTags
                value={row.tags || []}
                minimal
                onChange={(tagIds: string[]) => TasksActions.setTags(row.id, tagIds)}
                nowrap
                disabled={disabled}
            />
        );
    } else if (column === "subtasks") {
        return (
            <>
                <TaskSubtasks taskId={row.id} asTag />
                {row.parent != null && (
                    <TaskParent
                        parentId={row.parent}
                        asTag
                        onOpen={row.parent ? () => handleOpenTask(row.parent!, row.project) : undefined}
                    />
                )}
            </>
        );
    } else if (column === "stack") {
        return (
            <TaskStackPicker
                taskId={row.id}
                stackId={row.stack}
                projectId={row.project}
                disabled={disabled}
            />
        );
    } else if (column === "attachments") {
        return <TaskAttachments taskId={row.id} asTag />;
    } else if (column === "spentprogress") {
        return <TaskSpentProgress estimated={row.estimate || 0} spent={row.timeSpent || 0} />;
    } else if (column === "estimatedtime") {
        return (
            <TaskEstimates
                value={row.estimate}
                minimal
                onChange={(estimate?: number) => TasksActions.setEstimate(row.id, estimate)}
                disabled={disabled}
            />
        );
    } else if (column === "spenttime") {
        return (
            <>
                <TimeTracker taskId={row.id} rounded disabled={disabled} />

                <Tag minimal intent={Intent.SUCCESS}>
                    {formatDuration(row.timeSpent)}
                </Tag>
            </>
        );
    } else if (column === "completed") {
        return <>{row.completed && formatDate(row.completed)}</>;
    } else if (column === "project") {
        const project = getDocument(row.project);
        return <>{project ? <Link to={`/project/${row.project}`}>{project.title}</Link> : "Unkown project"}</>;
    } else if (column === "created" && row.created != null) {
        return <>{formatDate(row.created)}</>;
    } else if (column === "updated" && row.updated != null) {
        return <>{formatDate(row.updated)}</>;
    } else if (column === "archived" && row.archived != null) {
        return <>{formatDate(row.archived)}</>;
    }

    return <>{row[column as keyof ITask]?.toString() ?? <span className={Classes.TEXT_DISABLED}>-</span>}</>;
};
const TableCell = React.memo(TableCellPure);

const TableGroup: FunctionComponent<TablePersistentGroupProps> = ({ groupId, count }) => {
    const grouping = TableStore.use(state => state.grouping, shallowEqual);

    const icon = useMemo(() => {
        if (grouping === GROUPING_TYPE.STACK) {
            const stack = getStack(groupId);
            return <Icon icon="stop-filled" color={stack?.tint ?? Colors.GRAY5} />;
        }

        if (grouping === GROUPING_TYPE.PEOPLE) {
            const person = PeopleStore.get().people.find(person => person.id === groupId);
            return person && <Avatar small person={person} />;
        }

        return null;
    }, [grouping, groupId]);

    const tagStyles = useMemo(() => {
        const styles: CSSProperties = {};

        if (
            grouping === GROUPING_TYPE.STARTDATE ||
            grouping === GROUPING_TYPE.DUEDATE ||
            grouping === GROUPING_TYPE.PRIORITY
        ) {
            switch (groupId) {
                case "started":
                case "overdue":
                case "critical":
                    styles.backgroundColor = Colors.VERMILION3;
                    break;
                case "starting-today":
                case "due-today":
                case "medium":
                    styles.backgroundColor = Colors.ORANGE4;
                    break;
                case "starting-tomorrow":
                case "due-tomorrow":
                case "high":
                    styles.backgroundColor = Colors.RED5;
                    break;
                case "starting-this-week":
                case "due-this-week":
                    styles.backgroundColor = Colors.INDIGO3;
                    break;
                case "starting-next-week":
                case "due-next-week":
                    styles.backgroundColor = Colors.CERULEAN3;
                    break;
                case "upcoming":
                case "low":
                    styles.backgroundColor = Colors.GREEN3;
                    break;
            }
        }

        styles.color = styles.backgroundColor ? getTextColor(styles.backgroundColor) : undefined;

        return styles;
    }, [grouping, groupId]);

    return (
        <>
            {icon}
            <Tag minimal round style={tagStyles}>
                {count}
            </Tag>
        </>
    );
};
