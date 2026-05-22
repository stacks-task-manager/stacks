// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Tag } from "@blueprintjs/core";
import { format, isToday } from "date-fns";
import React, { useMemo } from "react";
import { DateRange } from "@blueprintjs/datetime";

import { Col, Row } from "../Layout";
import { isAfterToday } from "app/utils/date";

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

export const FormattedDateRange: React.FC<FormattedDateRangeProps> = ({ range, showTime = false, onClearStart, onClearEnd }) => {
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
}