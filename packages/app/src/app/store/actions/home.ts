// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Home dashboard todos.
 */
import { produce } from "immer";

import api, { HomeAPI } from "app/api";
import sound from "app/utils/sound";
import { HomeStore, IHomeStore, IHomeTodoItem } from "../home";

const load = async () => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.isLoading = true;
        })
    );

    const { todos, todoSorting, notes } = await HomeAPI.load();
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.todos = todos;
            state.todoSorting = todoSorting;
            state.notes = notes;
            state.isLoading = false;
        })
    );
};

const updateTodo = async (todo: IHomeTodoItem) => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.todos = state.todos.map(t => {
                if (t.id === todo.id) {
                    return todo;
                }

                return t;
            });
        })
    );

    await api("home/updateTodo", { todo });
};

const addTodo = async (title: string, date: Date | null) => {
    if (title.trim().length === 0) return;

    const todoData: Partial<IHomeTodoItem> = { title };
    if (date) {
        todoData.date = date;
    }

    const todo = await HomeAPI.addTodo(todoData);

    if (todo) {
        HomeStore.set(
            produce((state: IHomeStore) => {
                state.todos.push(todo);
            })
        );
    }
};

const setTodoDate = async (index: number, date: Date | null) => {
    const todo = HomeStore.get().todos.at(index);
    if (!todo || !date) return;

    await updateTodo({ ...todo, date });
};

const toggleTodo = async (index: number) => {
    const todo = HomeStore.get().todos.at(index);
    if (!todo) return;

    await updateTodo({ ...todo, completed: !todo.completed });

    // if the todo was incomplete and we changed it to completed
    // make the sound
    if (!todo.completed) {
        sound.play("complete");
    }
};

const removeTodo = async (index: number) => {
    const todo = HomeStore.get().todos.at(index);

    if (todo) {
        HomeStore.set(
            produce((state: IHomeStore) => {
                state.todos = state.todos.filter((todo, i) => i !== index);
            })
        );

        await HomeAPI.removeTodo(todo.id);
    }
};

const setTodoSorting = async (sorting: string) => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.todoSorting = sorting;
            state.todos = state.todos.sort((a, b) => {
                const dateA = a.date;
                const dateB = b.date;
                if (!dateA || !dateB) return 0;
                return state.todoSorting === "date-asc"
                    ? dateA.getTime() - dateB.getTime()
                    : dateB.getTime() - dateA.getTime();
            });
        })
    );

    await api("home/saveSorting", { sorting });
};

const setManuallySortedTodos = async (todos: IHomeTodoItem[]) => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.todos = todos;
        })
    );
    await api("home/orderTodo", { todoIds: HomeStore.get().todos.map(todo => todo.id) });
};

const clearCompletedTodos = async () => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.todos = state.todos.filter(todo => !todo.completed);
        })
    );

    await api("home/clearCompleted");
};

let updateDebounce: NodeJS.Timeout | null;
const setNotes = async (notes: string) => {
    HomeStore.set(
        produce((state: IHomeStore) => {
            state.notes = notes;
        })
    );

    if (updateDebounce) {
        clearTimeout(updateDebounce);
        updateDebounce = null;
    }

    updateDebounce = setTimeout(async () => {
        await api("home/saveNotes", { notes: HomeStore.get().notes });
    }, 500);
};

export const HomeActions = {
    load,
    addTodo,
    toggleTodo,
    setTodoDate,
    setTodoSorting,
    setManuallySortedTodos,
    clearCompletedTodos,
    removeTodo,
    setNotes,
};
