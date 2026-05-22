// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Request-scoped context helpers used by loaders.
 *
 * These read the current request's user, role and instance id from the
 * AsyncLocalStorage set up by `middleware/requestContext.ts`. They are the
 * primary way loader code accesses the caller identity without threading
 * `user` through every call site.
 */

import { requestContext } from "../services/requestContext";
import type { User } from "../types";
import { IRole, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { getLicense } from "@stacks/license";

export const getInstanceId = (): string => {
    return requestContext.getInstanceId();
};

/** Current authenticated user for the in-flight request. */
export const getCurrentUser = (): User => {
    return requestContext.getCurrentUser();
};

/** Role for the in-flight request (loaded alongside the user by `requireAuth`). */
export const getCurrentRole = (): IRole => {
    return requestContext.getCurrentRole();
};

/** License entry for the current user's tenant, if any. */
export const getTenantLicense = () => {
    const user = getCurrentUser();
    const license = getLicense();
    return license.tenants.find(tenant => tenant.id === user.tenant);
};

const canAccess = (section: ROLE_SECTIONS, action: "read" | "write") => {
    const role: IRole = getCurrentRole();
    const user = getCurrentUser();
    if (user && user.admin) return true;
    return Boolean(role.access[section]?.[action]);
};

export const canRead = (section: ROLE_SECTIONS) => canAccess(section, ROLE_ACTIONS.READ);
export const canWrite = (section: ROLE_SECTIONS) => canAccess(section, ROLE_ACTIONS.WRITE);
