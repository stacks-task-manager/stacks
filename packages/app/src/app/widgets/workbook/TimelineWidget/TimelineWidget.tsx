// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useMemo } from "react";
import type { ITask } from "@stacks/types";

import { BlankSlate, Grid } from "app/components/common";
import { Timeline } from "app/widgets/common/Timeline/Timeline";
import { convertToTimeline } from "./timelineData";

interface ITimelineWidgetProps {
    tasks: ITask[];
}

export const TimelineWidget: React.FunctionComponent<ITimelineWidgetProps> = ({ tasks }) => {
    const data = useMemo(() => convertToTimeline(tasks), [tasks]);

    if (!data.length)
        return (
            <Grid vertical>
                <BlankSlate
                    icon="calendar-date"
                    title={translate("No data")}
                    description={translate("There is not enough data to render the timeline")}
                />
            </Grid>
        );

    return <Timeline id="workbook-timeline" title={translate("Tasks")} data={data} />;
};
