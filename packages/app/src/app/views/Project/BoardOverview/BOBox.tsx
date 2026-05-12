// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import CountUp from "react-countup";

interface IBOBoxProps {
    value: number;
    title: React.ReactNode;
    intent: string;
}

export default class BOBox extends React.PureComponent<IBOBoxProps> {
    render() {
        return (
            <div className={`board-overview-box ${this.props.intent}`}>
                <strong>
                    <CountUp end={this.props.value} />
                </strong>
                <span>{this.props.title}</span>
            </div>
        );
    }
}
