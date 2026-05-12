// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Card, Classes, Intent, Tag, Tooltip } from "@blueprintjs/core";
import CountUp from "react-countup";
import { usePreferences } from "app/hooks";
interface ITasksSummaryProps {
    total: number;
    idle: number;
    inProgress: number;
    completed: number;
    today: number;
    overdue: number;
    archived: number;
}
export const TasksSummary: FunctionComponent<ITasksSummaryProps> = ({
    total,
    idle,
    inProgress,
    completed,
    today,
    overdue,
    archived,
}) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>
                {translate("Tasks summary")}
            </h6>

            <div className="project-overview-tasks">
                {/* <div>
                    <div className="project-overview-count">{total}</div>
                    <div className={Classes.TEXT_DISABLED}>Total</div>
                </div> */}
                <div>
                    <div className="project-overview-count">
                        <span className="text-alert">
                            <CountUp end={idle} duration={showAnimations ? 2 : 0} />
                        </span>{" "}
                        <Tooltip content={`Based on the total tasks count (${total})`} placement="top">
                            <Tag minimal>{Number(Math.round(idle * 100) / total || 0).toFixed()}%</Tag>
                        </Tooltip>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("To do")}
                    </div>
                </div>
                <div>
                    <div className="project-overview-count">
                        <span className="text-primary">
                            <CountUp end={inProgress} duration={showAnimations ? 2 : 0} />
                        </span>{" "}
                        <Tooltip content={`Based on the total tasks count (${total})`} placement="top">
                            <Tag minimal intent={Intent.PRIMARY}>
                                {Number(Math.round(inProgress * 100) / total || 0).toFixed()}%
                            </Tag>
                        </Tooltip>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("In progress")}
                    </div>
                </div>
                <div>
                    <div className="project-overview-count">
                        <span className="text-success">
                            <CountUp end={completed} duration={showAnimations ? 2 : 0} />
                        </span>{" "}
                        <Tooltip content={`Based on the total tasks count (${total})`} placement="top">
                            <Tag minimal intent={Intent.SUCCESS}>
                                {Number(Math.round(completed * 100) / total || 0).toFixed()}%
                            </Tag>
                        </Tooltip>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("Completed")}
                    </div>
                </div>
                <div>
                    <div className="project-overview-count">
                        <span className="text-warning">
                            <CountUp end={today} duration={showAnimations ? 2 : 0} />
                        </span>{" "}
                        <Tooltip content={`Based on the total tasks count (${total})`} placement="top">
                            <Tag minimal intent={Intent.WARNING}>
                                {Number(Math.round(today * 100) / total || 0).toFixed()}%
                            </Tag>
                        </Tooltip>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("Starting today")}
                    </div>
                </div>
                <div>
                    <div className="project-overview-count">
                        <span className="text-danger">
                            <CountUp end={overdue} duration={showAnimations ? 2 : 0} />
                        </span>{" "}
                        <Tooltip content={`Based on the total tasks count (${total})`} placement="top">
                            <Tag minimal intent={Intent.DANGER}>
                                {Number(Math.round(overdue * 100) / total || 0).toFixed()}%
                            </Tag>
                        </Tooltip>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("Overdue")}
                    </div>
                </div>
                <div>
                    <div className="project-overview-count">
                        <span>
                            <CountUp end={archived} duration={showAnimations ? 2 : 0} />
                        </span>
                    </div>
                    <div className={Classes.TEXT_DISABLED}>
                        {translate("Archived")}
                    </div>
                </div>
            </div>
        </Card>
    );
};
