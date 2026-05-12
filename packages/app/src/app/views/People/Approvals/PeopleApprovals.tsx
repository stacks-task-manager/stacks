// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import xor from "lodash/xor";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Button, ButtonGroup, Classes, FormGroup, Intent, mergeRefs, Popover, Tag, TagProps, TextArea, Tooltip } from "@blueprintjs/core";
import { APPICONS, ITimeLog, TIMELOG_STATUS } from "@stacks/types";
import { Avatar, BlankSlate, Col, Grid, Icon, Row, Table, TableBody, TableBodyCell, TableHead, TableHeaderCell, TableSection, TableSectionCell } from "app/components/common";
import { usePerson, useTimelogsInterval } from "app/hooks";
import { durationToHours, durationToWorkingDays, formatStringDuration } from "app/utils/date";
import { AppViewContent, TIMELOG_STATUS_MAP, TimelogStatusIcon } from "app/widgets";
import { TimesheetApprovalStore } from "app/store/timesheetApprovals";
import { TimesheetApprovalActions } from "app/store/actions";
import uniq from "lodash/uniq";
import { TaskSpentProgress } from "app/components/project";
import { shallowEqual } from "app/hooks/store";

interface GroupedTimelogs {
    [personId: string]: {
        totals: number;
        projects: {
            [projectId: string]: {
                title: string;
                estimate: number;
                tasks: {
                    [taskId: string]: {
                        title: string;
                        timelogs: ITimeLog[];
                        total: number;
                        estimate: number;
                        done: boolean;
                    };
                };
                total: number;
            };
        }
    };
}

