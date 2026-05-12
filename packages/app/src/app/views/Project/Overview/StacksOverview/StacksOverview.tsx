// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Card, Classes, Colors } from "@blueprintjs/core";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip } from "recharts";

import { IStackOverview } from "@stacks/types";
import { usePreferences } from "app/hooks";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IStacksOverviewProps {
    data: IStackOverview[];
}
export const StacksOverview: FunctionComponent<IStacksOverviewProps> = ({ data }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);
    return (
        <Card>
            <h6 className={Classes.HEADING}>Stacks workload</h6>

            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ left: -30 }}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar
                            dataKey="idle"
                            stackId="stack"
                            fill="#ffca11"
                            maxBarSize={30}
                            name={translate("Idle")}
                            barSize={20}
                            isAnimationActive={showAnimations}
                        />
                        <Bar
                            dataKey="doing"
                            stackId="stack"
                            fill={Colors.BLUE3}
                            maxBarSize={30}
                            name={translate("Doing")}
                            barSize={20}
                            isAnimationActive={showAnimations}
                        />
                        <Bar
                            dataKey="done"
                            stackId="stack"
                            fill={Colors.GREEN3}
                            maxBarSize={30}
                            name={translate("Done")}
                            barSize={20}
                            isAnimationActive={showAnimations}
                        />
                        <Bar
                            dataKey="overdue"
                            stackId="stack"
                            fill={Colors.RED3}
                            maxBarSize={30}
                            name={translate("Overdue")}
                            barSize={20}
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
