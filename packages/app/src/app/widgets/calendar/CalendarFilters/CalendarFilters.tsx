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

    const { calendars, isGoogleAuthenticated, loading } = useCalendars();

    if (!showFilters) return null;

    const { showCalendars, showTasks, showBirthdays } = filters;

    // Filter local calendars
    const localCalendars = calendars.filter(c => c.source === "local");

    return (
        <FiltersSidebar header="Calendar filters">
            <FormGroup label="Local calendars" style={{ marginBottom: 20 }}>
                {localCalendars.length === 0 ? (
                    <div className={Classes.TEXT_MUTED} style={{ fontSize: 13, padding: "8px 0" }}>
                        No local calendars
                    </div>
                ) : (
                    localCalendars.map(calendar => (
                        <ColoredCheckbox
                            text={calendar.title}
                            color={calendar.color}
                            key={calendar.id}
                            checked={showCalendars.includes(calendar.id)}
                            onChange={() => CalendarActions.toggleCalendar(calendar.id)}
                        />
                    ))
                )}
            </FormGroup>

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

            <GoogleCalendars calendars={calendars} isGoogleAuthenticated={isGoogleAuthenticated} loading={loading} />
        </FiltersSidebar>
    );
};

const GoogleCalendars = ({
    calendars,
    isGoogleAuthenticated,
    loading,
}: {
    calendars: ReturnType<typeof useCalendars>["calendars"];
    isGoogleAuthenticated: boolean;
    loading: boolean;
}) => {
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

    const googleCalendars = calendars.filter(c => c.source === "google");

    return (
        <FormGroup label="Google calendars" style={{ marginTop: 20 }}>
            {googleCalendars.map(calendar => (
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
