// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { addDays, endOfDay, startOfDay } from "date-fns";
import uniq from "lodash/uniq";
import { Op, Transaction } from "sequelize";

import { AttachmentEntity, DocumentEntity, PermissionEntity, sequelize, TaskEntity } from "@stacks/db";
import { NOTIFICATION_RECORD_TYPE, POLLINGACTIONS, POLLINGTYPE, type ITask } from "@stacks/types";

import { Errors } from "../errors";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { NotificationsLoader } from "./notifications";
import { PermissionsLoader } from "./permissions";
import { ProjectsLoader } from "./projects";
import { StacksLoader } from "./stacks";
import { TimelogsLoader } from "./timelogs";
import {
    createOne,
    deleteAll,
    deleteOne,
    findAll,
    findOne,
    mergePermissions,
    sanitizeWherePermissions,
    updateOne,
    withTransaction,
} from "./utils";
import { translate } from "@stacks/translations";

const TASKS_ASSOC_KEY = "__tasks_assoc_initialized__";
if (!(TaskEntity as any)[TASKS_ASSOC_KEY]) {
    TaskEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
    PermissionEntity.belongsTo(TaskEntity, { foreignKey: "id", constraints: false });

    TaskEntity.hasMany(AttachmentEntity, { foreignKey: "recordId", as: "attachments", constraints: false });
    TaskEntity.belongsTo(DocumentEntity, { foreignKey: "project", as: "projectInfo", constraints: false });

    (TaskEntity as any)[TASKS_ASSOC_KEY] = true;
}

/**
 * Create a new task.
 * @param data Task data
 * @returns Task
 */
async function create(data: Partial<ITask>, positionInStack?: "top" | "bottom") {
    return withTransaction(undefined, async transaction => {
        const user = getCurrentUser();
        const newTask = await createOne<ITask>({
            entity: TaskEntity,
            data: data,
            transaction,
        });

        const project = await ProjectsLoader.getOne(newTask.project);

        // create permissions for the new task
        const permissions = await PermissionsLoader.create(
            newTask.id,
            {
                type: POLLINGTYPE.TASK,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            },
            transaction
        );

        const task = { ...newTask, permissions };

        await sendRealtimeUpdate({
            type: POLLINGTYPE.TASK,
            record: task.id,
            action: POLLINGACTIONS.CREATE,
            permissions: mergePermissions(permissions, project.permissions),
        });

        await StacksLoader.addTaskOrder(newTask.stack, newTask.id, positionInStack ?? "bottom");

        if (newTask.assignees?.length) {
            for (const assignee of newTask.assignees) {
                if (assignee === user.id) continue;
                NotificationsLoader.add({
                    recipient: assignee,
                    subject: translate("You have been assigned to a new task"),
                    message: newTask.title,
                    recordType: NOTIFICATION_RECORD_TYPE.TASK,
                    recordId: newTask.id,
                    data: newTask as any,
                });
            }
        }

        invalidateApiCacheForCurrentRequest();
        return task;
    });
}

/**
 * Get a single task by ID.
 * @param id Task ID
 * @param transaction Optional transaction
 * @returns Task
 */
async function getOne(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const task = await findOne({
            entity: TaskEntity,
            id,
            include: [
                {
                    model: AttachmentEntity,
                    attributes: [],
                    required: false,
                    as: "attachments",
                },
                {
                    model: DocumentEntity,
                    attributes: ["id", "title"],
                    required: false,
                    as: "projectInfo",
                },
            ],
            attributes: {
                include: [[sequelize.fn("COUNT", sequelize.col("attachments.id")), "attachments"]],
            },
            group: ["TaskEntity.id", "PermissionEntity.id", "projectInfo.id"],
            transaction,
        });

        if (!task) {
            throw Errors.notFound(translate("Task not found"));
        }

        return task;
    });
}

