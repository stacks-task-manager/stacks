// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Colors } from "@blueprintjs/core";
import { format, parse } from "date-fns";
import React, { FunctionComponent, useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { IProjectTimelogs } from "@stacks/types";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

const colors = {
    total: {
        title: "Total",
        stroke: Colors.INDIGO5,
    },
    billable: {
        title: "Billable",
        stroke: Colors.BLUE5,
    },
    "non-billable": {
        title: "Non-Billable",
        stroke: Colors.GREEN5,
    },
};

interface IStackEstimatesProps {
    data: IProjectTimelogs[];
}

export const Timelogs: FunctionComponent<IStackEstimatesProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const monthKeys = new Set<string>();
        for (const item of data) {
            for (const d of item.data) {
                monthKeys.add(format(parse(d.date, "yyyy-MM", new Date()), "MMM yy"));
            }
        }
        const months = [...monthKeys].sort(
            (a, b) => parse(a, "MMM yy", new Date()).getTime() - parse(b, "MMM yy", new Date()).getTime()
        );

        return months.map(monthLabel => {
            const row: Record<string, string | number> = { month: monthLabel };
            for (const item of data) {
                const key = colors[item.type].title;
                const point = item.data.find(
                    d => format(parse(d.date, "yyyy-MM", new Date()), "MMM yy") === monthLabel
                );
                row[key] = point ? point.timespent / 3600 : 0;
            }
            return row;
        });
    }, [data]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Timelogs</h6>

            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={Colors.LIGHT_GRAY2} />
                        <XAxis dataKey="month" stroke={Colors.GRAY1} label={{ value: "Months", position: "insideBottom", offset: -4 }} />
                        <YAxis stroke={Colors.GRAY1} label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        {data.map(item => {
                            const c = colors[item.type];
                            return (
                                <Line
                                    key={item.type}
                                    type="monotone"
                                    dataKey={c.title}
                                    stroke={c.stroke}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};
