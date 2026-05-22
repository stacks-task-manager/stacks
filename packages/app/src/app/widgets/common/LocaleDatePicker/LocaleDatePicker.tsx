// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { DatePicker as DateComponent, DatePickerProps } from "@blueprintjs/datetime";
import { addYears } from "date-fns";

import { usePreferences } from "app/hooks";

interface LocaleDatePickerProps extends DatePickerProps {
    maxDateYears?: number;
}

export const LocaleDatePicker: FunctionComponent<LocaleDatePickerProps> = props => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    return (
        <DateComponent
            {...props}
            maxDate={props.maxDateYears ? addYears(new Date(), props.maxDateYears) : props.maxDate}
            locale={dateLocale}
        />
    );
};