export interface GetAllFilters {
    ids?: string | string[]; // Task UUID(s)
    project?: string | string[]; // Project UUID(s)
    stack?: string | string[]; // Stack UUID(s)
    from?: string; // ISO date — start of range; matches tasks whose startdate or duedate falls in the window (see server TasksLoader)
    to?: string; // ISO date — end of range (paired with from)
    completed?: "true" | true; // Only tasks with `done: true` (matches REST `completed=true`).
    open?: "true" | true; // Only tasks with `done: false` (not completed).
    archived?: "true" | true; // Only tasks with `archived: null` (not archived).
    assigned?: "true" | true; // Only tasks with assignees (matches REST `assigned=true`).
    unassigned?: "true" | true; // Only tasks with no assignees (matches REST `unassigned=true`).
    assignees?: string | string[]; // Assignee UUID(s)
    parent?: string; // Parent task UUID
    query?: string; // Query (title or description)
    limit?: number; // Limit the number of tasks returned
}

type TaskOrdering = [string, "ASC" | "DESC"][];

function buildTaskListFilter(filters: GetAllFilters): object {
    let filter: any = {
        archived: {
            [filters.archived === "true" || filters.archived === true ? Op.ne : Op.eq]: null,
        },
    };

    // Filter by project
    if (filters.project) {
        filter.project = filters.project;
    }

    // Filter by stack
    if (filters.stack) {
        filter.stack = filters.stack;
    }

    // Filter by assignees
    if (filters.assignees) {
        if (Array.isArray(filters.assignees)) {
            filter.assignees = {
                [Op.overlap]: filters.assignees,
            };
        } else {
            filter.assignees = {
                [Op.contains]: [filters.assignees],
            };
        }
    // Filter by assigned
    } else if (filters.assignees == null && filters.assigned === "true") {
        filter.assignees = {
            [Op.ne]: [],
        };
    // Filter by unassigned
    } else if (
        filters.assignees == null &&
        filters.assigned !== "true" &&
        (filters.unassigned === "true" || filters.unassigned === true)
    ) {
        filter.assignees = {
            [Op.or]: [{ [Op.eq]: [] }, { [Op.is]: null }],
        };
    }

    // Filter by completed
    if (filters.completed === "true" || filters.completed === true) {
        filter.done = true;
    } else if (filters.open === "true" || filters.open === true) {
        filter.done = false;
    }

    // Filter by ids
    if (filters.ids) {
        filter.id = filters.ids;
    }

    if (filters.parent) {
        filter.parent = filters.parent;
    }

    const andClauses: object[] = [];

    // Filter by query (title or description)
    if (filters.query && filters.query.length) {
        andClauses.push({
            [Op.or]: [
                {
                    title: {
                        [Op.iLike]: `%${filters.query}%`,
                    },
                },
                {
                    description: {
                        [Op.iLike]: `%${filters.query}%`,
                    },
                },
            ],
        });
    }

    // Filter by date range (startdate or duedate falls in the window)
    if (filters.from || filters.to) {
        const fromDate: Date = startOfDay(new Date(filters.from || new Date().toISOString()));
        const toDate: Date = endOfDay(new Date(filters.to || addDays(new Date(), 10)));

        andClauses.push({
            [Op.or]: [
                {
                    startdate: {
                        [Op.gte]: fromDate,
                        [Op.lte]: toDate,
                    },
                    duedate: {
                        [Op.gte]: fromDate,
                        [Op.lte]: toDate,
                    },
                },
            ],
        });
    }

    if (andClauses.length >= 1) {
        filter[Op.and] = andClauses;
    }

    return filter;
}

/**
 * Count tasks matching filters (same semantics as {@link getAll}, without loading rows).
 */
async function countAll(filters: GetAllFilters, extTransaction?: Transaction): Promise<number> {
    return withTransaction(extTransaction, async transaction => {
        const filter = buildTaskListFilter(filters);
        return TaskEntity.count({
            where: sanitizeWherePermissions(filter),
            include: [
                {
                    model: PermissionEntity,
                    required: false,
                },
            ],
            distinct: true,
            col: "TaskEntity.id",
            transaction,
        });
    });
}

/**
 * Get all tasks by filters.
 * @param filters GetAllFilters
 * @param user User
 * @returns Tasks
 */
