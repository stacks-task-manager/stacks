// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DocumentEntity, PermissionEntity, ProjectEntity, TaskEntity } from "@stacks/db";
import { Errors } from "../errors";
import { ITask, POLLINGACTIONS, POLLINGTYPE, ROLE_SECTIONS, type IProject } from "@stacks/types";
import { literal, Op, Transaction } from "sequelize";
import { IProjectWithDocument, IProjectWithTitle } from "../types/project";
import { canWrite, getCurrentUser } from "./context";
import { StacksLoader } from "./stacks";
import { createOne, deleteOne, findAll, findOne, updateAll, updateOne, withTransaction } from "./utils";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { translate } from "@stacks/translations";

ProjectEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
ProjectEntity.hasOne(DocumentEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(ProjectEntity, { foreignKey: "id", constraints: false });

/**
 * Create a new project.
 * @param data The project data to create.
 * @param transaction Optional transaction for database operations.
 * @returns The created project.
 */
async function create(data: object, extTransaction?: Transaction) {
    return withTransaction(extTransaction, async transaction => {
        const created = await createOne({
            entity: ProjectEntity,
            data,
            transaction,
        });
        invalidateApiCacheForCurrentRequest();
        return created;
    });
}

/**
 * Retrieve a project by its ID.
 * @param id The ID of the project to retrieve.
 * @returns The requested project.
 */
async function getOne(id: string, extTransaction?: Transaction): Promise<IProject> {
    return withTransaction(extTransaction, async transaction => {
        const project = await findOne({
            entity: ProjectEntity,
            id,
            transaction,
        });

        if (!project) {
            throw Errors.notFound(translate("Project not found"));
        }

        return project;
    });
}

/**
 * Get all projects.
 * @param transaction Optional transaction for database operations.
 * @returns A list of all projects.
 */
async function getAll(extTransaction?: Transaction): Promise<IProjectWithTitle[]> {
    return withTransaction(extTransaction, async transaction => {
        const projects = await findAll<IProjectWithDocument>({
            entity: ProjectEntity,
            transaction,
            filter: {
                [Op.and]: literal(`"DocumentEntity"."archived" IS NULL`),
            },
            include: [
                {
                    model: DocumentEntity,
                    attributes: ["title"],
                },
            ],
        });

        return projects.map((projectData: IProjectWithDocument): IProjectWithTitle => {
            const { DocumentEntity: Document, ...project } = projectData;
            return {
                ...project,
                title: (Document as any)?.title,
            };
        });
    });
}

/**
 * Update a project by its ID.
 * @param id The ID of the project to update.
 * @param data The new data for the project.
 * @param transaction Optional transaction for database operations.
 * @returns A boolean indicating whether the update was successful.
 */
async function update(id: string, data: Partial<IProject>, extTransaction?: Transaction): Promise<IProject> {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();

        const project = await getOne(id, transaction);

        // check if user has write access to the project settings
        let haveAccess = canWrite(ROLE_SECTIONS.PROJECT_SETTINGS);

        // check whether we're setting the stacks order
        if (Object.keys(data).length === 1 && data.stacksOrder !== undefined) {
            haveAccess = true;
        }

        // thow error in case anyone except the owner is changing the project data
        if (!haveAccess && project.projectOwner !== user.id) {
            throw Errors.forbidden(translate("Project update not allowed"));
        }

        const updatedProject: IProject = await updateOne<IProject>({
            entity: ProjectEntity,
            id,
            data,
            transaction,
        });

        await sendRealtimeUpdate({
            type: POLLINGTYPE.PROJECT,
            record: id,
            action: POLLINGACTIONS.UPDATE,
            permissions: project.permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return updatedProject;
    });
}

/** * Remove a project by its ID.
 * @param id The ID of the project to remove.
 * @param transaction Optional transaction for database operations.
 * @return A boolean indicating whether the removal was successful.
 */
async function remove(id: string, extTransaction?: Transaction): Promise<boolean> {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();

        const project = await getOne(id, transaction);
        // check if the person deleting the project is the project owner or admin
        if (project.projectOwner !== user.id || !user.admin) {
            throw Errors.forbidden(translate("Project delete not allowed"));
        }

        // delete all stacks for the project
        await StacksLoader.removeAll(id, transaction);

        // delete project
        await deleteOne<IProject>({
            entity: ProjectEntity,
            id,
            transaction,
        });

        await sendRealtimeUpdate({
            type: POLLINGTYPE.PROJECT,
            record: id,
            action: POLLINGACTIONS.DELETED,
            permissions: project.permissions,
        });

        invalidateApiCacheForCurrentRequest();
        return true;
    });
}

/**
 * Archive all completed tasks for a project.
 * @param id The ID of the project to archive tasks for.
 * @param extTransaction Optional transaction for database operations.
 * @returns A list of archived tasks.
 */
async function archiveCompletedTasks(id: string, extTransaction?: Transaction): Promise<ITask[]> {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();

        const project = await getOne(id, transaction);

        // check if the person archiving all the completed tasks is the project owner or admin
        if (project.projectOwner !== user.id && !user.admin) {
            throw Errors.forbidden(translate("Archive completed not allowed"));
        }

        const taskToArchive: ITask[] = await findAll<ITask>({
            entity: TaskEntity,
            filter: {
                project: id,
                done: true,
                archived: null,
            },
            transaction,
        });

        const archivedTasks = await updateAll<ITask>({
            entity: TaskEntity,
            data: { archived: new Date() },
            filter: {
                project: id,
                done: true,
                archived: null,
            },
            transaction,
        });

        for (const task of taskToArchive) {
            sendRealtimeUpdate({
                type: POLLINGTYPE.TASK,
                record: task.id,
                action: POLLINGACTIONS.ARCHIVED,
                permissions: task.permissions,
            });
        }

        invalidateApiCacheForCurrentRequest();
        return archivedTasks;
    });
}

/**
 * Add a stack to the project's stacks order.
 * @param id The ID of the project to add the stack to.
 * @param stackId The ID of the stack to add.
 * @param index Optional index to insert the stack at. If not provided, the stack is appended.
 * @param extTransaction Optional transaction for database operations.
 * @returns The updated project.
 */
async function addStackOrder(
    id: string,
    stackId: string,
    index?: number,
    extTransaction?: Transaction
): Promise<IProject> {
    return withTransaction(extTransaction, async transaction => {
        const project = await getOne(id, transaction);
        const stacksOrder = project.stacksOrder;

        if (index != null) {
            stacksOrder.splice(index, 0, stackId);
        } else {
            stacksOrder.push(stackId);
        }

        return await update(id, { stacksOrder }, transaction);
    });
}

/**
 * Remove a stack from the project's stacks order.
 * @param id The ID of the project to remove the stack from.
 * @param stackId The ID of the stack to remove.
 * @param extTransaction Optional transaction for database operations.
 * @returns The updated project.
 */
async function removeStackOrder(
    id: string,
    stackId: string,
    extTransaction?: Transaction
): Promise<IProject> {
    return withTransaction(extTransaction, async transaction => {
        const project = await getOne(id, transaction);
        const stacksOrder = project.stacksOrder.filter(stack => stack !== stackId);
        const updatedProject = await update(id, { stacksOrder }, transaction);

        await sendRealtimeUpdate({
            type: POLLINGTYPE.PROJECT,
            record: project.id,
            action: POLLINGACTIONS.UPDATE,
            permissions: project.permissions,
        });

        return updatedProject;
    });
}

export const ProjectsLoader = {
    create,
    getOne,
    getAll,
    update,
    remove,
    archiveCompletedTasks,
    addStackOrder,
    removeStackOrder,
};
