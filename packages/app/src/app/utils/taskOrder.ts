// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

/**
 * Returns a copy of items in their persisted order. Items absent from the order
 * retain the legacy leading position and their relative order.
 */
export function sortByIdOrder<T>(
    items: readonly T[],
    order: readonly string[],
    getId: (item: T) => string
): T[] {
    const positions = new Map<string, number>();
    for (const [index, id] of order.entries()) {
        if (!positions.has(id)) positions.set(id, index);
    }

    return [...items].sort(
        (left, right) => (positions.get(getId(left)) ?? -1) - (positions.get(getId(right)) ?? -1)
    );
}
