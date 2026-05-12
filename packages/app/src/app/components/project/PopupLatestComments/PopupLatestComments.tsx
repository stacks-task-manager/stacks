// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useState } from "react";

import { Comment } from "app/components/common";
import { IComment } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { getLatestActivitiesByTask } from "app/hooks";

interface IPopupLatestCommentsProps {
    taskId: string;
    count?: number;
    children: React.ReactNode;
}
export const PopupLatestComments: FunctionComponent<IPopupLatestCommentsProps> = ({
    taskId,
    count,
    children,
}) => {
    const [comments, setComments] = useState<IComment[]>([]);

    useEffect(() => {
        const activities = getLatestActivitiesByTask(taskId, count ?? 2);
        const people = PeopleStore.get().people;

        setComments(
            activities.map(activity => {
                const assignee = people.find(person => person.id === activity.person);

                return {
                    ...activity,
                    assignee,
                };
            })
        );
    }, []);

    return (
        <Popover
            content={
                <div style={{ padding: "10px 0" }}>
                    <div className={Classes.TEXT_MUTED}>Latest comments</div>

                    <div style={{ display: "flex", flexDirection: "column", maxWidth: 400 }}>
                        {comments.map(comment => (
                            <Comment key={comment.id} resourceId={taskId} comment={comment} mine={false} />
                        ))}
                    </div>
                </div>
            }
            popoverClassName="popover-padded-medium-sides"
            lazy
        >
            {children}
        </Popover>
    );
};
