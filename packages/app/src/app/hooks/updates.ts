// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Updates hooks and selectors.
 */
import { IUpdate, POLLINGTYPE } from "@stacks/types";
import {
    BookmarksActions,
    CalendarActions,
    NotepadActions,
    NotificationsActions,
    PeopleActions,
    ProjectsActions,
    RecordActions,
    StacksActions,
    TasksActions,
    TimelogsActions,
} from "app/store/actions";
import { useEffect } from "react";

/**
 * Subscribes a callback to realtime updates for a given section, unsubscribing on unmount.
 * @template TSection - The polling section type.
 * @param {TSection} section - The section to subscribe to.
 * @param {(update: IUpdate, hasPermissions: boolean) => void} callback - Handler invoked with each update and whether the user has permissions.
 */
export const useRealtimeUpdates = <TSection extends string>(
    section: TSection,
    callback: (update: IUpdate, hasPermissions: boolean) => void
) => {
    useEffect(() => {
        const removeUpdatePoller = window.updatePoller.on(section, callback);

        return () => {
            if (removeUpdatePoller) removeUpdatePoller();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

/**
 * Registers realtime update handlers for every polling section, reloading the related store data on each update.
 */
export const useUpdates = () => {
    useRealtimeUpdates(POLLINGTYPE.DOCUMENTS, RecordActions.reload);
    useRealtimeUpdates(POLLINGTYPE.PEOPLE, PeopleActions.reloadPeople);
    useRealtimeUpdates(POLLINGTYPE.COMPANIES, PeopleActions.reloadCompanies);
    useRealtimeUpdates(POLLINGTYPE.NOTIFICATION, NotificationsActions.load);
    useRealtimeUpdates(POLLINGTYPE.PROJECT, ProjectsActions.reloadProject);
    useRealtimeUpdates(POLLINGTYPE.STACK, StacksActions.reloadOne);
    useRealtimeUpdates(POLLINGTYPE.TASK, TasksActions.reloadTask);
    useRealtimeUpdates(POLLINGTYPE.CALENDAR, CalendarActions.reloadFromRealtimeUpdate);
    useRealtimeUpdates(POLLINGTYPE.EVENT, () => CalendarActions.load());
    useRealtimeUpdates(POLLINGTYPE.TIMELOG, TimelogsActions.reload);
    useRealtimeUpdates(POLLINGTYPE.NOTEPAD, NotepadActions.reload);
    useRealtimeUpdates(POLLINGTYPE.BOOKMARKS, BookmarksActions.reload);
};
