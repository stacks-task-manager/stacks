// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Divider,
    EditableText,
    FormGroup,
    HTMLSelect,
    Intent,
    Menu,
    MenuItem,
    NumericInput,
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
    parseISO,
    isValid,
} from "date-fns";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Col, Grid, Icon, Row, Scroller } from "app/components/common";
import {
    use24Hours,
    useCalendars,
    useDocument,
    useTask,
    useMousetrap,
    usePerson,
    usePreferences,
    useSelectedEvent,
} from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { EVENTTYPE, ICalendarEvent, ICalendarSource, ITimeLogExtended, TAGSECTION } from "@stacks/types";
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { DateTimePicker } from "app/widgets/date";
import { CalendarPicker } from "../CalendarPicker/CalendarPicker";
import { formatDuration } from "app/utils/date";
import { HTMLRenderer, Tags, TagsWrapper } from "app/widgets/common";
import { PriorityChip, TaskDetailsAssignees } from "app/components/project";
import { TaskDetailsStatus } from "app/widgets/status";
import { DateInput } from "@blueprintjs/datetime";

type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";
type RecurrenceEndMode = "never" | "until" | "count";

interface RecurrenceState {
    frequency: RecurrenceFrequency;
    interval: number;
    endMode: RecurrenceEndMode;
    until: string | null;
    count: number;
}

const FREQUENCY_TO_RRULE: Record<Exclude<RecurrenceFrequency, "none">, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY",
};

const RRULE_TO_FREQUENCY: Record<string, Exclude<RecurrenceFrequency, "none">> = {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
};

function parseRecurrenceRule(rule?: string | null): RecurrenceState {
    if (!rule) {
        return {
            frequency: "none",
            interval: 1,
            endMode: "never",
            until: null,
            count: 10,
        };
    }

    const parts = rule.replace(/^RRULE:/, "").split(";");
    const values = new Map(
        parts.map(part => {
            const [key, value] = part.split("=");
            return [key, value];
        })
    );
    const frequency = RRULE_TO_FREQUENCY[values.get("FREQ") ?? ""] ?? "none";
    const until = values.get("UNTIL");

    return {
        frequency,
        interval: Math.max(1, Number(values.get("INTERVAL") ?? "1") || 1),
        endMode: values.has("COUNT") ? "count" : until ? "until" : "never",
        until: until ? `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}` : null,
        count: Math.max(1, Number(values.get("COUNT") ?? "10") || 10),
    };
}

