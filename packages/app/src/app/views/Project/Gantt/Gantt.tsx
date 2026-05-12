// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Colors, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import { endOfDay, startOfDay } from "date-fns";
import RcGantt from "rc-gantt";
import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { IStack, ITask } from "@stacks/types";
import { BlankSlate, Grid, Icon, Row } from "app/components/common";
import { useFilteredProjectTasks, useNav, useProjectStacks } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { PreferencesStore } from "app/store/preferences";

interface GanttTask {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    content?: string;
    parent: string | null;
    stack?: IStack;
    project: string;
    subtasksCount?: number
    children: GanttTask[];
    collapsed?: boolean;
}

function convertToGantt(tasks: ITask[], stacks: IStack[], parent?: string): GanttTask[] {
    const stacksById: Record<string, IStack> = {};
    for (const stack of stacks) {
        stacksById[stack.id] = stack;
    }

    const root: GanttTask[] = [];

    for (const task of tasks) {
        if (parent && task.parent !== parent) continue;
        if (!parent && task.parent) continue;

        const startDate = task.startdate
            ? task.startdate
            : task.duedate
                ? startOfDay(task.duedate)
                : null;
        const endDate = task.duedate
            ? task.duedate
            : task.startdate
                ? endOfDay(new Date(task.startdate))
                : null;

        const item: GanttTask = {
            name: task.title,
            id: task.id,
            startDate,
            endDate,
            parent: task.parent,
            stack: stacksById[task.stack],
            project: task.project,
            children: convertToGantt(tasks, stacks, task.id),
            collapsed: false,
        };

        if (item.children.length) {
            item.children = item.children.sort((a, b) => task.subtasksOrder.indexOf(a.id) - task.subtasksOrder.indexOf(b.id));
        }

        root.push(item);
    }

    return root.sort((a, b) => a.name.localeCompare(b.name));
}

export const Gantt = () => {
    const tasks = useFilteredProjectTasks();
    const stacks = useProjectStacks();
    const location = useLocation();
    const nav = useNav();

    const ganttTasks: GanttTask[] = useMemo(() => {
        return convertToGantt(tasks, stacks);
    }, [tasks, stacks]);

    const handleOpenTask = (task: GanttTask) => {
        if (PreferencesStore.get().embeddedTask) {
            nav(`/project/${task.project}/${task.id}`);
        } else {
            nav(`/task/${task.id}`, {
                state: { backgroundLocation: location },
            });
        }
    };

    const handleDateChange = (task: GanttTask, startDate: Date, endDate: Date) => {
        TasksActions.setDates(
            task.id,
            startDate,
            endDate
        );
    };

    if (!ganttTasks.length)
        return (
            <Grid vertical>
                <BlankSlate
                    icon="dataflow-03"
                    title="No data"
                    description="There is not enough data to render the Gantt chart."
                />
            </Grid>
        );

    return (
        <>
            <RcGantt
                data={ganttTasks}
                locale={{
                    today: translate("Today"),
                    day: translate("Day"),
                    days: translate("days"),
                    week: translate("Week"),
                    month: translate("Month"),
                    quarter: translate("Quarter"),
                    halfYear: translate("Half year"),
                    firstHalf: translate("First half"),
                    secondHalf: translate("Second half"),
                    majorFormat: {
                        day: "YYYY, MMMM",
                        week: "YYYY, MMMM",
                        month: "YYYY",
                        quarter: "YYYY",
                        halfYear: "YYYY",
                    },
                    minorFormat: {
                        day: "D",
                        week: "wo [week]",
                        month: "MMMM",
                        quarter: "[Q]Q",
                        halfYear: "YYYY-",
                    },
                }}
                rowHeight={48}
                columnsWidth={300}
                columns={[
                    {
                        name: "task",
                        label: "Task",
                        minWidth: 150,
                        render: item => {
                            return (
                                <span
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleOpenTask(item as GanttTask)}
                                >
                                    <Row justify="between">{item.name} {item.children && item.children.length > 0 && <Tag minimal round>{item.children.length}</Tag>}</Row>
                                    {item.stack != null && (
                                        <>
                                            <br />
                                            <Row
                                                align="center"
                                                justify="left"
                                                gutter={4}
                                                className={classNames(Classes.TEXT_MUTED, Classes.TEXT_SMALL)}
                                            >
                                                <Icon icon="circle-filled" size={8} color={item.stack.tint} />{" "}
                                                {item.stack.title}
                                            </Row>
                                        </>
                                    )}
                                </span>
                            );
                        },
                    },
                ]}
                tableIndent={20}
                getBarColor={(row: GanttTask) => {
                    return {
                        backgroundColor: row.stack && row.stack.tint ? row.stack.tint : Colors.GRAY5,
                        borderColor: "transparent",
                    };
                }}
                onUpdate={async (row, startDate, endDate) => {
                    handleDateChange(row, new Date(startDate), new Date(endDate));
                    document.body.style.userSelect = "none";
                    return true;
                }}
                onBarClick={row => {
                    handleOpenTask(row);
                }}
                alwaysShowTaskBar={true}
            />
        </>
    );
};
