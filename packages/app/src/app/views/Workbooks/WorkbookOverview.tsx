// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Colors } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { translate } from "@stacks/translations";
import { PRIORITY, type ITask } from "@stacks/types";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface IWorkbookOverviewProps {
    tasks: ITask[];
}

export const WorkbookOverview: FunctionComponent<IWorkbookOverviewProps> = ({ tasks }) => {
    const summary = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            total: tasks.length,
            idle: tasks.filter(task => !task.done && !task.progress).length,
            inProgress: tasks.filter(task => !task.done && task.progress > 0).length,
            completed: tasks.filter(task => task.done).length,
            overdue: tasks.filter(task => !task.done && task.duedate && task.duedate < today).length,
            critical: tasks.filter(task => task.priority === PRIORITY.CRITICAL).length,
            high: tasks.filter(task => task.priority === PRIORITY.HIGH).length,
            medium: tasks.filter(task => task.priority === PRIORITY.MEDIUM).length,
            low: tasks.filter(task => task.priority === PRIORITY.LOW).length,
        };
    }, [tasks]);

    const projects = useMemo(() => {
        const counts = new Map<string, { name: string; idle: number; inProgress: number; done: number }>();
        for (const task of tasks) {
            const name = task.projectInfo?.title ?? translate("Inbox");
            const entry = counts.get(task.project) ?? { name, idle: 0, inProgress: 0, done: 0 };
            if (task.done) entry.done++;
            else if (task.progress > 0) entry.inProgress++;
            else entry.idle++;
            counts.set(task.project, entry);
        }
        return [...counts.values()];
    }, [tasks]);

    const metrics = [
        [translate("Total"), summary.total],
        [translate("To do"), summary.idle],
        [translate("In progress"), summary.inProgress],
        [translate("Completed"), summary.completed],
        [translate("Overdue"), summary.overdue],
        [translate("Critical"), summary.critical],
        [translate("High"), summary.high],
        [translate("Medium"), summary.medium],
        [translate("Low"), summary.low],
    ] as const;

    return (
        <div className="workbook-overview">
            <Card>
                <h6 className={Classes.HEADING}>{translate("Tasks summary")}</h6>
                <div className="workbook-overview__metrics">
                    {metrics.map(([label, value]) => (
                        <div key={label} className="workbook-overview__metric">
                            <strong>{value}</strong>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </Card>
            <Card>
                <h6 className={Classes.HEADING}>{translate("Workload by project")}</h6>
                {projects.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={projects} margin={{ left: -25, right: 5 }}>
                            <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} width={35} />
                            <Tooltip />
                            <Bar
                                dataKey="idle"
                                stackId="tasks"
                                fill={Colors.ORANGE3}
                                name={translate("To do")}
                            />
                            <Bar
                                dataKey="inProgress"
                                stackId="tasks"
                                fill={Colors.BLUE3}
                                name={translate("In progress")}
                            />
                            <Bar
                                dataKey="done"
                                stackId="tasks"
                                fill={Colors.GREEN3}
                                name={translate("Completed")}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className={Classes.TEXT_MUTED}>{translate("No tasks")}</p>
                )}
            </Card>
        </div>
    );
};
