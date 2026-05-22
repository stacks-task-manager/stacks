// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DateRange } from "@blueprintjs/datetime";

export interface IDatePickerShortcutExtra {
    title: string;
    label: string;
    date: Date;
}

export interface IDatePickerRangeShortcutExtra {
    title: string;
    label: string;
    dateRange: DateRange;
}

export interface CommonButtonProps {
    id?: string;
    done?: boolean;
    minimal?: boolean;
    extendedFormat?: boolean | string;
    hideTooltip?: boolean;
    simple?: boolean;
    testId?: string;
}
