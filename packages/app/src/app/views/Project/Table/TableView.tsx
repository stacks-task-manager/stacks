// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

import { DropResult } from "@hello-pangea/dnd";
import { GROUPING_TYPE, PRIORITY } from "@stacks/types";
import { useGrouppedProjectTasks } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { TasksActions } from "app/store/actions";
import { TasksTable } from "app/widgets";
import { restoreDefaults, TableStore } from "./store";
import { flattenTree, getParentAtIndex } from "app/utils/array";
import { TablePersistentData, TablePersistentGroupData } from "app/components/common";
import { ITask } from "@stacks/types";

export const TableView = () => {
    const params = useParams();
    const tasks = useGrouppedProjectTasks();

    useEffect(() => {
        restoreDefaults();
    }, [params.id]);

    const grouping = TableStore.use(state => state.grouping, shallowEqual);

    const isDraggable = useMemo(
        () => [GROUPING_TYPE.PRIORITY, GROUPING_TYPE.PEOPLE, GROUPING_TYPE.STACK].includes(grouping),
        [grouping]
    );

    const getRowsForDroppable = (droppableId: string): TablePersistentData<ITask>[] => {
        // tasks may be grouped or flat depending on current grouping
        if (Array.isArray(tasks) && (tasks as any)[0]?.groupId != null) {
            const groups = tasks as TablePersistentGroupData<ITask>[];
            return groups.find(g => g.groupId === droppableId)?.data ?? [];
        }
        return tasks as TablePersistentData<ITask>[];
    };

    const resolveParentAndPosition = (droppableId: string, index: number): { parentId?: string; position: number } => {
        const rows = getRowsForDroppable(droppableId);
        const flat = flattenTree(rows);
        const clampIndex = Math.max(0, Math.min(index, flat.length));
        const parentId = getParentAtIndex(flat, clampIndex);

        if (parentId) {
            const parentIdx = flat.findIndex(n => n.id === parentId);
            const parentLevel = flat[parentIdx]?.level ?? 0;
            const start = parentIdx + 1;
            let end = start;
            for (let j = start; j < flat.length; j++) {
                if (flat[j].level <= parentLevel) { end = j; break; }
                end = j;
            }
            const rangeStart = start;
            const rangeEnd = Math.min(end, clampIndex);
            const position = flat.slice(rangeStart, rangeEnd).filter(n => n.level === parentLevel + 1).length;
            return { parentId, position };
        } else {
            const position = flat.slice(0, clampIndex).filter(n => n.level === 0).length;
            return { parentId: undefined, position };
        }
    };

    const handleDrop = async (result: DropResult) => {
        if (!result.destination) return;

        const { grouping } = TableStore.get();

        if (grouping === GROUPING_TYPE.PRIORITY) {
            TasksActions.setPriority(result.draggableId, result.destination.droppableId as PRIORITY);
        } else if (grouping === GROUPING_TYPE.PEOPLE) {
            const { destination, source, draggableId } = result;

            if (!destination) return;
            if (destination.droppableId === source.droppableId) return;

            if (draggableId.includes("/")) {
                const [personId, taskId] = draggableId.split("/");
                if (destination.droppableId === personId) return;

                if (destination.droppableId === "unassigned") {
                    TasksActions.setAssignees(taskId, []);
                } else {
                    TasksActions.assignPerson(taskId, destination.droppableId);
                }
            } else {
                TasksActions.assignPerson(draggableId, destination.droppableId);
            }
        } else if (grouping === GROUPING_TYPE.STACK) {
            const { source, destination, draggableId } = result;
            if (!destination || !source) return;

            TasksActions.moveToStack(draggableId, destination.droppableId, destination.index);
        } else if (grouping === GROUPING_TYPE.UNGROUPED) {
            const { destination, draggableId } = result;
            if (!destination) return;
            const { parentId, position } = resolveParentAndPosition(destination.droppableId, destination.index);
            // For now, just log the resolved placement; actions can be wired as needed
            console.log("Drop resolved:", { taskId: draggableId, parentId: parentId ?? "root", position });
        }
    };

    return <TasksTable tasks={tasks} id="project" onDrop={handleDrop} isDraggable={isDraggable} />;
};
