// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button } from "@blueprintjs/core";
import React, { useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";

import { ITask } from "@stacks/types";
import { BlankSlate, Grid, TablePersistentGroupData } from "app/components/common";
import { MyTasksFilterDrawer } from "app/components/project";
import {
    useFilteredMyTasks,
    useFilterQuerySync,
    useHasFilters,
    useMyTasksFilterMerge,
    useProjectDocuments,
} from "app/hooks";
import { defaultFilters } from "app/store/projectFilters";
import { shallowEqual } from "app/hooks/store";
import { ProjectFiltersActions, TasksActions } from "app/store/actions";
import { toggleNewTask } from "app/store/global";
import { MyTasksStore } from "app/store/myTasks";
import { AppView, AppViewContent, TasksTable, ToolbarMyTasks } from "app/widgets";
import { Timebox } from "../Timebox/Timebox";

export const MyTasks = () => {
    const view = MyTasksStore.use(state => state.view, shallowEqual);

    const effectiveDefaults = useMemo(() => ({ ...defaultFilters, me: true }), []);
    const mergeMyTasksFilters = useMyTasksFilterMerge(effectiveDefaults);
    useFilterQuerySync({
        filterStoreKey: "mytasks",
        effectiveDefaults,
        getMergedFilters: mergeMyTasksFilters,
    });

    return (
        <AppView
            toolbar={<ToolbarMyTasks />}
            append={
                <>
                    <MyTasksFilterDrawer />
                    <Outlet />
                </>
            }
        >
            {view === "list" ? <MyTasksListView /> : <Timebox />}
        </AppView >
    );
};

const MyTasksListView = () => {
    const { tasks } = useFilteredMyTasks();

    useEffect(() => {
        (async () => {
            await TasksActions.loadMy();
        })();
    }, []);

    const projectDocuments = useProjectDocuments();

    const projects = useMemo(() => {
        const projectList: TablePersistentGroupData<ITask>[] = [];

        let index = 0;
        for (const document of projectDocuments) {
            projectList.push({
                groupId: `${document.id}`,
                title: document.title,
                data: tasks.filter(task => task.project === document.id),
                defaultExpanded: !index,
            });

            index++;
        }

        return projectList.filter(group => group.data.length > 0);
    }, [tasks, projectDocuments]);

    if (tasks.length === 0) return <MyTasksBlankSlate />;

    return (
        <AppViewContent padded>
            <TasksTable tasks={projects} id="mytasks" />
        </AppViewContent>
    )
}

const MyTasksBlankSlate = () => {
    const hasFilters = useHasFilters();

    return (
        <Grid vertical>
            <BlankSlate
                title={translate(
                    hasFilters ? "No tasks" : "No tasks assigned",
                )}
                icon="check-circle"
                description={translate(
                    hasFilters
                        ? "Oops None of your tasks match your current filter settings Give it another try by adjusting your filter settings"
                        : "You don t have any tasks assigned to you yet Click the button bellow to add a task",
                )}
                action={
                    <Button
                        text={translate(hasFilters ? "Clear filters" : "Add task")}
                        intent="primary"
                        onClick={hasFilters ? ProjectFiltersActions.reset : toggleNewTask}
                    />
                }
            />
        </Grid>
    );
};
