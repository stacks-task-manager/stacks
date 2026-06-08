// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Divider,
    EditableText,
    FormGroup,
    Intent,
    Menu,
    MenuItem,
    Popover,
    Switch,
} from "@blueprintjs/core";
import {
    format,
    isSameDay,
    setHours,
    setMinutes,
    getHours,
    getMinutes,
    parse,
    differenceInYears,
    isAfter,
    isSameMinute,
    addHours,
    subDays,
} from "date-fns";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Col, Grid, Icon, Row, Scroller } from "app/components/common";
import {
    use24Hours,
    useDocument,
    useTask,
    useMousetrap,
    usePerson,
    usePreferences,
    useSelectedEvent,
} from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import {
    EVENTTYPE,
    ICalendarEvent,
    ICalendarSource,
    IPerson,
    ITask,
    ITimeLogExtended,
    TAGSECTION,
} from "@stacks/types";
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { DateTimePicker } from "app/widgets/date";
import { CalendarPicker } from "../CalendarPicker/CalendarPicker";
import { formatDuration } from "app/utils/date";
import { HTMLRenderer, Tags, TagsWrapper } from "app/widgets/common";
import { PriorityChip, TaskDetailsAssignees } from "app/components/project";
import { TaskDetailsStatus } from "app/widgets/status";
import { DateInput } from "@blueprintjs/datetime";

export const CalendarEventDetails = () => {
    const selected = useSelectedEvent();

    useMousetrap("escape", () => {
        CalendarActions.unselectEvent();
    });

    useMousetrap("backspace", () => {
        CalendarActions.deleteSelectedEvent();
    });



    if (selected == null) return null;

    const [id, type] = selected;
    const isEvent = type === EVENTTYPE.EVENT;
    const isTask = type === EVENTTYPE.TASK;
    const isBirthday = type === EVENTTYPE.BIRTHDAY;
    // const isTimelog = type === EVENTTYPE.TIMELOG;

    if (isEvent) {
        return <EventDetailsGate id={id} />;
    } else if (isTask) {
        return <TaskDetails taskId={id} />;
    } else if (isBirthday) {
        return <BirthdayDetails personId={id} />;
    }

    // else if (isTimelog) {
    //     return <TimelogDetails timelog={data as ITimeLogExtended} />;
    // }

    return null;
};

const EventDetailsGate = ({ id }: { id: string }) => {
    const isNew = id.includes("-new");
    const event = CalendarStore.use(state => state.events.find(
        event => event.resource.data.id === id
    ), shallowEqual);

    if (!event) return null;

    return <EventDetails event={event.resource.data as ICalendarEvent} isNew={isNew} isAllDay={event.allDay ?? false} />;
}

