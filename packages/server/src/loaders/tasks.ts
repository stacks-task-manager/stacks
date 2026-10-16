// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { addDays, endOfDay, startOfDay } from "date-fns";
import uniq from "lodash/uniq";
import { Op, Transaction } from "sequelize";

import { AttachmentEntity, DocumentEntity, PermissionEntity, sequelize, TaskEntity } from "@stacks/db";
import {
    AUTOMATION_EVENT,
    NOTIFICATION_RECORD_TYPE,
    POLLINGACTIONS,
    POLLINGTYPE,
    type ITask,
} from "@stacks/types";

import { Errors } from "../errors";
import { AutomationsService } from "../services/automations";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { NotificationsLoader } from "./notifications";
import { PermissionsLoader } from "./permissions";
import { ProjectsLoader } from "./projects";
import { StacksLoader } from "./stacks";
import { TimelogsLoader } from "./timelogs";
import {
    afterTransactionCommit,
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

        const project = await ProjectsLoader.getOne(newTask.project, transaction);

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

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.CREATE,
                permissions: mergePermissions(permissions, project.permissions),
            });
        });

        await StacksLoader.addTaskOrder(newTask.stack, newTask.id, positionInStack ?? "bottom", transaction);

        if (newTask.assignees?.length) {
            for (const assignee of newTask.assignees) {
                if (assignee === user.id) continue;
                await NotificationsLoader.add(
                    {
                        recipient: assignee,
                        subject: translate("You have been assigned to a new task"),
                        message: newTask.title,
                        recordType: NOTIFICATION_RECORD_TYPE.TASK,
                        recordId: newTask.id,
                        data: newTask as any,
                    },
                    transaction
                );
            }
        }
        // Trigger CREATED automation event
        await AutomationsService.triggerAutomation(newTask.id, AUTOMATION_EVENT.CREATED, {
            projectId: newTask.project,
            stackId: newTask.stack,
            extTransaction: transaction,
        });

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

        await ProjectsLoader.getOne(task.project, transaction);

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
    overdue?: "true" | true; // Incomplete tasks with a due date strictly before now.
    open?: "true" | true; // Only tasks with `done: false` (not completed).
    archived?: "true" | true; // Only tasks with `archived: null` (not archived).
    assigned?: "true" | true; // Only tasks with assignees (matches REST `assigned=true`).
    unassigned?: "true" | true; // Only tasks with no assignees (matches REST `unassigned=true`).
    assignees?: string | string[]; // Assignee UUID(s)
    parent?: string; // Parent task UUID
    query?: string; // Query (title or description)
    tags?: string | string[]; // Tag UUID(s); matches tasks carrying at least one of them (OR, like `assignees`)
    status?: string | string[]; // Status tag UUID(s); the task `status` column holds a single tag UUID
    priority?: "critical" | "high" | "medium" | "low" | "none"; // Exact priority match
    progress?: string; // Progress operator `gt:60` | `gte:60` | `lt:20` | `lte:20` | `eq:0`; tasks with no progress never match
    dueFrom?: string; // ISO date-time — first day of the due-date window (whole UTC day; resolve "due today / this week / next week" to a window)
    dueTo?: string; // ISO date-time — last day of the due-date window (paired with dueFrom)
    startFrom?: string; // ISO date-time — first day of the start-date window (resolve "starts today / next week" to a window)
    startTo?: string; // ISO date-time — last day of the start-date window (paired with startFrom)
    limit?: number; // Limit the number of tasks returned
}

type TaskOrdering = [string, "ASC" | "DESC"][];

/**
 * Parse a progress operator (`gt|gte|lt|lte|eq:<0-100>`) into a Sequelize clause for the `progress` column.
 * SQL `NULL` comparisons are false, so tasks without a progress value never match any operator.
 * @param raw Raw operator string, or undefined when no progress filter was requested
 * @returns Sequelize clause, or null when no filter was requested
 */
function buildProgressClause(raw?: string): object | null {
    if (raw == null) {
        return null;
    }

    const match = /^(gt|gte|lt|lte|eq):(\d{1,3})$/.exec(raw);
    if (!match) {
        // The accepted grammar stays in the response context, not in the translatable message
        throw Errors.badRequest(translate("Invalid progress filter"), {
            progress: raw,
            expected: "gt | gte | lt | lte | eq with a 0-100 value",
        });
    }

    const percent = Number(match[2]);
    if (percent > 100) {
        throw Errors.badRequest(translate("Invalid progress filter value"), { progress: raw });
    }

    switch (match[1]) {
        case "gt":
            return { [Op.gt]: percent };
        case "gte":
            return { [Op.gte]: percent };
        case "lt":
            return { [Op.lt]: percent };
        case "lte":
            return { [Op.lte]: percent };
        default:
            return { [Op.eq]: percent };
    }
}

