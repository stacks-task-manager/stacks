// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, FormGroup, Intent, Placement, Popover } from "@blueprintjs/core";
import { Icon } from "app/components/common";
import React, { FunctionComponent, useMemo } from "react";
import { DateMenu, formatDates } from "./DateMenu";

interface IDateFilterProps {
    date?: string;
    /** Already-localized label shown when no date is selected. */
    emptyLabel: string;
    /** Optional already-localized form-group label; defaults to `emptyLabel`. */
    label?: string;
    onChange: (date?: string) => void;
    /** Unique test-id prefix for the trigger button and the date menu items. */
    "data-testid"?: string;
    /** Minimal popover appearance (default true — project filter style). */
    minimal?: boolean;
    /** Match the trigger's width (default true — project filter style). */
    matchTargetWidth?: boolean;
    /** Popover placement (default "bottom" — project filter style). */
    placement?: Placement;
    /** Tint the trigger PRIMARY while a date is selected (default true — project filter style). */
    highlightWhenSet?: boolean;
}
/**
 * Shared single date-filter button (start / do / due / time-logged).
 * The caller supplies the localized empty label and the store action. Callers
 * that need the plain-popover presentation (e.g. the timelogs drawer) can opt
 * out of the project-filter styling via the `minimal` / `matchTargetWidth` /
 * `placement` / `highlightWhenSet` props.
 */
export const DateFilter: FunctionComponent<IDateFilterProps> = ({
    date,
    emptyLabel,
    label,
    onChange,
    "data-testid": testId,
    minimal = true,
    matchTargetWidth = true,
    placement = "bottom",
    highlightWhenSet = true,
}) => {
    const buttonLabel = useMemo(() => {
        if (!date) return emptyLabel;
        return formatDates(date);
    }, [date, emptyLabel]);

    return (
        <FormGroup label={label ?? emptyLabel}>
            <Popover
                content={<DateMenu date={date} onChange={onChange} data-testid={testId} />}
                minimal={minimal}
                matchTargetWidth={matchTargetWidth}
                placement={placement}
            >
                <Button
                    fill
                    icon={<Icon icon="calendar-date" />}
                    alignText={Alignment.END}
                    endIcon={<Icon icon="chevron-down" />}
                    intent={date != null && highlightWhenSet ? Intent.PRIMARY : Intent.NONE}
                    data-testid={testId ? `${testId}-button` : undefined}
                >
                    {buttonLabel}
                </Button>
            </Popover>
        </FormGroup>
    );
};