interface EventDetailsProps {
    event: ICalendarEvent;
    isNew: boolean;
    isAllDay: boolean;
}
const EventDetails: FunctionComponent<EventDetailsProps> = ({ event, isNew, isAllDay }) => {
    // const calendars = CalendarStore.use(state => state.calendars, shallowEqual);
    const { dateLocale } = usePreferences(["dateLocale"]);
    const is24Hours = use24Hours();
    const titleRef = useRef<HTMLDivElement | null>(null);
    const isDisabled = false;

    const { id, title, description, location, start, end } = event;

    const startTime = start ? format(start, "p") : "";
    const endTime = end ? format(end, "p") : "";

    const isSameDayValue = start && end ? isSameDay(start, end) : false;

    useEffect(() => {
        if (isNew) {
            setTimeout(() => {
                if (titleRef.current) {
                    titleRef.current.focus();
                    titleRef.current.click();
                }
            }, 200);
        }
    }, [isNew]);

    // const eventCalendar = useMemo(() => {
    //     return calendars.find(calendar => calendar.id === calendar);
    // }, [calendar, calendars]);

    // const isDisabled = useMemo(() => eventCalendar?.readOnly ?? false, [eventCalendar]);

    const handleUpdateTitle = (title: string) => {
        CalendarActions.updateEvent(id, {
            title,
        });
    };

    const handleUpdateDescription = (description: string) => {
        CalendarActions.updateEvent(id, {
            description,
        });
    };

    const handleUpdateLocation = (location: string) => {
        CalendarActions.updateEvent(id, {
            location,
        });
    };

    const handleUpdateAllDay = () => {
        const allDay = !isAllDay;

        let newStartDate = start;
        let newEndDate = end;

        if (!isAfter(newEndDate, newStartDate) || isSameMinute(newEndDate, newStartDate)) {
            newEndDate = addHours(newStartDate, 1);
        }
        if (allDay) {
            if (isSameDay(newStartDate, newEndDate)) {
                newStartDate = setMinutes(setHours(newStartDate, 0), 0);
                newEndDate = setMinutes(setHours(newEndDate, 23), 0);
            }
        } else {
            newStartDate = setMinutes(setHours(newStartDate, 12), 0);
            newEndDate = setMinutes(setHours(subDays(newEndDate, 1), 13), 0);
        }

        CalendarActions.updateEvent(id, {
            allDay,
            start: newStartDate,
            end: newEndDate,
        });
    };

    const handleUpdateStartTime = (time: string) => {
        const timeObj = parse(time, "p", new Date());
        const startDate = start
            ? setMinutes(setHours(start, getHours(timeObj)), getMinutes(timeObj))
            : new Date();

        let newEndDate = end;
        if (!isAfter(newEndDate, startDate) || isSameMinute(newEndDate, startDate)) {
            newEndDate = addHours(startDate, 1);
        }

        CalendarActions.updateEvent(id, {
            allDay: false,
            start: startDate,
            end: newEndDate,
        });
    };

    const handleUpdateEndTime = (time: string) => {
        const timeObj = parse(time, "p", new Date());
        const endDate = end
            ? setMinutes(setHours(end, getHours(timeObj)), getMinutes(timeObj))
            : new Date();

        let newStartDate = start;
        if (!isAfter(endDate, newStartDate) || isSameMinute(endDate, newStartDate)) {
            newStartDate = addHours(endDate, -1);
        }

        CalendarActions.updateEvent(id, {
            allDay: false,
            start: newStartDate,
            end: endDate,
        });
    };

    const handleUpdateStartDate = (st: string | null, isUserChange: boolean) => {
        if (!isUserChange || !st) return;

        let startDate = parse(st, "P", new Date());
        if (!end) return;

        let endDate = end;
        if (isAllDay) {
            if (isSameDay(startDate, endDate)) {
                startDate = setHours(setMinutes(startDate, 0), 0);
                endDate = setHours(setMinutes(endDate, 0), 23);
            }
        } else {
            const hours = start ? format(start, "HH") : "00";
            const minutes = start ? format(start, "mm") : "00";
            startDate = setHours(setMinutes(startDate, Number(minutes)), Number(hours));
        }

        CalendarActions.updateEvent(id, {
            allDay: isAllDay,
            start: startDate,
        });
    };

    const handleUpdateEndDate = (en: string | null, isUserChange: boolean) => {
        if (!isUserChange || !en) return;
        if (!start) return;

        let startDate = start;
        let endDate = parse(en, "P", new Date());
        if (isAllDay) {
            if (isSameDay(endDate, startDate)) {
                startDate = setHours(setMinutes(startDate, 0), 0);
                endDate = setHours(setMinutes(endDate, 0), 23);
            }
        } else {
            const hours = end ? format(end, "HH") : "00";
            const minutes = end ? format(end, "mm") : "00";
            endDate = setHours(setMinutes(endDate, Number(minutes)), Number(hours));
        }

        CalendarActions.updateEvent(id, {
            allDay: isAllDay,
            end: endDate,
        });
    };

    const handleDeleteEvent = async () => {
        await CalendarActions.deleteEventAlert(id);
    };

    // const handleChangeCalendar = (calendarId: string, source: ICalendarSource) => {
    //     if (calendarId === calendar) return;

    //     CalendarActions.moveEvent(id, calendarId, source);
    // };

    const handleOpenEventLink = () => {
        if (event.original && event.original.htmlLink) {
            window.open(event.original.htmlLink, "_blank");
        }
    };

    return (
        <div className="filters-sidebar" style={{ minWidth: 300 }}>
            <EventHeader
                menus={
                    <MenuItem
                        text="Delete event"
                        icon={<Icon icon="trash" />}
                        intent={Intent.DANGER}
                        onClick={handleDeleteEvent}
                    />
                }
            />

            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                <Grid gap={5}>
                    <h5 className={Classes.HEADING} style={{ margin: 0 }}>
                        <EditableText
                            value={event.title as string}
                            multiline
                            onChange={handleUpdateTitle}
                            elementRef={titleRef}
                            disabled={isDisabled}
                        />
                    </h5>

                    <EventDivider />

                    <div>
                        {!isDisabled && (
                            <Switch
                                label={translate("All day")}
                                checked={event.allDay}
                                onChange={handleUpdateAllDay}
                            />
                        )}
                        {isDisabled ? (
                            <ReadOnlyDates
                                start={event.start}
                                end={event.end}
                                startAllDay={event.allDay}
                                endAllDay={event.allDay}
                            />
                        ) : (
                            <Row gutter={10}>
                                <Col>
                                    <FormGroup label="Starts">
                                        <Grid gap={10}>
                                            {!isAllDay && (
                                                <DateTimePicker
                                                    value={startTime}
                                                    is24Hour={is24Hours}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateStartTime}
                                                />
                                            )}
                                            <DateInput
                                                value={format(start, "P")}
                                                locale={dateLocale}
                                                maxDate={end ? new Date(end) : undefined}
                                                disabled={isDisabled}
                                                onChange={handleUpdateStartDate}
                                            />
                                        </Grid>
                                    </FormGroup>
                                </Col>
                                <Col align="center" justify="center" width={16}>
                                    <Icon icon="arrow-right" />
                                </Col>
                                <Col>
                                    <FormGroup label="Ends">
                                        <Grid gap={10}>
                                            {!isAllDay && (
                                                <DateTimePicker
                                                    value={endTime}
                                                    is24Hour={is24Hours}
                                                    min={isSameDayValue ? startTime : undefined}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateEndTime}
                                                />
                                            )}
                                            <DateInput
                                                value={format(end, "P")}
                                                locale={dateLocale}
                                                disabled={isDisabled}
                                                onChange={handleUpdateEndDate}
                                            />
                                        </Grid>
                                    </FormGroup>
                                </Col>
                            </Row>
                        )}

                        <EventDivider />
                        <FormGroup label="Description and notes">
                            <EditableText
                                value={description ?? ""}
                                placeholder="Add notes"
                                multiline
                                disabled={isDisabled}
                                onChange={handleUpdateDescription}
                            />
                        </FormGroup>
                        <EventDivider />
                        <FormGroup label="Location">
                            <EditableText
                                placeholder="Enter location"
                                multiline
                                value={location}
                                disabled={isDisabled}
                                onChange={handleUpdateLocation}
                            />
                        </FormGroup>
                        <EventDivider />
                        {/* <FormGroup label="Calendar">
                            <CalendarPicker
                                value={calendar}
                                disabled={isDisabled}
                                onChange={handleChangeCalendar}
                            />
                        </FormGroup> */}
                    </div>

                    {/* {source === "google" ? (
                        <>
                            <EventDivider />

                            <Row>
                                <Col justify="right">
                                    <Button
                                        intent={Intent.PRIMARY}
                                        size="small"
                                        onClick={handleOpenEventLink}
                                    >
                                        View in Google Calendar
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : null} */}
                </Grid>
            </Scroller>
        </div>
    );
};

