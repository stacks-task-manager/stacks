// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Colors,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tag,
    Tooltip,
} from "@blueprintjs/core";
import { format, isSameDay, isWeekend } from "date-fns";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { APPICONS, ITimeLog, ROLE_SECTIONS, TIMELOG_STATUS } from "@stacks/types";
import {
    BlankSlate,
    Col,
    Grid,
    Icon,
    Row,
    Scroller,
    Table,
    TableBody,
    TableBodyCell,
    TableFooter,
    TableFooterCell,
    TableHead,
    TableHeaderCell,
} from "app/components/common";
import { QuickTimeLogDialog } from "app/components/project";
import { PersonTimesheetActions } from "app/store/actions";
import { PersonTimesheetStore } from "app/store/personTimesheet";
import { formatStringDuration } from "app/utils/date";
import { stripMd } from "app/utils/string";
import { useLocation, useNavigate } from "react-router-dom";
import { xor } from "lodash";
import classNames from "classnames";
import { useCanAccess, useTimelogsInterval } from "app/hooks";
import { translate } from "@stacks/translations";

type TimesheetStatus = TIMELOG_STATUS | "partiallyReviewed";

interface IBase {
    id: string;
    title: string;
    total: number;
    status: TimesheetStatus;
}

interface ITaskBased extends IBase {
    timelogs: ITimeLog[];
}

interface IProjectBased extends IBase {
    tasks: Record<string, ITaskBased>;
}

const APPROVED_COLOR = Colors.GREEN3;
const PARTIALLY_APPROVED_COLOR = Colors.GOLD3;
const INREVIEW_COLOR = Colors.ORANGE3;
const REJECTED_COLOR = Colors.RED3;

const APPROVED_ICON = "check-circle-filled";
const REJECTED_ICON = "minus-circle";
const INREVIEW_ICON = "help-circle";

export const TIMELOG_STATUS_MAP = {
    [TIMELOG_STATUS.PENDING]: {
        label: "Pending approval",
        icon: APPICONS.TASK,
        color: undefined,
    },
    [TIMELOG_STATUS.APPROVED]: {
        label: "Approved",
        icon: APPROVED_ICON,
        color: APPROVED_COLOR,
    },
    [TIMELOG_STATUS.REJECTED]: {
        label: "Rejected",
        icon: REJECTED_ICON,
        color: REJECTED_COLOR,
    },
    [TIMELOG_STATUS.INREVIEW]: {
        label: "In review",
        icon: INREVIEW_ICON,
        color: INREVIEW_COLOR,
    },
    all: {
        label: "All",
        icon: "circle",
        color: undefined,
    },
};

const summarizeStatus = (timelogs: ITimeLog[]): TimesheetStatus => {
    const statuses = new Set(timelogs.map(timelog => timelog.status));
    return statuses.size === 1 ? timelogs[0].status : "partiallyReviewed";
};

