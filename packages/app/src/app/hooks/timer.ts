// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timer hooks and selectors.
 */
import { useEffect, useState } from "react";

/**
 * Registers a callback to run on a shared interval of the given delay. Multiple callers sharing the same
 * delay reuse a single underlying setInterval. Returns a stop function that unregisters the callback
 * (and clears the interval once the last caller stops).
 * @param callback The function to invoke on each interval tick
 * @param delay The interval delay in milliseconds
 * @returns A function that stops the callback from being invoked again
 */
export function useInterval(callback: () => void, delay: number) {
    const intName = `int-${delay}`;
    /**
     * Invokes every registered callback for the current interval.
     */
    const handleCallCallback = () => {
        if (window.intervalCallbacks[intName] != null) {
            for (const cb of window.intervalCallbacks[intName]) {
                cb();
            }
        }
    };

    /**
     * Unregisters the callback from the interval, clearing it entirely once no callbacks remain.
     */
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

/**
 * Returns a value that only updates after the given delay has elapsed without the input changing.
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
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
