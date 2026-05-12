// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, InputGroup, Intent, Placement, Tooltip } from "@blueprintjs/core";
import { Icon } from "app/components/common";
import { formatStringDuration, isDurationValid, parseStringDuration } from "app/utils/date";
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";

interface DurationInputProps {
    value?: number;
    placeholder?: string;
    disabled?: boolean;
    showHelp?: boolean;
    placement?: Placement;
    onChange?: (value: number | undefined) => void;
}

export const DurationInput: FunctionComponent<DurationInputProps> = ({
    value,
    placeholder = "6h 45m",
    disabled = false,
    showHelp = true,
    placement = "top",
    onChange,
}) => {
    const [isValid, setIsValid] = useState(true);
    const [inputValue, setInputValue] = useState<string>(value ? formatStringDuration(value) : "");

    useEffect(() => {
        const newInputValue = value ? formatStringDuration(value) : "";
        if (newInputValue !== inputValue) {
            setInputValue(newInputValue);
        }
    }, [value]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        const valid = newValue.trim() === "" || isDurationValid(newValue);
        setIsValid(valid);
        setInputValue(newValue);
    }, []);

    const handleSubmit = useCallback(() => {
        if (isValid && onChange) {
            const trimmedValue = inputValue.trim();
            onChange(trimmedValue ? parseStringDuration(trimmedValue) : undefined);
        }
    }, [isValid, inputValue, onChange]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            handleSubmit();
        }
    }, [handleSubmit]);

    return (
        <InputGroup
            value={inputValue}
            intent={isValid ? Intent.NONE : Intent.DANGER}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            rightElement={showHelp === true ? (
                <Tooltip content={
                    <>
                        Use the format: 2w 4d 6h 45m<br />
                        - w = weeks<br />
                        - d = days<br />
                        - h = hours<br />
                        - m = minutes
                    </>
                } placement={placement}>
                    <Button variant="minimal" style={{ cursor: "help" }} icon={<Icon icon="help-circle" />} />
                </Tooltip>
            ) : undefined
            }
        />
    );
}