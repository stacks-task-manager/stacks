// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Clears stale nav refs when records delete.
 */
import { BookmarksActions } from "./bookmarks";
import { RecentsActions } from "./recents";

/** Remove bookmark + recent entry when a resource is deleted (projects, tasks, people, notepad, …). */
export async function cleanupResourceNavigationRefs(resourceId: string): Promise<void> {
    await BookmarksActions.removeResource(resourceId);
    RecentsActions.removeItem(resourceId);
}
