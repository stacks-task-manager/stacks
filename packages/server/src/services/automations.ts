// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Server-side automation execution.
 *
 * Triggers project automations based on task events (DONE, TODO, CREATED,
 * MOVED, ARCHIVED, OVERDUE, STARTED, DO) and executes matching actions
 * directly via Sequelize — no HTTP round-trips.
 */
import { addDays, isBefore } from "date-fns";
import { Transaction } from "sequelize";

import { ProjectEntity, StackEntity, TaskEntity } from "@stacks/db";
import {
    AUTOMATION_DO,
    AUTOMATION_EVENT,
    IAutomation,
    IAutomationAction,
    POLLINGACTIONS,
    POLLINGTYPE,
} from "@stacks/types";

import { Errors } from "../errors";
import { findOne, updateOne, withTransaction } from "../loaders/utils";
import { ProjectsLoader, StacksLoader } from "src/loaders";
import { sendRealtimeUpdate } from "src/events";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check whether a date field has become overdue.
 * A task is overdue when its due date is before today (end of day) and not done.
 */
function isOverdue(duedate: Date | string | null, done: boolean): boolean {
    if (!duedate || done) return false;
    const due = new Date(duedate);
    const now = new Date();
    // End of today
    now.setHours(23, 59, 59, 999);
    return isBefore(due, now);
}

/**
 * Check whether a date field has become started (start date in the past).
 */
function isStarted(startdate: Date | string | null, done: boolean): boolean {
    if (!startdate || done) return false;
    const start = new Date(startdate);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return isBefore(start, now);
}

/**
 * Check whether a date field has become do (do date in the past).
 */
function isDo(dodate: Date | string | null, done: boolean): boolean {
    if (!dodate || done) return false;
    const doDate = new Date(dodate);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return isBefore(doDate, now);
}

/**
 * Calculate a new date based on an action value (relative offset in days).
 * Positive = add days, negative = subtract days.
 */
function calculateDate(value: number, field: "startdate" | "duedate" | "dodate"): Date | null {
    if (value > 0) {
        return addDays(new Date(), value);
    }
    return subDays(new Date(), Math.abs(value));
}

/**
 * Subtract days from today.
 */
function subDays(date: Date, days: number): Date {
    return addDays(date, -days);
}

// ─── Core ───────────────────────────────────────────────────────────────────

/**
 * Fetch a project and its automations by ID.
 */
async function getProjectAutomations(projectId: string, extTransaction?: Transaction): Promise<IAutomation[]> {
    const project = await findOne({
        entity: ProjectEntity,
        id: projectId,
        transaction: extTransaction,
    });

    if (!project) {
        throw Errors.notFound("Project not found");
    }

    return (project.automations as IAutomation[]) ?? [];
}

/**
 * Filter enabled automations for a given event and optional event value.
 */
function filterAutomations(
    automations: IAutomation[],
    event: AUTOMATION_EVENT,
    eventValue?: string
): IAutomation[] {
    return automations.filter(
        (a) =>
            a.enabled &&
            a.event === event &&
            (eventValue == null || a.value === eventValue)
    );
}

/**
 * Execute a single automation action on a task via direct Sequelize update.
 */
