// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FormGroup, Switch } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import React, { FunctionComponent, memo } from "react";

interface IQuickFiltersProps {
    overdue: boolean;
    inProgress: boolean;
    loggedTime?: boolean;
    showLoggedTime?: boolean;
    onOverdueChange: () => void;
    onInProgressChange: () => void;
    onLoggedTimeChange?: () => void;
}

export const QuickFilters: FunctionComponent<IQuickFiltersProps> = memo(function QuickFilters({
    overdue,
    inProgress,
    loggedTime,
    showLoggedTime = false,
    onOverdueChange,
    onInProgressChange,
    onLoggedTimeChange,
}) {
    return (
        <FormGroup label={translate("Quick filters")}>
            <Switch label={translate("Only overdue tasks")} checked={overdue} onChange={onOverdueChange} />
            <Switch
                label={translate("Only tasks in progress")}
                checked={inProgress}
                onChange={onInProgressChange}
            />
            {showLoggedTime && onLoggedTimeChange && (
                <Switch
                    label={translate("Only tasks with logged time")}
                    checked={Boolean(loggedTime)}
                    onChange={onLoggedTimeChange}
                />
            )}
        </FormGroup>
    );
});
