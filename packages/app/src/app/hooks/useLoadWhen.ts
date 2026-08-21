// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * React hook useLoadWhen and related helpers.
 */
import { DependencyList, useEffect } from "react";

/**
 * Runs `load` once when `when` is true (e.g. hydrate an entity if missing from
 * the store). `load` may return a promise, which is fired asynchronously.
 * @param when When true, runs `load` on effect runs.
 * @param load The load function to invoke.
 * @param deps Dependency list that controls when the effect re-runs.
 * @returns void No return value.
 */
export function useLoadWhen(when: boolean, load: () => void | Promise<void>, deps: DependencyList): void {
    useEffect(() => {
        if (!when) return;
        void Promise.resolve(load());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps explicitly
    }, deps);
}
