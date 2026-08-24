// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { endOfDay, startOfDay } from "date-fns";

import { IStack, ITask } from "@stacks/types";
import { sortByIdOrder } from "app/utils/taskOrder";

export interface GanttTask {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    content?: string;
    parent: string | null;
    stack?: IStack;
    project: string;
    subtasksCount?: number;
    children: GanttTask[];
    collapsed?: boolean;
}

export function convertToGantt(tasks: ITask[], stacks: IStack[]): GanttTask[] {
    const stacksById = new Map(stacks.map(stack => [stack.id, stack]));
    const childrenByParent = new Map<string, ITask[]>();
    const roots: ITask[] = [];

    for (const task of tasks) {
        if (!task.parent) {
            roots.push(task);
            continue;
        }

        const children = childrenByParent.get(task.parent) ?? [];
        children.push(task);
        childrenByParent.set(task.parent, children);
    }

    const buildTask = (task: ITask): GanttTask => {
        const children = (childrenByParent.get(task.id) ?? []).map(buildTask);

        return {
            name: task.title,
            id: task.id,
            startDate: task.startdate ? task.startdate : task.duedate ? startOfDay(task.duedate) : null,
            endDate: task.duedate ? task.duedate : task.startdate ? endOfDay(new Date(task.startdate)) : null,
            parent: task.parent,
            stack: stacksById.get(task.stack),
            project: task.project,
            children: sortByIdOrder(children, task.subtasksOrder ?? [], child => child.id),
            collapsed: false,
        };
    };

    return roots.map(buildTask).sort((left, right) => left.name.localeCompare(right.name));
}
