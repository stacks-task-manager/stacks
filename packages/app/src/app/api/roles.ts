// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Role definitions and access matrix updates.
 */
import { IRole } from "@stacks/types";
import request from "./request";

export const RolesAPI = {
    /** Lists roles. */
    async load(): Promise<IRole[]> {
        return request.get("/api/roles");
    },
    /** PATCH title, description, or access JSON. */
    async update(
        id: string,
        data: Partial<Pick<IRole, "access" | "title" | "description">>
    ): Promise<boolean> {
        return request.patch(`/api/roles/${id}`, data);
    },
};