async function getAll(
    filters: GetAllFilters,
    order?: TaskOrdering,
    extTransaction?: Transaction
): Promise<ITask[]> {
    return withTransaction(extTransaction, async transaction => {
        const filter = buildTaskListFilter(filters);

        const tasks = await findAll<ITask>({
            entity: TaskEntity,
            filter,
            include: [
                {
                    model: AttachmentEntity,
                    attributes: [],
                    required: false,
                    as: "attachments",
                },
                {
                    model: DocumentEntity,
                    attributes: ["id", "title"],
                    required: false,
                    as: "projectInfo",
                },
            ],
            attributes: {
                include: [[sequelize.fn("COUNT", sequelize.col("attachments.id")), "attachments"]],
            },
            group: ["TaskEntity.id", "PermissionEntity.id", "projectInfo.id"],
            order: order,
        });

        return tasks.map(task => ({
            ...task,
            permissions: task.permissions,
        }));
    });
}

async function removeById(id: string, extTransaction?: Transaction): Promise<ITask> {
    return withTransaction(extTransaction, async transaction => {
        const task = await getOne(id, transaction);
        const user = getCurrentUser();

        for (const assignee of task.assignees ?? []) {
            if (assignee === user.id) continue;
            NotificationsLoader.add({
                recipient: assignee,
                subject: translate("A task you were assigned to was deleted"),
                message: task.title,
                recordType: NOTIFICATION_RECORD_TYPE.TASK,
                recordId: id,
                data: task,
            });
        }

        await TimelogsLoader.removeByTask(id, transaction);

        const deletedTask = await deleteOne<ITask>({
            entity: TaskEntity,
            id,
            transaction,
        });

        await sendRealtimeUpdate({
            type: POLLINGTYPE.TASK,
            record: task.id,
            action: POLLINGACTIONS.DELETED,
            permissions: task.permissions,
        });

        await StacksLoader.removeTaskOrder(task.stack, task.id, transaction);

        invalidateApiCacheForCurrentRequest();
        return deletedTask;
    });
}

/**
 * Remove all tasks for a project.
 * @param project Project ID
 * @param user User
 * @param transaction Transaction
 * @returns
 */
async function removeByProject(project: string, extTransaction?: Transaction): Promise<ITask[]> {
    return withTransaction(extTransaction, async transaction => {
        await TimelogsLoader.removeByProject(project, transaction);

        const deletedTasks: ITask[] = await deleteAll<ITask>({
            entity: TaskEntity,
            filter: { project },
            transaction,
        });

        for (const task of deletedTasks) {
            await StacksLoader.removeTaskOrder(task.stack, task.id, transaction);

            await sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.DELETED,
                permissions: task.permissions,
            });
        }

        invalidateApiCacheForCurrentRequest();
        return deletedTasks;
    });
}

/**
 * Remove all tasks for a stack.
 * @param stack Stack ID
 * @param user User
 * @param transaction Transaction
 * @returns
 */
async function removeByStack(stack: string, extTransaction?: Transaction): Promise<ITask[]> {
    return withTransaction(extTransaction, async transaction => {
        const deletedTasks: ITask[] = await deleteAll<ITask>({
            entity: TaskEntity,
            filter: { stack },
            transaction,
        });

        const taskIds = deletedTasks.map(task => task.id);
        await TimelogsLoader.removeByTasks(taskIds, transaction);

        for (const task of deletedTasks) {
            await StacksLoader.removeTaskOrder(task.stack, task.id, transaction);

            await sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.DELETED,
                permissions: task.permissions,
            });
        }

        invalidateApiCacheForCurrentRequest();
        return deletedTasks;
    });
}

/**
 * Update a task by ID.
 * @param id Task ID
 * @param data Task data
 * @param user User
 * @returns Task
 */
