// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timer hooks and selectors.
 */
import { useEffect, useState } from "react";

export function useInterval(callback: () => void, delay: number) {
    const intName = `int-${delay}`;
    const handleCallCallback = () => {
        if (window.intervalCallbacks[intName] != null) {
            for (const cb of window.intervalCallbacks[intName]) {
                cb();
            }
        }
    };

    const stop = () => {
        if (window.intervalCallbacks[intName].length > 1) {
            window.intervalCallbacks[intName] = window.intervalCallbacks[intName].filter(
                cb => cb !== callback
            );
        } else {
            if (window.intervalRefs[intName]) {
                clearInterval(window.intervalRefs[intName]);
            }
            delete window.intervalRefs[intName];
            delete window.intervalCallbacks[intName];
        }
    };

    useEffect(() => {
        if (!window.intervalRefs) {
            window.intervalRefs = {};
            window.intervalCallbacks = {};
        }

        if (!window.intervalRefs[intName]) {
            window.intervalRefs[intName] = setInterval(handleCallCallback, delay);
            window.intervalCallbacks[intName] = [];
        }

        window.intervalCallbacks[intName].push(callback);

        return stop;
    }, []);

    return stop;
}

export function useDebounce(value: any, delay: number) {
    // State and setters for debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(
        () => {
            // Update debounced value after delay
            const handler = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);
            // Cancel the timeout if value changes (also on delay change or unmount)
            // This is how we prevent debounced value from updating if value is changed ...
            // .. within the delay period. Timeout gets cleared and restarted.
            return () => {
                clearTimeout(handler);
            };
        },
        [value, delay] // Only re-call effect if value or delay changes
    );
    return debouncedValue;
}
