// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Home page stub store.
 */
import { entity } from "app/hooks/store";

export interface IHomeTodoItem {
    id: string;
    title: string;
    date?: Date;
    completed: boolean;
}

export interface IHomeStoreBase {
    todos: IHomeTodoItem[];
    todoSorting: string;
    notes: string;
}

export interface IHomeStore extends IHomeStoreBase {
    isLoading: boolean;
}

export const HomeStore = entity<IHomeStore>({
    todos: [],
    todoSorting: "manual",
    notes: "",
    isLoading: false,
});