export const PersonTimesheet = () => {
    const { interval } = PersonTimesheetStore.use();
    const { timelogs, isLoading } = useTimelogsInterval(interval);
    const [showTimelog, setShowTimelog] = useState(false);
    const [timelog, setTimelog] = useState<Partial<ITimeLog>>({});
    const [explodedProjects, setExplodedProjects] = useState<string[]>([]);

    const grouped: Record<string, IProjectBased> = useMemo(() => {
        const groupedTimelogs = timelogs.reduce((acc, timelog) => {
            const projectId = timelog.project;
            const taskId = timelog.task;

            if (!acc[projectId]) {
                acc[projectId] = {
                    id: projectId,
                    title: timelog.documentInfo?.title ?? projectId,
                    tasks: {},
                    total: 0,
                    status: TIMELOG_STATUS.PENDING,
                };
            }

            if (!acc[projectId].tasks[taskId]) {
                acc[projectId].tasks[taskId] = {
                    id: taskId,
                    title: timelog.taskInfo?.title ?? taskId,
                    timelogs: [],
                    total: 0,
                    status: TIMELOG_STATUS.PENDING,
                };
            }

            acc[projectId].tasks[taskId].timelogs.push(timelog);
            acc[projectId].tasks[taskId].total += timelog.duration;
            acc[projectId].total += timelog.duration;

            return acc;
        }, {} as Record<string, IProjectBased>);

        Object.values(groupedTimelogs).forEach(project => {
            Object.values(project.tasks).forEach(task => {
                task.status = summarizeStatus(task.timelogs);
            });
            project.status = summarizeStatus(Object.values(project.tasks).flatMap(task => task.timelogs));
        });

        return groupedTimelogs;
    }, [timelogs]);

    useEffect(() => {
        (async () => {
            await PersonTimesheetActions.load();
        })();
    }, []);

    const handleToggleTimelog = (project?: string, date?: Date, task?: string) => {
        setTimelog({
            project,
            date: date ?? interval[0] ?? new Date(),
            task,
        });
        setShowTimelog(true);
    };

    const handleCloseTimelog = () => {
        setShowTimelog(false);
    };

    const handleOnAdd = (_timelog: ITimeLog, another?: boolean) => {
        if (another) {
            setShowTimelog(true);
        }
    };

    const handleEditTimelog = (timelog: ITimeLog) => {
        setTimelog(timelog);
        setShowTimelog(true);
    };

    const toggleProjectVisibility = (projectId: string) => {
        setExplodedProjects(current => xor(current, [projectId]));
    };

    return (
        <>
            {!isLoading && timelogs.length === 0 && (
                <Grid vertical>
                    <BlankSlate
                        icon="calendar-view"
                        title={
                            <Grid gap={10} align="center">
                                <div>{translate("No timelogs for the current interval")}</div>
                                <Tag minimal size="large">
                                    {format(interval.at(0) ?? new Date(), "LLL d")} -{" "}
                                    {format(interval.at(-1) ?? new Date(), "LLL d")}
                                </Tag>
                            </Grid>
                        }
                        description={translate("Add some timelogs to see the data here")}
                    >
                        <Button
                            intent="primary"
                            onClick={() => handleToggleTimelog()}
                            data-testid="people-timesheet-empty-log-time-button"
                        >
                            {translate("Log time")}
                        </Button>
                    </BlankSlate>
                </Grid>
            )}

            {!isLoading && timelogs.length > 0 && (
                <Table sticky>
                    <TimesheetHeader />

                    <TableBody>
                        {Object.values(grouped).map(project => (
                            <React.Fragment key={project.id}>
                                <tr data-testid={`people-timesheet-project-${project.id}-row`}>
                                    <TitleCol
                                        title={project.title}
                                        isMain
                                        isOpen={explodedProjects.includes(project.id)}
                                        onToggleVisibility={() => toggleProjectVisibility(project.id)}
                                        status={project.status}
                                        testId={`people-timesheet-project-${project.id}-toggle`}
                                    />
                                    <TimelogsCols
                                        projectId={project.id}
                                        detailed
                                        timelogs={Object.values(project.tasks).flatMap(task => task.timelogs)}
                                        onAdd={handleToggleTimelog}
                                        onEdit={handleEditTimelog}
                                    />
                                    <TotalColumn value={project.total} />
                                    <AddColumn
                                        onAdd={() => handleToggleTimelog(project.id)}
                                        testId={`people-timesheet-project-${project.id}-add`}
                                    />
                                </tr>

                                {explodedProjects.includes(project.id) &&
                                    Object.values(project.tasks).map(task => (
                                        <tr
                                            key={task.id}
                                            data-testid={`people-timesheet-task-${task.id}-row`}
                                        >
                                            <TitleCol title={task.title} status={task.status} />
                                            <TimelogsCols
                                                projectId={project.id}
                                                taskId={task.id}
                                                timelogs={task.timelogs}
                                                onAdd={handleToggleTimelog}
                                                onEdit={handleEditTimelog}
                                            />
                                            <TotalColumn value={task.total} />
                                            <AddColumn
                                                onAdd={() =>
                                                    handleToggleTimelog(project.id, undefined, task.id)
                                                }
                                                testId={`people-timesheet-task-${task.id}-add`}
                                            />
                                        </tr>
                                    ))}
                            </React.Fragment>
                        ))}
                    </TableBody>

                    <FooterTotals records={grouped} />
                </Table>
            )}

            {isLoading && (
                <Grid vertical gap={10}>
                    {Array.from({ length: 10 }, (v, i) => i).map((a, i) => {
                        return <div key={i} className={Classes.SKELETON} style={{ height: 30 }} />;
                    })}
                </Grid>
            )}

            {showTimelog && (
                <QuickTimeLogDialog
                    value={timelog}
                    changeTask
                    changeProject
                    onClose={handleCloseTimelog}
                    onSave={handleOnAdd}
                />
            )}
        </>
    );
};

