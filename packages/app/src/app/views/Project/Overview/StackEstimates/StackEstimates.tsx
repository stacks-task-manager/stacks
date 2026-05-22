// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Colors } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { TASK_STACK_CHART_LABELS } from "app/locale/dynamic-messages";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePreferences } from "app/hooks";
import { IStackTime } from "@stacks/types";
import { formatDuration } from "app/utils/date";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IStackEstimatesProps {
    data: IStackTime[];
}
export const StackEstimates: FunctionComponent<IStackEstimatesProps> = ({ data }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);
    return (
        <Card>
            <h6 className={Classes.HEADING}>Time estimates by Stack</h6>

            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ left: -30 }}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                            formatter={(value: string, name: string) => {
                                return [formatDuration(Number(value)), TASK_STACK_CHART_LABELS[name]];
                            }}
                        />
                        <Bar
                            dataKey="estimated"
                            fill={Colors.BLUE3}
                            barSize={10}
                            isAnimationActive={showAnimations}
                        />
                        <Bar
                            dataKey="spent"
                            stackId="a"
                            fill={Colors.ORANGE4}
                            barSize={10}
                            isAnimationActive={showAnimations}
                        />
                        <Bar
                            dataKey="remaining"
                            stackId="a"
                            fill={Colors.GREEN3}
                            barSize={10}
                            isAnimationActive={showAnimations}
                        />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};
