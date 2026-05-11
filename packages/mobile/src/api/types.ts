// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Standard JSON envelope from `c.replySuccess` / `c.replyError`. */
export type ApiSuccess<T> = {
    success: true;
    timestamp: string;
    data?: T;
    message?: string;
    meta?: unknown;
};

export type ApiErrorBody = {
    success: false;
    message?: string;
    errorCode?: string;
};
