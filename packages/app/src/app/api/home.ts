// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Home dashboard todos stub API.
 */
import { IHomeStoreBase, IHomeTodoItem } from "app/store/home";
import request from "./request"


export const HomeAPI = {
    /** Loads home payload. */
    async load(): Promise<IHomeStoreBase> {
        return request.get("/api/home");
    },
    /** Adds a home todo item. */
    async addTodo(todo: Partial<IHomeTodoItem>): Promise<IHomeTodoItem> {
        return request.post("/api/home/todo", todo);
    },
    /** Deletes a todo by id. */
    async removeTodo(todoId: string): Promise<boolean> {
        return request.delete(`/api/home/todo/${todoId}`);
    }
}