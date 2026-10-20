// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Raw Sequelize queries shared by report builders (projects, tasks, timelogs).
 */
import { IStack, ITask, ITimeLog } from "@stacks/types";
import { StackEntity, TaskEntity, TimelogEntity } from "@stacks/db";
import { Op } from "sequelize";

import { ProjectsLoader } from "../loaders/projects";
import { getCurrentUser } from "../loaders/context";

export async function getProjects() {
    return await ProjectsLoader.getAll();
}

export async function fetchTasksByProjects(
    projectIds: string[],
    updatedRange?: { start: Date; end: Date }
): Promise<ITask[]> {
    const user = getCurrentUser();
    const where: Record<string, unknown> = {
        project: projectIds,
        tenant: user.tenant,
    };
    if (updatedRange) {
        where.updated = { [Op.between]: [updatedRange.start, updatedRange.end] };
    }
    const tasksEntities = await TaskEntity.findAll({ where });
    return tasksEntities.map(task => task.toJSON()) as ITask[];
}

export async function fetchTasksGrouped(
    projectIds: string[],
    updatedRange?: { start: Date; end: Date }
): Promise<Record<string, ITask[]>> {
    const tasks = await fetchTasksByProjects(projectIds, updatedRange);
    const projectTasks: Record<string, ITask[]> = {};
    tasks.forEach(task => {
        if (!projectTasks[task.project]) {
            projectTasks[task.project] = [];
        }
        projectTasks[task.project].push(task);
    });
    return projectTasks;
}

export async function fetchTimelogs(options: {
    projectIds: string[];
    dateRange?: { start: Date; end: Date };
}): Promise<ITimeLog[]> {
    const user = getCurrentUser();
    const where: Record<string, unknown> = { tenant: user.tenant, project: options.projectIds };
    if (options.dateRange) {
        where.date = { [Op.between]: [options.dateRange.start, options.dateRange.end] };
    }
    const timelogsEntities = await TimelogEntity.findAll(Object.keys(where).length ? { where } : undefined);
    return timelogsEntities.map(timelog => timelog.toJSON()) as ITimeLog[];
}

export async function fetchTimelogsByTask(
    projectIds: string[],
    dateRange?: { start: Date; end: Date }
): Promise<Record<string, ITimeLog[]>> {
    const timelogs = await fetchTimelogs({ projectIds, dateRange });
    const taskTimelogs: Record<string, ITimeLog[]> = {};
    timelogs.forEach(timelog => {
        if (!taskTimelogs[timelog.task]) {
            taskTimelogs[timelog.task] = [];
        }
        taskTimelogs[timelog.task].push(timelog);
    });
    return taskTimelogs;
}

export async function getStacks(projectIds: string[]) {
    const user = getCurrentUser();
    const stacksEntities = await StackEntity.findAll({
        where: {
            project: projectIds,
            tenant: user.tenant,
        },
    });
    return stacksEntities.map(stack => stack.toJSON()) as IStack[];
}

/** Tasks with at least one assignee; optional `updated` window for span. */
export async function fetchTasksWithAssignees(
    projectIds: string[],
    updatedRange?: { start: Date; end: Date }
): Promise<ITask[]> {
    const user = getCurrentUser();
    const where: Record<string, unknown> = {
        tenant: user.tenant,
        project: projectIds,
        assignees: {
            [Op.ne]: "[]",
        },
    };
    if (updatedRange) {
        where.updated = { [Op.between]: [updatedRange.start, updatedRange.end] };
    }
    const tasksEntities = await TaskEntity.findAll({ where });
    return tasksEntities.map(task => task.toJSON()) as ITask[];
}
