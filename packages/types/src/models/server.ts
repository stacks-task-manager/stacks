// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export interface IMember {
    id: number | string;
    email: string;
    nickname: string;
    firstName: string;
    lastName: string;
    created?: string;
}
