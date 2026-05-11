// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Federated quick search across people, tasks, and notepads.
 */
import { IPerson, RECORDTYPE, ITask, ISearchResult, INotepad } from "@stacks/types";
import { PeopleLoader } from "./people";
import { TasksLoader } from "./tasks";
import { NotepadsLoader } from "./notepads";
import { getCurrentUser } from "./context";

/** Runs scoped loaders and normalizes rows into {@link ISearchResult} items. */
async function query(query: string) {
    const user = getCurrentUser();
    const results: ISearchResult[] = [];

    // People
    const people: IPerson[] = await PeopleLoader.getAll({ query });
    results.push(...people.map(person => ({
        id: person.id,
        type: RECORDTYPE.PERSON,
        title: `${person.firstName} ${person.lastName}`,
        parentId: "people",
        parentTitle: "People",
        parentType: RECORDTYPE.PERSON,
        data: person,
        url: "",
        thumbnail: person.avatar ?? ""
    })));

    // Tasks
    const tasks: ITask[] = await TasksLoader.getAll({ query, limit: 20 });
    results.push(...tasks.map(task => ({
        id: task.id,
        type: RECORDTYPE.TASK,
        title: task.title,
        parentId: task.project,
        parentTitle: task.projectInfo?.title ?? "-",
        parentType: RECORDTYPE.PROJECT,
        data: task,
        url: "",
        thumbnail: ""
    })));

    // Notepads
    const notepads: INotepad[] = await NotepadsLoader.getAll({ query });
    results.push(...notepads.map(notepad => ({
        id: notepad.id,
        type: RECORDTYPE.NOTEPAD,
        title: notepad.document?.title ?? "",
        parentId: "",
        parentTitle: "",
        parentType: RECORDTYPE.NOTEPAD,
        data: notepad,
        url: "",
        thumbnail: ""
    })));

    return results;
}

export const SearchLoader = {
    query,
};
