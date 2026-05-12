// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Tag } from "@blueprintjs/core";
import { FullCircle } from "@blueprintjs/icons";
import React, { FunctionComponent, useMemo } from "react";

import { IProjectCounter } from "@stacks/types";
import { adjustColor, colorToRGBA } from "app/utils/colors";
import { TagsWrapper } from "app/widgets";
import { useProjectStatuses } from "app/hooks";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IStatusesOverviewProps {
    counter: IProjectCounter;
    projectId: string;
}
export const StatusesOverview: FunctionComponent<IStatusesOverviewProps> = ({ counter, projectId }) => {
    const statuses = useProjectStatuses(projectId);

    const memoizedStatuses = useMemo(() => {
        return statuses.map(status => {
            return (
                <Tag
                    key={status.id}
                    style={{
                        backgroundColor: colorToRGBA(status.color, 15),
                        color: adjustColor(status.color, -150),
                    }}
                    className="status-chip"
                    minimal
                    round
                    icon={<FullCircle color={status.color} size={8} />}
                >
                    {status.title} &nbsp; {counter[status.id] || 0}
                </Tag>
            );
        });
    }, []);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Statuses overview</h6>

            <TagsWrapper>{memoizedStatuses}</TagsWrapper>
            {memoizedStatuses.length === 0 && <OverviewWidgetBlankSlate />}
        </Card>
    );
};