async function executeAction(
    taskId: string,
    action: IAutomationAction,
    extTransaction?: Transaction
): Promise<void> {
    switch (action.do) {
        case AUTOMATION_DO.ASSIGN:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { assignees: [...(action.value as string[])] },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.UNASSIGN:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { assignees: (action.value as string[]) },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.UNASSIGNALL:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { assignees: [] },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.STARTDATE:
        case AUTOMATION_DO.DUEDATE:
        case AUTOMATION_DO.DODATE: {
            const dateValue = action.value as number;
            const newDate = calculateDate(dateValue, action.do === AUTOMATION_DO.STARTDATE ? "startdate" : action.do === AUTOMATION_DO.DUEDATE ? "duedate" : "dodate");
            const field = action.do === AUTOMATION_DO.STARTDATE ? "startdate" : action.do === AUTOMATION_DO.DUEDATE ? "duedate" : "dodate";
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { [field]: newDate },
                transaction: extTransaction,
            });
            break;
        }

        case AUTOMATION_DO.ADDTAG:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { tags: [...(action.value as string[])] },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.REMOVETAG: {
            const currentTags = (await findOne({
                entity: TaskEntity,
                id: taskId,
                transaction: extTransaction,
            }))?.tags as string[] | undefined;
            const removed = (action.value as string[]);
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { tags: (currentTags ?? []).filter((t) => !removed.includes(t)) },
                transaction: extTransaction,
            });
            break;
        }

        case AUTOMATION_DO.REMOVEALLTAGS:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { tags: [] },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.ADDSTATUS:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { status: action.value as string },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.REMOVESTATUS:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { status: null },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.DONE:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { done: true, completed: new Date(), progress: 100 },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.TODO:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { done: false, progress: 0 },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.MOVE:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { stack: action.value as string },
                transaction: extTransaction,
            });

            await StacksLoader.addTaskOrder(action.value as string, taskId, "top", extTransaction);

            const stack = await StacksLoader.getOne(action.value as string, extTransaction);
            const tasksOrder = [taskId, ...stack.tasksOrder];

            await updateOne({
                entity: StackEntity,
                id: stack.id,
                data: { tasksOrder },
                transaction: extTransaction,
            });

            const project = await ProjectsLoader.getOne(stack.project, extTransaction);

            await sendRealtimeUpdate({
                type: POLLINGTYPE.STACK,
                record: stack.id,
                action: POLLINGACTIONS.UPDATE,
                permissions: project.permissions,
                automation: true,
            });

            break;

        case AUTOMATION_DO.PROGRESS:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { progress: action.value as number },
                transaction: extTransaction,
            });
            break;

        case AUTOMATION_DO.ARCHIVE:
            await updateOne({
                entity: TaskEntity,
                id: taskId,
                data: { archived: new Date() },
                transaction: extTransaction,
            });
            break;
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function triggerDateAutomations(
    taskId: string,
    context: {
        projectId?: string;
        prevTask?: Record<string, unknown>;
        updatedFields?: Record<string, unknown>;
        extTransaction?: Transaction;
    }
): Promise<boolean> {
    const { projectId, prevTask, updatedFields, extTransaction } = context;

    if (!projectId || !updatedFields) return false;

    const shouldCheck =
        updatedFields.duedate !== undefined ||
        updatedFields.startdate !== undefined ||
        updatedFields.dodate !== undefined;
    if (!shouldCheck) return false;

    const updatedTask = await findOne({
        entity: TaskEntity,
        id: taskId,
        transaction: extTransaction,
    });

    if (!updatedTask) return false;

    const done = Boolean(updatedTask.done);
    const prevDone = Boolean(prevTask?.["done"]);

    let triggered = false;

    if (updatedFields.duedate !== undefined) {
        const prevDueDate = prevTask?.["duedate"] as Date | string | null | undefined;
        const wasOverdue = prevDueDate ? isOverdue(prevDueDate, prevDone) : false;
        if (!wasOverdue && isOverdue(updatedTask.duedate, done)) {
            await triggerAutomation(taskId, AUTOMATION_EVENT.OVERDUE, {
                projectId,
                extTransaction,
            });
            triggered = true;
        }
    }

    if (updatedFields.startdate !== undefined) {
        const prevStartDate = prevTask?.["startdate"] as Date | string | null | undefined;
        const wasStarted = prevStartDate ? isStarted(prevStartDate, prevDone) : false;
        if (!wasStarted && isStarted(updatedTask.startdate, done)) {
            await triggerAutomation(taskId, AUTOMATION_EVENT.STARTED, {
                projectId,
                extTransaction,
            });
            triggered = true;
        }
    }

    return triggered;
}

/**
 * Trigger automations for a task event.
 *
 * @param taskId - Task UUID
 * @param event - Automation event to trigger
 * @param context - Additional context
 * @param context.stackId - Stack ID (used for CREATED/MOVED eventValue)
 * @param context.extTransaction - Optional transaction
 */
export async function triggerAutomation(
    taskId: string,
    event: AUTOMATION_EVENT,
    context: {
        stackId?: string;
        projectId?: string;
        prevTask?: Record<string, unknown>;
        updatedFields?: Record<string, unknown>;
        extTransaction?: Transaction;
    }
): Promise<void> {
    const { stackId, projectId, prevTask, updatedFields, extTransaction } = context;

    if (!projectId) return;

    const automations = await getProjectAutomations(projectId, extTransaction);
    const filtered = filterAutomations(automations, event, stackId);

    // Execute each action within the provided transaction
    if (filtered.length) {
        for (const automation of filtered) {
            for (const action of automation.actions) {
                await executeAction(taskId, action, extTransaction);
            }
        }
    }

    // After actions execute, re-check date-based events that may have become true
    // as a result of the action. Only fire once to avoid infinite loops.
    const isDateEvent = [AUTOMATION_EVENT.OVERDUE, AUTOMATION_EVENT.STARTED].includes(event);
    if (!isDateEvent) {
        await triggerDateAutomations(taskId, {
            projectId,
            prevTask,
            updatedFields,
            extTransaction,
        });
    }
}

export const AutomationsService = {
    triggerAutomation,
    triggerDateAutomations,
    executeAction,
};