const TimesheetHeader = () => {
    const { interval } = PersonTimesheetStore.use();
    return (
        <TableHead>
            <TableHeaderCell name="project" title={translate("Project")} width={300} resizable />
            {interval.map((date, i) => {
                const formattedDate = format(date, "dd");
                return (
                    <TableHeaderCell
                        key={i}
                        name={formattedDate}
                        align="right"
                        width={100}
                        secondary={isWeekend(date)}
                    >
                        <Grid
                            gap={0}
                            align="right"
                            className={classNames("person-timesheet__date", {
                                "person-timesheet__today": isSameDay(date, new Date()),
                            })}
                        >
                            <span style={{ fontSize: 9 }}>{format(date, "ccc")}</span>
                            <div>{format(date, "LLL d")}</div>
                        </Grid>
                    </TableHeaderCell>
                );
            })}
            <TableHeaderCell name="weekTotal" align="right" width={110}>
                <Grid gap={0} align="right">
                    <span style={{ fontSize: 9 }}>{translate("Week")}</span>
                    <div>{translate("Hours")}</div>
                </Grid>
            </TableHeaderCell>

            <TableHeaderCell name="new" align="right" width={40}></TableHeaderCell>
        </TableHead>
    );
};

const TotalColumn = ({ value }: { value: number }) => {
    return (
        <TableBodyCell align="right">
            <Tag minimal intent={Intent.PRIMARY}>
                {formatStringDuration(value)}
            </Tag>
        </TableBodyCell>
    );
};

const AddColumn = ({ onAdd, testId }: { onAdd: () => void; testId: string }) => {
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    return (
        <TableBodyCell align="right">
            <Tooltip content={translate("Log time this week")} placement="top-end">
                <Button
                    variant="minimal"
                    size="small"
                    onClick={onAdd}
                    disabled={!canLogTime}
                    aria-label={translate("Log time this week")}
                    data-testid={testId}
                >
                    <Icon icon="plus" />
                </Button>
            </Tooltip>
        </TableBodyCell>
    );
};

interface TitleColProps {
    title: string;
    isOpen?: boolean;
    isMain?: boolean;
    status?: TimesheetStatus;
    onToggleVisibility?: () => void;
    testId?: string;
}
const TitleCol: FunctionComponent<TitleColProps> = ({
    title,
    status,
    isOpen,
    isMain,
    onToggleVisibility,
    testId,
}) => {
    return (
        <TableBodyCell>
            <Row>
                <Col align="center" gap={10}>
                    {isMain ? (
                        <>
                            <Button
                                variant="minimal"
                                size="small"
                                onClick={onToggleVisibility}
                                aria-label={isOpen ? translate("Collapse") : translate("Expand")}
                                data-testid={testId}
                            >
                                <Icon icon={isOpen ? "chevron-up" : "chevron-down"} />
                            </Button>
                            <strong>{title}</strong>
                        </>
                    ) : (
                        <Row style={{ marginLeft: 12 }} align="center" gutter={5} justify="left">
                            <Icon icon="corner-down-right" /> {title}
                        </Row>
                    )}
                </Col>
                <Col justify="right">
                    {status === TIMELOG_STATUS.APPROVED && (
                        <Tag minimal intent={Intent.SUCCESS} data-testid="people-timesheet-status-approved">
                            {translate("Approved")}
                        </Tag>
                    )}
                    {status === TIMELOG_STATUS.INREVIEW && (
                        <Tag minimal intent={Intent.WARNING} data-testid="people-timesheet-status-inreview">
                            {translate("In review")}
                        </Tag>
                    )}
                    {status === TIMELOG_STATUS.REJECTED && (
                        <Tag minimal intent={Intent.DANGER} data-testid="people-timesheet-status-rejected">
                            {translate("Needs changes")}
                        </Tag>
                    )}
                    {status === "partiallyReviewed" && (
                        <Tag
                            minimal
                            intent={Intent.WARNING}
                            data-testid="people-timesheet-status-partially-reviewed"
                        >
                            {translate("Partially reviewed")}
                        </Tag>
                    )}
                </Col>
            </Row>
        </TableBodyCell>
    );
};

