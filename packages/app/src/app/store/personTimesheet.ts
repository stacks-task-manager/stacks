// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Person timesheet grid preferences.
 */
import { entity } from "app/hooks/store";
import { getStorage } from "app/utils/storage";
import { eachDayOfInterval, endOfWeek, isWeekend, startOfWeek } from "date-fns";
import { produce } from "immer";

export const SHOW_WEEKENDS_TIMESHEETS = "timesheets-show-weekends";

export interface IPersonTimesheetStore {
    interval: Date[];
    showWeekends: boolean;
    submittedIntervals: string[];
}

export const PersonTimesheetStore = entity<IPersonTimesheetStore>(
    {
        interval: [],
        showWeekends: false,
        submittedIntervals: [],
    },
    [
        {
            init: (origInit, entity) => () => {
                origInit();
                const showWeekends = getStorage(SHOW_WEEKENDS_TIMESHEETS, true, false);

                const interval = eachDayOfInterval({
                    start: startOfWeek(new Date()),
                    end: endOfWeek(new Date()),
                }).filter(date => {
                    if (showWeekends) {
                        return true;
                    }

                    return !isWeekend(date);
                });

                entity.set(
                    produce((state: IPersonTimesheetStore) => {
                        state.showWeekends = showWeekends;
                        state.interval = interval;
                    })
                );
            },
        },
    ]
);
