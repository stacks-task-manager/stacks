// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Comment } from "app/components/common";
import { getLatestActivitiesByProject } from "app/hooks";
import { IComment } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

export const LatestComments = () => {
    const params = useParams();
    const [comments, setComments] = useState<IComment[]>([]);

    useEffect(() => {
        const activities = getLatestActivitiesByProject(params.id!, 2);
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

    const memoizedList = useMemo(() => {
        // if (isLoading) {
        //     return (
        //         <div style={{ display: "flex", gap: 20, flexDirection: "column", padding: "10px 0" }}>
        //             <div style={{ display: "flex", gap: 10 }}>
        //                 <div
        //                     className={Classes.SKELETON}
        //                     style={{ height: 30, width: 30, borderRadius: 999 }}
        //                 />
        //                 <div style={{ display: "flex", flexDirection: "column", gap: 5, flexGrow: 2 }}>
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                 </div>
        //             </div>
        //             <div style={{ display: "flex", gap: 10 }}>
        //                 <div
        //                     className={Classes.SKELETON}
        //                     style={{ height: 30, width: 30, borderRadius: 999 }}
        //                 />
        //                 <div style={{ display: "flex", flexDirection: "column", gap: 5, flexGrow: 2 }}>
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                 </div>
        //             </div>
        //             <div style={{ display: "flex", gap: 10 }}>
        //                 <div
        //                     className={Classes.SKELETON}
        //                     style={{ height: 30, width: 30, borderRadius: 999 }}
        //                 />
        //                 <div style={{ display: "flex", flexDirection: "column", gap: 5, flexGrow: 2 }}>
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                     <div className={Classes.SKELETON} style={{ height: 15 }} />
        //                 </div>
        //             </div>
        //         </div>
        //     );
        // }

        return (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {comments.map(comment => (
                        <Comment key={comment.id} resourceId="" comment={comment} mine={false} />
                    ))}
                </div>
            </div>
        );
    }, [comments]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>Latest comments</h6>
            {comments.length > 0 ? memoizedList : <OverviewWidgetBlankSlate />}
        </Card>
    );
};
