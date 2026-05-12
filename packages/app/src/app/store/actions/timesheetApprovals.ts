// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Approver workflow for timelogs.
 */
import { addMonths, eachDayOfInterval, endOfMonth, formatISO9075, startOfMonth, subMonths } from "date-fns";
import { produce } from "immer";

import { ApprovalGroupBy, ITimesheetApprovalStore, TimesheetApprovalStore } from "../timesheetApprovals";
import { TimelogsActions } from "./timelogs";
import { TIMELOG_STATUS } from "@stacks/types";
import { TimelogsAPI } from "app/api/timelogs";

function getInterval(date: Date) {
    return eachDayOfInterval({
        start: startOfMonth(date),
        end: endOfMonth(date),
    });
}

const load = async () => {
    const { interval, status } = TimesheetApprovalStore.get();
    const start = formatISO9075(interval.at(0)!, { representation: "date" });
    const end = formatISO9075(interval.at(-1)!, { representation: "date" });

    await TimelogsActions.load({
        start,
        end,
        status: status === "all" ? undefined : (status as TIMELOG_STATUS),
    });
};

const setStatus = async (status: TIMELOG_STATUS | "all") => {
    TimesheetApprovalStore.set(
        produce((state: ITimesheetApprovalStore) => {
            state.status = status;
        })
    );

    await load();
};

const setGroupBy = (groupBy: ApprovalGroupBy) => {
    TimesheetApprovalStore.set(
        produce((state: ITimesheetApprovalStore) => {
            state.groupBy = groupBy;
        })
    );
};

const currentInterval = async () => {
    const interval = getInterval(new Date());

    if (TimesheetApprovalStore.get().interval[0].getTime() === interval[0].getTime()) {
        return;
    }

    TimesheetApprovalStore.set(
        produce((state: ITimesheetApprovalStore) => {
            state.interval = interval;
        })
    );

    await load();
};

const nextInterval = async () => {
    const { interval } = TimesheetApprovalStore.get();
    const nextMonth = addMonths(interval[0], 1);

    const newInterval = getInterval(startOfMonth(nextMonth));

    TimesheetApprovalStore.set(
        produce((state: ITimesheetApprovalStore) => {
            state.interval = newInterval;
        })
    );

    await load();
};

const prevInterval = async () => {
    const { interval } = TimesheetApprovalStore.get();
    const prevMonth = subMonths(interval[0], 1);

    const newInterval = getInterval(startOfMonth(prevMonth));

    TimesheetApprovalStore.set(
        produce((state: ITimesheetApprovalStore) => {
            state.interval = newInterval;
        })
    );

    await load();
};

interface ApproveRejectProps {
    timelog?: string;
    task?: string;
    project?: string;
    person?: string;
}

const approve = async (props: ApproveRejectProps) => {
    const timelogs = await TimelogsAPI.approve(props);
    TimelogsActions.upsertTimelogs(timelogs);
};

const reject = async (props: ApproveRejectProps, reason: string) => {
    const timelogs = await TimelogsAPI.reject({ ...props, reason });
    TimelogsActions.upsertTimelogs(timelogs);
};

export const TimesheetApprovalActions = {
    load,
    setStatus,
    setGroupBy,
    currentInterval,
    nextInterval,
    prevInterval,
    approve,
    reject,
};
