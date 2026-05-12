// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Button, Checkbox, Classes, Divider, HTMLSelect, Intent, NumericInput } from "@blueprintjs/core";

import { IRepeats, REPEATTYPE } from "@stacks/types";
import { format, getDay, getDate, setDay } from "date-fns";

export const defaultRepeats: IRepeats = {
    type: REPEATTYPE.WEEKLY,
    value: getDay(new Date()).toString(),
    reopen: false,
    dates: [],
};

interface IRepeatPickerProps {
    value?: IRepeats;
    onChange: (value?: IRepeats) => void;
}
export const RepeatPicker: FunctionComponent<IRepeatPickerProps> = ({ value, onChange }) => {
    const repeats = value ? { ...value } : { ...defaultRepeats };

    const handleSetType = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const repeatData = { ...repeats, type: event.currentTarget.value as REPEATTYPE };

        if (repeatData.type === REPEATTYPE.DAILY || repeatData.type === REPEATTYPE.YEARLY) {
            repeatData.value = "";
        } else if (repeatData.type === REPEATTYPE.WEEKLY) {
            repeatData.value = getDay(new Date()).toString();
        } else if (repeatData.type === REPEATTYPE.MONTHLY) {
            repeatData.value = getDate(new Date()).toString();
        } else if (repeatData.type === REPEATTYPE.PERIODICALLY) {
            repeatData.value = "7";
        }

        onChange(repeatData);
    };

    const handleSetDayOfWeek = (day: number) => {
        const days = repeats.value.length ? repeats.value.split(",").map(d => parseInt(d, 10)) : [];

        if (days.includes(day)) {
            if (days.length === 1) return;
            days.splice(days.indexOf(day), 1);
        } else {
            days.push(day);
        }

        onChange({ ...repeats, value: days.join(",") });
    };

    const handleSetValue = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...repeats, value: event.currentTarget.value });
    };

    const handleSetMumericValue = (days: number) => {
        let value = days;
        if (isNaN(value) || value < 1) {
            value = 1;
        } else if (value > 1825) {
            value = 1825;
        }
        onChange({ ...repeats, value: value.toString() });
    };

    const handleOpenAsNew = () => {
        onChange({ ...repeats, reopen: !repeats.reopen });
    };

    const isDayChecked = (day: number) => {
        if (!repeats.value.length) return false;

        return repeats.value
            .split(",")
            .map((d: string) => Number(d))
            .includes(day);
    };

    return (
        <div className="repeat-picker">
            <div className="row">
                <div className="col col-align-center col-auto">Repeats</div>
                <div className="col col-align-center col-justify-end">
                    <HTMLSelect value={repeats.type} onChange={handleSetType}>
                        <option value={REPEATTYPE.DAILY}>Daily</option>
                        <option value={REPEATTYPE.WEEKLY}>Weekly</option>
                        <option value={REPEATTYPE.MONTHLY}>Monthly</option>
                        <option value={REPEATTYPE.YEARLY}>Yearly</option>
                        <option value={REPEATTYPE.PERIODICALLY}>Periodically</option>
                    </HTMLSelect>
                </div>
            </div>
            {repeats.type === REPEATTYPE.WEEKLY && (
                <div className="repeater-section week-days">
                    {[...Array(7).keys()].map((day: number) => (
                        <Checkbox
                            value={day}
                            key={day}
                            className="week-day"
                            checked={isDayChecked(day)}
                            onClick={() => handleSetDayOfWeek(day)}
                        >
                            <div>
                                {format(setDay(new Date(), day), "eee")
                                    .substring(0, 1)
                                    .toUpperCase()}
                            </div>
                        </Checkbox>
                    ))}
                </div>
            )}

            {repeats.type === REPEATTYPE.MONTHLY && (
                <div className="row repeater-section">
                    <div className="col col-align-center">On day</div>
                    <div className="col col-align-center col-justify-end">
                        <HTMLSelect value={repeats.value} onChange={handleSetValue}>
                            {[...Array(28).keys()].map((day: number) => (
                                <option value={day + 1} key={day}>
                                    {day + 1}
                                </option>
                            ))}
                            <option value="last">Last</option>
                        </HTMLSelect>
                    </div>
                </div>
            )}

            {repeats.type === REPEATTYPE.PERIODICALLY && (
                <div className="row repeater-section">
                    <div className="col col-align-center">Days after completion</div>
                    <div className="col col-align-center col-justify-end col-60">
                        <NumericInput
                            min={1}
                            max={1825}
                            fill
                            value={repeats.value}
                            selectAllOnFocus
                            onValueChange={handleSetMumericValue}
                        />
                    </div>
                </div>
            )}

            <Divider />
            <div className="repeat-footer">
                <Checkbox label="Reopen task" checked={repeats.reopen} onClick={handleOpenAsNew} inline />
                <Button
                    minimal
                    small
                    intent={Intent.WARNING}
                    onClick={() => onChange()}
                    className={Classes.POPOVER_DISMISS}
                >
                    {translate("Clear")}
                </Button>
            </div>
        </div>
    );
};
