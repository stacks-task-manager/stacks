// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button } from '@blueprintjs/core';
import { endOfDay, format, isSameDay, setDate, startOfDay } from 'date-fns';
import React, { useCallback, useMemo } from 'react';

import { Icon } from 'app/components/common';
import { Container } from 'app/components/draggable';
import { TaskCard } from 'app/components/project';
import { getTask, usePeriodFilteredMyTasks } from 'app/hooks';
import { MyTasksActions, TasksActions } from 'app/store/actions';
import { InfiniteDateBoard } from 'app/widgets';

interface TimeboxBoardProps {
    onShowPicker: (dates: Date[]) => void;
}

export const TimeboxBoard = ({ onShowPicker }: TimeboxBoardProps) => {
    const applyTaskToDay = useCallback(async (taskId: string, date: Date) => {
        const task = getTask(taskId);
        if (!task) {
            return;
        }
        const day = date.getDate();
        const startDate = setDate(task.startdate || new Date(), day);
        const dueDate = task.duedate ? setDate(task.duedate, day) : null;

        await TasksActions.setDates(task.id, startDate, dueDate);

        const taskCardEl = document.getElementById(`task-${taskId}`);
        if (taskCardEl) {
            taskCardEl.scrollIntoView({ behavior: 'smooth' });
            taskCardEl.classList.add("highlight");
            setTimeout(() => {
                taskCardEl.classList.remove("highlight");
            }, 2000);
        }
    }, []);

    const columnRenderer = useCallback((date: Date) => {
        const containerId = `timebox-${format(date, 'yyyy-MM-dd')}`;
        const handleReorder = ({
            itemId,
            fromIndex,
            toIndex,
        }: {
            itemId: string;
            fromIndex: number;
            toIndex: number;
        }) => {
            if (fromIndex === toIndex) return;
            void applyTaskToDay(itemId, date);
        };
        const handleItemMove = ({ itemId }: { itemId: string }) => {
            void applyTaskToDay(itemId, date);
        };
        return (
            <>
                <div className="stack-header">
                    <div className="stack-header-title-wrapper">
                        <div className="day-date">{format(date, 'MMM d')}</div>
                        <div className="day-name">{format(date, 'EEEE')}</div>
                    </div>
                    <Button
                        icon={<Icon icon="plus" />}
                        variant="minimal"
                        size="small"
                        onClick={() => onShowPicker([date])}
                    />
                </div>
                <DayTasksColumn
                    day={date}
                    containerId={containerId}
                    onReorder={handleReorder}
                    onItemMove={handleItemMove}
                />
            </>
        );
    }, [applyTaskToDay, onShowPicker]);

    return (
        <InfiniteDateBoard
            className="timebox-board"
            ref={MyTasksActions.setBoard}
            initialDate={new Date()}
            onDatesLoaded={MyTasksActions.onDatesChanged}
            columnRenderer={columnRenderer}
        />
    );
};

interface DayTasksColumnProps {
    day: Date;
    containerId: string;
    onReorder: (result: { itemId: string; fromIndex: number; toIndex: number }) => void;
    onItemMove: (result: { itemId: string }) => void;
}

/** Container wraps the mapped cards directly so drag placeholder indices match React children (see DragDropContext). */
const DayTasksColumn = ({ day, containerId, onReorder, onItemMove }: DayTasksColumnProps) => {
    const { tasks } = usePeriodFilteredMyTasks(startOfDay(day), endOfDay(day));
    const forDay = useMemo(
        () =>
            tasks
                .filter(t => t.startdate && isSameDay(t.startdate, day))
                .sort((a, b) => {
                    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
                    return (a.startdate?.getTime() ?? 0) - (b.startdate?.getTime() ?? 0);
                }),
        [tasks, day]
    );

    return (
        <Container
            id={containerId}
            type="timebox-task"
            direction="vertical"
            className="column-content scroller thin auto"
            onReorder={onReorder}
            onItemMove={onItemMove}
        >
            {forDay.map((t, index) => (
                <TaskCard
                    key={t.id}
                    taskId={t.id}
                    containerId={containerId}
                    dragType="timebox-task"
                    initialVisible={index < 6}
                />
            ))}
        </Container>
    );
};
