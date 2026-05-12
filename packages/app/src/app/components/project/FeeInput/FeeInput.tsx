// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, FormGroup, Menu, MenuItem, NumericInput, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useState } from "react";
import { Icon } from "app/components/common";
import Config from "config";

interface FeeInputProps {
    value?: number;
    currency?: string;
    readonly?: boolean;
    label?: string | React.ReactNode;
    placeholder?: number;
    onChange: (value: number | undefined, currency: string) => void;
}

interface FeeInputPopupProps extends FeeInputProps {
    disabled?: boolean;
    children: React.ReactElement;
}

export const FeeInputPopup: React.FC<FeeInputPopupProps> = ({
    children,
    disabled,
    ...inputProps
}) => {
    return (
        <Popover disabled={disabled} popoverClassName="popover-padded-medium" content={<FeeInput {...inputProps} />}>
            {children}
        </Popover>
    );
};

interface CurrencySelectorProps {
    value: string;
    readonly?: boolean;
    onSelect: (currency: string) => void;
}
const CurrencySelector: FunctionComponent<CurrencySelectorProps> = ({ value, readonly, onSelect }) => {
    return (
        <Popover
            content={
                <Menu className="currency-selector-menu">
                    {Object.keys(window.currencies).map((key: string) => {
                        const currencyItem = window.currencies[key];
                        return (
                            <MenuItem
                                key={key}
                                text={currencyItem.name}
                                label={currencyItem.symbol}
                                shouldDismissPopover={false}
                                icon={value === currencyItem.code ? <Icon icon="check" /> : undefined}
                                onClick={() => onSelect(currencyItem.code)}
                            />
                        );
                    })}
                </Menu>
            }
            disabled={readonly}
        >
            <Button
                variant="minimal"
                disabled={readonly}
            >
                {window.currencies[value].symbol}
            </Button>
        </Popover>
    );
}

export const FeeInput: FunctionComponent<FeeInputProps> = ({ value, currency = Config.defaultCurrency, label, readonly, placeholder, onChange }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [currentCurrency, setCurrentCurrency] = useState(currency);

    useEffect(() => {
        if (value !== currentValue) {
            setCurrentValue(value);
        }
        if (currency !== currentCurrency) {
            setCurrentCurrency(currency);
        }
    }, [currency, value])

    const handleCurrencySelect = (selectedCurrency: string) => {
        setCurrentCurrency(selectedCurrency);
        if (currentValue === value && selectedCurrency === currency) {
            return;
        }
        onChange(currentValue ?? 0, selectedCurrency);
    };

    const handleValueChange = (newValue: number) => {
        setCurrentValue(newValue);
    };

    const handleSendChange = () => {
        if (currentValue === value && currentCurrency === currency) {
            return;
        }
        onChange(currentValue, currentCurrency);
    }

    return (
        <FormGroup label={label} style={{ marginBottom: 0, width: 120 }}>
            <NumericInput
                value={currentValue}
                rightElement={<CurrencySelector value={currentCurrency} readonly={readonly} onSelect={handleCurrencySelect} />}
                placeholder={placeholder?.toString() || translate("Hourly fee")}
                buttonPosition="none"
                min={0}
                onValueChange={handleValueChange}
                fill
                selectAllOnFocus
                onBlur={handleSendChange}
                onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.keyCode === 13) {
                        handleSendChange();
                    }
                }}
            />
        </FormGroup>
    )
}