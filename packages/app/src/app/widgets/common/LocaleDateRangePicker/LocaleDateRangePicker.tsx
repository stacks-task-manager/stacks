// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { DateRangePicker as DateComponent, DateRangePickerProps } from "@blueprintjs/datetime";

import { usePreferences } from "app/hooks";

export const LocaleDateRangePicker: FunctionComponent<DateRangePickerProps> = props => {
    const { dateLocale } = usePreferences(["dateLocale"]);
    return <DateComponent {...props} locale={dateLocale} />;
};
