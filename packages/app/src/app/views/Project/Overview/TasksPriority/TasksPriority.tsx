// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import { usePreferences } from "app/hooks";
import CountUp from "react-countup";

import React, { FunctionComponent } from "react";

interface ITasksPriorityProps {
    critical: number;
    high: number;
    medium: number;
    low: number;
}
export const TasksPriority: FunctionComponent<ITasksPriorityProps> = ({ critical, high, medium, low }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Tasks by priority</h6>

            <div className="project-overview-tasks-small evenly-distributed">
                <div>
                    <div className="project-overview-count small text-danger">
                        <CountUp end={critical} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>Critical</div>
                </div>
                <div>
                    <div className="project-overview-count small text-warning">
                        <CountUp end={high} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>High</div>
                </div>
                <div>
                    <div className="project-overview-count small text-primary">
                        <CountUp end={medium} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>Medium</div>
                </div>
                <div>
                    <div className="project-overview-count small text-success">
                        <CountUp end={low} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>Low</div>
                </div>
            </div>
        </Card>
    );
};
