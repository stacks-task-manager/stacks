// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Card, Classes } from "@blueprintjs/core";
import CountUp from "react-countup";
import { usePreferences } from "app/hooks";

interface ITotalTasksProps {
    total: number;
    stacks: number;
}
export const TotalTasks: FunctionComponent<ITotalTasksProps> = ({ total, stacks }) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>
                {translate("Total tasks")}
            </h6>

            <div className="total-tasks">
                <CountUp end={total} duration={showAnimations ? 2 : 0} />
            </div>

            <div className="total-stacks">
                Distributed across <strong>{stacks}</strong> stacks.
            </div>
        </Card>
    );
};
