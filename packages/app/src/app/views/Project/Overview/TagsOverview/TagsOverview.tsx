// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { IProjectCounter } from "@stacks/types";
import { useProjectTags } from "app/hooks";
import { adjustColor } from "app/utils/colors";
import { TagsWrapper } from "app/widgets";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface ITagsOverviewProps {
    counter: IProjectCounter;
    projectId: string;
}
export const TagsOverview: FunctionComponent<ITagsOverviewProps> = ({ counter, projectId }) => {
    const tags = useProjectTags(projectId);

    const memoizedTags = useMemo(() => {
        return tags.map(tag => {
            return (
                <Tag
                    key={tag.id}
                    className="custom-tag"
                    style={{
                        backgroundColor: tag.color,
                        borderColor: adjustColor(tag.color, -20),
                    }}
                    round
                >
                    {tag.title} &nbsp; {counter[tag.id] || 0}
                </Tag>
            );
        });
    }, [tags]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Tags overview</h6>
            <TagsWrapper>{memoizedTags}</TagsWrapper>

            {memoizedTags.length === 0 && <OverviewWidgetBlankSlate />}
        </Card>
    );
};
