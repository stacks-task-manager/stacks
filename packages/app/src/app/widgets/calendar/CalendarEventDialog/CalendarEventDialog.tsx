// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Switch, TextArea } from "@blueprintjs/core";
import { DateInput } from "@blueprintjs/datetime";
import { format, parse, isAfter, addDays, addHours, addYears } from "date-fns";
import React, { FunctionComponent, useCallback, useMemo, useState } from "react";
import { Col, Icon, Row } from "app/components/common";
import { usePreferences } from "app/hooks";
import { ICalendarEvent, IEvent } from "@stacks/types";

interface CalendarEventDialogProps {
    value: IEvent;
    onSave: (event: IEvent) => void;
    onClose: () => void;
    onDelete: () => void;
}
export const CalendarEventDialog: FunctionComponent<CalendarEventDialogProps> = ({
    value,
    onSave,
    onClose,
    onDelete,
}) => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    const [event, setEvent] = useState<IEvent>(value);
    const [open, setOpen] = useState(true);

    const handleFocus = useCallback((titleRef: HTMLInputElement | null) => {
        if (titleRef) titleRef.focus();
    }, []);

    const canSave = useMemo(() => {
        return (
            (event.resource.data as ICalendarEvent).title.trim().length > 0 &&
            (event.resource.data as ICalendarEvent).start != null &&
            (event.resource.data as ICalendarEvent).end != null
        );
    }, [event]);

    const dateFormat = useMemo(() => {
        if (event.allDay) return "L";
        return "L LT";
    }, [event.allDay]);

    const handleClose = () => {
        setOpen(false);
    };

    const formatDate = (date: Date) => {
        return format(date, dateFormat);
    };

    const parseDate = (str: string) => {
        return parse(str, dateFormat, new Date());
    };

    const handleSave = () => {
        onSave(event);
        handleClose();
    };

    const handleDelete = () => {
        onDelete();
        handleClose();
    };

    const handleSetTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const data: ICalendarEvent = {
            ...(event.resource.data as ICalendarEvent),
            title: e.currentTarget.value,
        };

        setEvent({
            ...event,
            title: e.currentTarget.value,
            resource: {
                data,
                type: event.resource.type,
            },
        });
    };

    const handleSetStartDate = (date: string | null, isUserChange: boolean) => {
        if (!isUserChange) return;

        const newEvent = {
            ...event,
            start: date ? new Date(date) : new Date(),
            resource: {
                data: {
                    ...event.resource.data,
                    start: date ? new Date(date) : new Date(),
                },
                type: event.resource.type,
            },
        };

        if (newEvent.start && newEvent.end && isAfter(new Date(newEvent.start), new Date(newEvent.end))) {
            if (newEvent.allDay) {
                newEvent.end = addDays(new Date(newEvent.start), 1);
            } else {
                newEvent.end = addHours(new Date(newEvent.start), 1);
            }
        }

        setEvent(newEvent);
    };

    const handleSetEndDate = (date: string | null, isUserChange: boolean) => {
        if (!isUserChange) return;

        const data: ICalendarEvent = {
            ...(event.resource.data as ICalendarEvent),
            end: date ? new Date(date) : new Date(),
        };

        setEvent({
            ...event,
            end: date ? new Date(date) : new Date(),
            resource: {
                data,
                type: event.resource.type,
            },
        });
    };

    // const handleSetDates = (dates: DateRange) => {
    //     setEvent({
    //         ...event,
    //         start: dates[0] || new Date(),
    //         end: dates[1] || new Date(),
    //         resource: {
    //             data: {
    //                 ...event.resource.data,
    //                 start: (dates[0] || new Date()).toJSON(),
    //                 end: (dates[1] || new Date()).toJSON(),
    //             },
    //             type: event.resource.type,
    //         },
    //     });
    // };

    const handleSetDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const data: ICalendarEvent = {
            ...(event.resource.data as ICalendarEvent),
            description: e.currentTarget.value,
        };

        setEvent({
            ...event,
            resource: {
                data,
                type: event.resource.type,
            },
        });
    };

    const handleSetAllDay = (e: React.ChangeEvent<HTMLInputElement>) => {
        const data: ICalendarEvent = {
            ...(event.resource.data as ICalendarEvent),
            allDay: e.currentTarget.checked,
        };

        setEvent({
            ...event,
            allDay: e.currentTarget.checked,
            resource: {
                data,
                type: event.resource.type,
            },
        });
    };

    return (
        <Dialog isOpen={open} onClose={handleClose} onClosed={onClose} lazy>
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label="Event title">
                    <InputGroup
                        defaultValue={event.title as string}
                        placeholder="New event"
                        large
                        onChange={handleSetTitle}
                        inputRef={handleFocus}
                        autoFocus
                    />
                </FormGroup>

                <Row gutter={15}>
                    <Col>
                        <FormGroup label="Start date" style={{ width: "100%" }}>
                            <DateInput
                                fill
                                value={event.start ? event.start.toJSON() : undefined}
                                highlightCurrentDay
                                formatDate={formatDate}
                                parseDate={parseDate}
                                shortcuts={false}
                                maxDate={addYears(new Date(), 5)}
                                closeOnSelection
                                showTimezoneSelect={false}
                                locale={dateLocale}
                                timePickerProps={
                                    event.allDay
                                        ? undefined
                                        : {
                                              useAmPm:
                                                  new Intl.DateTimeFormat("en", { hour: "numeric" })
                                                      .formatToParts(new Date())
                                                      .find(part => part.type === "dayPeriod") !== undefined,
                                          }
                                }
                                onChange={handleSetStartDate}
                            />
                        </FormGroup>
                    </Col>
                    <Col>
                        <FormGroup label="End date" style={{ width: "100%" }}>
                            <DateInput
                                fill
                                value={event.end ? event.end.toJSON() : undefined}
                                highlightCurrentDay
                                formatDate={formatDate}
                                parseDate={parseDate}
                                shortcuts={false}
                                minDate={event.start ?? undefined}
                                maxDate={addYears(new Date(), 5)}
                                closeOnSelection
                                showTimezoneSelect={false}
                                locale={dateLocale}
                                timePickerProps={
                                    event.allDay
                                        ? undefined
                                        : {
                                              useAmPm:
                                                  new Intl.DateTimeFormat("en", { hour: "numeric" })
                                                      .formatToParts(new Date())
                                                      .find(part => part.type === "dayPeriod") !== undefined,
                                          }
                                }
                                onChange={handleSetEndDate}
                            />
                        </FormGroup>
                    </Col>
                </Row>

                <FormGroup label="Description">
                    <TextArea
                        fill
                        rows={3}
                        defaultValue={(event.resource.data as ICalendarEvent).description}
                        onChange={handleSetDescription}
                    />
                </FormGroup>

                <Switch
                    label={translate("All day event")}
                    checked={event.allDay}
                    onChange={handleSetAllDay}
                />
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS} style={{ justifyContent: "space-between" }}>
                    {!event.resource.data.id && <span />}
                    {event.resource.data.id && (
                        <Button
                            variant="minimal"
                            intent={Intent.DANGER}
                            style={{ margin: 0 }}
                            icon={<Icon icon="trash" />}
                            onClick={handleDelete}
                        >
                            {translate("Delete event")}
                        </Button>
                    )}
                    <span>
                        <Button variant="minimal" onClick={handleClose}>
                            {translate("Cancel")}
                        </Button>
                        <Button intent={Intent.PRIMARY} onClick={handleSave} disabled={!canSave}>
                            {translate("Save")}
                        </Button>
                    </span>
                </div>
            </div>
        </Dialog>
    );
};
