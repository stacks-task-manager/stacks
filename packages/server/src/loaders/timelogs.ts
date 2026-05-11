// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog persistence, approvals, aggregates on tasks, and realtime polling hooks.
 */
import { DocumentEntity, ProjectEntity, TaskEntity, TimelogEntity } from "@stacks/db";
import { Errors } from "../errors";
import {
    IProject,
    NOTIFICATION_RECORD_TYPE,
    POLLINGACTIONS,
    POLLINGTYPE,
    TIMELOG_STATUS,
    type ITimeLog,
} from "@stacks/types";
import { endOfDay, startOfDay } from "date-fns";
import { literal, Op, Transaction } from "sequelize";
import { getCurrentUser } from "./context";
import { pgStringLiteral } from "./sqlLiteral";
import { ProjectsLoader } from "./projects";
import { TasksLoader } from "./tasks";
import { createOne, deleteAll, sanitizeWhere, updateOne, withTransaction } from "./utils";
import { NotificationsLoader } from "./notifications";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { translate } from "@stacks/translations";

if (!TimelogEntity.associations.documentInfo) {
    TimelogEntity.hasOne(DocumentEntity, {
        foreignKey: "id",
        sourceKey: "project",
        as: "documentInfo",
        constraints: false,
    });
}
if (!TimelogEntity.associations.projectInfo) {
    TimelogEntity.hasOne(ProjectEntity, {
        foreignKey: "id",
        sourceKey: "project",
        as: "projectInfo",
        constraints: false,
    });
}
if (!TimelogEntity.associations.taskInfo) {
    TimelogEntity.hasOne(TaskEntity, {
        foreignKey: "id",
        sourceKey: "task",
        as: "taskInfo",
        constraints: false,
    });
}

/** Filters for list queries and bulk status transitions. */
interface TimelogFilter {
    task?: string | string[];
    project?: string;
    start?: string;
    end?: string;
    status?: TIMELOG_STATUS;
    timelog?: string;
    person?: string;
}

/** Single timelog with task/document/project includes; enforces approver/owner visibility. */
async function getOne(id: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();

        const where: any = sanitizeWhere({ id });

        if (!user.admin) {
            where[Op.or] = [
                literal(`"TimelogEntity"."person" = ${pgStringLiteral(user.id)}`),
                literal(`"projectInfo"."approvers" ? ${pgStringLiteral(user.id)}`),
            ];
        }

        const timelog = await TimelogEntity.findOne({
            where,
            include: [
                {
                    model: TaskEntity,
                    attributes: ["title", "done", "estimate"],
                    as: "taskInfo",
                },
                {
                    model: DocumentEntity,
                    attributes: ["title"],
                    as: "documentInfo",
                },
                {
                    model: ProjectEntity,
                    attributes: ["estimate"],
                    as: "projectInfo",
                },
            ],
            transaction,
        });

        if (!timelog) {
            throw Errors.notFound(translate("Timelog not found"));
        }

        const task = await TasksLoader.getOne(timelog.get("task") as string, transaction);
        if (!task) {
            throw Errors.notFound(translate("Timelog not found"));
        }

        return timelog.toJSON();
    });
}

/** Filtered list with optional date range and status; joins related entities. */
async function getAll(filters: TimelogFilter, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const filter: Record<string, any> = {};
        if (filters.task != null) {
            if (Array.isArray(filters.task)) {
                const tasks = await TasksLoader.getAll({ ids: filters.task });

                if (tasks.length !== filters.task.length) {
                    return [];
                }
            } else {
                const task = await TasksLoader.getOne(filters.task, transaction);
                if (!task) {
                    return [];
                }
            }

            filter.task = filters.task;
        }

        if (filters.project != null) {
            const project = await ProjectsLoader.getOne(filters.project, transaction);
            if (!project) {
                return [];
            }

            filter.project = filters.project;
        }

        if (filters.start != null || filters.end != null) {
            filter.date = {};

            if (filters.start != null) {
                filter.date[Op.gte] = startOfDay(filters.start);
            }
            if (filters.end != null) {
                filter.date[Op.lte] = endOfDay(filters.end);
            }
        }

        if (filters.status != null) {
            filter.status = filters.status;
        }

        if (filters.timelog != null) {
            filter.id = filters.timelog;
        }

        const user = getCurrentUser();
        const where: any = sanitizeWhere(filter);

        if (!user.admin) {
            where[Op.or] = [
                literal(`"TimelogEntity"."person" = ${pgStringLiteral(user.id)}`),
                literal(`"projectInfo"."approvers" ? ${pgStringLiteral(user.id)}`),
            ];
        }

        const timelogEntities = await TimelogEntity.findAll({
            where,
            include: [
                {
                    model: TaskEntity,
                    attributes: ["title", "done", "estimate"],
                    as: "taskInfo",
                },
                {
                    model: DocumentEntity,
                    attributes: ["title"],
                    as: "documentInfo",
                },
                {
                    model: ProjectEntity,
                    attributes: ["estimate", "approvers"],
                    as: "projectInfo",
                },
            ],
            order: [["date", "ASC"]],
            transaction,
        });
        const timelogs: ITimeLog[] = timelogEntities.map(
            (timelogEntity: InstanceType<typeof TimelogEntity>) =>
                timelogEntity.toJSON() as ITimeLog
        );

        const ids = timelogs.map(timelog => timelog.task);
        const tasks = await TasksLoader.getAll({ ids });
        const taskIds = tasks.map(task => task.id);

        return timelogs.filter(timelog => taskIds.includes(timelog.task));
    });
}

