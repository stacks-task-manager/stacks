// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelogs hooks and selectors.
 */
import { ITimeLog } from "@stacks/types";
import { shallowEqual } from "./store";
import { TimelogsStore } from "app/store/timelogs";
import { isSameDay } from "date-fns";

export const useProjectTimelogs = (projectId: string) => {
    return TimelogsStore.use(state => state.timelogs.filter(t => t.project === projectId), shallowEqual);
};

/**
 * Returns an array of timelogs for a task
 */
export const useTaskTimelogs = (taskId: string): { timelogs: ITimeLog[]; isLoading: boolean } => {
    return TimelogsStore.use(
        state => ({
            timelogs: state.timelogs.filter(t => t.task === taskId),
            isLoading: state.loadingChunk.includes(taskId) || state.isLoading,
        }),
        shallowEqual
    );
};

export const useTimelogsInterval = (interval: Date[]) => {
    return TimelogsStore.use(
        state => ({
            timelogs: state.timelogs.filter(timelog => interval.some(date => isSameDay(timelog.date, date))),
            isLoading: state.isLoading,
        }),
        shallowEqual
    );
};