interface TimelogsColsProps {
    projectId: string;
    timelogs: ITimeLog[];
    detailed?: boolean;
    onAdd: (project?: string, date?: Date, task?: string) => void;
    onEdit: (timelog: ITimeLog) => void;
    taskId?: string;
}
const TimelogsCols: FunctionComponent<TimelogsColsProps> = ({
    projectId,
    taskId,
    timelogs: logs,
    detailed,
    onAdd,
    onEdit,
}) => {
    const { interval } = PersonTimesheetStore.use();
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);
    const timelogsByDate = useMemo(() => {
        const result = new Map<string, ITimeLog[]>();
        logs.forEach(timelog => {
            const key = format(timelog.date, "yyyy-MM-dd");
            const entries = result.get(key);
            if (entries) {
                entries.push(timelog);
            } else {
                result.set(key, [timelog]);
            }
        });
        return result;
    }, [logs]);

    return (
        <>
            {interval.map((date, i) => {
                const timelogs = timelogsByDate.get(format(date, "yyyy-MM-dd")) ?? [];
                const duration = timelogs.reduce((acc, timelog) => acc + timelog.duration, 0);

                const isApproved =
                    timelogs.length > 0 &&
                    timelogs.every(timelog => timelog.status === TIMELOG_STATUS.APPROVED);
                const rejected =
                    timelogs.length > 0 &&
                    timelogs.some(timelog => timelog.status === TIMELOG_STATUS.REJECTED);
                const inReview =
                    !rejected && timelogs.some(timelog => timelog.status === TIMELOG_STATUS.INREVIEW);
                const partiallyApproved =
                    !rejected &&
                    !isApproved &&
                    timelogs.length > 0 &&
                    timelogs.some(timelog => timelog.status === TIMELOG_STATUS.APPROVED);

                return (
                    <TableBodyCell key={i} align="right" secondary={isWeekend(date)}>
                        {isApproved && (
                            <Tooltip content={translate("Approved")} placement="top">
                                <Icon icon="check-circle-filled" color={APPROVED_COLOR} />
                            </Tooltip>
                        )}
                        {rejected && (
                            <Tooltip content={translate("Rejected")} placement="top">
                                <Icon icon="minus-circle" color={REJECTED_COLOR} />
                            </Tooltip>
                        )}
                        {partiallyApproved && (
                            <Tooltip content={translate("Partially approved")} placement="top">
                                <Icon icon="check-circle" color={PARTIALLY_APPROVED_COLOR} />
                            </Tooltip>
                        )}
                        {inReview && (
                            <Tooltip content={translate("In review")} placement="top">
                                <Icon icon={INREVIEW_ICON} color={INREVIEW_COLOR} />
                            </Tooltip>
                        )}

                        {duration > 0 ? (
                            <Popover
                                content={
                                    <DayPopupContent
                                        project={projectId}
                                        date={date}
                                        task={taskId}
                                        detailed={detailed}
                                        timelogs={timelogs}
                                        onAdd={() => onAdd(projectId, date, taskId)}
                                        onEdit={onEdit}
                                    />
                                }
                            >
                                <Tag
                                    minimal
                                    interactive
                                    intent={Intent.SUCCESS}
                                    data-testid={`people-timesheet-day-${format(date, "yyyy-MM-dd")}-entries`}
                                >
                                    {formatStringDuration(duration)}
                                </Tag>
                            </Popover>
                        ) : (
                            <Tooltip
                                content={translate("Log time on", { date: format(date, "LLL d") })}
                                disabled={!canLogTime}
                                placement="top"
                            >
                                <Tag
                                    minimal
                                    interactive={canLogTime}
                                    onClick={() => onAdd(projectId, date, taskId)}
                                    data-testid={`people-timesheet-day-${format(date, "yyyy-MM-dd")}-add`}
                                >
                                    -
                                </Tag>
                            </Tooltip>
                        )}
                    </TableBodyCell>
                );
            })}
        </>
    );
};