function formatUntilDate(date: string | null): string | null {
    if (!date) return null;
    const parsed = new Date(`${date}T23:59:59Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

function parseCalendarDateInput(value: string): Date {
    const isoDate = parseISO(value);
    if (isValid(isoDate)) {
        return isoDate;
    }

    return parse(value, "P", new Date());
}

function buildRecurrenceRule(state: RecurrenceState): string | null {
    if (state.frequency === "none") return null;

    const parts = [`FREQ=${FREQUENCY_TO_RRULE[state.frequency]}`];
    if (state.interval > 1) {
        parts.push(`INTERVAL=${state.interval}`);
    }
    if (state.endMode === "until") {
        const until = formatUntilDate(state.until);
        if (until) {
            parts.push(`UNTIL=${until}`);
        }
    }
    if (state.endMode === "count") {
        parts.push(`COUNT=${state.count}`);
    }

    return `RRULE:${parts.join(";")}`;
}

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
    const eventId = isNew ? id.replace("-new", "") : id;
    const event = CalendarStore.use(
        state => state.events.find(event => event.resource.data.id === eventId),
        shallowEqual
    );

    if (!event) return null;

    const data = event.resource.data as ICalendarEvent;

    return (
        <EventDetails
            event={{
                ...data,
                start: event.start ?? data.start,
                end: event.end ?? data.end,
                allDay: event.allDay ?? data.allDay,
            }}
            isNew={isNew}
            isAllDay={event.allDay ?? false}
        />
    );
};

interface EventDetailsProps {
    event: ICalendarEvent;
    isNew: boolean;
    isAllDay: boolean;
}
const EventDetails: FunctionComponent<EventDetailsProps> = ({ event, isNew, isAllDay }) => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    const is24Hours = use24Hours();
    const titleRef = useRef<HTMLDivElement | null>(null);
    const { calendars, isGoogleAuthenticated, loadCalendars } = useCalendars();

    const { id, description, location, start, end, source, calendar } = event;

    const isDisabled = useMemo(() => {
        if (source === "local") return false;
        const cal = calendars.find(c => c.id === calendar);
        return cal?.readOnly ?? false;
    }, [source, calendar, calendars]);

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

    useEffect(() => {
        if (!isGoogleAuthenticated) return;
        if (calendars.some(c => c.source === "google")) return;
        loadCalendars();
    }, [isGoogleAuthenticated, calendars, loadCalendars]);

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
        const endDate = end ? setMinutes(setHours(end, getHours(timeObj)), getMinutes(timeObj)) : new Date();

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

        let startDate = parseCalendarDateInput(st);
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
        let endDate = parseCalendarDateInput(en);
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

    const handleChangeCalendar = (calendarId: string, newSource: ICalendarSource) => {
        if (source === newSource && calendar === calendarId) return;
        void CalendarActions.moveEvent(event, calendarId, newSource);
    };

    const handleOpenEventLink = () => {
        if (event.original && event.original.htmlLink) {
            window.open(event.original.htmlLink, "_blank");
        }
    };

    const recurrence = parseRecurrenceRule(event.recurrenceRule);
    const handleChangeRecurrence = (updates: Partial<RecurrenceState>) => {
        const defaultUntil = end ? format(end, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
        const next = {
            ...recurrence,
            ...updates,
        };
        if (next.endMode === "until" && !next.until) {
            next.until = defaultUntil;
        }
        CalendarActions.updateEvent(id, {
            recurrenceRule: buildRecurrenceRule(next),
            recurrenceExDates: [],
        });
    };

    return (
        <div className="filters-sidebar" style={{ minWidth: 300 }} data-testid="calendar-event-details">
            <EventHeader
                menus={
                    <MenuItem
                        text={translate("Delete event")}
                        icon={<Icon icon="trash" />}
                        intent={Intent.DANGER}
                        onClick={handleDeleteEvent}
                        data-testid="calendar-event-delete-menu-item"
                    />
                }
            />

            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                <Grid gap={5}>
                    <h5 className={Classes.HEADING} style={{ margin: 0 }}>
                        <div data-testid="calendar-event-title">
                            <EditableText
                                value={event.title as string}
                                multiline
                                onChange={handleUpdateTitle}
                                elementRef={titleRef}
                                disabled={isDisabled}
                            />
                        </div>
                    </h5>

                    <EventDivider />

                    <div>
                        {!isDisabled && (
                            <Switch
                                label={translate("All day")}
                                checked={event.allDay}
                                onChange={handleUpdateAllDay}
                                data-testid="calendar-event-all-day"
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
                                    <FormGroup label={translate("Starts")}>
                                        <Grid gap={10}>
                                            {!isAllDay && (
                                                <DateTimePicker
                                                    value={startTime}
                                                    is24Hour={is24Hours}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateStartTime}
                                                    data-testid="calendar-event-start-time"
                                                />
                                            )}
                                            <div data-testid="calendar-event-start-date">
                                                <DateInput
                                                    value={format(start, "yyyy-MM-dd")}
                                                    dateFnsFormat="P"
                                                    locale={dateLocale}
                                                    maxDate={end ? new Date(end) : undefined}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateStartDate}
                                                />
                                            </div>
                                        </Grid>
                                    </FormGroup>
                                </Col>
                                <Col align="center" justify="center" width={16}>
                                    <Icon icon="arrow-right" />
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Ends")}>
                                        <Grid gap={10}>
                                            {!isAllDay && (
                                                <DateTimePicker
                                                    value={endTime}
                                                    is24Hour={is24Hours}
                                                    min={isSameDayValue ? startTime : undefined}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateEndTime}
                                                    data-testid="calendar-event-end-time"
                                                />
                                            )}
                                            <div data-testid="calendar-event-end-date">
                                                <DateInput
                                                    value={format(end, "yyyy-MM-dd")}
                                                    dateFnsFormat="P"
                                                    locale={dateLocale}
                                                    disabled={isDisabled}
                                                    onChange={handleUpdateEndDate}
                                                />
                                            </div>
                                        </Grid>
                                    </FormGroup>
                                </Col>
                            </Row>
                        )}

                        <EventDivider />
                        <FormGroup label={translate("Repeats")}>
                            <Grid gap={8}>
                                <HTMLSelect
                                    fill
                                    value={recurrence.frequency}
                                    disabled={isDisabled}
                                    onChange={event =>
                                        handleChangeRecurrence({
                                            frequency: event.currentTarget.value as RecurrenceFrequency,
                                        })
                                    }
                                >
                                    <option value="none">{translate("Does not repeat")}</option>
                                    <option value="daily">{translate("Daily")}</option>
                                    <option value="weekly">{translate("Weekly")}</option>
                                    <option value="monthly">{translate("Monthly")}</option>
                                    <option value="yearly">{translate("Yearly")}</option>
                                </HTMLSelect>
                                {recurrence.frequency !== "none" ? (
                                    <>
                                        <FormGroup label={translate("Every")}>
                                            <NumericInput
                                                fill
                                                min={1}
                                                max={999}
                                                value={recurrence.interval}
                                                disabled={isDisabled}
                                                onValueChange={value =>
                                                    handleChangeRecurrence({
                                                        interval: Math.max(1, value || 1),
                                                    })
                                                }
                                            />
                                        </FormGroup>
                                        <HTMLSelect
                                            fill
                                            value={recurrence.endMode}
                                            disabled={isDisabled}
                                            onChange={event =>
                                                handleChangeRecurrence({
                                                    endMode: event.currentTarget.value as RecurrenceEndMode,
                                                })
                                            }
                                        >
                                            <option value="never">{translate("Never ends")}</option>
                                            <option value="until">{translate("Ends on date")}</option>
                                            <option value="count">
                                                {translate("Ends after occurrences")}
                                            </option>
                                        </HTMLSelect>
                                        {recurrence.endMode === "until" ? (
                                            <input
                                                type="date"
                                                className={Classes.INPUT}
                                                value={recurrence.until ?? ""}
                                                disabled={isDisabled}
                                                onChange={event =>
                                                    handleChangeRecurrence({
                                                        until: event.currentTarget.value,
                                                    })
                                                }
                                            />
                                        ) : null}
                                        {recurrence.endMode === "count" ? (
                                            <NumericInput
                                                fill
                                                min={1}
                                                max={999}
                                                value={recurrence.count}
                                                disabled={isDisabled}
                                                onValueChange={value =>
                                                    handleChangeRecurrence({ count: Math.max(1, value || 1) })
                                                }
                                            />
                                        ) : null}
                                    </>
                                ) : null}
                            </Grid>
                        </FormGroup>
                        <EventDivider />
                        <FormGroup label={translate("Description and notes")}>
                            <div data-testid="calendar-event-description">
                                <EditableText
                                    value={description ?? ""}
                                    placeholder={translate("Add notes")}
                                    multiline
                                    disabled={isDisabled}
                                    onChange={handleUpdateDescription}
                                />
                            </div>
                        </FormGroup>
                        <EventDivider />
                        <FormGroup label={translate("Location")}>
                            <div data-testid="calendar-event-location">
                                <EditableText
                                    placeholder={translate("Enter location")}
                                    multiline
                                    value={location}
                                    disabled={isDisabled}
                                    onChange={handleUpdateLocation}
                                />
                            </div>
                        </FormGroup>
                        <EventDivider />
                        <FormGroup label={translate("Calendar")}>
                            <div data-testid="calendar-event-calendar-picker">
                                <CalendarPicker
                                    value={calendar}
                                    allowedSources={[source]}
                                    disabled={isDisabled}
                                    onChange={handleChangeCalendar}
                                />
                            </div>
                        </FormGroup>
                    </div>

                    {source === "google" && event.original?.htmlLink ? (
                        <>
                            <EventDivider />

                            <Row>
                                <Col justify="right">
                                    <Button
                                        intent={Intent.PRIMARY}
                                        size="small"
                                        onClick={handleOpenEventLink}
                                    >
                                        {translate("View in Google Calendar")}
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : null}
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
                            startLabel={translate("Start date")}
                            endLabel={translate("Due date")}
                        />

                        <EventDivider />

                        <FormGroup label={translate("Description")}>
                            {task.description.length ? (
                                <HTMLRenderer html={task.description} />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>{translate("No description")}</span>
                            )}
                        </FormGroup>

                        <FormGroup label={translate("Assignees")}>
                            {task.assignees ? (
                                <TaskDetailsAssignees
                                    assignees={task.assignees || []}
                                    large
                                    disabled
                                    taskId="none"
                                />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>{translate("No assignees")}</span>
                            )}
                        </FormGroup>

                        <FormGroup label={translate("Tags")}>
                            {task.tags ? (
                                <TagsWrapper>
                                    <Tags value={task.tags ?? []} section={TAGSECTION.PROJECTS} />
                                </TagsWrapper>
                            ) : (
                                <span className={Classes.TEXT_MUTED}>{translate("No tags")}</span>
                            )}
                        </FormGroup>

                        <FormGroup label={translate("Status")}>
                            {task.status ? (
                                <TaskDetailsStatus value={task.status} disabled taskId="none" />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>{translate("No status")}</span>
                            )}
                        </FormGroup>

                        <FormGroup label={translate("Priority")}>
                            {task.priority ? (
                                <PriorityChip priority={task.priority} />
                            ) : (
                                <span className={Classes.TEXT_MUTED}>{translate("No priority")}</span>
                            )}
                        </FormGroup>
                    </Grid>

                    <EventDivider />

                    <Row>
                        <Col justify="right">
                            <Button intent={Intent.PRIMARY} size="small" onClick={handleOpenTask}>
                                {translate("Open task details")}
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
                <FormGroup label={startLabel ?? translate("Starts")}>
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
                <FormGroup label={endLabel ?? translate("Ends")}>
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
                            data-testid="calendar-event-menu-button"
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
                data-testid="calendar-event-details-close"
            />
        </div>
    );
};
