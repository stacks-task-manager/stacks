// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { format, isSameYear, isToday, isTomorrow, isYesterday } from "date-fns";
import React, { FunctionComponent, useMemo } from "react";
interface IDateLabelProps {
    date?: Date;
    long?: boolean;
    full?: boolean;
    weekday?: boolean;
    proximity?: boolean;
}
export const DateLabel: FunctionComponent<IDateLabelProps> = ({ date, long, full, weekday, proximity }) => {
    const dateString = useMemo(() => {
        if (!date) return "";

        let dateFormat = "";

        if (long) {
            dateFormat = "d MMMM";
        } else {
            dateFormat = "d MMM";
        }

        if (!isSameYear(date, new Date())) {
            dateFormat += ", yyyy";
        }

        if (weekday) {
            dateFormat = `${long ? "EEEE" : "EEE"} ${dateFormat}`;
        }

        if (proximity) {
            if (isToday(date)) {
                return translate("Today");
            } else if (isTomorrow(date)) {
                return translate("Tomorrow");
            } else if (isYesterday(date)) {
                return translate("Yesterday");
            }
        }

        if (full) {
            dateFormat = "PPPP";
        }

        return format(date, dateFormat);
    }, [date, long, weekday, proximity]);

    if (!date) return null;

    return <>{dateString}</>;
};
