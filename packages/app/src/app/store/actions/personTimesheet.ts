// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timesheet grid week state and API.
 */
import {
    addWeeks,
    eachDayOfInterval,
    endOfWeek,
    formatISO9075,
    isWeekend,
    startOfWeek,
    subWeeks,
} from "date-fns";
import { produce } from "immer";

import { setStorage } from "app/utils/storage";
import { IPersonTimesheetStore, PersonTimesheetStore, SHOW_WEEKENDS_TIMESHEETS } from "../personTimesheet";
import { TimelogsActions } from "./timelogs";
import { TimelogsAPI } from "app/api/timelogs";

function getInterval(date: Date, showWeekends: boolean) {
    return eachDayOfInterval({
        start: startOfWeek(date),
        end: endOfWeek(date),
    }).filter(date => {
        if (showWeekends) {
            return true;
        }

        return !isWeekend(date);
    });
}

const load = async () => {
    const interval: Date[] = PersonTimesheetStore.get().interval;
    const start = formatISO9075(interval.at(0)!, { representation: "date" });
    const end = formatISO9075(interval.at(-1)!, { representation: "date" });

    await TimelogsActions.load({ start, end });
};

const currentInterval = async () => {
    const interval = getInterval(new Date(), PersonTimesheetStore.get().showWeekends);

    if (PersonTimesheetStore.get().interval[0].getTime() === interval[0].getTime()) {
        return;
    }

    PersonTimesheetStore.set(
        produce((state: IPersonTimesheetStore) => {
            state.interval = interval;
        })
    );

    await load();
};

const nextInterval = async () => {
    const { interval } = PersonTimesheetStore.get();
    const nextWeek = addWeeks(interval[0], 1);

    const newInterval = getInterval(startOfWeek(nextWeek), PersonTimesheetStore.get().showWeekends);

    PersonTimesheetStore.set(
        produce((state: IPersonTimesheetStore) => {
            state.interval = newInterval;
        })
    );

    await load();
};

const prevInterval = async () => {
    const { interval } = PersonTimesheetStore.get();
    const prevWeek = subWeeks(interval[0], 1);

    const newInterval = getInterval(startOfWeek(prevWeek), PersonTimesheetStore.get().showWeekends);

    PersonTimesheetStore.set(
        produce((state: IPersonTimesheetStore) => {
            state.interval = newInterval;
        })
    );

    await load();
};

const toggleWeekendVisibility = async () => {
    PersonTimesheetStore.set(
        produce((state: IPersonTimesheetStore) => {
            state.showWeekends = !state.showWeekends;
            state.interval = getInterval(state.interval[0], state.showWeekends);
        })
    );

    setStorage(SHOW_WEEKENDS_TIMESHEETS, PersonTimesheetStore.get().showWeekends);

    await load();
};

const submitReview = async () => {
    const { interval } = PersonTimesheetStore.get();
    const start = formatISO9075(interval.at(0)!, { representation: "date" });
    const end = formatISO9075(interval.at(-1)!, { representation: "date" });

    await TimelogsAPI.review({
        start,
        end,
    });
};

export const PersonTimesheetActions = {
    load,
    currentInterval,
    nextInterval,
    prevInterval,
    toggleWeekendVisibility,
    submitReview,
};
