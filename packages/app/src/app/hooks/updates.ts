// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Updates hooks and selectors.
 */
import { IUpdate, POLLINGTYPE } from "@stacks/types";
import {
    BookmarksActions,
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

export const useRealtimeUpdates = <TSection extends string>(
    section: TSection,
    callback: (update: IUpdate, hasPermissions: boolean) => void
) => {
    useEffect(() => {
        const removeUpdatePoller = window.updatePoller.on(section, callback);

        return () => {
            if (removeUpdatePoller) removeUpdatePoller();
        };
    }, []);
};

export const useUpdates = () => {
    useRealtimeUpdates(POLLINGTYPE.DOCUMENTS, RecordActions.reload);
    useRealtimeUpdates(POLLINGTYPE.PEOPLE, PeopleActions.reloadPeople);
    useRealtimeUpdates(POLLINGTYPE.COMPANIES, PeopleActions.reloadCompanies);
    useRealtimeUpdates(POLLINGTYPE.NOTIFICATION, NotificationsActions.load);
    useRealtimeUpdates(POLLINGTYPE.PROJECT, ProjectsActions.reloadProject);
    useRealtimeUpdates(POLLINGTYPE.STACK, StacksActions.reloadOne);
    useRealtimeUpdates(POLLINGTYPE.TASK, TasksActions.reloadTask);
    useRealtimeUpdates(POLLINGTYPE.TIMELOG, TimelogsActions.reload);
    useRealtimeUpdates(POLLINGTYPE.NOTEPAD, NotepadActions.reload);
    useRealtimeUpdates(POLLINGTYPE.BOOKMARKS, BookmarksActions.reload);
};