interface TaskDetailsProps {
    taskId: string;
}
const TaskDetails: FunctionComponent<TaskDetailsProps> = ({ taskId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { task } = useTask(taskId);

    const handleOpenTask = useCallback(() => {
        navigate(`/task/${taskId}`, {
            state: { backgroundLocation: location },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    const startAllDay = useMemo(() => {
        if (!task) return true;
        const startDate = task?.startdate;
        return startDate?.allDay;
    }, [task]);

    const dueAllDay = useMemo(() => {
        if (!task) return true;
        const dueDate = task?.duedate;
        return dueDate?.allDay;
    }, [task]);

    if (!task) return null;

    return (
        <div className="filters-sidebar" style={{ minWidth: 300 }}>
            <EventHeader />

            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                <Grid gap={10}>
                    <Grid gap={5}>
                        <h5 className={Classes.HEADING} style={{ margin: 0 }}>
                            {task.title}
                        </h5>

                        <EventDivider />

                        <ReadOnlyDates
                            start={task.startdate}
                            startAllDay={startAllDay}
                            end={task.duedate}
                            endAllDay={dueAllDay}
                            startLabel="Start date"
                            endLabel="Due date"
                        />

                        <EventDivider />

                        <FormGroup label="Description">
                            {task.description.length ? (
                                <HTMLRenderer html={task.description} />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No description</span>
                            )}
                        </FormGroup>

                        <FormGroup label="Assignees">
                            {task.assignees ? (
                                <TaskDetailsAssignees
                                    assignees={task.assignees || []}
                                    large
                                    disabled
                                    taskId="none"
                                />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No assignees</span>
                            )}
                        </FormGroup>

                        <FormGroup label="Tags">
                            {task.tags ? (
                                <TagsWrapper>
                                    <Tags value={task.tags ?? []} section={TAGSECTION.PROJECTS} />
                                </TagsWrapper>
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No tags</span>
                            )}
                        </FormGroup>

                        <FormGroup label="Status">
                            {task.status ? (
                                <TaskDetailsStatus value={task.status} disabled taskId="none" />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No status</span>
                            )}
                        </FormGroup>

                        <FormGroup label="Priority">
                            {task.priority ? (
                                <PriorityChip priority={task.priority} />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No priority</span>
                            )}
                        </FormGroup>
                    </Grid>

                    <EventDivider />

                    <Row>
                        <Col justify="right">
                            <Button intent={Intent.PRIMARY} size="small" onClick={handleOpenTask}>
                                Open task details
                            </Button>
                        </Col>
                    </Row>
                </Grid>
            </Scroller>
        </div>
    );
};

interface TimelogDetailsProps {
    timelog: ITimeLogExtended;
}
const TimelogDetails: FunctionComponent<TimelogDetailsProps> = ({ timelog }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { task } = useTask(timelog.taskId);
    const { person } = usePerson(timelog.person);
    const project = useDocument(timelog.project);

    const handleOpenTask = useCallback(() => {
        navigate(`/task/${timelog.taskId}`, {
            state: { backgroundLocation: location },
        });
    }, []);

    const personName = useMemo(() => {
        return person ? `${person.firstName} ${person.lastName}` : "Unknown";
    }, [person]);

    if (!task) return null;

    return (
        <div className="filters-sidebar" style={{ minWidth: 300 }}>
            <EventHeader />

            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                <Grid gap={10}>
                    <Grid gap={5}>
                        <h5 className={Classes.HEADING} style={{ margin: 0 }}>
                            {personName}
                        </h5>

                        <EventDivider />

                        <FormGroup label={translate("Logged time")}>
                            {formatDuration(timelog.duration)}
                        </FormGroup>
                        <FormGroup label="Billed">{timelog.billed ? "Yes" : "No"}</FormGroup>
                        <FormGroup label="Billable">{timelog.billable ? "Yes" : "No"}</FormGroup>
                        <FormGroup label="Project">{project?.text}</FormGroup>

                        <EventDivider />

                        <FormGroup label="Task">{task.title}</FormGroup>

                        <EventDivider />

                        <ReadOnlyDates
                            start={task.startdate}
                            end={task.duedate}
                            startLabel="Start date"
                            endLabel="Due date"
                        />

                        <EventDivider />

                        <FormGroup label="Task description">
                            {task.description.length ? (
                                task.description
                            ) : (
                                <span className={Classes.TEXT_MUTED}>No task description</span>
                            )}
                        </FormGroup>
                    </Grid>

                    <EventDivider />

                    <Row>
                        <Col justify="right">
                            <Button intent={Intent.PRIMARY} size="small" onClick={handleOpenTask}>
                                Open task details
                            </Button>
                        </Col>
                    </Row>
                </Grid>
            </Scroller>
        </div>
    );
};

interface ReadOnlyDatesProps {
    start?: Date | null;
    startAllDay?: boolean;
    end?: Date | null;
    endAllDay?: boolean;
    startLabel?: string;
    endLabel?: string;
}

const ReadOnlyDates: FunctionComponent<ReadOnlyDatesProps> = ({
    start,
    startAllDay,
    end,
    endAllDay,
    startLabel,
    endLabel,
}) => {
    return (
        <Row gutter={10} justify="between">
            <Col>
                <FormGroup label={startLabel ?? "Starts"}>
                    <Grid gap={2}>
                        <Row align="center" gutter={5} justify="left">
                            <Icon icon="calendar" size={12} />
                            {start ? format(new Date(start), "PP") : "-"}
                        </Row>
                        <Row align="center" gutter={5} className={Classes.TEXT_MUTED} justify="left">
                            <Icon icon="clock" size={12} />
                            {start ? (
                                <>{startAllDay ? translate("All day") : format(new Date(start), "p")}</>
                            ) : (
                                "-"
                            )}
                        </Row>
                    </Grid>
                </FormGroup>
            </Col>
            <Col align="center" justify="center" width={16}>
                <Icon icon="arrow-right" />
            </Col>
            <Col>
                <FormGroup label={endLabel ?? "Ends"}>
                    <Grid gap={2}>
                        <Row align="center" gutter={5} justify="left">
                            <Icon icon="calendar" size={12} />
                            {end ? format(new Date(end), "PP") : "-"}
                        </Row>
                        <Row align="center" gutter={5} className={Classes.TEXT_MUTED} justify="left">
                            <Icon icon="clock" size={12} />
                            {end ? <>{endAllDay ? translate("All day") : format(new Date(end), "p")}</> : "-"}
                        </Row>
                    </Grid>
                </FormGroup>
            </Col>
        </Row>
    );
};

interface BirthdayDetailsProps {
    personId: string;
}
const BirthdayDetails: FunctionComponent<BirthdayDetailsProps> = ({ personId }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const { person } = usePerson(personId);

    const handleOpenPerson = useCallback(() => {
        navigate(`/person/${personId}`, {
            state: { backgroundLocation: location },
        });
    }, [navigate, location, personId]);

    if (person == null) return null;

    const name = (person.firstName + " " + person.lastName).trim();

    return (
        <div className="filters-sidebar" style={{ minWidth: 300 }}>
            <EventHeader />

            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                <Grid gap={5}>
                    <h5 className={Classes.HEADING} style={{ margin: 0 }}>
                        {`${name}'s birthday 🎂`}
                    </h5>

                    <EventDivider />

                    <div>
                        It&apos;s <strong>{person.firstName}&apos;s</strong>{" "}
                        <u>
                            {person.birthday ? differenceInYears(new Date(), new Date(person.birthday)) : 0}{" "}
                            years old
                        </u>{" "}
                        birthday
                    </div>

                    <EventDivider />

                    <FormGroup label="Birthday">
                        {person.birthday ? format(new Date(person.birthday), "PP") : "-"}
                    </FormGroup>

                    <EventDivider />

                    <Row>
                        <Col justify="right">
                            <Button intent={Intent.PRIMARY} size="small" onClick={handleOpenPerson}>
                                Open person details
                            </Button>
                        </Col>
                    </Row>
                </Grid>
            </Scroller>
        </div>
    );
};

const EventDivider = () => {
    return <Divider style={{ margin: "15px -10px" }} />;
};

interface EventHeaderProps {
    menus?: React.ReactNode;
}
const EventHeader: FunctionComponent<EventHeaderProps> = ({ menus }) => {
    return (
        <div
            style={{
                height: 50,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
            }}
        >
            {menus ? (
                <Popover
                    content={<Menu>{menus}</Menu>}
                    placement="bottom-end"
                    renderTarget={({ isOpen, ...popoverProps }) => (
                        <Button
                            small
                            minimal
                            icon={<Icon icon="dots-vertical" />}
                            active={isOpen}
                            {...popoverProps}
                        />
                    )}
                />
            ) : (
                <span />
            )}
            <Button
                size="small"
                variant="minimal"
                icon={<Icon icon="close" />}
                onClick={CalendarActions.unselectEvent}
            />
        </div>
    );
};
