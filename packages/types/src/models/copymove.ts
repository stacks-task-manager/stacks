// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum COPYMOVEACTION {
    COPY = "copy",
    MOVE = "move",
}

export enum COPYMOVETYPE {
    TASK = "task",
    STACK = "stack",
}

export interface ICopyMoveDestination {
    id: string;
    title: string;
}
