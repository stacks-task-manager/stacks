// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Tag } from "@blueprintjs/core";
import { addDays, addMonths, addWeeks, format, isToday } from "date-fns";
import React, { useMemo } from "react";
import { DateRange } from "@blueprintjs/datetime";
import { translate } from "@stacks/translations";

import { Col, Row } from "../Layout";
import { isAfterToday } from "app/utils/date";
import { IDatePickerShortcutExtra } from "./types";

/**
 * Shared single-date shortcut list used by both DatePicker and DateRangePicker
 * (Today / Tomorrow / 1 week / 2 weeks / 1 month). Pass the "now" anchor date
 * so each picker controls its own time-of-day resolution.
 */
export const getSingleDateShortcuts = (now: Date): IDatePickerShortcutExtra[] => [
    {
        title: translate("Today"),
        label: format(now, "eee"),
        date: now,
    },
    {
        title: translate("Tomorrow"),
        label: format(addDays(now, 1), "eee"),
        date: addDays(now, 1),
    },
    {
        title: translate("1 week"),
        label: format(addWeeks(now, 1), "MMM d"),
        date: addWeeks(now, 1),
    },
    {
        title: translate("2 weeks"),
        label: format(addWeeks(now, 2), "MMM d"),
        date: addWeeks(now, 2),
    },
    {
        title: translate("1 month"),
        label: format(addMonths(now, 1), "MMM d"),
        date: addMonths(now, 1),
    },
];

export interface FormattedDateTagProps {
    date: Date | string | null;
    showTime?: boolean;
    onClear?: () => void;
}

export const FormattedDateTag: React.FC<FormattedDateTagProps> = ({ date, showTime = false, onClear }) => {
    const isEmpty = date == null;
    const dateFnsFormat = showTime ? "Pp" : "P";
    return (
        <Tag intent={isEmpty ? "none" : "primary"} minimal={isEmpty} onRemove={isEmpty ? undefined : onClear}>
            {isEmpty ? "No date" : typeof date === "string" ? date : format(date, dateFnsFormat)}
        </Tag>
    );
};

export interface FormattedDateRangeProps {
    range: DateRange | null;
    showTime?: boolean;
    onClearStart?: () => void;
    onClearEnd?: () => void;
}

export const FormattedDateRange: React.FC<FormattedDateRangeProps> = ({
    range,
    showTime = false,
    onClearStart,
    onClearEnd,
}) => {
    if (range == null) {
        return <Tag minimal={true}>No range</Tag>;
    }

    const [start, end] = range;

    return (
        <Row>
            <Col align="center" vertical gap={5}>
                <div>Start date</div>
                <FormattedDateTag date={start} showTime={showTime} onClear={onClearStart} />
            </Col>
            <Col align="center" vertical gap={5}>
                <div>End date</div>
                <FormattedDateTag date={end} showTime={showTime} onClear={onClearEnd} />
            </Col>
        </Row>
    );
};

export const useDateIntent = (date: Date | null | undefined, isDone?: boolean) => {
    return useMemo(() => {
        let intent: Intent = Intent.NONE;
        if (!date) return intent;

        if (isToday(date)) {
            intent = Intent.WARNING;
        } else {
            if (!isDone) {
                if (isAfterToday(date)) {
                    intent = Intent.SUCCESS;
                } else {
                    intent = Intent.DANGER;
                }
            }
        }

        return intent;
    }, [date]);
};
