// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * React hook useBrowserState and related helpers.
 */
import { useEffect, useRef, useCallback, useState } from "react";

// Debounce timeout constant for state changes (30 seconds)
const STATE_CHANGE_DEBOUNCE_TIMEOUT = 30 * 1000; // 30 seconds in milliseconds

interface UseBrowserStateOptions {
    idleTimeout?: number; // Time in ms before considering user idle (default: 5 minutes)
}

export type BrowserState = "active" | "idle" | "closed";

/**
 * Custom hook to track browser tab activity states and expose the current
 * presence so the UI can show user status indicators (green/orange/red bubbles).
 * @param options Optional hook configuration.
 * @param options.idleTimeout Time in ms before considering the user idle (default: 5 minutes).
 * @returns {BrowserState} The current browser state: 'active', 'idle', or 'closed'.
 */
export const useBrowserState = (options: UseBrowserStateOptions = {}): BrowserState => {
    const { idleTimeout = 5 * 60 * 1000 } = options; // Default 5 minutes
    const [state, setState] = useState<BrowserState>("active");

    // Callback refs
    const onResumeCallbackRef = useRef<(() => void) | null>(null);
    const onIdleCallbackRef = useRef<(() => void) | null>(null);
    const onCloseCallbackRef = useRef<(() => void) | null>(null);

    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isIdleRef = useRef(false);
    const lastActivityRef = useRef(Date.now());

    /**
     * Debounced state setter that only delays transitions to the 'idle' state.
     * @param newState The new browser state to set.
     */
    // Debounced setState function - only delays transitions to 'idle' state
    const debouncedSetState = useCallback((newState: BrowserState) => {
        // Only debounce transitions to idle state
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setState(newState);
            debounceTimerRef.current = null;
        }, STATE_CHANGE_DEBOUNCE_TIMEOUT);
    }, []);

    /**
     * Clears the pending idle timer.
     */
    // Clear idle timer
    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    /**
     * Clears the pending debounce timer.
     */
    // Clear debounce timer
    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    /**
     * (Re)starts the idle timer; when it fires, marks the user as idle.
     */
    // Start idle timer
    const startIdleTimer = useCallback(() => {
        clearIdleTimer();
        idleTimerRef.current = setTimeout(() => {
            if (!isIdleRef.current) {
                isIdleRef.current = true;
                debouncedSetState("idle");
                onIdleCallbackRef.current?.();
            }
        }, idleTimeout);
    }, [clearIdleTimer, idleTimeout]);

    /**
     * Records user activity and resumes from the idle state if needed,
     * then restarts the idle timer.
     */
    // Handle user activity (resume from idle)
    const handleActivity = useCallback(() => {
        lastActivityRef.current = Date.now();

        if (isIdleRef.current) {
            isIdleRef.current = false;
            debouncedSetState("active");
            onResumeCallbackRef.current?.();
        }

        startIdleTimer();
    }, [startIdleTimer]);

    /**
     * Handles tab visibility changes (switch/minimize): marks the user idle when
     * hidden and resumes when visible again.
     */
    // Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = useCallback(() => {
        if (document.hidden) {
            // Tab is hidden (switched away or minimized)
            clearIdleTimer();
            if (!isIdleRef.current) {
                isIdleRef.current = true;
                debouncedSetState("idle");
                onIdleCallbackRef.current?.();
            }
        } else {
            // Tab is visible again
            if (isIdleRef.current) {
                isIdleRef.current = false;
                debouncedSetState("active");
                onResumeCallbackRef.current?.();
            }
            startIdleTimer();
        }
    }, [clearIdleTimer, startIdleTimer]);

    /**
     * Handles window focus, treating it as user activity.
     */
    // Handle window focus/blur
    const handleFocus = useCallback(() => {
        handleActivity();
    }, [handleActivity]);

    /**
     * Handles window blur, marking the user idle immediately.
     */
    const handleBlur = useCallback(() => {
        clearIdleTimer();
        if (!isIdleRef.current) {
            isIdleRef.current = true;
            debouncedSetState("idle");
            onIdleCallbackRef.current?.();
        }
    }, [clearIdleTimer]);

    /**
     * Handles page unload/close, immediately setting the state to 'closed'.
     */
    // Handle page unload/close
    const handleBeforeUnload = useCallback(() => {
        clearDebounceTimer(); // Clear debounce for immediate close state
        setState("closed");
        onCloseCallbackRef.current?.();
    }, [clearDebounceTimer]);

    useEffect(() => {
        // Activity events
        const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, true);
        });

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Start initial timer
        startIdleTimer();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleActivity, true);
            });

            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("beforeunload", handleBeforeUnload);

            clearIdleTimer();
            clearDebounceTimer();
        };
    }, [
        handleActivity,
        handleVisibilityChange,
        handleFocus,
        handleBlur,
        handleBeforeUnload,
        startIdleTimer,
        clearIdleTimer,
    ]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearDebounceTimer(); // Clear debounce for immediate close state
            setState("closed");
            onCloseCallbackRef.current?.();
        };
    }, [clearDebounceTimer]);

    return state;
};

export default useBrowserState;
