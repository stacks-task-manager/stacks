// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Tooltip, ResponsiveContainer, Bar, BarChart, XAxis, YAxis } from "recharts";
import { IStack } from "@stacks/types";
import { minutesToTime } from "app/utils/string";

interface IBOStacksEarningsProps {
    stacks: IStack[];
    value?: number;
    currency?: string;
}

interface IStackEarnings {
    [id: string]: {
        total: number;
        totalTime: number;
        spent: number;
        spentTime: number;
        name: string;
    };
}

export default class BOStacksEarnings extends React.PureComponent<IBOStacksEarningsProps> {
    render() {
        const earnings = this.getStacksEarnings();

        let total = 0;
        const data = [];
        for (const key in earnings) {
            const remaining = earnings[key].total - earnings[key].spent;

            total += earnings[key].total;

            data.push({
                name: earnings[key].name,
                total: earnings[key].total,
                totalTime: minutesToTime(earnings[key].totalTime),
                spent: earnings[key].spent,
                spentTime: minutesToTime(earnings[key].spentTime),
                profit: remaining > 0 ? remaining : 0,
            });
        }

        if (!total) {
            return (
                <p>
                    {translate("There is not enough data to render this report")}
                </p>
            );
        }

        const currency = window.currencies[this.props.currency || "USD"];

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
                    barSize={20}
                    barGap={1}
                >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                        formatter={(
                            value: string | number | Array<string | number>,
                            name: string,
                            entry: any
                        ) => {
                            // console.log(entry);
                            if (entry.dataKey === "profit") {
                                const percent =
                                    100 - Math.floor((entry.payload.spent * 100) / entry.payload.total);
                                return [`${name}: ${percent >= 0 ? percent : 0}%`];
                            }

                            if (entry.dataKey === "spent" && entry.payload.total - entry.payload.spent < 0) {
                                return [
                                    `${name}: ${currency.symbol} ${
                                        entry.payload.total - entry.payload.spent
                                    } (${entry.payload.spentTime})`,
                                ];
                            }

                            if (entry.dataKey === "spent") {
                                return [
                                    `${translate("Total Spent")}: ${currency.symbol} ${(
                                        entry.payload.total - entry.payload.spent
                                    ).toFixed(2)} (${entry.payload.spentTime})`,
                                ];
                            }

                            return [`${name}: ${currency.symbol} ${value} (${entry.payload.totalTime})`];
                        }}
                    />
                    <Bar
                        dataKey="total"
                        stackId="total"
                        fill="#0088FE"
                        maxBarSize={10}
                        name={translate("Total Earnings")}
                    />
                    <Bar
                        dataKey="spent"
                        stackId="rest"
                        fill="#ff8042"
                        maxBarSize={10}
                        name={translate("Exceeded by")}
                    />
                    <Bar
                        dataKey="profit"
                        stackId="rest"
                        fill="#00b3b3"
                        maxBarSize={10}
                        name={translate("Profit")}
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    private getStacksEarnings = () => {
        const { stacks, value } = this.props;

        const earnings: IStackEarnings = {};

        stacks.forEach((stack: IStack) => {
            if (!earnings[stack.id]) {
                earnings[stack.id] = {
                    total: 0,
                    totalTime: 0,
                    spent: 0,
                    spentTime: 0,
                    name: stack.title,
                };
            }

            // stack.tasks.forEach((task: ITask) => {
            //     if (task.estimate || task.spent) {
            //         const estimatedMinutes = timeToMinutes(task.estimate);
            //         const spentMinutes = timeToMinutes(task.spent);

            //         earnings[stack.id].totalTime += estimatedMinutes;
            //         earnings[stack.id].spentTime += spentMinutes;

            //         if (task.hourlyRate) {
            //             earnings[stack.id].total += (estimatedMinutes / 60) * task.hourlyRate;
            //             earnings[stack.id].spent += (spentMinutes / 60) * task.hourlyRate;
            //         } else {
            //             earnings[stack.id].total += (estimatedMinutes / 60) * (value || 0);
            //             earnings[stack.id].spent += (spentMinutes / 60) * (value || 0);
            //         }
            //     }
            // });
        });

        return earnings;
    };
}