/** Inserts a timelog, updates task spent time, emits notifications. */
async function create(data: Omit<ITimeLog, "id" | "created" | "updated">) {
    return withTransaction(undefined, async transaction => {
        const newTimelog = await createOne<ITimeLog>({
            entity: TimelogEntity,
            data,
            transaction,
        });

        await updateTotals(newTimelog.task);

        invalidateApiCacheForCurrentRequest();
        return newTimelog;
    });
}

/** PATCH existing row and refresh derived task totals. */
async function update(id: string, data: Partial<ITimeLog>) {
    return withTransaction(undefined, async (transaction: Transaction) => {
        const timelog = await getOne(id);

        const udatedTimelog = await updateOne<ITimeLog>({
            entity: TimelogEntity,
            id,
            data,
            transaction,
        });

        await updateTotals(timelog.task);

        invalidateApiCacheForCurrentRequest();
        return udatedTimelog;
    });
}

/** Hard-deletes many ids inside a transaction. */
async function removeByIds(id: string[], extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const deletedTimelogs = await deleteAll<ITimeLog>({
            entity: TimelogEntity,
            filter: { id },
            transaction,
        });

        for (const timelog of deletedTimelogs) {
            await updateTotals(timelog.task);
        }

        invalidateApiCacheForCurrentRequest();
        return deletedTimelogs;
    });
}

/** Deletes one timelog by id and recomputes task totals. */
async function remove(id: string) {
    return withTransaction(undefined, async (transaction: Transaction) => {
        const user = getCurrentUser();
        const timelog = await getOne(id);

        if (!user.admin && timelog.person !== user.id) {
            throw Errors.forbidden(translate("Timelog delete not allowed"));
        }

        const success = await removeByIds([id], transaction);

        return { success, timelog };
    });
}

/** Removes all timelogs attached to a task. */
async function removeByTask(task: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const timelogs = await getAll({ task }, transaction);
        const timelogIds = timelogs.map(timelog => timelog.id);
        const success = await removeByIds(timelogIds, transaction);

        return { success, timelogs };
    });
}

/** Batch variant of {@link removeByTask}. */
async function removeByTasks(task: string[], extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const timelogs = await getAll({ task }, transaction);
        const timelogIds = timelogs.map(timelog => timelog.id);
        const success = await removeByIds(timelogIds, transaction);

        return { success, timelogs };
    });
}

/** Deletes timelogs for every task in a project. */
async function removeByProject(project: string, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const timelogs = await getAll({ project }, transaction);
        const timelogIds = timelogs.map(timelog => timelog.id);

        const success = await removeByIds(timelogIds, transaction);

        return { success, timelogs };
    });
}

