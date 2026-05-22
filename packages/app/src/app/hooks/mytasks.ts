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
 * Returns an array of tasks for my tasks
 * @returns
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

export const useHomeMyTasks = () => {
    const meId = PeopleStore.use(state => state.me, shallowEqual);
    const [filter, setFilter] = useStorage<string>("home-my-tasks-filter", false, "due-thisWeek");
    const filters = { ...defaultFilters, me: true };

    const filterDate = filter.split("-").at(0);
    const filterRange = filter.split("-").at(1);

    switch (filterDate) {
        case "start":
            filters.startDate = filterRange;
            break;
        case "do":
            filters.doDate = filterRange;
            break;
        case "due":
            filters.dueDate = filterRange;
            break;
    }

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
