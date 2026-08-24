// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Mytasks hooks and selectors.
 */
import { PeopleStore } from "app/store/people";
import { useMyTasksFilters } from "./projectFilters";
import { TasksStore } from "app/store/tasks";
import { buildTaskPredicates, taskInDateRange } from "./tasks";
import { shallowEqual } from "./store";
import { useStorage } from "./storage";
import { defaultFilters } from "app/store/projectFilters";
import { useMemo } from "react";

/**
 * Returns the current user's tasks filtered by the "my tasks" filters.
 * @returns An object containing the filtered tasks and the loading state
 */
export const useFilteredMyTasks = () => {
    const { filters } = useMyTasksFilters();
    const meId = PeopleStore.use(state => state.me, shallowEqual);
    const preds = useMemo(() => buildTaskPredicates(filters, meId), [filters, meId]);

    return TasksStore.use(
        state => ({
            tasks: meId
                ? state.tasks.filter(task => task.archived == null && preds.every(p => p(task))) ?? []
                : [],
            isLoading: state.isLoading,
        }),
        shallowEqual
    );
};

/**
 * Returns the current user's tasks that fall within the given date range and match the "my tasks" filters.
 * @param dateFrom The start of the date range (inclusive)
 * @param dateTo The end of the date range (inclusive)
 * @returns An object containing the filtered tasks and the loading state
 */
export const usePeriodFilteredMyTasks = (dateFrom: Date, dateTo: Date) => {
    const { filters } = useMyTasksFilters();
    const meId = PeopleStore.use(state => state.me, shallowEqual);
    const preds = useMemo(() => buildTaskPredicates(filters, meId), [filters, meId]);

    return TasksStore.use(state => {
        return {
            tasks: meId
                ? state.tasks.filter(
                      task => taskInDateRange(task, dateFrom, dateTo) && preds.every(p => p(task))
                  )
                : [],
            isLoading: state.isLoading,
        };
    }, shallowEqual);
};

/**
 * Returns the tasks shown on the home screen, filtered by the persisted home filter (due, do, or start within a period).
 * @returns An object containing the filtered tasks, the loading state, the current filter, and a setter for it
 */
export const useHomeMyTasks = () => {
    const meId = PeopleStore.use(state => state.me, shallowEqual);
    const [filter, setFilter] = useStorage<string>("home-my-tasks-filter", false, "due-thisWeek");
    const filters = useMemo(() => {
        const nextFilters = { ...defaultFilters, me: true };
        const [filterDate, filterRange] = filter.split("-");

        switch (filterDate) {
            case "start":
                nextFilters.startDate = filterRange;
                break;
            case "do":
                nextFilters.doDate = filterRange;
                break;
            case "due":
                nextFilters.dueDate = filterRange;
                break;
        }

        return nextFilters;
    }, [filter]);

    const preds = useMemo(() => buildTaskPredicates(filters, meId), [filters, meId]);

    const { tasks, isLoading } = TasksStore.use(
        state => ({
            tasks: meId ? state.tasks.filter(task => preds.every(p => p(task))) ?? [] : [],
            isLoading: state.isLoading,
        }),
        shallowEqual
    );

    return { tasks, isLoading, filter, setFilter };
};
