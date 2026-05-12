// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { InputGroup, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import { Icon, Scroller } from "app/components/common";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { scrollIntoView } from "app/utils/dom";

// Utility functions for Date/time conversion
function dateToTimeString(date: Date, is24Hour: boolean): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    if (is24Hour) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
        const period = hours < 12 ? 'AM' : 'PM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
}

function timeStringToDate(timeString: string, baseDate: Date = new Date()): Date {
    const date = new Date(baseDate);
    
    // Handle 24-hour format
    const time24Match = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
        const [, hours, minutes] = time24Match;
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date;
    }
    
    // Handle 12-hour format
    const time12Match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (time12Match) {
        const [, hours, minutes, period] = time12Match;
        let hour24 = parseInt(hours);
        
        if (period.toUpperCase() === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        
        date.setHours(hour24, parseInt(minutes), 0, 0);
        return date;
    }
    
    return date;
}

interface TimePickerProps {
    value: Date;
    is24Hour?: boolean;
    span?: 5 | 10 | 15 | 20;
    min?: Date;
    max?: Date;
    disabled?: boolean;
    onChange: (time: Date) => void;
}

export const TimePicker: FunctionComponent<TimePickerProps> = ({
    value,
    is24Hour = false,
    span,
    min,
    max,
    disabled,
    onChange,
}) => {
    const [open, setOpen] = useState(false);
    const [time, setTime] = useState(dateToTimeString(value, is24Hour));
    const [selected, setSelected] = useState<undefined | number>();

    useEffect(() => {
        const newTimeString = dateToTimeString(value, is24Hour);
        if (newTimeString !== time) {
            setTime(newTimeString);
        }
    }, [value, is24Hour]);

    const parseTime = (event: React.ChangeEvent<HTMLInputElement>) => {
        const validTimeSlotPattern = /[^0-9:\sampm]/gi;
        let inputValue = "";
        if (event.currentTarget.value.length) {
            inputValue = event.currentTarget.value.replace(validTimeSlotPattern, "").replace("  ", " ").toUpperCase();
            setTime(inputValue);
        } else {
            setTime("");
        }

        if (inputValue && isValidTimeSlot(inputValue, Boolean(is24Hour))) {
            const dateValue = timeStringToDate(inputValue, value);
            onChange(dateValue);
        }

        setSelected(undefined);
    };

    const items = useMemo(() => {
        const minTimeString = min ? dateToTimeString(min, is24Hour) : undefined;
        const maxTimeString = max ? dateToTimeString(max, is24Hour) : undefined;
        
        const hours = generateTimeSlots(
            Boolean(is24Hour),
            span || 15,
            minTimeString || "00:00",
            maxTimeString || "23:59"
        );
        const isValid = isValidTimeSlot(time, Boolean(is24Hour));

        return hours.filter(t => {
            if (time != null && !isValid) {
                return t.toLowerCase().startsWith(time.toLowerCase());
            }

            return t;
        });
    }, [time, min, max, is24Hour, span]);

    useEffect(() => {
        if (selected == null) return;

        const timeEl = document.getElementById(`time-${selected}`);
        if (timeEl) {
            scrollIntoView(timeEl);
        }
    }, [selected, items]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (items.length) {
                if (selected == null || (selected != null && selected + 1 > items.length - 1)) {
                    setSelected(0);
                } else {
                    setSelected(selected + 1);
                }
            }
        } else if (event.key === "ArrowUp") {
            if (items.length) {
                if (selected == null || (selected != null && selected - 1 < 0)) {
                    setSelected(items.length - 1);
                } else {
                    setSelected(selected - 1);
                }
            }
        } else if (event.key === "Enter") {
            if (selected) {
                setTime(items[selected]);
                // setSelected(undefined);
                setOpen(false);
            }

            handleOnChange(selected ? items[selected] : time);
        }
    };

    const handleOnChange = (timeValue: string) => {
        if (isValidTimeSlot(timeValue, Boolean(is24Hour))) {
            const dateValue = timeStringToDate(timeValue.toUpperCase(), value);
            onChange(dateValue);
        } else {
            const defaultTime = `12:00${Boolean(is24Hour) ? "" : "PM"}`.toUpperCase();
            const dateValue = timeStringToDate(defaultTime, value);
            onChange(dateValue);
        }
    };

    const handleSetTime = (newTime: string) => {
        setTime(newTime);
        const dateValue = timeStringToDate(newTime.toUpperCase(), value);
        onChange(dateValue);
        setOpen(false);
    };

    const handleFocus = () => {
        setOpen(true);
    };

    const handleBlur = (event: React.FocusEvent) => {
        if (event.relatedTarget?.tagName === "A") {
            event.preventDefault();
            return;
        }

        const timeSlot = completeTimeSlot(time, Boolean(is24Hour));
        const dateValue = timeStringToDate(timeSlot.toUpperCase(), value);
        onChange(dateValue);
        setOpen(false);
    };

    const handleOpened = () => {
        if (value == null) return;
        const timeString = dateToTimeString(value, Boolean(is24Hour));
        const timeIndex = items.indexOf(timeString);

        setSelected(timeIndex);

        const timeEl = document.getElementById(`time-${timeIndex}`);

        if (timeEl) {
            scrollIntoView(timeEl);
        }
    };

    return (
        <Popover
            isOpen={open}
            content={
                <Scroller vertical maxHeight={300} thin>
                    <Menu style={{ minWidth: 90 }}>
                        {items.map((time, i) => (
                            <MenuItem
                                text={time}
                                key={time}
                                onClick={() => handleSetTime(time)}
                                active={i === selected}
                                intent={dateToTimeString(value, Boolean(is24Hour)) === time ? Intent.PRIMARY : Intent.NONE}
                                id={`time-${i}`}
                            />
                        ))}
                    </Menu>
                </Scroller>
            }
            onOpened={handleOpened}
            minimal
            placement="left-start"
            autoFocus={false}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ref, ...props }) => (
                <InputGroup
                    leftIcon={<Icon icon="clock" />}
                    placeholder="12:00"
                    inputRef={ref}
                    {...props}
                    value={time}
                    onChange={parseTime}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                />
            )}
        />
    );
};

