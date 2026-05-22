// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Card, Classes, Colors } from "@blueprintjs/core";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import classNames from "classnames";

import { Row, Col, Grid } from "app/components/common";
import { usePreferences } from "app/hooks";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

type IValue = {
    name: string;
    value: number;
};

interface IData {
    values: IValue[];
    completedPercent: number;
    completedCount: number;
    inProgressPercent: number;
    inProgressCount: number;
}

const COLORS = [Colors.GREEN3, Colors.BLUE3];

interface IGlobalOverviewProps {
    total: number;
    inProgress: number;
    completed: number;
}
export const GlobalOverview: FunctionComponent<IGlobalOverviewProps> = ({ total, inProgress, completed }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    const data: IData = useMemo(() => {
        const data: IData = {
            values: [
                {
                    name: "Completed",
                    value: completed,
                },
                {
                    name: "In progress",
                    value: inProgress,
                },
            ],
            completedPercent: Math.round((completed * 100) / total),
            completedCount: completed,
            inProgressPercent: Math.round((inProgress * 100) / total),
            inProgressCount: inProgress,
        };

        return data;
    }, [total, inProgress, completed]);

    const weekPercentage = 100;

    // const weekPercentage = useMemo(() => {
    //     const week = DateTime.now().minus({ days: 7 });
    //     const currentWeek = DateTime.now().minus({ week: 1 });
    //     const twoWeeksAgo = DateTime.now().minus({ week: 2 });
    //     let currentWeekCount = 0;
    //     let lastWeekCount = 0;

    //     for (let day = 0; day < 7; day++) {
    //         const m = currentWeek.plus({ day });
    //         const count = tasks.filter(task => {
    //             return task.done && parseDate(task.completed).hasSame(m, "day");
    //         }).length;
    //         currentWeekCount += count;
    //     }

    //     for (let day = 0; day < 7; day++) {
    //         const m = twoWeeksAgo.plus({ day });
    //         const count = tasks.filter(task => {
    //             return task.done && parseDate(task.completed).hasSame(m, "day");
    //         }).length;
    //         lastWeekCount += count;
    //     }

    //     if (lastWeekCount === 0 && currentWeekCount === 0) return 0;
    //     if (lastWeekCount === 0 && currentWeekCount > 0) return 100;
    //     if (lastWeekCount > 0 && currentWeekCount === 0) return -100;

    //     return ((currentWeekCount - lastWeekCount) / lastWeekCount) * 100;
    // }, [tasks]);

    return (
        <Card className="global-tasks-overview">
            <h6 className={Classes.HEADING}>Global tasks overview</h6>
            {data.completedCount > 0 || data.inProgressCount > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={100}>
                        <PieChart width={200} height={100}>
                            <Pie
                                data={data.values}
                                // cx="50%"
                                cy="100%"
                                innerRadius={65}
                                outerRadius={90}
                                fill="#8884d8"
                                dataKey="value"
                                startAngle={180}
                                endAngle={0}
                                isAnimationActive={showAnimations}
                            >
                                {data.values.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <Grid>
                        <div className="global-tasks-overview__perncentages">
                            <Grid>
                                <Row>
                                    <Col>
                                        <div className="global-tasks-overview__perncentage">
                                            {data.completedPercent || 0}%
                                        </div>
                                    </Col>
                                    <Col justify="right">
                                        <div className="global-tasks-overview__perncentage">
                                            {data.inProgressPercent || 0}%
                                        </div>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col>
                                        <div className="global-tasks-overview__labels text-success">
                                            <div>Completed</div>
                                            <div>{data.completedCount}</div>
                                        </div>
                                    </Col>
                                    <Col justify="right">
                                        <div className="global-tasks-overview__labels text-primary">
                                            <div>In Progress</div>
                                            <div>{data.inProgressCount}</div>
                                        </div>
                                    </Col>
                                </Row>
                            </Grid>
                        </div>
                        <Row>
                            <Col width="auto">
                                <div className={classNames(Classes.TEXT_DISABLED, Classes.TEXT_SMALL)}>
                                    You&rsquo;ve completed{" "}
                                    <strong
                                        className={classNames(
                                            weekPercentage > 0 ? "text-success" : "text-danger"
                                        )}
                                    >
                                        {Math.abs(weekPercentage)}%
                                    </strong>{" "}
                                    {weekPercentage > 0 ? "more" : "less"} tasks this week than last week.
                                </div>
                            </Col>
                        </Row>
                    </Grid>
                </>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};
