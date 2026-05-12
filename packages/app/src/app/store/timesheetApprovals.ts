// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timesheet approval UI state.
 */
import { TIMELOG_STATUS } from "@stacks/types";
import { entity } from "app/hooks/store";
import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { produce } from "immer";

export const SHOW_WEEKENDS_TIMESHEETS = "timesheets-show-weekends";

export type ApprovalGroupBy = "person" | "project";

export interface ITimesheetApprovalStore {
    interval: Date[];
    status: TIMELOG_STATUS | "all";
    groupBy: ApprovalGroupBy;
}

export const TimesheetApprovalStore = entity<ITimesheetApprovalStore>(
    {
        interval: [],
        status: TIMELOG_STATUS.INREVIEW,
        groupBy: "person",
    },
    [
        {
            init: (origInit, entity) => () => {
                origInit();

                const interval = eachDayOfInterval({
                    start: startOfMonth(new Date()),
                    end: endOfMonth(new Date()),
                });

                entity.set(
                    produce((state: ITimesheetApprovalStore) => {
                        state.interval = interval;
                    })
                );
            },
        },
    ]
);
