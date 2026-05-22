// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Activities hooks and selectors.
 */
import { ActivitiesStore } from "app/store/activities";
import { shallowEqual } from "./store";
import { getProjectTasksIds, useProjectTasksIds } from "./tasks";

export const useActivities = (resourceId: string) => {
    return ActivitiesStore.use(
        state => state.activities.filter(activity => activity.resourceId === resourceId),
        shallowEqual
    );
};

export const useLatestActivitiesByProject = (projectId: string, count: number) => {
    const taskIds = useProjectTasksIds(projectId);
    const activities = ActivitiesStore.use(state => state.activities);

    return activities
        .filter(activity => activity.type === "message" && taskIds.includes(activity.resourceId))
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};

export const getLatestActivitiesByProject = (projectId: string, count: number) => {
    const taskIds = getProjectTasksIds(projectId);
    const activities = ActivitiesStore.get().activities;

    return activities
        .filter(activity => activity.type === "message" && taskIds.includes(activity.resourceId))
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};

export const getLatestActivitiesByTask = (taskId: string, count: number) => {
    const activities = ActivitiesStore.get().activities;

    return activities
        .filter(activity => activity.type === "message" && activity.resourceId === taskId)
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};