/** Milliseconds in a calendar day, used to close whole-day window bounds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Read a date-window bound as an instant, reading values without an explicit timezone as UTC.
 * @param value ISO date (`2026-10-12`) or ISO date-time (`2026-10-12T00:00:00.000Z`)
 * @returns Date, or null when the value is not a real ISO date
 */
function parseWindowInstant(value: string): Date | null {
    // One grammar, no fallthrough: anything outside an ISO date or ISO date-time (a space-separated
    // form, a month name) is rejected rather than handed to `new Date`, which reads those shapes
    // against the host clock and silently moves the bound to another day.
    const shape =
        /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
    if (!shape) {
        return null;
    }

    const iso = shape[2] ? `${shape[1]}T${shape[2]}${shape[3] ?? "Z"}` : `${shape[1]}T00:00:00.000Z`;
    const parsed = new Date(iso);
    if (!Number.isFinite(parsed.getTime())) {
        return null;
    }

    // Reject impossible calendar dates (JS rolls `2026-02-30` over to the next month otherwise)
    const calendarDay = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (
        !Number.isFinite(calendarDay.getTime()) ||
        calendarDay.toISOString().slice(0, 10) !== value.slice(0, 10)
    ) {
        return null;
    }

    return parsed;
}

/**
 * Inclusive UTC calendar-day bounds for one date-window bound (`dueFrom`, `dueTo`, `startFrom`, `startTo`).
 * Windows name whole days in UTC, so `dueFrom: 2026-10-12T00:00:00.000Z` with `dueTo:
 * 2026-10-18T23:59:59.999Z` selects 2026-10-12 through 2026-10-18 in the host's timezone as well:
 * the bounds are derived from the UTC calendar date, never from the host-local day, which would
 * widen the window into the next day for hosts west/east of UTC.
 * @param value ISO date or date-time bound
 * @returns `[00:00:00.000, 23:59:59.999]` of the bound's UTC calendar day, or null when invalid
 */
function utcDayBounds(value: string): [Date, Date] | null {
    const instant = parseWindowInstant(value);
    if (!instant) {
        return null;
    }

    const dayStart = new Date(
        Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
    );
    return [dayStart, new Date(dayStart.getTime() + DAY_MS - 1)];
}

/**
 * Build a date column clause from a `[from, to]` window of inclusive whole days.
 * @param from ISO bound naming the first day of the window
 * @param to ISO bound naming the last day of the window
 * @returns Sequelize clause, or null when neither bound was requested
 */
