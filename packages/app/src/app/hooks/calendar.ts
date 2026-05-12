// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar hooks and selectors.
 */
import { CalendarActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { shallowEqual } from "./store";

export const useCalendars = () => {
    const { tokens, calendars, loading } = CalendarStore.use(
        state => ({
            tokens: state.tokens,
            filters: state.filters,
            calendars: state.calendars,
            loading: state.loadingCalendars,
        }),
        shallowEqual
    );

    const isGoogleAuthenticated = tokens.google != null;

    const loadCalendars = () => {
        CalendarActions.loadCalendars();
    };

    return { isGoogleAuthenticated, calendars, loading, loadCalendars };
};

export const useCalendarsFilters = () => {
    return CalendarStore.use(state => state.filters, shallowEqual);
};

export const useSelectedEvent = () => {
    const { selected, selectedId } = CalendarStore.use(
        state => ({
            selected: state.events.find(
                event => state.selected && state.selected.startsWith(event.resource.data.id)
            ),
            selectedId: state.selected,
        }),
        shallowEqual
    );

    return { selected, isNew: selectedId?.includes("-new") };
};
