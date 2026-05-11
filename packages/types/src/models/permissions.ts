// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { UUID } from "./basic";
import { POLLINGTYPE } from "./updates";

export interface IPermissions {
    id: UUID;
    isPublic: boolean;
    visibleUsers: string[];
    visibleRoles: string[];
    owner: string;
    type: POLLINGTYPE;
}
