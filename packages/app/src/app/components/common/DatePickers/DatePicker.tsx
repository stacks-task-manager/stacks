// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Divider,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    PopoverProps
} from '@blueprintjs/core';
import {
    DatePicker as BlueprintDatePicker,
    TimePicker
} from '@blueprintjs/datetime';
import { addDays, addMonths, addWeeks, format, setHours, setMinutes } from "date-fns";
import React, { FunctionComponent, useMemo, useState } from 'react';
import { usePreferences } from 'app/hooks';
import { isAmPm } from 'app/utils/date';
import { DateChip } from '../DateChip/DateChip';
import { Col, Grid, Row } from '../Layout';
import { CommonButtonProps, IDatePickerShortcutExtra } from './types';
import { useDateIntent } from './utils';

export const DateComponent: FunctionComponent<DatePickerProps> = ({
    value,
    minDate,
    maxDate,
    onChange,
    enableTimePicker = true,
}) => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    const [date, setDate] = useState<Date | null>(value ?? null);
    const useAmPm = isAmPm();

    const shortcuts: IDatePickerShortcutExtra[] = useMemo(() => {
        const now = setHours(setMinutes(new Date(), 0), 12);
        const shorcutsList = [
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
        return shorcutsList;
    }, []);

    const handleShortcutSingleSelection = (date: Date) => {
        setDate(date);
    }

    const handleApply = () => {
        onChange(date);
    };

    return (
        <Row data-testid="date-picker">
            <Col unshrinkable width="auto">
                <Menu data-testid="date-picker-menu">
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
                </Menu>
            </Col>
            <Divider />
            <Col>
                <BlueprintDatePicker
                    value={date}
                    highlightCurrentDay
                    onChange={setDate}
                    locale={dateLocale}
                    shortcuts={false}
                    minDate={minDate ?? undefined}
                    maxDate={maxDate ?? undefined}
                    footerElement={(
                        <Grid>
                            {enableTimePicker && (
                                <Row>
                                    <Col justify="center"><TimePicker onChange={setDate} value={date} useAmPm={useAmPm} /></Col>
                                </Row>
                            )}

                            <Row justify="right">
                                <Col>
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        className={Classes.POPOVER_DISMISS}
                                        data-testid="date-picker-cancel"
                                    >
                                        {translate("Cancel")}
                                    </Button>
                                </Col>
                                <Col justify="right" gap={5}>
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        onClick={() => onChange(null)}
                                        className={Classes.POPOVER_DISMISS}
                                        intent={Intent.WARNING}
                                        data-testid="date-picker-clear"
                                    >
                                        {translate("Clear")}
                                    </Button>

                                    <Button
                                        size="small"
                                        className={Classes.POPOVER_DISMISS}
                                        intent={Intent.PRIMARY}
                                        onClick={handleApply}
                                        data-testid="date-picker-apply"
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

export interface DatePickerProps {
    value: Date | null;
    enableTimePicker?: boolean;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    minDate?: Date | null;
    maxDate?: Date | null;
    popoverProps?: PopoverProps;
    onChange: (value: Date | null) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    children,
    className,
    disabled,
    popoverProps,
    ...props
}) => {
    return (
        <div>
            <Popover
                content={<DateComponent {...props} />}
                popoverClassName="popover-padded-small"
                className={className}
                disabled={disabled}
                {...popoverProps}
            >
                {children}
            </Popover>
        </div>
    );
};

export const DatePickerButton: FunctionComponent<DatePickerProps & CommonButtonProps> = ({
    id,
    done,
    minimal,
    extendedFormat,
    hideTooltip,
    simple,
    testId,
    ...props
}) => {
    const dateIntent = useDateIntent(props.value, done);

    return (
        <DatePicker {...props}>
            <DateChip
                id={id}
                simple={simple}
                dueDate={props.value ?? undefined}
                intent={dateIntent}
                minimal={minimal}
                placement="top"
                disabled={props.disabled}
                extendedFormat={extendedFormat}
                hideTooltip={Boolean(extendedFormat) || hideTooltip}
                testId={testId}
                onRemove={() => props.onChange(null)}
            />
        </DatePicker>
    )
}