// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Card, Classes, Intent, Tag } from "@blueprintjs/core";
import React, { useMemo } from "react";
import { TasksStore } from "app/store/tasks";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";
import { useCurrentProject, useProjectTimelogs } from "app/hooks";

export const Earnings = () => {
    const { project } = useCurrentProject();
    const { tasks } = TasksStore.use();
    const timelogs = useProjectTimelogs(project!.id)

    const data = useMemo(() => {
        if (!tasks || !project) return { estimatedEarnings: 0, spentEarnings: 0 };

        const estimated = tasks.reduce((acc, task) => {
            if (!task.estimate) return acc;
            return acc + task.estimate;
        }, 0);

        const spent = timelogs.reduce((acc, timelog) => acc + timelog.duration, 0);
        const estimatedEarnings = (estimated / 3600) * project.hourlyRate;
        const spentEarnings = (spent / 3600) * project.hourlyRate;

        return {
            estimatedEarnings,
            spentEarnings,
            profitAmount: estimatedEarnings - spentEarnings,
        };
    }, [tasks, project]);

    const hasData = useMemo(() => {
        return (
            data.estimatedEarnings > 0 ||
            (data.profitAmount != null && data.profitAmount > 0) ||
            data.spentEarnings > 0
        );
    }, [data]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>
                {translate("Earnings")}
            </h6>

            {hasData && project != null ? (
                <div className="overview-legend">
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-primary" />
                            {translate("Estimated")}
                        </div>

                        <Tag
                            icon={<>{window.currencies[project.currency || "USD"].symbol}</>}
                            minimal
                            intent={Intent.PRIMARY}
                        >
                            {(data.estimatedEarnings || 0).toFixed(2)}
                        </Tag>
                    </div>
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-warning" />
                            {translate("Spent")}
                        </div>
                        <Tag
                            icon={<>{window.currencies[project.currency || "USD"].symbol}</>}
                            minimal
                            intent={Intent.WARNING}
                        >
                            {(data.spentEarnings || 0).toFixed(2)}
                        </Tag>
                    </div>
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-success" />
                            {translate("Profit")}
                        </div>
                        <Tag
                            icon={<>{window.currencies[project.currency || "USD"].symbol}</>}
                            minimal
                            intent={Intent.SUCCESS}
                        >
                            {(data.profitAmount || 0).toFixed(2)}
                        </Tag>
                    </div>
                </div>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};
