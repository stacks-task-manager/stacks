// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import {
    Button,
    ButtonGroup,
    Classes,
    FormGroup,
    Intent,
    mergeRefs,
    Popover,
    Tag,
    TagProps,
    TextArea,
    Tooltip,
} from "@blueprintjs/core";
import { APPICONS, ITimeLog, TIMELOG_STATUS } from "@stacks/types";
import {
    Avatar,
    BlankSlate,
    Col,
    Grid,
    Icon,
    Row,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeaderCell,
    TableSection,
    TableSectionCell,
} from "app/components/common";
import { TaskSpentProgress } from "app/components/project";
import { usePerson, useTimelogsInterval } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { TimesheetApprovalActions } from "app/store/actions";
import { TimesheetApprovalStore } from "app/store/timesheetApprovals";
import { durationToHours, durationToWorkingDays, formatStringDuration } from "app/utils/date";
import { AppViewContent, TIMELOG_STATUS_MAP, TimelogStatusIcon } from "app/widgets";

interface TaskGroup {
    title: string;
    timelogs: ITimeLog[];
    total: number;
    estimate: number;
}

interface PersonGroup {
    total: number;
    projects: Record<string, ProjectGroup>;
    tasks: Record<string, TaskGroup>;
}

interface ProjectGroup {
    title: string;
    total: number;
    estimate: number;
    tasks: Record<string, TaskGroup>;
    people: Record<string, PersonGroup>;
}

type GroupedByPerson = Record<string, PersonGroup>;
type GroupedByProject = Record<string, ProjectGroup>;

const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];

const addTimelogToTask = (tasks: Record<string, TaskGroup>, timelog: ITimeLog) => {
    if (!tasks[timelog.task]) {
        tasks[timelog.task] = {
            title: timelog.taskInfo?.title ?? timelog.task,
            timelogs: [],
            total: 0,
            estimate: timelog.taskInfo?.estimate ?? 0,
        };
    }
    tasks[timelog.task].timelogs.push(timelog);
    tasks[timelog.task].total += timelog.duration;
};

