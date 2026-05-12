// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Colors } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { AreaChart, XAxis, YAxis, Area, Tooltip, ResponsiveContainer } from "recharts";

import { IProjectTaskCompletionTime } from "@stacks/types";
import classNames from "classnames";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";
interface ITasksOverTimeProps {
    values: IProjectTaskCompletionTime[];
}
export const TasksOverTime: FunctionComponent<ITasksOverTimeProps> = ({ values }) => {
    const hasValues = useMemo(() => {
        return values.some(value => value.value > 0);
    }, [values]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Tasks completion over time</h6>

            {hasValues ? (
                <React.Fragment>
                    <ResponsiveContainer width="100%" maxHeight={200}>
                        <AreaChart
                            width={800}
                            height={300}
                            data={values}
                            margin={{
                                top: 10,
                                right: 0,
                                left: -30,
                                bottom: 0,
                            }}
                        >
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke={Colors.GREEN3} fill="#00B3B3" />
                        </AreaChart>
                    </ResponsiveContainer>

                    <div className={classNames(Classes.TEXT_MUTED, Classes.TEXT_SMALL, "text-center")}>
                        The period spans across the last two weeks.
                    </div>
                </React.Fragment>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};
