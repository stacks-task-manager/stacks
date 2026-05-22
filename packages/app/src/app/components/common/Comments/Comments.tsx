// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Tooltip } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ACTIVITYTYPE, APPICONS, IComment, POLLINGTYPE } from "@stacks/types";
import { BlankSlate, Col, Grid, Icon, Row } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { useActivities, useRealtimeUpdates } from "app/hooks";
import { ActivitiesActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { Comment } from "./Comment";

interface ICommentsProps {
    resourceId: string;
    disabled?: boolean;
}
export const Comments: FunctionComponent<ICommentsProps> = ({ resourceId, disabled }) => {
    const activities = useActivities(resourceId);
    const [showLogs, setShowLogs] = useState(false);
    const { people, me } = PeopleStore.use();

    useRealtimeUpdates(POLLINGTYPE.ACTIVITIES, update => ActivitiesActions.load(update.record));

    useEffect(() => {
        ActivitiesActions.load(resourceId);
    }, [resourceId]);

    const comments: IComment[] = useMemo(() => {
        return activities
            .filter(activity => activity.type === ACTIVITYTYPE.MESSAGE || showLogs)
            .map(activity => {
                const assignee = people.find(person => person.id === activity.person);

                return {
                    ...activity,
                    assignee,
                };
            });
    }, [activities, people, showLogs]);

    const handleToggleLogsVisibility = () => {
        setShowLogs(!showLogs);
    };

    return (
        <Grid gap={0} padding={30} className="comments-wrapper">
            <Row padding={30}>
                <Col>
                    <TaskDetailsSection
                        title={translate(showLogs ? "Comments activities" : "Comments")}
                        vertical
                        accessory={
                            <Tooltip content="Show activities and updates" placement="top-end">
                                <Button
                                    variant="minimal"
                                    size="small"
                                    icon={<Icon icon={showLogs ? "eye-off" : "eye"} />}
                                    intent={showLogs ? Intent.PRIMARY : Intent.NONE}
                                    onClick={handleToggleLogsVisibility}
                                />
                            </Tooltip>
                        }
                    >
                        {comments.length === 0 && (
                            <Row>
                                <Col justify="center">
                                    <BlankSlate
                                        icon={APPICONS.COMMENTS}
                                        title={translate("No comments")}
                                        description={translate(
                                            "This task does not have any comments yet Be the first one to leave a comment here"
                                        )}
                                        small
                                        maxWidth={250}
                                    />
                                </Col>
                            </Row>
                        )}

                        {comments.length > 0 && (
                            <Row>
                                <Col>
                                    <div className="messages">
                                        {comments.map(comment => {
                                            return (
                                                <Comment
                                                    resourceId={resourceId}
                                                    key={comment.id}
                                                    comment={comment}
                                                    mine={Boolean(me && me === comment.person)}
                                                />
                                            );
                                        })}
                                    </div>
                                </Col>
                            </Row>
                        )}
                    </TaskDetailsSection>
                </Col>
            </Row>
        </Grid>
    );
};
