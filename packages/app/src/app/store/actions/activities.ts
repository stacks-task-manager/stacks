// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Thunks: load and append activities.
 */
import { translate } from "@stacks/translations";
import { produce } from "immer";
import api, { ActivitiesAPI } from "app/api";
import { ActivitiesStore, IActivitiesStore } from "../activities";
import { IActivity } from "@stacks/types";
import Dialog from "app/utils/dialog";
import { TasksActions } from "./tasks";

const load = async (resourceId: string) => {
    const activities = await ActivitiesAPI.load(resourceId);
    ActivitiesStore.set(
        produce((state: IActivitiesStore) => {
            state.activities = activities;
        })
    );
}

const addActivity = async (newActivity: Omit<IActivity, "id" | "created">) => {
    const activity = await ActivitiesAPI.add(newActivity);

    ActivitiesStore.set(
        produce((state: IActivitiesStore) => {
            state.activities.unshift(activity);
        })
    );

    if (newActivity.type === "message") {
        await TasksActions.increaseCommentsCount(newActivity.resourceId);
    }
};

const remove = async (resourceId: string, activityId: string) => {
    ActivitiesStore.set(
        produce((state: IActivitiesStore) => {
            state.activities = state.activities.filter(activity => activity.id !== activityId);
        })
    );

    return await api("activities/remove", { resourceId, activityId });
};

const removeAlert = async (resourceId: string, activityId: string) => {
    const response = await Dialog.confirm(translate("Delete comment"), translate("Are you sure you want to delete your comment"));

    if (response) {
        await remove(resourceId, activityId);
    }

    return response;
};

const update = async (resourceId: string, activityId: string, content: string) => {
    ActivitiesStore.set(
        produce((state: IActivitiesStore) => {
            state.activities = state.activities.map(activity => {
                if (activity.id === activityId) {
                    activity.content = content;
                    activity.updated = new Date();
                }
                return activity;
            });
        })
    );

    return await api("activities/update", { resourceId, activityId, content });
};

export const ActivitiesActions = {
    load,
    // loadLatest,
    // reset,
    addActivity,
    remove,
    removeAlert,
    update,
};
