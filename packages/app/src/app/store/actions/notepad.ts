// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notepad load/save actions.
 */
import { produce } from "immer";
import kebabCase from "lodash/kebabCase";

import { IPermissions, IUpdate } from "@stacks/types";
import api, { ExportAPI, NotepadsAPI, PermissionsAPI } from "app/api";
import { getDocument, nav } from "app/hooks";
import { INotepadStore, NotepadStore } from "../notepad";
import { cleanupResourceNavigationRefs } from "./resourceNavigationCleanup";

const loadNotepad = async (notepadId: string) => {
    const editingBy = undefined;
    const notepad = await NotepadsAPI.load(notepadId);

    if (notepad) {
        NotepadStore.set(
            produce((state: INotepadStore) => {
                state.notepad = notepad;
                state.isLoading = false;
                state.editingBy = editingBy;
            })
        );

        // if (isEditing && editingBy) {
        //     const person = PeopleActions.getPerson(editingBy);
        //     if (!person) return;
        //     window.toaster.show({
        //         message: `${person.firstName} ${person.lastName} took control of this notepad.`,
        //         intent: Intent.WARNING,
        //     });
        // }
    }

    return notepad;
};

const load = async (notepadId: string) => {
    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.isLoading = true;
        })
    );

    try {
        await loadNotepad(notepadId);
    } catch (e) {
        nav("/");
    }
};

const reload = async (activity: IUpdate) => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    if (activity.record !== notepad.id) return;
    await loadNotepad(activity.record);
};

const getNotepad = async (notepadId: string) => {
    const { notepad } = NotepadStore.get();
    if (notepad && notepad.id === notepadId) return notepad;
    return await loadNotepad(notepadId);
};

const setContent = async (content: string) => {
    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.notepad = {
                ...state.notepad!,
                content,
                updated: new Date().toJSON(),
            };
        })
    );

    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    await NotepadsAPI.update(notepad.id, { content });
};

const add = async (title: string): Promise<boolean> => {
    return await NotepadsAPI.add(title);
};

const addImage = async (imagePath: string) => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    return await api("notepad/addImage", notepad.id, imagePath);
};

const removeImage = async (imageSrc: string) => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    return await api("notepad/removeImage", notepad.id, imageSrc);
};

const addFile = async (filePath: string) => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    return await api("notepad/addFile", notepad.id, filePath);
};

const setCover = async (cover: string) => {
    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.notepad = {
                ...state.notepad!,
                cover,
                updated: new Date().toJSON(),
            };
        })
    );

    const { notepad } = NotepadStore.get();
    if (!notepad) return;

    await NotepadsAPI.update(notepad.id, { cover: notepad.cover });
};

const removeCover = async () => {
    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.notepad = {
                ...state.notepad!,
                cover: undefined,
                updated: new Date().toJSON(),
            };
        })
    );

    const { notepad } = NotepadStore.get();
    if (!notepad) return;

    await NotepadsAPI.update(notepad.id, { cover: undefined });
};

const removeById = async (notepadId: string) => {
    await cleanupResourceNavigationRefs(notepadId);

    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.notepad = undefined;
        })
    );
};

const exportNotepad = async (content: string, format: "pdf" | "html") => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return false;
    const document = getDocument(notepad.id);
    if (!document) return;
    const fileTitle = kebabCase(document.text);

    await ExportAPI.export({
        title: fileTitle ?? "notepad",
        data: content,
        type: "notepad",
        format,
    });
};

const updatePermissions = async (notepadId: string, permissions: IPermissions) => {
    const { notepad } = NotepadStore.get();
    if (!notepad) return;
    if (notepad.id !== notepadId) return;
    NotepadStore.set(
        produce((state: INotepadStore) => {
            state.notepad = {
                ...state.notepad!,
                permissions,
            };
        })
    );
    await PermissionsAPI.update(notepadId, permissions);
};

export const NotepadActions = {
    load,
    reload,
    getNotepad,
    setContent,
    setCover,
    add,
    addImage,
    removeImage,
    addFile,
    removeCover,
    removeById,
    exportNotepad,
    updatePermissions,
};
