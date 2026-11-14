// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { addDays, endOfDay, startOfDay } from "date-fns";

import type { ITask } from "@stacks/types";
import type { TimelineDay, TimelineData } from "app/widgets/common/Timeline/types";

/** Hours shown for each scheduled day of a task. */
export const SCHEDULED_DAY_HOURS = 8;

/**
 * Converts tasks into timeline rows: one row per task spanning its date range.
 * Tasks without a start or due date cannot be placed and are skipped.
 */
export function convertToTimeline(tasks: ITask[]): TimelineData[] {
    return tasks.flatMap(task => {
        const start = task.startdate
            ? new Date(task.startdate)
            : task.duedate
              ? new Date(task.duedate)
              : null;
        const end = task.duedate ? new Date(task.duedate) : start;
        if (!start || !end) return [];

        const days: TimelineDay[] = [];
        for (let day = startOfDay(start); day <= endOfDay(end); day = addDays(day, 1)) {
            days.push({ date: day, hours: SCHEDULED_DAY_HOURS });
        }

        return [{ id: task.id, title: task.title, days }];
    });
}