export function generateTimeSlots(
    is24HourFormat: boolean,
    span: 5 | 10 | 15 | 20 | 30 = 15,
    minTime = "00:00",
    maxTime = "23:59"
): string[] {
    const timeSlots: string[] = [];

    // Parse minTime and maxTime
    const [minHour, minMinute] = minTime.split(":").map(Number);
    const [maxHour, maxMinute] = maxTime.split(":").map(Number);

    // Convert times to minutes since start of the day
    const minTotalMinutes = minHour * 60 + minMinute;
    let maxTotalMinutes = maxHour * 60 + maxMinute;

    // Ensure maxTime is greater than minTime based on the span
    if (maxTotalMinutes <= minTotalMinutes) {
        maxTotalMinutes = minTotalMinutes + span;
    }

    // Loop from minTotalMinutes to maxTotalMinutes, increasing by the span
    for (let totalMinutes = minTotalMinutes; totalMinutes <= maxTotalMinutes; totalMinutes += span) {
        const hour = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let hourFormatted: number | string = hour;
        let period = "";

        if (!is24HourFormat) {
            period = hour < 12 ? "AM" : "PM";
            hourFormatted = hour % 12;
            hourFormatted = hourFormatted === 0 ? 12 : hourFormatted;
        } else {
            hourFormatted = hour < 10 ? `0${hour}` : `${hour}`;
        }

        const minuteFormatted: string = minutes < 10 ? `0${minutes}` : `${minutes}`;
        timeSlots.push(
            is24HourFormat
                ? `${hourFormatted}:${minuteFormatted}`
                : `${hourFormatted}:${minuteFormatted} ${period}`
        );
    }

    return timeSlots;
}

function isValidTimeSlot(timeSlot: string, is24HourFormat: boolean): boolean {
    const time24HourPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const time12HourPattern = /^(0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/i;

    if (is24HourFormat) {
        return time24HourPattern.test(timeSlot);
    } else {
        return time12HourPattern.test(timeSlot);
    }
}

function completeTimeSlot(input: string, is24HourFormat: boolean): string {
    // Remove non-relevant characters first
    input = input.replace(/[^0-9:\sampm]/gi, "").trim();

    if (is24HourFormat) {
        return complete24HourTimeSlot(input);
    } else {
        return complete12HourTimeSlot(input);
    }
}

function complete24HourTimeSlot(input: string): string {
    const parts = input.split(":");
    let hour = "00";
    let minute = "00";

    if (parts.length === 2) {
        hour = parts[0].padStart(2, "0").slice(0, 2);
        minute = parts[1].padStart(2, "0").slice(0, 2);
    } else if (parts.length === 1) {
        hour = parts[0].padStart(2, "0").slice(0, 2);
    }

    if (parseInt(hour) > 23) {
        hour = "23";
    }
    if (parseInt(minute) > 59) {
        minute = "59";
    }

    return `${hour}:${minute}`;
}

function complete12HourTimeSlot(input: string): string {
    const ampmPattern = /\s*(AM|PM)\s*$/i;
    const hasAMPM = ampmPattern.test(input);
    let period = "AM";
    if (hasAMPM) {
        period = ampmPattern.exec(input)![0].trim().toUpperCase();
        input = input.replace(ampmPattern, "").trim();
    }

    const parts = input.split(":");
    let hour = "12";
    let minute = "00";

    if (parts.length === 2) {
        hour = parts[0].slice(0, 2);
        minute = parts[1].padStart(2, "0").slice(0, 2);
    } else if (parts.length === 1) {
        hour = parts[0].slice(0, 2);
    }

    if (parseInt(hour) > 12) {
        hour = "12";
    }
    if (parseInt(minute) > 59) {
        minute = "59";
    }

    return `${parseInt(hour) === 0 ? "12" : hour}:${minute} ${period}`;
}
