// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLSelect } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectPickerProps {
    options: SelectOption[];
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
    fill?: boolean;
    maxWidth?: number | string;
    onChange: (value: string) => void;
}

export const SelectPicker: FunctionComponent<SelectPickerProps> = ({
    options,
    defaultValue,
    placeholder,
    disabled,
    fill,
    maxWidth,
    onChange,
}) => {
    return (
        <HTMLSelect
            disabled={disabled}
            defaultValue={defaultValue ?? (placeholder ? "" : options[0]?.value)}
            fill={fill}
            style={{ maxWidth }}
            onChange={event => onChange(event.currentTarget.value)}
        >
            {placeholder ? (
                <option value="" disabled>
                    {placeholder}
                </option>
            ) : null}
            {options.map(option => (
                <option
                    key={`${option.value}-${option.label}`}
                    value={option.value}
                    disabled={option.disabled}
                >
                    {option.label}
                </option>
            ))}
        </HTMLSelect>
    );
};
