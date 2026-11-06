// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { BlankSlate, Grid } from "app/components/common";
import { GanttChart } from "app/components/common/GanttChart/GanttChart";
import { useFilteredProjectTasks, useNav, useProjectStacks } from "app/hooks";
import { rescheduleGanttTask } from "app/store/actions/gantt";
import { PreferencesStore } from "app/store/preferences";
import { convertToGantt } from "app/views/Project/Gantt/ganttTasks";

export const Gantt = () => {
    const tasks = useFilteredProjectTasks({ includeSubtasks: true });
    const { id } = useParams();
    const stacks = useProjectStacks(id);
    const embeddedTask = PreferencesStore.use(state => state.embeddedTask);
    const location = useLocation();
    const nav = useNav();
    const rows = useMemo(() => convertToGantt(tasks, stacks), [tasks, stacks]);
    const openTask = (id: string) => {
        const task = tasks.find(item => item.id === id);
        if (!task) return;
        if (embeddedTask) nav(`/project/${task.project}/${id}`);
        else nav(`/task/${id}`, { state: { backgroundLocation: location } });
    };
    if (!rows.length)
        return (
            <Grid vertical>
                <BlankSlate
                    testId="project-gantt-empty"
                    icon="dataflow-03"
                    title="No data"
                    description="There is not enough data to render the Gantt chart."
                />
            </Grid>
        );
    return (
        <GanttChart
            rows={rows}
            onActivate={openTask}
            onDatesChange={(id, range) => rescheduleGanttTask(id, range)}
        />
    );
};
