// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notepad documents: CRUD and cover upload stub.
 */
import request from "./request";
import { INotepad } from "@stacks/types";

/** PATCH body for editor content/cover. */
interface NotepadUpdate {
    content?: string;
    cover?: string;
}

export const NotepadsAPI = {
    /** GET notepad payload. */
    async load(notepadId: string): Promise<INotepad> {
        return request.get(`/api/notepads/${notepadId}`);
    },
    /** PATCH content or cover. */
    async update(notepadId: string, data: NotepadUpdate): Promise<boolean> {
        return request.patch(`/api/notepads/${notepadId}`, data);
    },
    /** Creates an empty notepad with title. */
    async add(title: string): Promise<boolean> {
        return request.post(`/api/notepads`, { title });
    },
    /** Deletes a notepad. */
    async delete(notepadId: string): Promise<boolean> {
        return request.delete(`/api/notepads/${notepadId}`);
    },
    /** POST multipart cover (placeholder field wiring). */
    async uploadCover(notepadId: string, file: string): Promise<string> {
        const formData = new FormData();
        // formData.append("cover", file);
        return request.post(`/api/notepads/${notepadId}/cover`, formData);
    },
};
