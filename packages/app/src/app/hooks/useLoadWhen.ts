// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * React hook useLoadWhen and related helpers.
 */
import { DependencyList, useEffect } from "react";

/**
 * Runs `load` once when `when` is true (e.g. hydrate entity if missing from store).
 */
export function useLoadWhen(when: boolean, load: () => void | Promise<void>, deps: DependencyList): void {
    useEffect(() => {
        if (!when) return;
        void Promise.resolve(load());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps explicitly
    }, deps);
}
