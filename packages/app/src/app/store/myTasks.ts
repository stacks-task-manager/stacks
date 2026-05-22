// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Aggregated personal task list store.
 */
import FullCalendar from "@fullcalendar/react";
import { TIMEBOXVIEWS } from "@stacks/types";

import { entity } from "app/hooks/store";
import { InfiniteDateBoardPropsRef } from "app/widgets";
import { addDays, startOfWeek } from "date-fns";

export interface IMyTasksStore {
    calendar: FullCalendar | null;
    board: InfiniteDateBoardPropsRef | null;
    scheduleView: TIMEBOXVIEWS;
    view: "list" | "schedule";
    calendarView: "one" | "three" | "weekdays" | "week" | "month";
    start: Date;
    end: Date;
}

export const MyTasksStore = entity<IMyTasksStore>({
    calendar: null,
    board: null,
    scheduleView: TIMEBOXVIEWS.BOARD,
    view: "list",
    calendarView: "week",
    start: startOfWeek(new Date()),
    end: addDays(startOfWeek(new Date()), 10),
});
