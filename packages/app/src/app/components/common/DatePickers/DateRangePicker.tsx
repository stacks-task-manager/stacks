// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Divider, Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import {
    DateRangePicker as BlueprintDateRangePicker,
    DateRange,
    TimePicker
} from '@blueprintjs/datetime';
import { addDays, addMonths, addWeeks, endOfDay, endOfMonth, endOfWeek, format, setHours, setMinutes, startOfMonth, startOfWeek } from "date-fns";
import React, { FunctionComponent, useMemo, useState } from "react";
import { usePreferences } from "app/hooks";
import { isAmPm } from "app/utils/date";
import { Col, Grid, Row } from "../Layout";
import { CommonButtonProps, IDatePickerRangeShortcutExtra, IDatePickerShortcutExtra } from "./types";
import { FormattedDateRange, useDateIntent } from "./utils";
import { DateChip } from "../DateChip/DateChip";

export interface DateRangePickerProps {
    start: Date | null;
    end: Date | null;
    onChange: (start: Date | null, end: Date | null) => void;
    enableTimePicker?: boolean;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const DateRangeComponent: FunctionComponent<DateRangePickerProps> = ({
    start,
    end,
    onChange,
    enableTimePicker = true,
}) => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    const [value, setValue] = useState<DateRange>([start ?? null, end ?? null]);
    const useAmPm = isAmPm();

    const shortcuts: IDatePickerShortcutExtra[] = useMemo(() => {
        const now = new Date();
        const shorcutsList = [
            {
                title: translate("Today"),
                label: format(now, "eee"),
                date: endOfDay(now),
            },
            {
                title: translate("Tomorrow"),
                label: format(addDays(now, 1), "eee"),
                date: addDays(endOfDay(now), 1),
            },
            {
                title: translate("1 week"),
                label: format(addWeeks(now, 1), "MMM d"),
                date: addWeeks(endOfDay(now), 1),
            },
            {
                title: translate("2 weeks"),
                label: format(addWeeks(now, 2), "MMM d"),
                date: addWeeks(endOfDay(now), 2),
            },
            {
                title: translate("1 month"),
                label: format(addMonths(now, 1), "MMM d"),
                date: addMonths(endOfDay(now), 1),
            },
        ];
        return shorcutsList;
    }, []);

    const shortcutsRange: IDatePickerRangeShortcutExtra[] = useMemo(() => {
        const now = new Date()
        const resetTime = (date: Date) => setHours(setMinutes(date, 0), 12);

        return [
            {
                title: translate("This week"),
                label: `${format(startOfWeek(now), "d")} - ${format(endOfWeek(now), "d MMM")}`,
                dateRange: [
                    resetTime(startOfWeek(now)),
                    resetTime(endOfWeek(now)),
                ],
            },
            {
                title: translate("Next week"),
                label: `${format(startOfWeek(addWeeks(now, 1)), "d")} - ${format(endOfWeek(addWeeks(now, 1)), "d MMM")}`,
                dateRange: [
                    resetTime(startOfWeek(addWeeks(now, 1))),
                    resetTime(endOfWeek(addWeeks(now, 1))),
                ],
            },
            {
                title: translate("This month"),
                label: `${format(startOfMonth(now), "d")} - ${format(endOfMonth(now), "d MMM")}`,
                dateRange: [
                    resetTime(startOfMonth(now)),
                    resetTime(endOfMonth(now)),
                ],
            },
            {
                title: translate("Next month"),
                label: `${format(startOfMonth(addMonths(now, 1)), "d")} - ${format(endOfMonth(addMonths(now, 1)), "d MMM")}`,
                dateRange: [
                    resetTime(startOfMonth(addMonths(now, 1))),
                    resetTime(endOfMonth(addMonths(now, 1))),
                ],
            },
        ];
    }, []);

    const handleShortcutRangeSelection = (range: DateRange) => {
        setValue(range);
    }

    const handleShortcutSingleSelection = (date: Date) => {
        setValue([null, date]);
    }

    const handleApply = () => {
        onChange(value[0], value[1]);
    };

