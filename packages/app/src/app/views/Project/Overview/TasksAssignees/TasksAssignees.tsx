// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import { usePreferences } from "app/hooks";
import CountUp from "react-countup";

import React, { FunctionComponent } from "react";

interface TasksAssigneesProps {
    assigned: number;
    unassigned: number;
}
export const TasksAssignees: FunctionComponent<TasksAssigneesProps> = ({ assigned, unassigned }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Tasks by assignees</h6>

            <div className="project-overview-tasks-small">
                <div>
                    <div className="project-overview-count small text-danger">
                        <CountUp end={assigned} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>Assigned</div>
                </div>
                <div>
                    <div className="project-overview-count small text-warning">
                        <CountUp end={unassigned} duration={showAnimations ? 2 : 0} />
                    </div>
                    <div className={Classes.TEXT_DISABLED}>Unassigned</div>
                </div>
            </div>
        </Card>
    );
};