async function update(id: string, data: Partial<ITask>, extTransaction?: Transaction): Promise<ITask> {
    const user = getCurrentUser();
    return withTransaction(extTransaction, async transaction => {
        const task = await getOne(id, transaction);

        // if the user changes the task project
        // we make sure we actually have access to that project
        if (data.project != null) {
            await ProjectsLoader.getOne(data.project, transaction);
        }

        // if the user changes the task stack
        // we make sure we actually have access to that stack
        if (data.stack != null) {
            await StacksLoader.getOne(data.stack, transaction);
        }

        if (data.done) {
            data.completed = new Date();
        }

        const updatedTask = await updateOne<ITask>({
            entity: TaskEntity,
            id,
            data,
            transaction,
        });

        const project = await ProjectsLoader.getOne(updatedTask.project, transaction);

        await sendRealtimeUpdate({
            type: POLLINGTYPE.TASK,
            record: task.id,
            action: POLLINGACTIONS.UPDATE,
            permissions: mergePermissions(task.permissions, project.permissions),
        });

        /*
            Sending notifications - START
        */
        if (data.assignees) {
            for (const assignee of data.assignees) {
                // sending notification to assignees by skipping current user
                if (assignee === user.id) continue;
                NotificationsLoader.add({
                    recipient: assignee,
                    subject: translate("You have been assigned to a task"),
                    message: task.title,
                    recordType: NOTIFICATION_RECORD_TYPE.TASK,
                    recordId: id,
                    data: task,
                });
            }
        }

        if (data.done === false && task.done === true) {
            for (const assignee of task.assignees ?? []) {
                if (assignee === user.id) continue;
                NotificationsLoader.add({
                    recipient: assignee,
                    subject: translate("A task you are assigned to was reopened"),
                    message: task.title,
                    recordId: id,
                    recordType: NOTIFICATION_RECORD_TYPE.TASK,
                    data: task,
                });
            }
        }

        if (data.done) {
            for (const assignee of task.assignees ?? []) {
                // sending notification to assignees by skipping current user
                if (assignee === user.id) continue;
                NotificationsLoader.add({
                    recipient: assignee,
                    subject: translate("A task where you are assigned to was completed"),
                    message: task.title,
                    recordId: id,
                    recordType: NOTIFICATION_RECORD_TYPE.TASK,
                    data: task,
                });
            }
        }
        /*
            Sending notifications - END
        */

        invalidateApiCacheForCurrentRequest();
        return updatedTask;
    });
}

const archive = async (id: string, extTransaction?: Transaction): Promise<ITask> => {
    return withTransaction(extTransaction, async transaction => {
        const task = await getOne(id, transaction);
        await StacksLoader.removeTaskOrder(task.stack, id, transaction);
        return update(id, { archived: new Date() }, transaction);
    });
};

const unarchive = async (id: string, stack?: string, extTransaction?: Transaction) => {
    return withTransaction(extTransaction, async transaction => {
        const data: Partial<ITask> = {
            archived: null,
        };

        if (stack) {
            data.stack = stack;
            await StacksLoader.addTaskOrder(stack, id, "top", transaction);
        }

        return update(id, data, extTransaction);
    });
};

const move = async (
    taskId: string,
    stackId: string,
    after?: string,
    extTransaction?: Transaction
): Promise<void> => {
    return withTransaction(extTransaction, async transaction => {
        const task = await getOne(taskId, transaction);
        const stack = await StacksLoader.getOne(stackId, transaction);
        const isSameStack = stackId === task.stack;
        const order = stack.tasksOrder;

        if (after) {
            if (order.indexOf(taskId) > -1) {
                order.splice(order.indexOf(taskId), 1);
            }
            const afterIndex = order.indexOf(after);
            order.splice(afterIndex + 1, 0, taskId);
        } else {
            order.unshift(taskId);
        }

        const tasksOrder = uniq(order);
        await StacksLoader.update(stackId, { tasksOrder }, transaction);

        // if the task's stack is not the same as the destination stack
        if (!isSameStack) {
            // 1. we need to update the task's stack
            await update(taskId, { stack: stackId }, transaction);

            // 2. we need to remove the task's id from the old stack's tasksOrder
            const oldStack = await StacksLoader.getOne(task.stack, transaction);
            await StacksLoader.update(
                task.stack,
                { tasksOrder: oldStack.tasksOrder.filter(id => id !== taskId) },
                transaction
            );
        }

        invalidateApiCacheForCurrentRequest();
    });
};

export const TasksLoader = {
    create,
    getAll,
    countAll,
    getOne,
    removeById,
    removeByProject,
    removeByStack,
    update,
    archive,
    unarchive,
    move,
};