export const PeopleApprovals = () => {
    const { interval, groupBy } = TimesheetApprovalStore.use(state => ({
        interval: state.interval,
        groupBy: state.groupBy,
    }), shallowEqual);
    const [visiblePeople, setVisiblePeople] = useState<string[]>([]);
    const [visibleProjects, setVisibleProjects] = useState<string[]>([]);
    const [visibleTasks, setVisibleTasks] = useState<string[]>([]);
    const { timelogs, isLoading } = useTimelogsInterval(interval);

    useEffect(() => {
        TimesheetApprovalActions.load();
    }, []);

    const groupByPerson = useMemo(() => {
        return timelogs.reduce((acc, cur) => {
            if (!acc[cur.person]) {
                acc[cur.person] = {
                    totals: 0,
                    projects: {}
                };
            }
            if (!acc[cur.person].projects[cur.project]) {
                acc[cur.person].projects[cur.project] = {
                    title: cur.documentInfo.title,
                    tasks: {},
                    total: 0,
                    estimate: cur.projectInfo.estimate ?? 0,
                };
            }
            if (!acc[cur.person].projects[cur.project].tasks[cur.task]) {
                acc[cur.person].projects[cur.project].tasks[cur.task] = {
                    title: cur.taskInfo.title,
                    timelogs: [],
                    total: 0,
                    estimate: cur.taskInfo.estimate ?? 0,
                    done: false,
                };
            }
            acc[cur.person].projects[cur.project].tasks[cur.task].timelogs.push(cur);
            acc[cur.person].totals += cur.duration;
            acc[cur.person].projects[cur.project].total += cur.duration;
            acc[cur.person].projects[cur.project].tasks[cur.task].total += cur.duration;

            return acc;
        }, {} as GroupedTimelogs);
    }, [timelogs]);

    const handleTogglePerson = (personId: string) => {
        setVisiblePeople(xor(visiblePeople, [personId]));
    };
    const handleToggleAllProjects = (personId: string) => {
        const projects = Object.keys(groupByPerson[personId].projects);
        // if (visibleProjects.some(projectId => projects.includes(projectId))) {
        //     setVisibleProjects(visibleProjects.filter(projectId => !projects.includes(projectId)));
        // } else {
        //     setVisibleProjects(visibleProjects.concat(projects));
        // }

        setVisibleProjects(uniq(visibleProjects.concat(projects)));
        setVisiblePeople(uniq(visiblePeople.concat([personId])));
    };
    const handleToggleProject = (projectId: string) => {
        setVisibleProjects(xor(visibleProjects, [projectId]));
    }
    const handleToggleTask = (taskId: string) => {
        setVisibleTasks(xor(visibleTasks, [taskId]));
    }

    return (
        <AppViewContent padded relative>
            <div className="people-approvals">

                {!isLoading && timelogs.length > 0 && (
                    <Table sticky>
                        <ApprovalHeader />
                        {Object.keys(groupByPerson).map((personId) => (
                            <React.Fragment key={personId}>
                                <PersonSection
                                    userId={personId}
                                    total={groupByPerson[personId].totals}
                                    isOpen={visiblePeople.includes(personId)}
                                    onToggle={() => handleTogglePerson(personId)}
                                    onToggleAll={() => handleToggleAllProjects(personId)} />
                                <TableBody>
                                    {visiblePeople.includes(personId) && Object.keys(groupByPerson[personId].projects).map((projectId) => (
                                        <React.Fragment key={`project-${projectId}`}>
                                            {/* Project Header Row */}
                                            <ProjectHeaderRow
                                                project={projectId}
                                                title={groupByPerson[personId].projects[projectId].title}
                                                total={groupByPerson[personId].projects[projectId].total}
                                                estimate={groupByPerson[personId].projects[projectId].estimate}
                                                isOpen={visibleProjects.includes(projectId)}
                                                onToggle={handleToggleProject}
                                            />

                                            {visibleProjects.includes(projectId) && Object.keys(groupByPerson[personId].projects[projectId].tasks).map((taskId) => (
                                                <React.Fragment key={`task-${taskId}`}>
                                                    {/* Task Header Row */}
                                                    <TaskHeaderRow
                                                        task={taskId}
                                                        title={groupByPerson[personId].projects[projectId].tasks[taskId].title}
                                                        total={groupByPerson[personId].projects[projectId].tasks[taskId].total}
                                                        estimate={groupByPerson[personId].projects[projectId].tasks[taskId].estimate}
                                                        isOpen={visibleTasks.includes(taskId)}
                                                        onToggle={handleToggleTask}
                                                    />

                                                    {/* Timelog Rows */}
                                                    {visibleTasks.includes(taskId) && groupByPerson[personId].projects[projectId].tasks[taskId].timelogs.map((timelog: ITimeLog) => (
                                                        <TimelogRow
                                                            key={timelog.id}
                                                            timelog={timelog}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </React.Fragment>
                        ))}
                    </Table>
                )}

                {!isLoading && timelogs.length === 0 && (
                    <Grid vertical>
                        <BlankSlate icon="calendar-view" title={
                            <Grid gap={10} align="center">
                                <div>No timelogs need review in the current interval:</div>
                                <Tag minimal size="large">{format(interval.at(0) ?? new Date(), "PP")}</Tag>
                            </Grid>
                        }
                            description="Once people will submit their timelogs for approval, they will appear here."
                        />
                    </Grid>
                )}

                {isLoading && (
                    <Grid vertical gap={10}>
                        {Array.from({ length: 10 }, (v, i) => i).map((a, i) => {
                            return (
                                <div
                                    key={i}
                                    className={Classes.SKELETON}
                                    style={{ height: 50 }}
                                />
                            );
                        })}
                    </Grid>
                )}
            </div>
        </AppViewContent >
    );
};

const ApprovalHeader = () => {
    return (
        <TableHead>
            <TableHeaderCell name="project" title="Project/Task/Date" resizable />
            <TableHeaderCell name="description" title="Description" />
            <TableHeaderCell name="billable" title="Billable" width={100} />
            <TableHeaderCell name="billed" title="Billed" width={100} />
            <TableHeaderCell name="status" title="Status" width={100} />
            <TableHeaderCell name="time" title="Time" align="right" />
            <TableHeaderCell name="actions" title="Actions" align="right" width={100} />
        </TableHead>
    )
}

interface ProjectHeaderRowProps {
    project: string;
    title: string;
    total: number;
    estimate: number;
    isOpen?: boolean;
    onToggle: (projectId: string) => void;
}
const ProjectHeaderRow: FunctionComponent<ProjectHeaderRowProps> = ({ project, title, total, estimate, isOpen, onToggle }) => {
    return (
        <tr>
            <TableBodyCell span={2}>
                <Icon icon={APPICONS.PROJECT} />
                <strong>{title}</strong>
                <Button
                    icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                    variant="minimal"
                    size="small"
                    onClick={() => onToggle(project)} />
            </TableBodyCell>
            <TableBodyCell span={3}>
                <TaskSpentProgress
                    estimated={estimate}
                    spent={total}
                    fill
                />
            </TableBodyCell>
            <TableBodyCell align="right">
                <TotalTag total={total} intent={Intent.SUCCESS} />
            </TableBodyCell>
            <TableBodyCell align="right" paddingLeft={0}>
                <ApproveButtons
                    onApprove={() => TimesheetApprovalActions.approve({ project })}
                    onReject={(reason) => TimesheetApprovalActions.reject({ project }, reason)}
                />
            </TableBodyCell>
        </tr>
    )
}

interface TaskHeaderRowProps {
    task: string;
    title: string;
    total: number;
    estimate: number;
    isOpen?: boolean;
    onToggle: (taskId: string) => void;
}
const TaskHeaderRow: FunctionComponent<TaskHeaderRowProps> = ({ task, title, total, estimate, isOpen, onToggle }) => {
    return (
        <tr>
            <TableBodyCell span={2}>
                <Row style={{ marginLeft: 8 }} align="center" gutter={5} justify="left">
                    <Icon icon="corner-down-right" />
                    <Icon icon={APPICONS.TASK} />
                    {title}
                    <Button icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />} variant="minimal" size="small"
                        onClick={() => onToggle(task)} />
                </Row>
            </TableBodyCell>
            <TableBodyCell span={3}>
                <TaskSpentProgress
                    estimated={estimate}
                    spent={total}
                    fill
                />
            </TableBodyCell>
            <TableBodyCell align="right">
                <TotalTag total={total} />
            </TableBodyCell>
            <TableBodyCell align="right" paddingLeft={0}>
                <ApproveButtons
                    onApprove={() => TimesheetApprovalActions.approve({ task })}
                    onReject={(reason) => TimesheetApprovalActions.reject({ task }, reason)}
                />
            </TableBodyCell>
        </tr>
    )
}

const TimelogRow = ({ timelog }: { timelog: ITimeLog }) => {
    return (
        <tr key={timelog.id}>
            <TableBodyCell>
                <Row style={{ marginLeft: 36 }} align="center" gutter={5} justify="left">
                    <Icon icon="corner-down-right" />
                    <Icon icon={APPICONS.CALENDAR} /> {format(timelog.date, "PP")}
                </Row>
            </TableBodyCell>
            <TableBodyCell>
                {timelog.description || 'No description'}
            </TableBodyCell>
            <TableBodyCell >
                <Icon icon={timelog.billable ? "check-square" : "square"} />
            </TableBodyCell>
            <TableBodyCell>
                <Icon icon={timelog.billed ? "check-square" : "square"} />
            </TableBodyCell>
            <TableBodyCell>
                <TimelogStatusIcon status={timelog.status} />
                {timelog.status === TIMELOG_STATUS.REJECTED && timelog.rejectReason && (
                    <Tooltip content={timelog.rejectReason} placement="top">
                        <Icon icon="message-alert-square" color={TIMELOG_STATUS_MAP[timelog.status].color} />
                    </Tooltip>
                )}
            </TableBodyCell>
            <TableBodyCell align="right">
                <TotalTag total={timelog.duration} />
            </TableBodyCell>
            <TableBodyCell align="right" paddingLeft={0}>
                <ApproveButtons
                    onApprove={() => TimesheetApprovalActions.approve({ timelog: timelog.id })}
                    onReject={(reason) => TimesheetApprovalActions.reject({ timelog: timelog.id }, reason)}
                />
            </TableBodyCell>
        </tr>
    )
}

const PersonSection = ({ userId, total, isOpen, onToggle, onToggleAll }: { userId: string, total: number, isOpen: boolean, onToggle: () => void, onToggleAll: () => void }) => {
    const { person } = usePerson(userId);
    return (
        <TableSection span={7}>
            <TableSectionCell span={2}>
                {person && (
                    <Row align="center">
                        <Col gap={10} align="center">
                            <Avatar person={person} />
                            <div>
                                <div>
                                    <strong>{`${person.firstName} ${person.lastName}`}</strong>
                                </div>
                                <div className={Classes.TEXT_MUTED}>{person.email}</div>
                            </div>
                        </Col>
                        <Col align="center">
                            <Button
                                icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                                variant="minimal" onClick={onToggle} />

                            <Tooltip content="Expand all projects" placement="top">
                                <Button
                                    icon={<Icon icon="plus-square" />}
                                    variant="minimal"
                                    onClick={onToggleAll} />
                            </Tooltip>
                        </Col>
                    </Row>
                )}
            </TableSectionCell>
            <TableSectionCell span={5}>
                <Row>
                    <Col justify="right" align="center" gap={15}>
                        <Row justify="right" align="center" gutter={5}>
                            <strong>Person total:</strong>

                            <TotalTag total={total} intent={Intent.PRIMARY} size="large" />
                        </Row>

                        <ApproveButtons
                            hiddable={false}
                            onApprove={() => TimesheetApprovalActions.approve({ person: userId })}
                            onReject={(reason) => TimesheetApprovalActions.reject({ person: userId }, reason)}
                        />
                    </Col>
                </Row>
            </TableSectionCell>
        </TableSection>
    )
}

interface TotalTagProps extends TagProps {
    total: number;
}
const TotalTag = ({ total, ...props }: TotalTagProps) => {
    return (
        <Tooltip content={
            <div style={{ textAlign: "center" }}>
                <div>{`${durationToHours(total).toFixed(1)} hours`}</div>
                <small>or</small>
                <div>{`${durationToWorkingDays(total).toFixed(1)} working days`}</div>
            </div>
        } placement="top">
            <Tag minimal {...props}>{formatStringDuration(total)}</Tag>
        </Tooltip>
    )
}

interface ApproveButtonsProps {
    hiddable?: boolean;
    onApprove: () => void;
    onReject: (reason: string) => void;
}

const ApproveButtons: FunctionComponent<ApproveButtonsProps> = ({ hiddable = true, onApprove, onReject }) => {
    const [reason, setReason] = useState("");
    const handleReject = () => {
        onReject(reason);
    }
    return (
        <ButtonGroup className={hiddable ? "timelogs-approve-buttons" : ""}>
            <Tooltip content="Approve" placement="top-end">
                <Button icon={<Icon icon="check" />} size="small" variant="outlined" intent={Intent.SUCCESS}
                    onClick={onApprove} />
            </Tooltip>

            <Popover
                content={
                    <Grid>
                        <FormGroup helperText="Write a reason for rejecting the timelog" label="Reject motive">
                            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} fill />
                        </FormGroup>
                        <Row align="center" justify="right">
                            <Button
                                variant="minimal"
                                size="small"
                                className={Classes.POPOVER_DISMISS}
                            >
                                {translate("Cancel")}
                            </Button>
                            <Button
                                disabled={!reason}
                                intent={Intent.DANGER}
                                size="small"
                                className={Classes.POPOVER_DISMISS}
                                onClick={handleReject}
                            >
                                Reject
                            </Button>
                        </Row>
                    </Grid>
                }
                placement="bottom-end"
                popoverClassName="popover-padded-medium"
                renderTarget={({ isOpen: isPopoverOpen, ref: ref1, ...popoverProps }) => (
                    <Tooltip
                        content="Reject"
                        placement="top-end"
                        disabled={isPopoverOpen}
                        openOnTargetFocus={false}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref: ref2, ...tooltipProps }) => (
                            <Button
                                {...popoverProps}
                                {...tooltipProps}
                                icon={<Icon icon="close" />}
                                size="small"
                                variant="outlined"
                                intent={Intent.DANGER}
                                ref={mergeRefs(ref1, ref2)}
                            />
                        )}
                    />
                )}
            />
        </ButtonGroup>
    )
}