export const PeopleApprovals = () => {
    const { interval, groupBy } = TimesheetApprovalStore.use(
        state => ({ interval: state.interval, groupBy: state.groupBy }),
        shallowEqual
    );
    const [visiblePeople, setVisiblePeople] = useState<string[]>([]);
    const [visibleProjects, setVisibleProjects] = useState<string[]>([]);
    const [visibleTasks, setVisibleTasks] = useState<string[]>([]);
    const { timelogs, isLoading } = useTimelogsInterval(interval);

    useEffect(() => {
        TimesheetApprovalActions.load();
    }, []);

    const groupedByPerson = useMemo(
        () =>
            timelogs.reduce((groups, timelog) => {
                if (!groups[timelog.person]) groups[timelog.person] = { total: 0, projects: {}, tasks: {} };
                const person = groups[timelog.person];
                if (!person.projects[timelog.project]) {
                    person.projects[timelog.project] = {
                        title: timelog.documentInfo?.title ?? timelog.project,
                        total: 0,
                        estimate: timelog.projectInfo?.estimate ?? 0,
                        tasks: {},
                        people: {},
                    };
                }
                person.total += timelog.duration;
                person.projects[timelog.project].total += timelog.duration;
                addTimelogToTask(person.projects[timelog.project].tasks, timelog);
                return groups;
            }, {} as GroupedByPerson),
        [timelogs]
    );

    const groupedByProject = useMemo(
        () =>
            timelogs.reduce((groups, timelog) => {
                if (!groups[timelog.project]) {
                    groups[timelog.project] = {
                        title: timelog.documentInfo?.title ?? timelog.project,
                        total: 0,
                        estimate: timelog.projectInfo?.estimate ?? 0,
                        tasks: {},
                        people: {},
                    };
                }
                const project = groups[timelog.project];
                if (!project.people[timelog.person]) {
                    project.people[timelog.person] = { total: 0, projects: {}, tasks: {} };
                }
                project.total += timelog.duration;
                project.people[timelog.person].total += timelog.duration;
                addTimelogToTask(project.people[timelog.person].tasks, timelog);
                return groups;
            }, {} as GroupedByProject),
        [timelogs]
    );

    const handleTogglePerson = (personId: string) => setVisiblePeople(ids => toggle(ids, personId));
    const handleToggleProject = (projectId: string) => setVisibleProjects(ids => toggle(ids, projectId));
    const handleToggleTask = (taskId: string) => setVisibleTasks(ids => toggle(ids, taskId));

    return (
        <AppViewContent padded relative data-testid="people-approvals-view">
            <div className="people-approvals" data-testid="people-approvals-content">
                {!isLoading && timelogs.length > 0 && (
                    <Table sticky>
                        <ApprovalHeader />
                        {groupBy === "person"
                            ? Object.entries(groupedByPerson).map(([personId, person]) => (
                                  <React.Fragment key={personId}>
                                      <PersonSection
                                          userId={personId}
                                          total={person.total}
                                          isOpen={visiblePeople.includes(personId)}
                                          onToggle={() => handleTogglePerson(personId)}
                                      />
                                      <TableBody>
                                          {visiblePeople.includes(personId) &&
                                              Object.entries(person.projects).map(([projectId, project]) => (
                                                  <React.Fragment key={projectId}>
                                                      <ProjectHeaderRow
                                                          project={projectId}
                                                          title={project.title}
                                                          total={project.total}
                                                          estimate={project.estimate}
                                                          isOpen={visibleProjects.includes(projectId)}
                                                          onToggle={handleToggleProject}
                                                      />
                                                      {visibleProjects.includes(projectId) && (
                                                          <TaskRows
                                                              tasks={project.tasks}
                                                              visibleTasks={visibleTasks}
                                                              onToggleTask={handleToggleTask}
                                                          />
                                                      )}
                                                  </React.Fragment>
                                              ))}
                                      </TableBody>
                                  </React.Fragment>
                              ))
                            : Object.entries(groupedByProject).map(([projectId, project]) => (
                                  <TableBody key={projectId}>
                                      <ProjectHeaderRow
                                          project={projectId}
                                          title={project.title}
                                          total={project.total}
                                          estimate={project.estimate}
                                          isOpen={visibleProjects.includes(projectId)}
                                          onToggle={handleToggleProject}
                                      />
                                      {visibleProjects.includes(projectId) &&
                                          Object.entries(project.people).map(([personId, person]) => {
                                              const personKey = `${projectId}:${personId}`;
                                              return (
                                                  <React.Fragment key={personKey}>
                                                      <PersonHeaderRow
                                                          personId={personId}
                                                          projectId={projectId}
                                                          total={person.total}
                                                          isOpen={visiblePeople.includes(personKey)}
                                                          onToggle={() => handleTogglePerson(personKey)}
                                                      />
                                                      {visiblePeople.includes(personKey) && (
                                                          <TaskRows
                                                              tasks={person.tasks}
                                                              visibleTasks={visibleTasks}
                                                              onToggleTask={handleToggleTask}
                                                          />
                                                      )}
                                                  </React.Fragment>
                                              );
                                          })}
                                  </TableBody>
                              ))}
                    </Table>
                )}

                {!isLoading && timelogs.length === 0 && (
                    <Grid vertical>
                        <BlankSlate
                            icon="calendar-view"
                            title={
                                <Grid gap={10} align="center">
                                    <div>{translate("No timelogs for the current interval")}</div>
                                    <Tag minimal size="large">
                                        {format(interval.at(0) ?? new Date(), "PP")}
                                    </Tag>
                                </Grid>
                            }
                            description={translate("Timelogs awaiting approval will appear here")}
                        />
                    </Grid>
                )}

                {isLoading && (
                    <Grid vertical gap={10}>
                        {Array.from({ length: 10 }, (_, index) => (
                            <div key={index} className={Classes.SKELETON} style={{ height: 50 }} />
                        ))}
                    </Grid>
                )}
            </div>
        </AppViewContent>
    );
};

const ApprovalHeader = () => (
    <TableHead>
        <TableHeaderCell name="project" title={translate("Project Task Date")} resizable />
        <TableHeaderCell name="description" title={translate("Description")} />
        <TableHeaderCell name="billable" title={translate("Billable")} width={100} />
        <TableHeaderCell name="billed" title={translate("Billed")} width={100} />
        <TableHeaderCell name="status" title={translate("Status")} width={100} />
        <TableHeaderCell name="time" title={translate("Time")} align="right" />
        <TableHeaderCell name="actions" title={translate("Actions")} align="right" width={100} />
    </TableHead>
);

interface ProjectHeaderRowProps {
    project: string;
    title: string;
    total: number;
    estimate: number;
    isOpen?: boolean;
    onToggle: (projectId: string) => void;
}

