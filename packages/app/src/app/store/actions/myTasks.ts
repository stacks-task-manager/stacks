// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * My Tasks view loaders.
 */
import FullCalendar from "@fullcalendar/react";
import { produce } from "immer";

import { TIMEBOXVIEWS } from "@stacks/types";
import { calendarViewType, InfiniteDateBoardPropsRef } from "app/widgets";
import { IMyTasksStore, MyTasksStore } from "../myTasks";

const setCalendar = (calendar: FullCalendar | null) => {
    MyTasksStore.set(
        produce((state: IMyTasksStore) => {
            state.calendar = calendar;
        })
    );
};

const setBoard = (board: InfiniteDateBoardPropsRef | null) => {
    MyTasksStore.set(
        produce((state: IMyTasksStore) => {
            state.board = board;
        })
    );
};

const setScheduleView = (scheduleView: TIMEBOXVIEWS, calendarView?: calendarViewType) => {
    MyTasksStore.set(
        produce((state: IMyTasksStore) => {
            state.scheduleView = scheduleView;
            if (calendarView) {
                state.calendarView = calendarView;
            }
        })
    );
};

const nextSpan = () => {
    const { scheduleView } = MyTasksStore.get();
    if (scheduleView === TIMEBOXVIEWS.CALENDAR) {
        const calendar = MyTasksStore.get().calendar;

        if (calendar) {
            calendar.getApi().next();
        }
    } else if (scheduleView === TIMEBOXVIEWS.BOARD) {
        const board = MyTasksStore.get().board;
        if (board) {
            board.next();
        }
    }
};

const prevSpan = () => {
    const { scheduleView } = MyTasksStore.get();
    if (scheduleView === TIMEBOXVIEWS.CALENDAR) {
        const calendar = MyTasksStore.get().calendar;

        if (calendar) {
            calendar.getApi().prev();
        }
    } else if (scheduleView === TIMEBOXVIEWS.BOARD) {
        const board = MyTasksStore.get().board;
        if (board) {
            board.prev();
        }
    }
};

const onDatesChanged = (start: Date, end: Date) => {
    if (
        MyTasksStore.get().start.getTime() === start.getTime() &&
        MyTasksStore.get().end.getTime() === end.getTime()
    )
        return;

    MyTasksStore.set(
        produce((state: IMyTasksStore) => {
            state.start = start;
            state.end = end;
        })
    );
};

const today = () => {
    const { scheduleView } = MyTasksStore.get();
    if (scheduleView === TIMEBOXVIEWS.CALENDAR) {
        const calendar = MyTasksStore.get().calendar;

        if (calendar) {
            calendar.getApi().today();
        }
    } else if (scheduleView === TIMEBOXVIEWS.BOARD) {
        const board = MyTasksStore.get().board;
        if (board) {
            board.today();
        }
    }
};

const setCalendarView = (view: calendarViewType) => {
    if (MyTasksStore.get().scheduleView === TIMEBOXVIEWS.CALENDAR) {
        MyTasksStore.set(
            produce((state: IMyTasksStore) => {
                state.calendarView = view;
            })
        );

        const calendar = MyTasksStore.get().calendar;

        if (calendar) {
            calendar.getApi().changeView(view);
        }
    } else {
        setScheduleView(TIMEBOXVIEWS.CALENDAR, view);
    }
};

const setView = (view: "list" | "schedule") => {
    MyTasksStore.set(
        produce((state: IMyTasksStore) => {
            state.view = view;
        })
    );
};

export const MyTasksActions = {
    setCalendar,
    setBoard,
    setScheduleView,
    nextSpan,
    prevSpan,
    onDatesChanged,
    today,
    setCalendarView,
    setView,
};
