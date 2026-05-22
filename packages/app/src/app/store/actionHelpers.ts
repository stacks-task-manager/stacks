// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Replace or append rows by id (common list upsert for store actions).
 */
export function upsertById<T extends { id: string }>(
    existing: T[],
    incoming: T[],
    getId: (item: T) => string = item => item.id
): T[] {
    const ids = incoming.map(getId);
    return [...existing.filter(item => !ids.includes(getId(item))), ...incoming];
}

/**
 * Standard loading sequence: mutate store → fetch → mutate store with result.
 * `set` must wrap Immer, e.g. `(recipe) => Store.set(produce(recipe))`.
 */
export async function runStoreLoad<TState, TData>({
    set,
    onStart,
    load,
    onSuccess,
}: {
    set: (recipe: (draft: TState) => void) => void;
    onStart: (draft: TState) => void;
    load: () => Promise<TData>;
    onSuccess: (draft: TState, data: TData) => void;
}): Promise<TData> {
    set(onStart);
    const data = await load();
    set(draft => onSuccess(draft, data));
    return data;
}

/** Debounce helper for store query fields (500ms is the app default). */
export function createDebouncedCallback(ms: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (run: () => void) => {
        if (timer != null) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            timer = null;
            run();
        }, ms);
    };
}

/** `Object.assign` on a filter object inside Immer (shared by people, timelogs, calendar). */
export function patchFilterField<T extends object, K extends keyof T>(
    filters: T,
    key: K,
    value: T[K]
): void {
    Object.assign(filters, { [key]: value } as Pick<T, K>);
}
