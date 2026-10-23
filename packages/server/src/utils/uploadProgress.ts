// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export interface UploadProgressRecord {
    progress: number;
    total: number;
    hash?: string;
    userId: string;
    tenant: string;
}

export function visibleUploadProgress(
    record: UploadProgressRecord | undefined,
    userId: string,
    tenant: string
): Omit<UploadProgressRecord, "userId" | "tenant"> | null {
    if (!record || record.userId !== userId || record.tenant !== tenant) return null;
    const { userId: _userId, tenant: _tenant, ...visible } = record;
    return visible;
}
