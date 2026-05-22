// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useEffect } from "react";
import { useParams } from "react-router-dom";

import { Col, Grid, Row, Scroller } from "app/components/common";
import { OverviewActions } from "app/store/actions";
import { OverviewStore } from "app/store/overview";
import { Earnings } from "./Earnings/Earnings";
import { EstimatedSpent } from "./EstimatedSpent/EstimatedSpent";
import { GlobalOverview } from "./GlobalOverview/GlobalOverview";
import { PeopleLoad } from "./PeopleLoad/PeopleLoad";
import { PeopleTimeLoad } from "./PeopleTimeLoad/PeopleTimeLoad";
import { ProjectMembers } from "./ProjectMembers/ProjectMembers";
import { ProjectStatus } from "./ProjectStatus/ProjectStatus";
import { StackEstimates } from "./StackEstimates/StackEstimates";
import { StacksOverview } from "./StacksOverview/StacksOverview";
import { StatusesOverview } from "./StatusesOverview/StatusesOverview";
import { TagsOverview } from "./TagsOverview/TagsOverview";
import { TasksAssignees } from "./TasksAssignees/TasksAssignees";
import { TasksOverTime } from "./TasksOverTime/TasksOverTime";
import { TasksPriority } from "./TasksPriority/TasksPriority";
import { TasksSummary } from "./TasksSummary/TasksSummary";
import { TotalTasks } from "./TotalTasks/TotalTasks";
import { Timelogs } from "./Timelogs/Timelogs";

export const Overview = () => {
    const params = useParams();
    const { overview, isLoading } = OverviewStore.use();

    useEffect(() => {
        if (params.id) {
            OverviewActions.load(params.id);
        }
    }, [params.id]);

    if (!overview || isLoading) {
        return <OverviewLoading />;
    }

    return (
        <div id="project-overview">
            <Scroller className="project-overview__content" vertical>
                <Grid>
                    <Row gutter={15}>
                        <Col width="auto">
                            <Grid>
                                <Row gutter={15}>
                                    <Col>
                                        <TasksSummary
                                            total={overview.tasksTotal}
                                            idle={overview.tasksIdle}
                                            inProgress={overview.tasksInProgress}
                                            completed={overview.tasksCompleted}
                                            today={overview.tasksToday}
                                            overdue={overview.tasksOverdue}
                                            archived={overview.tasksArchived}
                                        />
                                    </Col>
                                    <Col width={250} unshrinkable>
                                        <TotalTasks
                                            total={overview.tasksTotal}
                                            stacks={overview.stacksCount}
                                        />
                                    </Col>
                                </Row>

                                <Row gutter={15}>
                                    <Col align="stretch">
                                        <Grid>
                                            <TasksPriority
                                                critical={overview.critical}
                                                high={overview.high}
                                                medium={overview.medium}
                                                low={overview.low}
                                            />
                                            <TasksAssignees
                                                assigned={overview.tasksAssigned}
                                                unassigned={overview.tasksUnassigned}
                                            />
                                        </Grid>
                                    </Col>

                                    <Col>
                                        {params.id && <TagsOverview counter={overview.tags} projectId={params.id} />}
                                    </Col>
                                    <Col>
                                        {params.id && <StatusesOverview counter={overview.statuses} projectId={params.id} />}
                                    </Col>
                                </Row>

                                <Row gutter={15}>
                                    <Col align="stretch">
                                        <Earnings />
                                    </Col>
                                    <Col>
                                        <PeopleLoad
                                            assignees={overview.assignees}
                                            counter={overview.workload}
                                        />
                                    </Col>
                                    <Col align="stretch">
                                        <Grid>
                                            <PeopleTimeLoad
                                                assignees={overview.assignees}
                                                counter={overview.timeLoad}
                                            />
                                            <ProjectMembers assignees={overview.assignees} />
                                        </Grid>
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        <EstimatedSpent
                                            estimatedTotal={overview.timeEstimatedTotal}
                                            loggedTotal={overview.timeLoggedTotal}
                                            remaining={overview.timeRemaining}
                                        />
                                    </Col>
                                    <Col>
                                        <GlobalOverview
                                            total={overview.tasksTotal}
                                            inProgress={overview.tasksInProgress}
                                            completed={overview.tasksCompleted}
                                        />
                                    </Col>
                                    <Col>
                                        <ProjectStatus />
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        <StackEstimates data={overview.stacksTime} />
                                    </Col>
                                    <Col>
                                        <StacksOverview data={overview.stacksOverview} />
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        {/* <LatestComments /> */}
                                        <Timelogs data={overview.timelogs} />
                                    </Col>
                                    <Col>
                                        <TasksOverTime values={overview.tasksCompletionTime} />
                                    </Col>
                                </Row>
                            </Grid>
                        </Col>
                    </Row>
                </Grid>
            </Scroller>
        </div>
    );
};

const OverviewLoading = () => {
    return (
        <div id="project-overview">
            <Scroller className="project-overview__content" vertical>
                <Grid>
                    <Row gutter={15}>
                        <Col width="auto">
                            <Grid>
                                <Row gutter={15}>
                                    <Col>
                                        <LoadingCard>
                                            <LoadingSquare />
                                            <LoadingSquare />
                                            <LoadingSquare />
                                            <LoadingSquare />
                                            <LoadingSquare />
                                        </LoadingCard>
                                    </Col>
                                    <Col width={250} unshrinkable>
                                        <LoadingCard justify="center">
                                            <LoadingSquare />
                                        </LoadingCard>
                                    </Col>
                                </Row>

                                <Row gutter={15}>
                                    <Col align="stretch">
                                        <LoadingCard>
                                            <LoadingSquare size={50} />
                                            <LoadingSquare size={50} />
                                            <LoadingSquare size={50} />
                                            <LoadingSquare size={50} />
                                        </LoadingCard>
                                    </Col>

                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                </Row>

                                <Row gutter={15}>
                                    <Col align="stretch">
                                        <LoadingCard justify="left">
                                            <LoadingSquare size={50} />
                                            <LoadingSquare size={50} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col align="stretch">
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare size={150} />
                                        </LoadingCard>
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare width="100%" height={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare width="100%" height={150} />
                                        </LoadingCard>
                                    </Col>
                                </Row>
                                <Row gutter={15}>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare width="100%" height={150} />
                                        </LoadingCard>
                                    </Col>
                                    <Col>
                                        <LoadingCard justify="center">
                                            <LoadingSquare width="100%" height={150} />
                                        </LoadingCard>
                                    </Col>
                                </Row>
                            </Grid>
                        </Col>
                    </Row>
                </Grid>
            </Scroller>
        </div>
    );
};

interface LoadingCardProps {
    children?: React.ReactNode;
    justify?: "center" | "left" | "right" | "between";
}

const LoadingCard: FunctionComponent<LoadingCardProps> = ({ children, justify }) => {
    return (
        <Card>
            <Grid>
                <div>
                    <span className={classNames(Classes.SKELETON)}>Lorem ipsum sit amet</span>
                </div>
                <Row gutter={15} justify={justify ?? "between"}>
                    {children}
                </Row>
            </Grid>
        </Card>
    );
};

interface LoadingSquareProps {
    size?: number;
    width?: number | string;
    height?: number | string;
}

const LoadingSquare: FunctionComponent<LoadingSquareProps> = ({ size, width, height }) => {
    return (
        <div
            className={Classes.SKELETON}
            style={{ width: width ?? size ?? 100, height: height ?? size ?? 100 }}
        />
    );
};
