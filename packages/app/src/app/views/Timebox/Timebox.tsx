// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { addMinutes } from "date-fns";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { ITask, TIMEBOXVIEWS } from "@stacks/types";
import { shallowEqual } from "app/hooks/store";
import { TasksActions } from "app/store/actions";
import { AppViewContent, TaskPicker2Dialog } from "app/widgets";
import { TimeboxBoard } from "./TimeboxBoard";
import { TimeboxCalendar } from "./TimeboxCalendar";
import { MyTasksStore } from "app/store/myTasks";
import { getMe } from "app/hooks";

const filterTasks = (tasks: ITask[]) => {
    return tasks.filter(task => !task.startdate && !task.duedate);
};

export const Timebox = () => {
    const view = MyTasksStore.use((state) => state.scheduleView, shallowEqual);
    const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
    const datesRef = useRef<Date[]>([]);

    const handleAddTask = useCallback((taskId?: string) => {
        setShowAddTaskDialog(false)
        if (taskId && datesRef.current.length) {
            TasksActions.setDates(taskId, datesRef.current[0], datesRef.current[1] ?? addMinutes(datesRef.current[0], 30));
        }
    }, [datesRef.current]);



    const handleShowPicker = useCallback((dates: Date[]) => {
        datesRef.current = dates;
        setShowAddTaskDialog(true);
    }, []);

    return (
        <>
            <AppViewContent padded={view === TIMEBOXVIEWS.CALENDAR} id="timebox2">
                {TIMEBOXVIEWS.BOARD === view && (
                    <TimeboxBoard
                        onShowPicker={handleShowPicker}
                    />
                )}
                {TIMEBOXVIEWS.CALENDAR === view && (
                    <TimeboxCalendar
                        onShowPicker={handleShowPicker}
                    />
                )}
            </AppViewContent>
            {showAddTaskDialog && (
                <TaskPicker2Dialog
                    onClose={handleAddTask}
                    onFilter={filterTasks}
                />
            )}
            <TimeboxTasksLoader />
        </>
    );
}

const TimeboxTasksLoader = React.memo(() => {
    const range = MyTasksStore.use((state) => ({
        start: state.start,
        end: state.end,
    }), shallowEqual);

    useEffect(() => {
        if (range) {
            TasksActions.loadPeriod(range.start, range.end, { assignees: [getMe().id] });
        }
    }, [range]);

    return null;
});
TimeboxTasksLoader.displayName = "TimeboxTasksLoader";