    return (
        <Row data-testid="date-range-picker">
            <Col unshrinkable width="auto">
                <Menu data-testid="date-range-picker-menu">
                    <MenuDivider title={translate("Single date")} />
                    {shortcuts.map((shortcut: IDatePickerShortcutExtra, index: number) => {
                        return (
                            <MenuItem
                                key={index}
                                text={shortcut.title}
                                label={shortcut.label}
                                labelClassName={Classes.TEXT_SMALL}
                                shouldDismissPopover={false}
                                onClick={() => handleShortcutSingleSelection(shortcut.date)}
                            />
                        );
                    })}
                    <MenuDivider title={translate("Date range")} />
                    {shortcutsRange.map((shortcut: IDatePickerRangeShortcutExtra, index: number) => {
                        return (
                            <MenuItem
                                key={index}
                                text={shortcut.title}
                                label={shortcut.label}
                                labelClassName={Classes.TEXT_SMALL}
                                shouldDismissPopover={false}
                                onClick={() => handleShortcutRangeSelection(shortcut.dateRange)}
                            />
                        );
                    })}
                </Menu>
            </Col>
            <Divider />
            <Col data-testid="date-range-picker-wrapper">
                <BlueprintDateRangePicker
                    value={value}
                    allowSingleDayRange
                    highlightCurrentDay
                    onChange={setValue}
                    locale={dateLocale}
                    shortcuts={false}
                    footerElement={(
                        <Grid>
                            {enableTimePicker && (
                                <Row>
                                    <Col justify="center"><TimePicker onChange={(v) => setValue([v, value[1]])} disabled={value[0] == null} value={value[0]} useAmPm={useAmPm} /></Col>
                                    <Col justify="center"><TimePicker onChange={(v) => setValue([value[0], v])} disabled={value[1] == null} value={value[1]} useAmPm={useAmPm} /></Col>
                                </Row>
                            )}
                            <FormattedDateRange range={value} showTime={enableTimePicker} onClearStart={() => setValue([null, value[1]])} onClearEnd={() => setValue([value[0], null])} />

                            <Row justify="right">
                                <Col>
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        className={Classes.POPOVER_DISMISS}
                                        data-testid="date-range-picker-cancel"
                                    >
                                        {translate("Cancel")}
                                    </Button>
                                </Col>
                                <Col justify="right" gap={5}>
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        onClick={() => onChange(null, null)}
                                        className={Classes.POPOVER_DISMISS}
                                        intent={Intent.WARNING}
                                        data-testid="date-range-picker-clear"
                                    >
                                        {translate("Clear")}
                                    </Button>

                                    <Button
                                        size="small"
                                        className={Classes.POPOVER_DISMISS}
                                        intent={Intent.PRIMARY}
                                        onClick={handleApply}
                                        data-testid="date-range-picker-apply"
                                    >
                                        {translate("Apply")}
                                    </Button>
                                </Col>
                            </Row>
                        </Grid>
                    )}
                />
            </Col>
        </Row>
    )
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    children,
    disabled,
    className,
    ...props
}) => {
    return (
        <div>
            <Popover
                content={<DateRangeComponent {...props} />}
                popoverClassName="popover-padded-small"
                className={className}
                disabled={disabled}
            >
                {children}
            </Popover>
        </div>
    );
};

export const DateRangePickerButton: FunctionComponent<DateRangePickerProps & CommonButtonProps> = ({
    id,
    done,
    minimal,
    extendedFormat,
    hideTooltip,
    simple,
    testId,
    ...props
}) => {
    const dateIntent = useDateIntent(props.end, done);

    return (
        <DateRangePicker {...props}>
            <DateChip
                id={id}
                simple={simple}
                startDate={props.start ?? undefined}
                dueDate={props.end ?? undefined}
                intent={dateIntent}
                minimal={minimal}
                disabled={props.disabled}
                extendedFormat={extendedFormat}
                hideTooltip={Boolean(extendedFormat) || hideTooltip}
                testId={testId}
                onRemove={() => props.onChange(null, null)}
            />
        </DateRangePicker>
    )
}