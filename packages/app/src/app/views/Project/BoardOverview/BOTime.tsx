// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PIE_SEGMENT_SPENT_REMAINING } from "app/locale/dynamic-messages";
import React from "react";
import { Sector } from "recharts";
import { ITime } from "./BoardOverview";

interface IColor {
    [key: string]: string;
}

const colors: IColor = {
    spent: "#FF8042",
    remaining: "#00B3B3",
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

interface IBOTimeProps {
    time: ITime;
}

interface IBOPieState {
    activeIndex: number;
}

export default class BOTime extends React.PureComponent<IBOTimeProps, IBOPieState> {
    constructor(props: IBOTimeProps) {
        super(props);

        this.state = {
            activeIndex: 0,
        };
    }

    onPieEnter = (_data: any, index: number) => {
        this.setState({
            activeIndex: index,
        });
    };

    render() {
        const { time } = this.props;
        const remaining = time.total - time.spent;

        const data = [
            { name: "spent", value: time.spent },
            { name: "remaining", value: remaining < 0 ? 0 : remaining },
        ];

        return null;
    }
}
