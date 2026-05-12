// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { PIE_SEGMENT_SPENT_REMAINING } from "app/locale/dynamic-messages";
import { Card, Classes, Colors } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from "recharts";

import { formatDuration } from "app/utils/date";
import { usePreferences } from "app/hooks";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IEstimatedSpentProps {
    estimatedTotal: number;
    loggedTotal: number;
    remaining: number;
}
export const EstimatedSpent: FunctionComponent<IEstimatedSpentProps> = ({
    estimatedTotal,
    loggedTotal,
    remaining,
}) => {
    const { showAnimations } = usePreferences(["showAnimations"]);
    const [activeIndex, setActiveIndex] = useState(0);

    const data = useMemo(() => {
        return [
            { name: "remaining", value: remaining },
            { name: "spent", value: loggedTotal },
        ];
    }, [remaining, loggedTotal]);

    const handlePieEnter = (_data: any, index: number) => {
        setActiveIndex(index);
    };

    return (
        <Card>
            <h6 className={Classes.HEADING}>Estimated vs Logged</h6>
            {estimatedTotal > 0 || loggedTotal > 0 || remaining > 0 ? (
                <React.Fragment>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                onMouseEnter={handlePieEnter}
                                isAnimationActive={showAnimations}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip
                            // formatter={(value: number, name: string, entry: any, index: number) => {
                            //     return [
                            //         <span key={index}>
                            //             <Translate value={`common.${name}`} /> (
                            //             {moment
                            //                 .utc(moment.duration(value, "seconds").asMilliseconds())
                            //                 .format("H[h] mm[m]")}
                            //             )
                            //         </span>,
                            //     ];
                            // }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="overview-legend">
                        <div className="overview-legend-row">
                            <div>
                                <i className="bg-primary" />
                                {translate("Total Estimates")}
                            </div>
                            <strong>{formatDuration(estimatedTotal)}</strong>
                        </div>
                        <div className="overview-legend-row">
                            <div>
                                <i className="bg-warning" />
                                {translate("Total Spent")}
                            </div>
                            <strong>{formatDuration(loggedTotal)}</strong>
                        </div>
                        <div className="overview-legend-row">
                            <div>
                                <i className="bg-success" />
                                {translate("Total Remaining")}
                            </div>
                            <strong>{formatDuration(remaining)}</strong>
                        </div>
                    </div>
                </React.Fragment>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};

interface IColor {
    [key: string]: string;
}

const colors: IColor = {
    spent: Colors.ORANGE4,
    remaining: Colors.GREEN3,
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

    const fillColor = colors[payload.name];

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
                {PIE_SEGMENT_SPENT_REMAINING[payload.name as keyof typeof PIE_SEGMENT_SPENT_REMAINING] ??
                    payload.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fillColor}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={0}
                endAngle={360}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 12}
                fill="#0088FE"
            />
        </g>
    );
};
