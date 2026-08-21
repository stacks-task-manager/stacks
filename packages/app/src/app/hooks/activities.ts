// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Activities hooks and selectors.
 */
import { ActivitiesStore } from "app/store/activities";
import { shallowEqual } from "./store";
import { getProjectTasksIds, useProjectTasksIds } from "./tasks";

/**
 * Custom hook to get all activities for a resource.
 * @param {string} resourceId The id of the resource to get activities for.
 * @returns {IActivity[]} The activities belonging to the resource.
 */
export const useActivities = (resourceId: string) => {
    return ActivitiesStore.use(
        state => state.activities.filter(activity => activity.resourceId === resourceId),
        shallowEqual
    );
};

/**
 * Custom hook to get the most recent message activities across all tasks of a project.
 * @param {string} projectId The id of the project.
 * @param {number} count The maximum number of activities to return.
 * @returns {IActivity[]} The latest message activities for the project's tasks, newest first.
 */
export const useLatestActivitiesByProject = (projectId: string, count: number) => {
    const taskIds = useProjectTasksIds(projectId);
    const activities = ActivitiesStore.use(state => state.activities);

    return activities
        .filter(activity => activity.type === "message" && taskIds.includes(activity.resourceId))
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};

/**
 * Returns the most recent message activities across all tasks of a project from the activities store.
 * @param {string} projectId The id of the project.
 * @param {number} count The maximum number of activities to return.
 * @returns {IActivity[]} The latest message activities for the project's tasks, newest first.
 */
export const getLatestActivitiesByProject = (projectId: string, count: number) => {
    const taskIds = getProjectTasksIds(projectId);
    const activities = ActivitiesStore.get().activities;

    return activities
        .filter(activity => activity.type === "message" && taskIds.includes(activity.resourceId))
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};

/**
 * Returns the most recent message activities for a task from the activities store.
 * @param {string} taskId The id of the task.
 * @param {number} count The maximum number of activities to return.
 * @returns {IActivity[]} The latest message activities for the task, newest first.
 */
export const getLatestActivitiesByTask = (taskId: string, count: number) => {
    const activities = ActivitiesStore.get().activities;

    return activities
        .filter(activity => activity.type === "message" && activity.resourceId === taskId)
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, count);
};
