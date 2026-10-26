// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Realtime delivery policy.
 *
 * A socket frame may only be serialized for a recipient that the canonical
 * tenant/ACL/RBAC rules already allow. {@link sanitizeWherePermissions} puts the
 * same visibility rule into a SQL WHERE clause; this module applies that rule to
 * a connected recipient *before* a frame is built, so raw frames obey tenant and
 * visibility rules without client-side filtering.
 *
 * The audience is always produced by server context (request context or an
 * explicit background-job identity), never from a client payload. A missing
 * audience or a missing permissions snapshot fails closed: it is never treated as
 * public access.
 */
import type { IPermissions } from "@stacks/types";

/** Trusted audience for one realtime event: the tenant that owns it plus the resource ACL. */
export interface RealtimeAudience {
    tenant: string;
    permissions?: IPermissions;
}

/** Connected recipient: the authenticated identity stored for a live socket connection. */
export interface RealtimeRecipient {
    userId: string;
    tenant: string;
    role: string;
    admin: boolean;
}

/**
 * Tenant gate only. Presence/status frames and server-addressed targets carry no
 * resource ACL, so tenant membership is the required check.
 */
export function isRealtimeTenantPeer(
    audience: RealtimeAudience | null,
    recipient: RealtimeRecipient | null | undefined
): boolean {
    if (!audience || !recipient || !audience.tenant) {
        return false;
    }
    return audience.tenant === recipient.tenant;
}

/**
 * Full gate: tenant membership plus the canonical visibility rules from
 * {@link sanitizeWherePermissions}. A tenant admin bypasses the ACL only inside
 * that tenant.
 */
export function isRealtimeAudienceAllowed(
    audience: RealtimeAudience | null,
    recipient: RealtimeRecipient | null | undefined
): boolean {
    if (!audience || !recipient || !audience.tenant || !recipient.tenant) {
        return false;
    }
    if (audience.tenant !== recipient.tenant) {
        return false;
    }
    if (recipient.admin) {
        return true;
    }
    const permissions = audience.permissions;
    if (!permissions) {
        return false;
    }
    if (permissions.isPublic) {
        return true;
    }
    if (permissions.owner === recipient.userId) {
        return true;
    }
    if (permissions.visibleRoles.includes(recipient.role)) {
        return true;
    }
    return permissions.visibleUsers.includes(recipient.userId);
}

/**
 * Single delivery gate for every recipient path (broadcast, targeted, queue):
 * an audience carrying a resource ACL uses the full visibility rule, otherwise
 * the frame is a tenant-scoped server-addressed frame.
 */
export function isFrameAuthorized(
    audience: RealtimeAudience | null,
    recipient: RealtimeRecipient | null | undefined
): boolean {
    if (!audience || !recipient) {
        return false;
    }
    return audience.permissions
        ? isRealtimeAudienceAllowed(audience, recipient)
        : isRealtimeTenantPeer(audience, recipient);
}

/** True when an ACL edit can only have narrowed visibility (conservative: any doubt returns true). */
const isNarrowedList = (before: string[] | undefined, after: string[] | undefined): boolean => {
    if (!Array.isArray(before)) {
        return false;
    }
    if (!Array.isArray(after)) {
        return true;
    }
    const kept = new Set(after);
    return before.some(entry => !kept.has(entry));
};

/**
 * Gate for removal invalidations: only an ACL change that withdrew access needs
 * the minimal invalidation frame.
 */
export function isAudienceNarrowed(
    previous: RealtimeAudience | null,
    current: RealtimeAudience | null
): boolean {
    const before = previous?.permissions;
    const after = current?.permissions;
    if (!before || !after) {
        return false;
    }
    if (before.isPublic && !after.isPublic) {
        return true;
    }
    if (before.owner !== after.owner) {
        return true;
    }
    return (
        isNarrowedList(before.visibleUsers, after.visibleUsers) ||
        isNarrowedList(before.visibleRoles, after.visibleRoles)
    );
}
