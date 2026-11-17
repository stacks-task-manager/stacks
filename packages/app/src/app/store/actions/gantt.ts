// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TasksAPI } from "app/api";
import { TasksActions } from "app/store/actions/tasks";

/** Save before publishing dates so a failed Gantt edit never changes the task store. */
export async function rescheduleGanttTask(
    taskId: string,
    range: { startDate: Date; endDate: Date }
): Promise<void> {
    const dates = { startdate: range.startDate, duedate: range.endDate };
    await TasksAPI.update(taskId, dates);
    await TasksActions.update(taskId, dates, true);
}