/** Marks submitted logs in range as reviewed per business rules. */
async function review(start: string, end: string) {
    return withTransaction(undefined, async (transaction: Transaction) => {
        const user = getCurrentUser();
        const [affectedCount] = await TimelogEntity.update(
            {
                updatedBy: user.id,
                status: TIMELOG_STATUS.INREVIEW,
            },
            {
                where: {
                    person: user.id,
                    date: {
                        [Op.gte]: start,
                        [Op.lte]: end,
                    },
                },
                transaction,
            }
        );

        // sending notifications to reviewers
        const timelogs = await getAll({ start, end }, transaction);

        const projectsIds: string[] = [];
        for (const timelog of timelogs) {
            if (!projectsIds.includes(timelog.project)) {
                projectsIds.push(timelog.project);
            }
        }

        const projectsEntities = await ProjectEntity.findAll({
            where: {
                id: projectsIds,
                approvers: {
                    [Op.ne]: "[]",
                },
            },
            transaction,
        });
        const projects: IProject[] = projectsEntities.map(
            (projectEntity: InstanceType<typeof ProjectEntity>) =>
                projectEntity.toJSON() as IProject
        );

        for (const project of projects) {
            for (const approver of project.approvers) {
                if (approver === user.id) continue;
                const projectTimelogs = timelogs.filter(timelog => timelog.project === project.id);
                NotificationsLoader.add({
                    recipient: approver,
                    subject: translate("Timelog review pending"),
                    message: translate("You have timelogs pending review", { count: projectTimelogs.length }),
                    recordType: NOTIFICATION_RECORD_TYPE.TIMELOG,
                    data: projectTimelogs,
                });
            }
        }

        invalidateApiCacheForCurrentRequest();
        return affectedCount > 0;
    });
}

/** Applies a {@link TIMELOG_STATUS} transition with optional scoped filters. */
async function updateStatus(
    action: TIMELOG_STATUS,
    filters: TimelogFilter,
    reason?: string
): Promise<ITimeLog[]> {
    return withTransaction(undefined, async (transaction: Transaction) => {
        const timelogs = await getAll(filters, transaction);
        if (timelogs.length === 0) {
            return [];
        }

        const user = getCurrentUser();
        const id = timelogs.map(timelog => timelog.id);
        const updateData: Partial<ITimeLog> = {
            updatedBy: user.id,
            status: action,
            approvedBy: user.id,
            approvedOn: new Date(),
        };

        if (action === TIMELOG_STATUS.REJECTED) {
            updateData.rejectReason = reason;
        }

        const [affectedCount] = await TimelogEntity.update(updateData, {
            where: { id },
            transaction,
        });

        if (affectedCount === 0) {
            throw Errors.internal(translate("Timelog status update failed"));
        }

        // sending notification to each of the timelogs assignees
        const assignees = timelogs.map(timelog => timelog.person);
        for (const assignee of assignees) {
            if (assignee === user.id) continue;
            NotificationsLoader.add({
                recipient: assignee,
                subject: translate("A timelog where you are assigned to was evaluated"),
                message: translate("Timelog change to action", { action }),
                recordType: NOTIFICATION_RECORD_TYPE.TIMELOG,
                data: timelogs
                    .filter(timelog => timelog.person === assignee)
                    .map((timelog: ITimeLog) => ({
                        recordId: timelog.id,
                        recordType: NOTIFICATION_RECORD_TYPE.TIMELOG,
                        message: translate("Your timelog was action", { action }),
                    })),
            });
        }

        invalidateApiCacheForCurrentRequest();
        return timelogs.map(timelog => ({ ...timelog, ...updateData }));
    });
}

/** Re-sums `duration` on a task and broadcasts timelog polling events. */
async function updateTotals(taskId: string, extTransaction?: Transaction): Promise<number> {
    return withTransaction(extTransaction, async (transaction: Transaction) => {
        const task = await TasksLoader.getOne(taskId, transaction);

        if (task) {
            const timelogsEntities = await TimelogEntity.findAll({
                where: { task: taskId },
                transaction,
            });
            const timelogs: ITimeLog[] = timelogsEntities.map(
                (timelogEntity: InstanceType<typeof TimelogEntity>) =>
                    timelogEntity.toJSON() as ITimeLog
            );
            const timeSpent = timelogs.reduce((acc: number, cur: ITimeLog) => acc + cur.duration, 0);

            await TasksLoader.update(
                taskId,
                {
                    timeSpent,
                },
                transaction
            );

            for (const timelog of timelogs) {
                sendRealtimeUpdate({
                    type: POLLINGTYPE.TIMELOG,
                    record: timelog.id,
                    action: POLLINGACTIONS.UPDATE,
                    permissions: task.permissions,
                });
            }

            return timeSpent;
        }

        return 0;
    });
}

export const TimelogsLoader = {
    getAll,
    getOne,
    create,
    update,
    remove,
    removeByTask,
    removeByTasks,
    removeByProject,
    review,
    updateStatus,
    updateTotals,
};
