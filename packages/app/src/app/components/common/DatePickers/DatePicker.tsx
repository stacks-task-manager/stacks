// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Divider,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    PopoverProps,
} from "@blueprintjs/core";
import { DatePicker as BlueprintDatePicker, TimePicker } from "@blueprintjs/datetime";
import { translate } from "@stacks/translations";
import { setHours, setMinutes } from "date-fns";
import React, { FunctionComponent, useState } from "react";

import { usePreferences } from "app/hooks";
import { isAmPm } from "app/utils/date";
import { DateChip } from "../DateChip/DateChip";
import { Col, Grid, Row } from "../Layout";
import { CommonButtonProps, IDatePickerShortcutExtra } from "./types";
import { getSingleDateShortcuts, useDateIntent } from "./utils";

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

    const shortcuts = getSingleDateShortcuts(setHours(setMinutes(new Date(), 0), 12));

    const handleShortcutSingleSelection = (date: Date) => {
        setDate(date);
    };

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
                                data-testid={`date-picker-shortcut-${shortcut.title
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")}`}
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
                    footerElement={
                        <Grid>
                            {enableTimePicker && (
                                <Row>
                                    <Col justify="center">
                                        <TimePicker onChange={setDate} value={date} useAmPm={useAmPm} />
                                    </Col>
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
                    }
                />
            </Col>
        </Row>
    );
};

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
    );
};
