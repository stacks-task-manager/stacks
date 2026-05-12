// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { InputGroup, Popover } from "@blueprintjs/core";
import { DatePicker } from "@blueprintjs/datetime";
import { format, isValid, parse } from "date-fns";
import React, { FunctionComponent, useEffect, useState } from "react";
import { parseDate as parseDateUtil } from "../../../utils/date";

interface DateInputProps {
    value: Date | null | undefined;
    format: string;
    locale?: string;
    max?: Date;
    min?: Date;
    disabled?: boolean;
    onChange: (date: Date | null) => void;
}

export const DateInput: FunctionComponent<DateInputProps> = ({
    value,
    format: formatString,
    locale,
    min,
    max,
    disabled,
    onChange,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [stringValue, setStringValue] = useState(value ? format(value, formatString) : "");
    const [dateValue, setDateValue] = useState(value);

    useEffect(() => {
        if (value !== dateValue) {
            setDateValue(value);
            setStringValue(value ? format(value, formatString) : "");
        }
    }, [value]);

    const formatDateLocal = (date: Date) => {
        return format(date, formatString);
    };

    const parseDate = (str: string) => {
        try {
            const parsedDate = parse(str, formatString, new Date());
            if (isValid(parsedDate)) {
                return parsedDate;
            }
        } catch (e) {
            // Fallback to utility function
        }
        return parseDateUtil(str) || new Date();
    };

    const handleOnChangeDate = (selectedDate: Date | null, isUserChange: boolean) => {
        if (!isUserChange) return;

        let date = selectedDate ?? value ?? new Date();

        if (max != null && date && date > max) {
            date = max;
        } else if (min != null && date && date < min) {
            date = min;
        }

        setStringValue(date ? format(date, formatString) : "");
        setDateValue(date);
        onChange(date);

        setIsOpen(false);
    };

    const handleOnChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStringValue(event.target.value);
        try {
            const parsedDate = parse(event.target.value, formatString, new Date());
            if (isValid(parsedDate)) {
                setDateValue(parsedDate);
            }
        } catch (e) {
            // Invalid date format
        }
    };

    const handleInputClick = React.useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        // stop propagation to the Popover's internal handleTargetClick handler;
        // otherwise, the popover will flicker closed as soon as it opens.
        e.stopPropagation();
    }, []);

    const handleInputFocus = React.useCallback(() => {
        setIsOpen(true);
    }, []);

    const handleInputBlur = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        if (event.relatedTarget?.tagName === "BUTTON") {
            event.preventDefault();
            return;
        }

        if (stringValue == null) {
            return;
        }

        const date = parseDate(event.currentTarget.value);

        if (date) {
            setDateValue(date);
            setStringValue(formatDateLocal(date));
        }

        setIsOpen(false);
    }, []);

    return (
        <Popover
            isOpen={isOpen}
            content={
                <DatePicker
                    value={dateValue}
                    locale={locale}
                    minDate={min}
                    maxDate={max}
                    onChange={handleOnChangeDate}
                />
            }
            placement="bottom-end"
            minimal
            autoFocus={false}
            enforceFocus={false}
        >
            <InputGroup
                autoComplete="off"
                value={stringValue}
                onChange={handleOnChangeInput}
                onClick={handleInputClick}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={disabled}
            />
        </Popover>
    );
};