const ProjectHeaderRow: FunctionComponent<ProjectHeaderRowProps> = ({
    project,
    title,
    total,
    estimate,
    isOpen,
    onToggle,
}) => (
    <tr data-testid="people-approvals-project-group">
        <TableBodyCell span={2}>
            <Icon icon={APPICONS.PROJECT} />
            <strong>{title}</strong>
            <Button
                data-testid="people-approvals-project-toggle"
                icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                variant="minimal"
                size="small"
                onClick={() => onToggle(project)}
            />
        </TableBodyCell>
        <TableBodyCell span={3}>
            <TaskSpentProgress estimated={estimate} spent={total} fill />
        </TableBodyCell>
        <TableBodyCell align="right">
            <TotalTag total={total} intent={Intent.SUCCESS} />
        </TableBodyCell>
        <TableBodyCell align="right" paddingLeft={0}>
            <ApproveButtons
                onApprove={() => TimesheetApprovalActions.approve({ project })}
                onReject={reason => TimesheetApprovalActions.reject({ project }, reason)}
            />
        </TableBodyCell>
    </tr>
);

const PersonHeaderRow = ({
    personId,
    projectId,
    total,
    isOpen,
    onToggle,
}: {
    personId: string;
    projectId: string;
    total: number;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    const { person } = usePerson(personId);
    return (
        <tr data-testid="people-approvals-person-group">
            <TableBodyCell span={2}>
                <Row style={{ marginLeft: 8 }} align="center" gutter={5} justify="left">
                    <Icon icon="corner-down-right" />
                    {person && <Avatar person={person} />}
                    <strong>{person ? `${person.firstName} ${person.lastName}` : personId}</strong>
                    <Button
                        data-testid="people-approvals-person-toggle"
                        icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                        variant="minimal"
                        size="small"
                        onClick={onToggle}
                    />
                </Row>
            </TableBodyCell>
            <TableBodyCell span={3} />
            <TableBodyCell align="right">
                <TotalTag total={total} />
            </TableBodyCell>
            <TableBodyCell align="right" paddingLeft={0}>
                <ApproveButtons
                    onApprove={() =>
                        TimesheetApprovalActions.approve({ project: projectId, person: personId })
                    }
                    onReject={reason =>
                        TimesheetApprovalActions.reject({ project: projectId, person: personId }, reason)
                    }
                />
            </TableBodyCell>
        </tr>
    );
};

const TaskRows = ({
    tasks,
    visibleTasks,
    onToggleTask,
}: {
    tasks: Record<string, TaskGroup>;
    visibleTasks: string[];
    onToggleTask: (taskId: string) => void;
}) => (
    <>
        {Object.entries(tasks).map(([taskId, task]) => (
            <React.Fragment key={taskId}>
                <TaskHeaderRow
                    task={taskId}
                    title={task.title}
                    total={task.total}
                    estimate={task.estimate}
                    isOpen={visibleTasks.includes(taskId)}
                    onToggle={onToggleTask}
                />
                {visibleTasks.includes(taskId) &&
                    task.timelogs.map(timelog => <TimelogRow key={timelog.id} timelog={timelog} />)}
            </React.Fragment>
        ))}
    </>
);

interface TaskHeaderRowProps {
    task: string;
    title: string;
    total: number;
    estimate: number;
    isOpen?: boolean;
    onToggle: (taskId: string) => void;
}

const TaskHeaderRow: FunctionComponent<TaskHeaderRowProps> = ({
    task,
    title,
    total,
    estimate,
    isOpen,
    onToggle,
}) => (
    <tr>
        <TableBodyCell span={2}>
            <Row style={{ marginLeft: 8 }} align="center" gutter={5} justify="left">
                <Icon icon="corner-down-right" />
                <Icon icon={APPICONS.TASK} />
                {title}
                <Button
                    icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                    variant="minimal"
                    size="small"
                    onClick={() => onToggle(task)}
                />
            </Row>
        </TableBodyCell>
        <TableBodyCell span={3}>
            <TaskSpentProgress estimated={estimate} spent={total} fill />
        </TableBodyCell>
        <TableBodyCell align="right">
            <TotalTag total={total} />
        </TableBodyCell>
        <TableBodyCell align="right" paddingLeft={0}>
            <ApproveButtons
                onApprove={() => TimesheetApprovalActions.approve({ task })}
                onReject={reason => TimesheetApprovalActions.reject({ task }, reason)}
            />
        </TableBodyCell>
    </tr>
);

const TimelogRow = ({ timelog }: { timelog: ITimeLog }) => (
    <tr>
        <TableBodyCell>
            <Row style={{ marginLeft: 36 }} align="center" gutter={5} justify="left">
                <Icon icon="corner-down-right" />
                <Icon icon={APPICONS.CALENDAR} /> {format(timelog.date, "PP")}
            </Row>
        </TableBodyCell>
        <TableBodyCell>{timelog.description || translate("No description")}</TableBodyCell>
        <TableBodyCell>
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
                onReject={reason => TimesheetApprovalActions.reject({ timelog: timelog.id }, reason)}
            />
        </TableBodyCell>
    </tr>
);

const PersonSection = ({
    userId,
    total,
    isOpen,
    onToggle,
}: {
    userId: string;
    total: number;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    const { person } = usePerson(userId);
    return (
        <TableSection span={7} data-testid="people-approvals-person-group">
            <TableSectionCell span={2}>
                <Row align="center">
                    {person && (
                        <Col gap={10} align="center">
                            <Avatar person={person} />
                            <div>
                                <div>
                                    <strong>{`${person.firstName} ${person.lastName}`}</strong>
                                </div>
                                <div className={Classes.TEXT_MUTED}>{person.email}</div>
                            </div>
                        </Col>
                    )}
                    <Button
                        data-testid="people-approvals-person-toggle"
                        icon={<Icon icon={isOpen ? "chevron-up" : "chevron-down"} />}
                        variant="minimal"
                        onClick={onToggle}
                    />
                </Row>
            </TableSectionCell>
            <TableSectionCell span={5}>
                <Row>
                    <Col justify="right" align="center" gap={15}>
                        <Row justify="right" align="center" gutter={5}>
                            <strong>{`${translate("Person")} ${translate("Total")}`}</strong>
                            <TotalTag total={total} intent={Intent.PRIMARY} size="large" />
                        </Row>
                        <ApproveButtons
                            hiddable={false}
                            onApprove={() => TimesheetApprovalActions.approve({ person: userId })}
                            onReject={reason => TimesheetApprovalActions.reject({ person: userId }, reason)}
                        />
                    </Col>
                </Row>
            </TableSectionCell>
        </TableSection>
    );
};

interface TotalTagProps extends TagProps {
    total: number;
}

const TotalTag = ({ total, ...props }: TotalTagProps) => (
    <Tooltip
        content={
            <div style={{ textAlign: "center" }}>
                <div>
                    {durationToHours(total).toFixed(1)} {translate("hours")}
                </div>
                <small>{translate("or")}</small>
                <div>{`${durationToWorkingDays(total).toFixed(1)} ${translate("working days")}`}</div>
            </div>
        }
        placement="top"
    >
        <Tag minimal {...props}>
            {formatStringDuration(total)}
        </Tag>
    </Tooltip>
);

interface ApproveButtonsProps {
    hiddable?: boolean;
    onApprove: () => void;
    onReject: (reason: string) => void;
}

const ApproveButtons: FunctionComponent<ApproveButtonsProps> = ({ hiddable = true, onApprove, onReject }) => {
    const [reason, setReason] = useState("");
    return (
        <ButtonGroup className={hiddable ? "timelogs-approve-buttons" : ""}>
            <Tooltip content={translate("Approve")} placement="top-end">
                <Button
                    icon={<Icon icon="check" />}
                    size="small"
                    variant="outlined"
                    intent={Intent.SUCCESS}
                    onClick={onApprove}
                />
            </Tooltip>
            <Popover
                content={
                    <Grid>
                        <FormGroup
                            helperText={translate("Write a reason for rejecting the timelog")}
                            label={translate("Reject motive")}
                        >
                            <TextArea value={reason} onChange={event => setReason(event.target.value)} fill />
                        </FormGroup>
                        <Row align="center" justify="right">
                            <Button variant="minimal" size="small" className={Classes.POPOVER_DISMISS}>
                                {translate("Cancel")}
                            </Button>
                            <Button
                                disabled={!reason}
                                intent={Intent.DANGER}
                                size="small"
                                className={Classes.POPOVER_DISMISS}
                                onClick={() => onReject(reason)}
                            >
                                {translate("Reject")}
                            </Button>
                        </Row>
                    </Grid>
                }
                placement="bottom-end"
                popoverClassName="popover-padded-medium"
                renderTarget={({ isOpen: isPopoverOpen, ref: ref1, ...popoverProps }) => (
                    <Tooltip
                        content={translate("Reject")}
                        placement="top-end"
                        disabled={isPopoverOpen}
                        openOnTargetFocus={false}
                        renderTarget={({ isOpen: _isOpen, ref: ref2, ...tooltipProps }) => (
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
    );
};
