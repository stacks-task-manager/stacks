// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Card, Classes, Divider, Intent, Menu, MenuDivider, MenuItem, Tag, Tooltip } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Col,
    Grid,
    Icon,
    Row,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "app/components/common";
import { OverflowTextCell } from "app/components/common/Table/Cells";
import { QuickTimeLogDialog } from "app/components/project";
import { IPerson, ITimeLog } from "@stacks/types";
import { TimelogsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { PreferencesStore } from "app/store/preferences";
import { TimelogsStore } from "app/store/timelogs";
import { formatDate, formatDuration } from "app/utils/date";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { AssigneesSync } from "app/widgets";
import { useNavigate, useParams } from "react-router-dom";

interface IAssigneeLog {
    assignee: IPerson;
    time: number;
}

interface IAssigneesLogs {
    [key: string]: IAssigneeLog;
}

export const Time = () => {
    const navigate = useNavigate();
    const params = useParams();
    const { timelogs, total, estimated, remaining, billable, billed } = TimelogsStore.use();
    const { people } = PeopleStore.use();
    const [editing, setEditing] = useState<string>();
    const [sortBy, setSortBy] = useState<string>("date");
    const [sortDesc, setSortDesc] = useState<boolean>(false);

    useEffect(() => {
        if (!params.id) return;
        TimelogsActions.load({ project: params.id });
    }, [params.id]);

    const assigneesLogs = useMemo(() => {
        const assignees: IAssigneesLogs = {};
        for (const log of timelogs) {
            if (assignees.hasOwnProperty(log.person)) {
                assignees[log.person].time += log.duration;
            } else {
                const assignee = people.find(person => person.id === log.person);
                if (assignee) {
                    assignees[log.person] = {
                        assignee: assignee!,
                        time: log.duration,
                    };
                }
            }
        }

        return assignees;
    }, [timelogs]);

    const totalTimeLoggedIntent = useMemo(() => {
        if (total < estimated) return Intent.SUCCESS;
        if (total === estimated) return Intent.WARNING;
        return Intent.DANGER;
    }, [estimated, total]);

    const sortedTimelogs = useMemo(() => {
        return [...timelogs].sort((logA, logB) => {
            if (sortBy === "date") {
                const dateA = logA.date instanceof Date ? logA.date.getTime() : new Date(logA.date).getTime();
                const dateB = logB.date instanceof Date ? logB.date.getTime() : new Date(logB.date).getTime();
                return sortDesc ? dateA - dateB : dateB - dateA;
            }

            if (sortBy === "duration") {
                return sortDesc ? logA.duration - logB.duration : logB.duration - logA.duration;
            }

            if (sortBy === "billable") {
                if (sortDesc) {
                    return logA.billable === logB.billable ? 0 : logA.billable ? -1 : 1;
                } else {
                    return logA.billable === logB.billable ? 0 : logB.billable ? -1 : 1;
                }
            }

            if (sortBy === "billed") {
                if (sortDesc) {
                    return logA.billed === logB.billed ? 0 : logA.billed ? -1 : 1;
                } else {
                    return logA.billed === logB.billed ? 0 : logB.billed ? -1 : 1;
                }
            }

            return 0;
        });
    }, [timelogs, sortBy, sortDesc]);

    const openTask = (taskId: string, projectId: string) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${projectId}/${taskId}`);
        } else {
            navigate(`/task/${taskId}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    // const handleToggleBilled = (taskId: string, log: ITimeLog) => {
    //     TasksActions.updateTimeLog(taskId, params.id!, { ...log, billed: !log.billed });
    // };

    const handleSorting = (by: string, desc: boolean) => {
        setSortBy(by);
        setSortDesc(desc);
    };

    return (
        <div>
            <Row gutter={15}>
                <Col>
                    <Table>
                        <TableHead>
                            <TableHeaderCell
                                title="Date"
                                name="date"
                                width={120}
                                sortable
                                sorting={sortBy === "date"}
                                desc={sortDesc}
                                onSort={handleSorting}
                                resizable
                            />
                            <TableHeaderCell name="task" title="Task" width={150} minWidth={50} resizable />
                            <TableHeaderCell name="taskAssignees" title="Task assignees" width={150} />
                            <TableHeaderCell name="loggedBy" title="Logged by" width={100} />
                            <TableHeaderCell
                                title="Duration"
                                name="duration"
                                width={120}
                                sortable
                                sorting={sortBy === "duration"}
                                desc={sortDesc}
                                onSort={handleSorting}
                            />
                            <TableHeaderCell
                                title="Billable"
                                name="billable"
                                width={150}
                                sortable
                                sorting={sortBy === "duration"}
                                desc={sortDesc}
                                onSort={handleSorting}
                            />
                            <TableHeaderCell
                                title="Billed"
                                name="billed"
                                width={120}
                                sortable
                                sorting={sortBy === "duration"}
                                desc={sortDesc}
                                onSort={handleSorting}
                            />
                            <TableHeaderCell
                                name="description"
                                title="Description"
                                width={150}
                                minWidth={100}
                                resizable
                            />
                            <TableHeaderCell name="empty" empty width={24} />
                        </TableHead>
                        <TableBody>
                            {sortedTimelogs.map((log: ITimeLog) => (
                                <TableRow key={`${log.id}-`}>
                                    {editing === log.id && params.id && (
                                        <QuickTimeLogDialog
                                            taskId={log.task}
                                            projectId={params.id}
                                            value={log}
                                            onClose={() => setEditing(undefined)}
                                        />
                                    )}
                                    <TableBodyCell>{formatDate(log.date, "d")}</TableBodyCell>
                                    <TableBodyCell
                                        className="td-keep"
                                        onClick={() => openTask(log.task, log.project)}
                                    >
                                        {/* <OverflowTextCell>{log.task.title}</OverflowTextCell> */}
                                        Missing task title
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        {/* <AssigneesSync assignees={log.task.assignees} max={3} small /> */}
                                        Missing task assignees
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        <AssigneesSync assignees={[log.person]} max={3} small />
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        <Tag intent={Intent.SUCCESS} minimal>
                                            {formatDuration(log.duration)}
                                        </Tag>
                                    </TableBodyCell>
                                    <TableBodyCell align="center">
                                        <Tooltip
                                            content={
                                                log.billable
                                                    ? "This time log is billable"
                                                    : "This time log is not billable"
                                            }
                                            placement="top"
                                        >
                                            <Icon icon={log.billable ? "check-square" : "square"} />
                                        </Tooltip>
                                    </TableBodyCell>
                                    <TableBodyCell align="center">
                                        {log.billable ? (
                                            <Tooltip
                                                content={
                                                    log.billed
                                                        ? "This time log is billed"
                                                        : "This time log is not yet billed"
                                                }
                                                placement="top"
                                            >
                                                <Icon icon={log.billed ? "check-square" : "square"} />
                                            </Tooltip>
                                        ) : null}
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        <OverflowTextCell>{log.description}</OverflowTextCell>
                                    </TableBodyCell>
                                    <TableBodyCell
                                        menu={
                                            <Menu>
                                                <MenuItem
                                                    text={translate("Edit")}
                                                    icon={<Icon icon="edit-05" />}
                                                    onClick={() => setEditing(log.id)}
                                                />
                                                <MenuDivider />
                                                <MenuItem
                                                    text={translate("Delete")}
                                                    intent={Intent.DANGER}
                                                    icon={<Icon icon="trash" />}
                                                    onClick={() => TimelogsActions.remove(log.id)}
                                                />
                                            </Menu>
                                        }
                                    />
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Col>
                <Col width={400}>
                    <Grid gap={15}>
                        <Card>
                            <Grid gap={10}>
                                <Row>
                                    <Col align="center">
                                        <strong>Total estimated time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal>{formatDuration(estimated)}</Tag>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col align="center">
                                        <strong>Total time logged</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal intent={totalTimeLoggedIntent}>
                                            {formatDuration(total)}
                                        </Tag>
                                    </Col>
                                </Row>
                                <Divider />
                                <Row>
                                    <Col align="center">
                                        <strong>Total non-billable time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal>{formatDuration(total - billable)}</Tag>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col align="center">
                                        <strong>Total billable time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal>{formatDuration(billable)}</Tag>
                                    </Col>
                                </Row>
                                <Divider />
                                <Row>
                                    <Col align="center">
                                        <strong>Total billed time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal>{formatDuration(billed)}</Tag>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col align="center">
                                        <strong>Total non-billed time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal>{formatDuration(billable - billed)}</Tag>
                                    </Col>
                                </Row>
                                <Divider />

                                <Row>
                                    <Col align="center">
                                        <strong>Remaining time</strong>
                                    </Col>
                                    <Col width={100} justify="right" align="center">
                                        <Tag minimal intent={remaining > 0 ? Intent.SUCCESS : Intent.DANGER}>
                                            {formatDuration(remaining)}
                                        </Tag>
                                    </Col>
                                </Row>
                            </Grid>
                        </Card>

                        <Card>
                            <h6 className={Classes.HEADING}>People workload</h6>
                            <Grid gap={10}>
                                {Object.keys(assigneesLogs).map((personId: string) => {
                                    return (
                                        <Row key={personId}>
                                            <Col align="center">
                                                <Avatar person={assigneesLogs[personId].assignee} small />{" "}
                                                &nbsp;
                                                {assigneesLogs[personId].assignee.firstName}{" "}
                                                {assigneesLogs[personId].assignee.lastName}
                                            </Col>
                                            <Col width={100} justify="right" align="center">
                                                <Tag round minimal>
                                                    {formatDuration(assigneesLogs[personId].time)}
                                                </Tag>
                                            </Col>
                                        </Row>
                                    );
                                })}
                            </Grid>
                        </Card>
                    </Grid>
                </Col>
            </Row>
        </div>
    );
};
