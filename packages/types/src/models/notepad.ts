// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPermissions } from "./permissions.js";
import { ISimpleDocument } from "./record.js";

export interface INotepad {
    id: string;
    content: string;
    document: ISimpleDocument | null;
    permissions: IPermissions;
    cover?: string;
    created?: string;
    updated?: string;
}
