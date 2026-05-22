// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import type { IPerson, ITag } from "@stacks/types";

import { fetchPeople, fetchTags } from "../api/endpoints";

/**
 * Shared cache of every person in the workspace. Used by the TaskCard widgets
 * (assignees avatars). Cached for 5 minutes since the same data is reused
 * across many cards.
 */
export function usePeople() {
    return useQuery<IPerson[]>({
        queryKey: ["people"],
        queryFn: fetchPeople,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Shared cache of every tag (status + regular tag entries) in the workspace.
 * Lets the TaskCard resolve `task.status` → `ITag` for the colored status bar
 * and tag chips, since mobile has no global tag store.
 */
export function useTags() {
    return useQuery<ITag[]>({
        queryKey: ["tags"],
        queryFn: fetchTags,
        staleTime: 5 * 60 * 1000,
    });
}

/** Look up a person by id in a list; tolerates undefined. */
export function findPerson(people: IPerson[] | undefined, id: string): IPerson | undefined {
    if (!people) return undefined;
    return people.find(p => p.id === id);
}

/** Look up a tag by id in a list; tolerates undefined. */
export function findTag(tags: ITag[] | undefined, id: string | null | undefined): ITag | undefined {
    if (!tags || !id) return undefined;
    return tags.find(t => t.id === id);
}
