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

type TimesheetStatus =
    | TIMELOG_STATUS.PENDING
    | TIMELOG_STATUS.APPROVED
    | TIMELOG_STATUS.REJECTED
    | "partiallyApproved";

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
                    title: timelog.documentInfo.title,
                    tasks: {},
                    total: 0,
                    status: TIMELOG_STATUS.PENDING,
                };
            }

            if (!acc[projectId].tasks[taskId]) {
                acc[projectId].tasks[taskId] = {
                    id: taskId,
                    title: timelog.taskInfo.title,
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
            // Set status for each task based on its timelogs
            Object.values(project.tasks).forEach(task => {
                const reviewed = task.timelogs.some(timelog => timelog.status !== TIMELOG_STATUS.PENDING);
                const isApproved = task.timelogs.every(timelog => timelog.status === TIMELOG_STATUS.APPROVED);
                if (isApproved) {
                    task.status = TIMELOG_STATUS.APPROVED;
                } else {
                    const isPartiallyApproved =
                        reviewed && task.timelogs.some(timelog => timelog.status === TIMELOG_STATUS.APPROVED);
                    if (isPartiallyApproved) {
                        task.status = "partiallyApproved";
                    }
                }
            });

            // Set status for project based on all tasks' timelogs
            const isApproved = Object.values(project.tasks)
                .flatMap(task => task.timelogs)
                .every(timelog => timelog.status === TIMELOG_STATUS.APPROVED);
            if (isApproved) {
                project.status = TIMELOG_STATUS.APPROVED;
            } else {
                const isPartiallyApproved = Object.values(project.tasks)
                    .flatMap(task => task.timelogs)
                    .some(timelog => timelog.status === TIMELOG_STATUS.APPROVED);
                if (isPartiallyApproved) {
                    project.status = "partiallyApproved";
                }
            }
        });

        return groupedTimelogs;
    }, [timelogs, interval]);

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
        setShowTimelog(!showTimelog);
    };

    const handleCloseTimelog = () => {
        setShowTimelog(false);
    };

    const handleOnAdd = (timelog: ITimeLog, another?: boolean) => {
        if (another) {
            setShowTimelog(true);
        }
    };

    const toggleProjectVisibility = (projectId: string) => {
        setExplodedProjects(xor(explodedProjects, [projectId]));
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
                        <Button intent="primary" onClick={() => handleToggleTimelog()}>
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
                                <tr>
                                    <TitleCol
                                        title={project.title}
                                        isMain
                                        isOpen={explodedProjects.includes(project.id)}
                                        onToggleVisibility={() => toggleProjectVisibility(project.id)}
                                        status={project.status}
                                    />
                                    <TimelogsCols
                                        projectId={project.id}
                                        detailed
                                        timelogs={Object.values(project.tasks).flatMap(task => task.timelogs)}
                                        onAdd={handleToggleTimelog}
                                    />
                                    <TotalColumn value={project.total} />
                                    <AddColumn onAdd={() => handleToggleTimelog(project.id)} />
                                </tr>

                                {explodedProjects.includes(project.id) &&
                                    Object.values(project.tasks).map(task => (
                                        <tr key={task.id}>
                                            <TitleCol title={task.title} status={task.status} />
                                            <TimelogsCols
                                                projectId={project.id}
                                                taskId={task.id}
                                                timelogs={task.timelogs}
                                                onAdd={handleToggleTimelog}
                                            />
                                            <TotalColumn value={task.total} />
                                            <AddColumn
                                                onAdd={() =>
                                                    handleToggleTimelog(project.id, undefined, task.id)
                                                }
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

const AddColumn = ({ onAdd }: { onAdd: () => void }) => {
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    return (
        <TableBodyCell align="right">
            <Tooltip content="Log time this week" placement="top-end">
                <Button variant="minimal" size="small" onClick={onAdd} disabled={!canLogTime}>
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
}
const TitleCol: FunctionComponent<TitleColProps> = ({
    title,
    status,
    isOpen,
    isMain,
    onToggleVisibility,
}) => {
    return (
        <TableBodyCell>
            <Row>
                <Col align="center" gap={10}>
                    {isMain ? (
                        <>
                            <Button variant="minimal" size="small" onClick={onToggleVisibility}>
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
                    {status === "approved" && (
                        <Tag minimal intent={Intent.SUCCESS}>
                            {translate("Approved")}
                        </Tag>
                    )}
                    {status === "partiallyApproved" && (
                        <Tag minimal intent={Intent.WARNING}>
                            {translate("Partial")}
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
    taskId?: string;
}
const TimelogsCols: FunctionComponent<TimelogsColsProps> = ({
    projectId,
    taskId,
    timelogs: logs,
    detailed,
    onAdd,
}) => {
    const { interval } = PersonTimesheetStore.use();
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    return (
        <>
            {interval.map((date, i) => {
                const timelogs = logs.filter(tl => isSameDay(tl.date, date));
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
                                        onAdd={() => onAdd(projectId, date, taskId)}
                                    />
                                }
                            >
                                <Tag minimal interactive intent={Intent.SUCCESS}>
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
        const daysTotals: number[] = interval.map(date => {
            return Object.values(records).reduce((acc, project) => {
                return (
                    acc +
                    Object.values(project.tasks)
                        .flatMap(task => task.timelogs)
                        .filter(timelog => isSameDay(timelog.date, date))
                        .reduce((acc, timelog) => acc + timelog.duration, 0)
                );
            }, 0);
        });

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
    onAdd: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DayPopupContent: FunctionComponent<DayPopupContent> = ({ project, task, date, detailed, onAdd }) => {
    const { timelogs } = useTimelogsInterval([date]);
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
                    return (
                        <MenuItem
                            key={timelog.id}
                            icon={<TimelogStatusIcon status={timelog.status} />}
                            text={
                                <Grid gap={0}>
                                    <Row justify="left" gutter={5}>
                                        {detailed
                                            ? stripMd(timelog.taskInfo.title)
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
                            onClick={() => handleOpenTask(timelog.task)}
                        />
                    );
                })}
                {canLogTime && (
                    <>
                        <MenuDivider />
                        <MenuItem icon={<Icon icon="plus" />} text={translate("Log time")} onClick={onAdd} />
                    </>
                )}
            </Menu>
        </Scroller>
    );
};

export const TimelogStatusIcon = ({ status }: { status: TIMELOG_STATUS }) => {
    return (
        <Tooltip content={TIMELOG_STATUS_MAP[status].label} placement="left">
            <Icon icon={TIMELOG_STATUS_MAP[status].icon} color={TIMELOG_STATUS_MAP[status].color} />
        </Tooltip>
    );
};
