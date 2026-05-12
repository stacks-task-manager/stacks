// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common";
import { usePreferences } from "app/hooks";
import { DATES_LABELS } from "app/locale/dynamic-messages";
import { formatDate } from "app/utils/date";
import { isThisYear } from "date-fns";
import React, { FunctionComponent } from "react";

interface IDateMenuProps {
    date?: string;
    onChange: (date?: string) => void;
}
export const DateMenu: FunctionComponent<IDateMenuProps> = ({ date, onChange }) => {
    const { dateLocale } = usePreferences(["dateLocale"]);

    return (
        <Menu>
            <MenuItem
                text={translate("Clear")}
                onClick={() => onChange()}
                icon={<Icon icon="calendar" />}
                labelElement={<Icon icon={!date ? "check" : undefined} />}
            />
            <MenuDivider />
            <MenuItem
                text={translate("Today")}
                onClick={() => onChange("today")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "today" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Yesterday")}
                onClick={() => onChange("yesterday")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "yesterday" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Tomorrow")}
                onClick={() => onChange("tomorrow")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "tomorrow" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("This week")}
                onClick={() => onChange("thisWeek")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "thisWeek" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Last week")}
                onClick={() => onChange("lastWeek")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "lastWeek" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Next week")}
                onClick={() => onChange("nextWeek")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "nextWeek" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("This month")}
                onClick={() => onChange("thisMonth")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "thisMonth" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Last month")}
                onClick={() => onChange("lastMonth")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "lastMonth" ? "check" : undefined} />}
            />
            <MenuItem
                text={translate("Next month")}
                onClick={() => onChange("nextMonth")}
                icon={<Icon icon="calendar-date" />}
                labelElement={<Icon icon={date === "nextMonth" ? "check" : undefined} />}
            />
            <MenuDivider />
            <MenuItem text="Custom" icon={<Icon icon="calendar-check-01" />}>
                <DateRangePicker
                    shortcuts={false}
                    locale={dateLocale}
                    onChange={(selectedDates: DateRange) =>
                        onChange(
                            `${selectedDates[0] ? selectedDates[0].toJSON() : ""}|${
                                selectedDates[1] ? selectedDates[1].toJSON() : ""
                            }`
                        )
                    }
                />
            </MenuItem>
        </Menu>
    );
};

export const formatDates = (date: string) => {
    if (
        [
            "today",
            "yesterday",
            "tomorrow",
            "thisWeek",
            "lastWeek",
            "nextWeek",
            "thisMonth",
            "lastMonth",
            "nextMonth",
        ].includes(date)
    ) {
        return DATES_LABELS[date as keyof typeof DATES_LABELS];
    }

    const dates = date.split("|");
    const datesFormats: string[] = [];

    if (dates[0]) {
        if (isThisYear(new Date(dates[0]))) {
            datesFormats.push(formatDate(dates[0], "d MMM"));
        } else {
            datesFormats.push(formatDate(dates[0], "d MMM, yyyy"));
        }
    }

    if (dates[1]) {
        if (isThisYear(new Date(dates[1]))) {
            datesFormats.push(formatDate(dates[1], "d MMM"));
        } else {
            datesFormats.push(formatDate(dates[1], "d MMM, yyyy"));
        }
    }

    return datesFormats.join(" - ");
};
