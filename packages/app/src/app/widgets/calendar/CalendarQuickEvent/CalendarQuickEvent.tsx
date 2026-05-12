// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent, Popover, TextArea } from "@blueprintjs/core";
import { isSameDay, format, setHours, endOfDay, addHours, addYears, getDate } from "date-fns";
import React, { FunctionComponent, useMemo, useState } from "react";
import type { CalendarSlotInfo } from "app/utils/calendarSlot";
import { DateRange, TimePrecision } from "@blueprintjs/datetime/lib/esm/common";
import { Col, Grid, Icon, Row } from "app/components/common";
import { APPICONS, EVENTTYPE, ICalendarEvent, IEvent } from "@stacks/types";
import { CalendarStore } from "app/store/calendar";
import { LocaleDateRangePicker } from "app/widgets/common";

type CalendarQuickEventProps = {
    slot: CalendarSlotInfo;
    onCancel: () => void;
};
export const CalendarQuickEvent: FunctionComponent<CalendarQuickEventProps> = ({ slot, onCancel }) => {
    const allDay = slot.allDay ?? (slot.bounds == null && slot.box == null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [start, setStart] = useState<Date | null>(slot.slots.at(0) ?? null);
    const [end, setEnd] = useState<Date | null>(slot.slots.at(-1) ?? null);

    const sameDay = useMemo(() => {
        return start && end ? isSameDay(start, end) : false;
    }, [start, end]);

    const dateLabel = useMemo(() => {
        if (start == null) return "-";

        const startDate = new Date(start);
        const endDate = end ? new Date(end) : startDate;

        if (slot.slots.length > 1) {
            if (sameDay) {
                return `${format(startDate, "P")} ${format(startDate, "p")
                    .toLowerCase()
                    .replace(/ /g, "")} to  ${format(endDate, "p").toLowerCase().replace(/ /g, "")}`;
            }

            return `${start ? format(start, "P") : ""} to ${end ? format(end, "P") : ""}`;
        }
        return start ? format(start, "PPPp") : "";
    }, [start, end, sameDay]);

    const canSave = useMemo(() => {
        return title.trim().length > 0 && start != null;
    }, [title, description, start]);

    return (
        <div style={{ width: 300, padding: 10 }}>
            <Grid>
                <Row gutter={10}>
                    <Col collapse align="center">
                        <Icon icon="type-01" />
                    </Col>
                    <Col fill align="center">
                        <InputGroup
                            placeholder="Event title"
                            autoFocus
                            large
                            fill
                            value={title}
                            onChange={e => setTitle(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </Col>
                </Row>

                <Row gutter={10}>
                    <Col collapse align="center">
                        <Icon icon="menu-03" />
                    </Col>
                    <Col fill align="center">
                        <TextArea
                            placeholder="Add notes, links or a location"
                            fill
                            value={description}
                            onChange={e => setDescription(e.currentTarget.value)}
                        />
                    </Col>
                </Row>

                <Row gutter={10}>
                    <Col collapse align="center">
                        <Icon icon={APPICONS.CALENDAR} />
                    </Col>
                    <Col fill align="center">
                        <Popover
                            content={
                                <LocaleDateRangePicker
                                    value={[start, end]}
                                    maxDate={addYears(new Date(), 5)}
                                    allowSingleDayRange
                                    shortcuts={false}
                                    singleMonthOnly={sameDay}
                                    timePrecision={allDay ? undefined : TimePrecision.MINUTE}
                                    timePickerProps={{
                                        useAmPm: new Intl.DateTimeFormat('en', { hour: 'numeric' }).formatToParts(new Date()).find(part => part.type === 'dayPeriod') !== undefined,
                                    }}
                                    onChange={handleChangeDates}
                                />
                            }
                            minimal
                            placement="bottom"
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            renderTarget={({ isOpen, ref, ...props }) => (
                                <Button
                                    {...props}
                                    ref={ref}
                                    variant="minimal"
                                     size="small"
                                    rightIcon={<Icon icon="chevron-down" />}
                                >
                                    {dateLabel}
                                </Button>
                            )}
                        />
                    </Col>
                </Row>

                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button size="small" variant="minimal" onClick={onCancel}>
                        {translate("Cancel")}
                    </Button>
                    <Button size="small" intent={Intent.PRIMARY} disabled={!canSave} onClick={handleSaveEvent}>
                        {translate("Save")}
                    </Button>
                </div>
            </Grid>
        </div>
    );

    function handleSaveEvent() {
        if (start == null) return;

        const eventPayload: ICalendarEvent = {
            title,
            description,
        } as unknown as ICalendarEvent;

        const newEvent: IEvent = {
            title,
            resource: {
                data: eventPayload,
                type: EVENTTYPE.EVENT,
            },
        };

        const { view } = CalendarStore.get();

        const startDate = new Date(start);
        const endDate = end ? new Date(end) : startDate;

        if (view === "month" || getDate(startDate) !== getDate(endDate)) {
            newEvent.start = setHours(startDate, 12);
            newEvent.end = endOfDay(endDate);
            newEvent.allDay = true;
            eventPayload.start = newEvent.start;
            eventPayload.end = newEvent.end;
            eventPayload.allDay = newEvent.allDay;
        } else {
            newEvent.start = start;
            newEvent.end = end != null ? end : addHours(startDate, 1);
            newEvent.allDay = false;
            eventPayload.start = start;
            eventPayload.end = end ?? start;
            eventPayload.allDay = newEvent.allDay;
        }

        // CalendarActions.saveEvent(newEvent as IEvent);

        onCancel();
    }

    function handleChangeDates(selectedDates: DateRange) {
        setStart(selectedDates.at(0) ?? null);
        setEnd(selectedDates.at(1) ?? null);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter" && canSave) {
            handleSaveEvent();
        } else if (event.key === "Escape") {
            onCancel();
        }
    }
};
