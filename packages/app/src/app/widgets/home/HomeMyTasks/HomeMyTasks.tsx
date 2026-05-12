// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Card, Classes, Menu, MenuItem, Popover } from "@blueprintjs/core";
import classNames from "classnames";
import React, { useEffect, useMemo } from "react";
import { APPICONS, ITask } from "@stacks/types";
import { BlankSlate, Grid, Icon, ReloadButton, TablePersistentGroupData } from "app/components/common";
import { useHomeMyTasks, useMe, useProjectDocuments } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { TasksTable } from "app/widgets/task";

export const HomeMyTasks = () => {
    const projectDocuments = useProjectDocuments();
    const { tasks, filter, setFilter } = useHomeMyTasks();
    const me = useMe();

    const filterDate = filter.split("-").at(0);
    const filterRange = filter.split("-").at(1);

    const loadTasks = async () => {
        // if (!me || !filterRange || !filterDate) return;
        if (!me) return;

        await TasksActions.loadMy();
    };

    useEffect(() => {
        loadTasks();
    }, [me]);

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

    const handleSetDateType = (type: string) => {
        setFilter(`${type}-${filterRange}`);
    };

    const handleSetRange = (range: string) => {
        setFilter(`${filterDate}-${range}`);
    };

    return (
        <Grid gap={0}>
            <h5 className={classNames("todo-list__header home-title", Classes.HEADING)}>
                <span>
                    {translate("My tasks")}
                    &nbsp;
                    <ReloadButton
                        tooltip={translate("Reload my tasks")}
                        placement="top"
                        iconSize={12}
                        onClick={loadTasks}
                    />
                </span>
                <span>
                    {me ? (
                        <Popover
                            content={
                                <Menu>
                                    <MenuItem
                                        text="Start date"
                                        icon={<Icon icon="calendar-date" />}
                                        labelElement={filterDate === "start" ? <Icon icon="check" /> : null}
                                        onClick={() => handleSetDateType("start")}
                                    />
                                    <MenuItem
                                        text="Do date"
                                        icon={<Icon icon="calendar-date" />}
                                        labelElement={filterDate === "do" ? <Icon icon="check" /> : null}
                                        onClick={() => handleSetDateType("do")}
                                    />
                                    <MenuItem
                                        text="Due date"
                                        icon={<Icon icon="calendar-date" />}
                                        labelElement={filterDate === "due" ? <Icon icon="check" /> : null}
                                        onClick={() => handleSetDateType("due")}
                                    />
                                </Menu>
                            }
                        >
                            <Button size="small" variant="minimal" rightIcon={<Icon icon="chevron-down" />}>
                                {filterDate === "start" ? translate("Start date") : null}
                                {filterDate === "do" ? translate("Do date") : null}
                                {filterDate === "due" ? translate("Due date") : null}
                            </Button>
                        </Popover>
                    ) : null}
                    {me ? (
                        <Popover
                            content={
                                <Menu>
                                    <MenuItem
                                        text={translate("Today")}
                                        icon={<Icon icon="calendar-date" />}
                                        labelElement={filterRange === "today" ? <Icon icon="check" /> : null}
                                        onClick={() => handleSetRange("today")}
                                    />
                                    <MenuItem
                                        text={translate("This week")}
                                        icon={<Icon icon="calendar" />}
                                        labelElement={
                                            filterRange === "thisWeek" ? <Icon icon="check" /> : null
                                        }
                                        onClick={() => handleSetRange("thisWeek")}
                                    />
                                </Menu>
                            }
                        >
                            <Button size="small" variant="minimal" rightIcon={<Icon icon="chevron-down" />}>
                                {filterRange === "today" ? translate("Today") : translate("This week")}
                            </Button>
                        </Popover>
                    ) : null}
                </span>
            </h5>
            <Card id="my-tasks" style={{ padding: 5 }}>
                {tasks.length === 0 ? (
                    <BlankSlate
                        icon={APPICONS.TASK}
                        title={`No tasks ${filterRange === "today" ? "today" : "this week"}`}
                        description={
                            <div>
                                You don&apos;t have any tasks for{" "}
                                {filterRange === "today" ? "today" : "this week"}
                                .
                                <br />
                            </div>
                        }
                    />
                ) : null}
                {tasks.length > 0 && <TasksTable tasks={projects} id="home-my-tasks" />}
            </Card>
        </Grid>
    );
};