const FooterTotals = ({ records }: { records: Record<string, IProjectBased> }) => {
    const { interval } = PersonTimesheetStore.use();

    const { daysTotals, weekTotal } = useMemo(() => {
        const totalsByDate = new Map<string, number>();
        Object.values(records)
            .flatMap(project => Object.values(project.tasks))
            .flatMap(task => task.timelogs)
            .forEach(timelog => {
                const key = format(timelog.date, "yyyy-MM-dd");
                totalsByDate.set(key, (totalsByDate.get(key) ?? 0) + timelog.duration);
            });
        const daysTotals = interval.map(date => totalsByDate.get(format(date, "yyyy-MM-dd")) ?? 0);

        const weekTotal = daysTotals.reduce((acc, day) => {
            return acc + day;
        }, 0);

        return { daysTotals, weekTotal };
    }, [interval, records]);

    return (
        <TableFooter detached>
            <TableFooterCell>
                <strong>{translate("Total")}</strong>
            </TableFooterCell>
            {daysTotals.map((day, i) => (
                <TableFooterCell key={i} align="right" secondary={isWeekend(interval[i])}>
                    <Tag minimal intent={Intent.PRIMARY}>
                        {day > 0 ? formatStringDuration(day) : "-"}
                    </Tag>
                </TableFooterCell>
            ))}
            <TableFooterCell align="right">
                <Tag minimal intent={Intent.PRIMARY}>
                    {weekTotal > 0 ? formatStringDuration(weekTotal) : "-"}
                </Tag>
            </TableFooterCell>
            <TableFooterCell align="right"></TableFooterCell>
        </TableFooter>
    );
};

interface DayPopupContent {
    project: string;
    task?: string;
    date: Date;
    detailed?: boolean;
    timelogs: ITimeLog[];
    onAdd: () => void;
    onEdit: (timelog: ITimeLog) => void;
}

const DayPopupContent: FunctionComponent<DayPopupContent> = ({
    project,
    task,
    date,
    detailed,
    timelogs,
    onAdd,
    onEdit,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    const filteredTimelogs = useMemo(() => {
        return timelogs.filter(timelog => {
            const ok = isSameDay(timelog.date, date) && timelog.project === project;
            if (task) {
                return ok && timelog.task === task;
            }
            return ok;
        });
    }, [timelogs, date, project, task]);

    const handleOpenTask = (taskId: string) => {
        navigate(`/task/${taskId}`, {
            state: {
                backgroundLocation: location,
            },
        });
    };

    return (
        <Scroller thin vertical maxHeight={300}>
            <Menu style={{ maxWidth: 300 }}>
                {filteredTimelogs.map(timelog => {
                    const canEdit =
                        canLogTime &&
                        [TIMELOG_STATUS.PENDING, TIMELOG_STATUS.REJECTED].includes(timelog.status);
                    return (
                        <MenuItem
                            key={timelog.id}
                            icon={<TimelogStatusIcon status={timelog.status} />}
                            text={
                                <Grid gap={0}>
                                    <Row justify="left" gutter={5}>
                                        {detailed
                                            ? stripMd(timelog.taskInfo?.title ?? timelog.task)
                                            : format(timelog.date, "LLL d, yyyy")}
                                        {timelog.status === TIMELOG_STATUS.REJECTED &&
                                            timelog.rejectReason?.length && (
                                                <Tooltip content={timelog.rejectReason} placement="right">
                                                    <Icon
                                                        icon="message-alert-square"
                                                        color={REJECTED_COLOR}
                                                    />
                                                </Tooltip>
                                            )}
                                    </Row>
                                    {detailed && (
                                        <small className={Classes.TEXT_MUTED}>
                                            {format(timelog.date, "LLL d, yyyy")}
                                        </small>
                                    )}
                                </Grid>
                            }
                            labelElement={
                                <Tag minimal intent={Intent.SUCCESS}>
                                    {formatStringDuration(timelog.duration)}
                                </Tag>
                            }
                            onClick={() => (canEdit ? onEdit(timelog) : handleOpenTask(timelog.task))}
                            data-testid={`people-timesheet-timelog-${timelog.id}`}
                        />
                    );
                })}
                {canLogTime && (
                    <>
                        <MenuDivider />
                        <MenuItem
                            icon={<Icon icon="plus" />}
                            text={translate("Log time")}
                            onClick={onAdd}
                            data-testid="people-timesheet-popover-log-time-button"
                        />
                    </>
                )}
            </Menu>
        </Scroller>
    );
};

export const TimelogStatusIcon = ({ status }: { status: TIMELOG_STATUS }) => {
    return (
        <Tooltip content={translate(TIMELOG_STATUS_MAP[status].label)} placement="left">
            <Icon icon={TIMELOG_STATUS_MAP[status].icon} color={TIMELOG_STATUS_MAP[status].color} />
        </Tooltip>
    );
};
