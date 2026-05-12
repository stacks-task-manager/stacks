// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import {
    Tooltip,
    ResponsiveContainer,
    Bar,
    BarChart,
    XAxis,
    YAxis,
} from "recharts";
import { IStackCount } from "./BoardOverview";

interface IBOStacksProps {
    count: IStackCount;
}

export default class BOStacks extends React.PureComponent<IBOStacksProps> {
    render() {
        const { count } = this.props;

        if (!Object.keys(count).length) {
            return (
                <p>
                    {translate("There is not enough data to render this report")}
                </p>
            );
        }

        const data = [];

        for (const id in count) {
            data.push({
                name: count[id].name,
                idle: count[id].idle,
                doing: count[id].doing,
                done: count[id].done,
                overdue: count[id].overdue,
            });
        }

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                        dataKey="idle"
                        stackId="stack"
                        fill="#FFCA11"
                        maxBarSize={50}
                        name={translate("Idle")}
                    />
                    <Bar
                        dataKey="doing"
                        stackId="stack"
                        fill="#0088FE"
                        maxBarSize={50}
                        name={translate("Doing")}
                    />
                    <Bar
                        dataKey="done"
                        stackId="stack"
                        fill="#00B3B3"
                        maxBarSize={50}
                        name={translate("Done")}
                    />
                    <Bar
                        dataKey="overdue"
                        stackId="stack"
                        fill="#DB3737"
                        maxBarSize={50}
                        name={translate("Overdue")}
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    }
}