function buildDateWindowClause(from?: string, to?: string): object | null {
    if (!from && !to) {
        return null;
    }

    const lower = from ? utcDayBounds(from)?.[0] : null;
    const upper = to ? utcDayBounds(to)?.[1] : null;
    if ((from && !lower) || (to && !upper)) {
        throw Errors.badRequest(translate("Invalid date window"), { from, to });
    }

    if (lower && upper) {
        return { [Op.between]: [lower, upper] };
    }
    if (lower) {
        return { [Op.gte]: lower };
    }
    return { [Op.lte]: upper };
}

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
                [Op.or]: filters.assignees.map(id => ({ [Op.contains]: [id] })),
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

    // Filter by tags (any of the requested tag UUIDs)
    if (filters.tags) {
        if (Array.isArray(filters.tags)) {
            filter.tags = {
                [Op.or]: filters.tags.map(id => ({ [Op.contains]: [id] })),
            };
        } else {
            filter.tags = {
                [Op.contains]: [filters.tags],
            };
        }
    }

    // Filter by status (single tag UUID per task; a list becomes an IN match)
    if (filters.status) {
        filter.status = filters.status;
    }

    // Filter by priority
    if (filters.priority) {
        filter.priority = filters.priority;
    }

    const progressClause = buildProgressClause(filters.progress);
    if (progressClause) {
        filter.progress = progressClause;
    }

    const andClauses: object[] = [];
    if (filters.overdue === "true" || filters.overdue === true) {
        andClauses.push({ done: false, duedate: { [Op.lt]: new Date() } });
    }

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
        // Reject malformed bounds before they reach SQL; the day wrapping below stays host-local
        if (
            (filters.from && !parseWindowInstant(filters.from)) ||
            (filters.to && !parseWindowInstant(filters.to))
        ) {
            throw Errors.badRequest(translate("Invalid date range"), {
                from: filters.from,
                to: filters.to,
            });
        }

        const fromDate: Date = startOfDay(new Date(filters.from || new Date().toISOString()));
        const toDate: Date = endOfDay(new Date(filters.to || addDays(new Date(), 10)));

        // Task overlaps the range if it starts before the range ends and ends after the range begins
        // Null dates are treated as unconstrained (task could start/end at any point)
        andClauses.push({
            [Op.and]: [
                {
                    [Op.or]: [{ startdate: { [Op.lte]: toDate } }, { startdate: null }],
                },
                {
                    [Op.or]: [{ duedate: { [Op.gte]: fromDate } }, { duedate: null }],
                },
            ],
        });
    }

    // Filter by due-date window (`dueFrom`/`dueTo`)
    const dueWindowClause = buildDateWindowClause(filters.dueFrom, filters.dueTo);
    if (dueWindowClause) {
        andClauses.push({ duedate: dueWindowClause });
    }

    // Filter by start-date window (`startFrom`/`startTo`)
    const startWindowClause = buildDateWindowClause(filters.startFrom, filters.startTo);
    if (startWindowClause) {
        andClauses.push({ startdate: startWindowClause });
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
        const filter: any = buildTaskListFilter(filters);
        const visibleProjectIds = (await ProjectsLoader.getAll(transaction)).map(project => project.id);
        filter[Op.and] = [...((filter as any)[Op.and] ?? []), { project: { [Op.in]: visibleProjectIds } }];
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
        const filter: any = buildTaskListFilter(filters);
        const visibleProjectIds = (await ProjectsLoader.getAll(transaction)).map(project => project.id);
        filter[Op.and] = [...((filter as any)[Op.and] ?? []), { project: { [Op.in]: visibleProjectIds } }];

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
            transaction,
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
            await NotificationsLoader.add(
                {
                    recipient: assignee,
                    subject: translate("A task you were assigned to was deleted"),
                    message: task.title,
                    recordType: NOTIFICATION_RECORD_TYPE.TASK,
                    recordId: id,
                    data: task,
                },
                transaction
            );
        }

        await TimelogsLoader.removeByTask(id, transaction);

        const deletedTask = await deleteOne<ITask>({
            entity: TaskEntity,
            id,
            transaction,
        });

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.DELETED,
                permissions: task.permissions,
            });
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
        }

        afterTransactionCommit(transaction, () => {
            for (const task of deletedTasks) {
                sendRealtimeUpdate({
                    type: POLLINGTYPE.TASK,
                    record: task.id,
                    action: POLLINGACTIONS.DELETED,
                    permissions: task.permissions,
                });
            }
        });

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
        // Totals must be recalculated while the tasks still exist in this transaction.
        const tasks = await findAll<ITask>({ entity: TaskEntity, filter: { stack }, transaction });
        await TimelogsLoader.removeByTasks(
            tasks.map(task => task.id),
            transaction
        );

        const deletedTasks: ITask[] = await deleteAll<ITask>({
            entity: TaskEntity,
            filter: { stack },
            transaction,
        });

        for (const task of deletedTasks) {
            await StacksLoader.removeTaskOrder(task.stack, task.id, transaction);
        }

        afterTransactionCommit(transaction, () => {
            for (const task of deletedTasks) {
                sendRealtimeUpdate({
                    type: POLLINGTYPE.TASK,
                    record: task.id,
                    action: POLLINGACTIONS.DELETED,
                    permissions: task.permissions,
                });
            }
        });

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

        const prevTaskSnapshot = {
            done: task.done,
            duedate: task.duedate,
            startdate: task.startdate,
            dodate: task.dodate,
            stack: task.stack,
            archived: task.archived,
        };

        if (data.done) {
            data.completed = new Date();
        }

        const updatedTask = await updateOne<ITask>({
            entity: TaskEntity,
            id,
            data,
            transaction,
        });

        /*
            Sending notifications - START
        */
        if (data.assignees) {
            for (const assignee of data.assignees) {
                // sending notification to assignees by skipping current user
                if (assignee === user.id) continue;
                await NotificationsLoader.add(
                    {
                        recipient: assignee,
                        subject: translate("You have been assigned to a task"),
                        message: task.title,
                        recordType: NOTIFICATION_RECORD_TYPE.TASK,
                        recordId: id,
                        data: task,
                    },
                    transaction
                );
            }
        }

        if (data.done === false && task.done === true) {
            for (const assignee of task.assignees ?? []) {
                if (assignee === user.id) continue;
                await NotificationsLoader.add(
                    {
                        recipient: assignee,
                        subject: translate("A task you are assigned to was reopened"),
                        message: task.title,
                        recordId: id,
                        recordType: NOTIFICATION_RECORD_TYPE.TASK,
                        data: task,
                    },
                    transaction
                );
            }
        }

        if (data.done) {
            for (const assignee of task.assignees ?? []) {
                // sending notification to assignees by skipping current user
                if (assignee === user.id) continue;
                await NotificationsLoader.add(
                    {
                        recipient: assignee,
                        subject: translate("A task where you are assigned to was completed"),
                        message: task.title,
                        recordId: id,
                        recordType: NOTIFICATION_RECORD_TYPE.TASK,
                        data: task,
                    },
                    transaction
                );
            }
        }
        /*
            Sending notifications - END
        */

        let automationRan = false;
        // Trigger automation events based on field changes
        const updatedFields: Record<string, unknown> = {};
        const toDateTime = (value: unknown): number | null => {
            if (value == null) return null;
            const date = value instanceof Date ? value : new Date(value as any);
            const time = date.getTime();
            return Number.isNaN(time) ? null : time;
        };

        if (data.duedate !== undefined && toDateTime(data.duedate) !== toDateTime(prevTaskSnapshot.duedate)) {
            updatedFields.duedate = data.duedate;
        }
        if (
            data.startdate !== undefined &&
            toDateTime(data.startdate) !== toDateTime(prevTaskSnapshot.startdate)
        ) {
            updatedFields.startdate = data.startdate;
        }
        if (data.dodate !== undefined && toDateTime(data.dodate) !== toDateTime(prevTaskSnapshot.dodate)) {
            updatedFields.dodate = data.dodate;
        }
        if (data.done === true && prevTaskSnapshot.done !== true) {
            await AutomationsService.triggerAutomation(id, AUTOMATION_EVENT.DONE, {
                projectId: updatedTask.project,
                prevTask: prevTaskSnapshot,
                updatedFields,
                extTransaction: transaction,
            });
            automationRan = true;
        } else if (data.done === false && prevTaskSnapshot.done !== false) {
            await AutomationsService.triggerAutomation(id, AUTOMATION_EVENT.TODO, {
                projectId: updatedTask.project,
                prevTask: prevTaskSnapshot,
                updatedFields,
                extTransaction: transaction,
            });
            automationRan = true;
        }
        if (data.stack != null && data.stack !== prevTaskSnapshot.stack) {
            updatedFields.stack = data.stack;
            await AutomationsService.triggerAutomation(id, AUTOMATION_EVENT.MOVED, {
                projectId: updatedTask.project,
                stackId: data.stack,
                prevTask: prevTaskSnapshot,
                updatedFields,
                extTransaction: transaction,
            });
            automationRan = true;
        }
        // Trigger ARCHIVED event if task was just archived
        if (data.archived != null && prevTaskSnapshot.archived == null) {
            updatedFields.archived = data.archived;
            await AutomationsService.triggerAutomation(id, AUTOMATION_EVENT.ARCHIVED, {
                projectId: updatedTask.project,
                prevTask: prevTaskSnapshot,
                extTransaction: transaction,
            });
            automationRan = true;
        } else if (data.archived != null) {
            updatedFields.archived = data.archived;
        }

        if (
            updatedFields.duedate !== undefined ||
            updatedFields.startdate !== undefined ||
            updatedFields.dodate !== undefined
        ) {
            const dateAutomationRan = await AutomationsService.triggerDateAutomations(id, {
                projectId: updatedTask.project,
                prevTask: prevTaskSnapshot,
                updatedFields,
                extTransaction: transaction,
            });
            automationRan = automationRan || dateAutomationRan;
        }

        const project = await ProjectsLoader.getOne(updatedTask.project, transaction);

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.UPDATE,
                permissions: mergePermissions(task.permissions, project.permissions),
                automation: automationRan,
            });
        });

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

        return update(id, data, transaction);
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

            // 3. Trigger MOVED automation event
            await AutomationsService.triggerAutomation(taskId, AUTOMATION_EVENT.MOVED, {
                projectId: task.project,
                stackId,
                prevTask: { stack: task.stack },
                extTransaction: transaction,
            });
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
