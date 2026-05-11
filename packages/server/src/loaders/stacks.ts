// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PermissionEntity, StackEntity } from "@stacks/db";
import { Errors } from "../errors";
import { POLLINGACTIONS, POLLINGTYPE, type IProject, type IStack } from "@stacks/types";
import uniq from "lodash/uniq";
import { type Transaction } from "sequelize";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { ProjectsLoader } from "./projects";
import { TasksLoader } from "./tasks";
import { createOne, deleteAll, deleteOne, findAll, findOne, updateOne, withTransaction } from "./utils";
import { PermissionsLoader } from "./permissions";
import { translate } from "@stacks/translations";

StackEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(StackEntity, { foreignKey: "id", constraints: false });

/**
 * Create a new stack.
 * @param data Stack data
 * @param index Index to insert the stack at in the project
 * @param extTransaction External transaction
 * @returns Stack
 */
async function create(data: IStack, index?: number, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const project = await ProjectsLoader.getOne(data.project, transaction);

        const newStack = await createOne<IStack>({
            entity: StackEntity,
            data: { ...data, project: project.id },
            transaction,
        });

        // create permissions for the new stack
        // these are not used, will allways be public
        await PermissionsLoader.create(
            newStack.id,
            {
                type: POLLINGTYPE.STACK,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            },
            transaction
        );

        sendRealtimeUpdate({
            type: POLLINGTYPE.STACK,
            record: newStack.id,
            parent: project.id,
            action: POLLINGACTIONS.CREATE,
            permissions: project.permissions,
        });

        await ProjectsLoader.addStackOrder(newStack.project, newStack.id, index);

        return newStack;
    });
}

/**
 * Get all stacks by project ID.
 * @param projectId Project ID
 * @returns Stacks
 */
async function getAll(project: string): Promise<IStack[]> {
    try {
        await ProjectsLoader.getOne(project);

        return await findAll<IStack>({
            entity: StackEntity,
            filter: {
                project,
            },
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Get a stack by ID.
 * @param id Stack ID
 * @param transaction Transaction
 * @returns Stack
 */
async function getOne(id: string, extTransaction?: Transaction): Promise<IStack> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await findOne({
            entity: StackEntity,
            id,
            transaction,
        });

        if (!stack) {
            throw Errors.notFound(translate("Stack not found"));
        }

        // check if the project is accessible by the current user
        await ProjectsLoader.getOne(stack.project, transaction);

        return stack;
    });
}

/**
 * Update a stack by ID.
 * @param id Stack ID
 * @param data Stack data
 * @param extTransaction External transaction
 */
async function update(id: string, data: any, extTransaction?: Transaction): Promise<IStack> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await getOne(id, transaction);
        const project = await ProjectsLoader.getOne(stack.project, transaction);

        const updatedStack = await updateOne<IStack>({
            entity: StackEntity,
            id,
            data,
            transaction,
        });

        if (!updatedStack) {
            throw Errors.internal(translate("Stack update failed"));
        }

        await sendRealtimeUpdate({
            type: POLLINGTYPE.STACK,
            record: id,
            parent: project.id,
            action: POLLINGACTIONS.UPDATE,
            permissions: project.permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return updatedStack;
    });
}

/**
 * Remove a stack by ID.
 * @param id Stack ID
 * @param extTransaction External transaction
 * @returns Stack | false
 */
async function remove(id: string, extTransaction?: Transaction): Promise<IStack | false> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await getOne(id, transaction);
        const project = await ProjectsLoader.getOne(stack.project, transaction);

        await TasksLoader.removeByStack(id, transaction);

        const deletedStack = await deleteOne<IStack>({
            entity: StackEntity,
            id,
            transaction,
        });

        if (!deletedStack) {
            throw Errors.internal("Stack delete failed");
        }

        await sendRealtimeUpdate({
            type: POLLINGTYPE.STACK,
            record: stack.id,
            parent: project.id,
            action: POLLINGACTIONS.DELETED,
            permissions: project.permissions,
        });

        return deletedStack;
    });
}

/**
 * Remove all stacks by project ID.
 * @param project Project ID
 * @param transaction Transaction
 * @returns Boolean
 */
async function removeAll(projectId: string, extTransaction?: Transaction): Promise<IStack[]> {
    return withTransaction(extTransaction, async transaction => {
        const project = await ProjectsLoader.getOne(projectId, transaction);

        // delete all tasks for the project
        await TasksLoader.removeByProject(projectId, transaction);

        const deletedStacks = await deleteAll<IStack>({
            entity: StackEntity,
            filter: { project: projectId },
            transaction,
        });

        for (const stack of deletedStacks) {
            await sendRealtimeUpdate({
                type: POLLINGTYPE.STACK,
                record: stack.id,
                parent: project.id,
                action: POLLINGACTIONS.DELETED,
                permissions: project.permissions,
            });
        }

        return deletedStacks;
    });
}

async function move(id: string, after: string | null, extTransaction?: Transaction): Promise<IProject> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await getOne(id, transaction);
        const project = await ProjectsLoader.getOne(stack.project, transaction);
        const order = project.stacksOrder;

        if (order.indexOf(id) > -1) {
            order.splice(order.indexOf(id), 1);
        }

        if (after) {
            const afterIndex = order.indexOf(after);
            order.splice(afterIndex + 1, 0, id);
        } else {
            order.unshift(id);
        }
        const stacksOrder = uniq(order);

        return await ProjectsLoader.update(project.id, { stacksOrder }, transaction);
    });
}

async function addTaskOrder(
    id: string,
    taskId: string,
    position?: "top" | "bottom",
    extTransaction?: Transaction
): Promise<IStack> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await getOne(id, transaction);
        const tasksOrder = position === "top" ? [taskId, ...stack.tasksOrder] : [...stack.tasksOrder, taskId];
        return await update(id, { tasksOrder }, transaction);
    });
}

async function removeTaskOrder(id: string, taskId: string, extTransaction?: Transaction): Promise<IStack> {
    return withTransaction(extTransaction, async transaction => {
        const stack = await getOne(id, transaction);
        const tasksOrder = stack.tasksOrder.filter(task => task !== taskId);
        return await update(id, { tasksOrder }, transaction);
    });
}

export const StacksLoader = {
    create,
    getAll,
    getOne,
    update,
    remove,
    removeAll,
    move,
    addTaskOrder,
    removeTaskOrder,
};
