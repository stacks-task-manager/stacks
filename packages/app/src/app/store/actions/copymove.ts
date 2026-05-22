// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Copy/move dialog orchestration.
 */
import { COPYMOVEACTION } from "@stacks/types";
import { produce } from "immer";

import { CopyMoveStore, ICopyMoveStore } from "../copymove";
import { getCurrentProjectId } from "app/hooks";

const setAction = (action: COPYMOVEACTION) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.action = action;
            const projectId = getCurrentProjectId();

            if (action === COPYMOVEACTION.MOVE && state.project === projectId) {
                state.project = "";
            }
        })
    );
};

const setProject = (projectId?: string) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.project = projectId;
        })
    );
};

const setStack = (stackId: string) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.stack = stackId;
        })
    );
};

const setPosition = (after: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.after = after;
        })
    );
};

const setCover = (cover: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.cover = cover;
        })
    );
};

const setAttachments = (attachments: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.attachments = attachments;
        })
    );
};

const setTimelogs = (timelogs: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.timelogs = timelogs;
        })
    );
};

const setComments = (comments: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.comments = comments;
        })
    );
};

const setSubtasks = (subtasks: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.subtasks = subtasks;
        })
    );
};

const setKeepSettings = (keepSettings: boolean) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.keepSettings = keepSettings;
        })
    );
};

const show = (options: Partial<ICopyMoveStore>) => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state = Object.assign(state, options);
            state.isVisible = true;
        })
    );
};

const hide = () => {
    CopyMoveStore.set(
        produce((state: ICopyMoveStore) => {
            state.isVisible = false;
            if (!state.keepSettings) {
                state.action = undefined;
                state.title = undefined;
                state.project = undefined;
                state.cover = false;
                state.attachments = false;
                state.timelogs = false;
                state.comments = false;
                state.subtasks = false;
            }
        })
    );
};

export const CopyMoveActions = {
    setAction,
    setProject,
    setStack,
    setPosition,
    setCover,
    setTimelogs,
    setAttachments,
    setComments,
    setSubtasks,
    setKeepSettings,
    show,
    hide,
};
