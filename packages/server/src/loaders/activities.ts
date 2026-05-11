// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task activity rows: comments/logs on resources with permission checks and cache invalidation.
 */
import { ActivityEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import { Errors } from "../errors";
import { ACTIVITYRESOURCETYPE, ACTIVITYTYPE, type IActivity } from "../types";
import { canWrite, getCurrentUser } from "./context";
import { withTransaction } from "./utils";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { NotificationsLoader } from "./notifications";
import { TasksLoader } from "./tasks";
import { sanitizeWhere } from "./utils";
import { Transaction } from "sequelize";
import { NOTIFICATION_RECORD_TYPE, ROLE_SECTIONS } from "@stacks/types";

/** Inserts an activity; bumps task comment count for message types; invalidates API cache. */
async function create(data: Omit<IActivity, "id" | "created" | "updated">): Promise<IActivity> {
    return withTransaction(undefined, async (transaction: Transaction) => {
        const user = getCurrentUser();

        if (data.type === ACTIVITYTYPE.MESSAGE) {
            const canCreateComments = canWrite(ROLE_SECTIONS.COMMENTS);
            if (!canCreateComments) {
                throw Errors.forbidden("User not authorized");
            }
        }

        data.person = user.id;
        const newActivityEntity = await ActivityEntity.create({
            ...data,
            tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
        });
        const newActivity: IActivity = newActivityEntity.toJSON();

        if (
            newActivity.resourceType === ACTIVITYRESOURCETYPE.TASK &&
            newActivity.type === ACTIVITYTYPE.MESSAGE
        ) {
            const task = await TasksLoader.getOne(newActivity.resourceId, transaction);
            if (task) {
                await TasksLoader.update(
                    newActivity.resourceId,
                    {
                        comments: task.comments + 1,
                    },
                    transaction
                );

                for (const assignee of task.assignees ?? []) {
                    if (assignee === user.id) continue;
                    NotificationsLoader.add({
                        recipient: assignee,
                        subject: translate("New comment on a task"),
                        message: newActivity.content,
                        recordType: NOTIFICATION_RECORD_TYPE.COMMENT,
                        recordId: newActivity.id,
                        data: newActivity as any,
                    });
                }
            }
        }

        invalidateApiCacheForCurrentRequest();
        return newActivity;
    });
}

/** Lists activities for any of the given resource ids, newest first. */
async function getAllByResources(resources: string[]) {
    const activities = await ActivityEntity.findAll({
        where: sanitizeWhere({
            resourceId: resources,
        }),
        order: [["created", "DESC"]],
    });

    return activities.map(activity => activity.toJSON());
}

export const ActivitiesLoader = {
    create,
    getAllByResources,
};
