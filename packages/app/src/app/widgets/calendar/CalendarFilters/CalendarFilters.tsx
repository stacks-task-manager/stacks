// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Checkbox, Classes, FormGroup } from "@blueprintjs/core";
import React from "react";
import { useCalendars, useCalendarsFilters } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { ColoredCheckbox, FiltersSidebar, TagsWrapper } from "app/widgets/common";

export const CalendarFilters = () => {
    const { showFilters, filters } = CalendarStore.use(
        state => ({
            showFilters: state.showFilters,
            filters: state.filters,
        }),
        shallowEqual
    );

    if (!showFilters) return null;

    const {
        showCalendars,
        showTasks,
        showBirthdays,
    } = filters;

    return (
        <FiltersSidebar header="Calendar filters">
            <Checkbox
                label={translate("Show events")}
                checked={showCalendars.includes("local")}
                onChange={() => CalendarActions.toggleCalendar("local")}
            />
            <Checkbox
                label={translate("Show birthdays")}
                checked={showBirthdays}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    CalendarActions.setFilter("showBirthdays", event.currentTarget.checked)
                }
            />
            <Checkbox
                label={translate("Show tasks")}
                checked={showTasks}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    CalendarActions.setFilter("showTasks", event.currentTarget.checked)
                }
            />

            <GoogleCalendars />
        </FiltersSidebar>
    );
};

const GoogleCalendars = () => {
    const { calendars, isGoogleAuthenticated, loading } = useCalendars();
    const filters = useCalendarsFilters();

    if (!isGoogleAuthenticated) return null;

    const { showCalendars } = filters;

    if (loading) {
        return (
            <FormGroup label="Google calendars">
                <TagsWrapper vertical gap={10}>
                    {Array.from(Array(5).keys()).map(i => (
                        <div key={i} className={Classes.SKELETON} style={{ height: 20, width: "100%" }} />
                    ))}
                </TagsWrapper>
            </FormGroup>
        );
    }

    return (
        <FormGroup label="Google calendar" style={{ marginTop: 20 }}>
            {calendars.map(calendar => (
                <ColoredCheckbox
                    text={calendar.title}
                    color={calendar.color}
                    key={calendar.id}
                    checked={showCalendars.includes(`google-${calendar.id}`)}
                    onChange={() => CalendarActions.toggleCalendar(`google-${calendar.id}`)}
                />
            ))}
        </FormGroup>
    );
};
