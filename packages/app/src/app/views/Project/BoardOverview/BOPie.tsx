// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { BOARD_COUNT_STATUS_LABELS } from "app/locale/dynamic-messages";
import React from "react";
import { Sector } from "recharts";

import { ICount } from "./BoardOverview";

interface IColor {
    [key: string]: string;
}

const colors: IColor = {
    idle: "#FFCA11",
    doing: "#0088FE",
    done: "#00B3B3",
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, payload } = props;

    const fillColor = colors[payload.name];

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fillColor}>
                {BOARD_COUNT_STATUS_LABELS[payload.name as keyof typeof BOARD_COUNT_STATUS_LABELS] ??
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
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 12}
                fill={fillColor}
            />
        </g>
    );
};

interface IBOPieProps {
    count: ICount;
}

interface IBOPieState {
    activeIndex: number;
}

export default class BOPie extends React.PureComponent<IBOPieProps, IBOPieState> {
    constructor(props: IBOPieProps) {
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
        const { count } = this.props;

        const data = [
            { name: "idle", value: count.idle },
            { name: "doing", value: count.doing },
            { name: "done", value: count.done },
        ];

        return null;
    }
}
