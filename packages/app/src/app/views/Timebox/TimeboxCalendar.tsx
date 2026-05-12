// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { CalendarApi, DateSelectArg, DatesSetArg, EventDropArg } from "@fullcalendar/core";
import { EventResizeDoneArg } from "@fullcalendar/interaction";
import { addMinutes, subDays } from "date-fns";
import React, { useCallback, useMemo, useRef } from "react";

import { ITask } from "@stacks/types";
import { usePeriodFilteredMyTasks } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { MyTasksActions, TasksActions } from "app/store/actions";
import { MyTasksStore } from "app/store/myTasks";
import { Calendar2, TaskInfo } from "app/widgets";

const tasksToEvents = (tasks: ITask[]) => {
    return tasks.map(task => {
        const start = task.startdate || task.duedate || new Date();
        const end = task.duedate || addMinutes(start, 30);

        return {
            id: task.id,
            title: task.title || "Unknown task",
            start,
            end,
            extendedProps: {
                tint: task.tint,
                task: task,
                type: "task",
                completed: task.done,
                popoverContent: <TaskInfo taskId={task.id} />
            }
        }
    });
}

interface TimeboxCalendarBaseProps {
    onShowPicker: (dates: Date[]) => void;
}

interface TimeboxCalendarProps extends TimeboxCalendarBaseProps {
    start: Date;
    end: Date;
}

export const TimeboxCalendar = (props: TimeboxCalendarBaseProps) => {
    const range = MyTasksStore.use((state) => ({
        start: state.start,
        end: state.end,
    }), shallowEqual);

    if (!range) {
        return null;
    }

    return (
        <TimeboxCalendarWrapper {...props} {...range} />
    )
}

export const TimeboxCalendarWrapper = ({ start, end, onShowPicker }: TimeboxCalendarProps) => {
    const { tasks } = usePeriodFilteredMyTasks(start, end);
    const events = useMemo(() => tasksToEvents(tasks), [tasks]);
    const calendarRef = useRef<CalendarApi>();
    const calendarView = MyTasksStore.use((state) => state.calendarView, shallowEqual);

    const handleUpdateDates = async ({ event }: EventDropArg | EventResizeDoneArg) => {
        const { id, start, end } = event;
        await TasksActions.setDates(id, start, end);
    }

    const handleShowAddTaskDialog = (arg: DateSelectArg) => {
        calendarRef.current = arg.view.calendar;
        onShowPicker([arg.start, arg.end]);
    }

    const handleDatesChange = useCallback(({ start, end }: DatesSetArg) => {
        MyTasksActions.onDatesChanged(start, subDays(end, 1));
    }, []);

    return (
        <Calendar2
            ref={MyTasksActions.setCalendar}
            initialDate={start}
            events={events}
            initialView={calendarView}
            showCurrentTime={true}
            onEventChange={handleUpdateDates}
            onSlotSelect={handleShowAddTaskDialog}
            onDatesChanged={handleDatesChange}
        />
    );
};