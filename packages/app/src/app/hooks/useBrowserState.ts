// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * React hook useBrowserState and related helpers.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

// Debounce timeout constant for state changes (30 seconds)
const STATE_CHANGE_DEBOUNCE_TIMEOUT = 30 * 1000; // 30 seconds in milliseconds

interface UseBrowserStateOptions {
    idleTimeout?: number; // Time in ms before considering user idle (default: 5 minutes)
}

export type BrowserState = 'active' | 'idle' | 'closed';

/**
 * Custom hook to track browser tab activity states
 * Returns state and methods to set callbacks for resume, idle, and close events
 * Useful for showing user status indicators (green/orange/red bubbles)
 */
export const useBrowserState = (
    options: UseBrowserStateOptions = {}
): BrowserState => {
    const { idleTimeout = 5 * 60 * 1000 } = options; // Default 5 minutes
    const [state, setState] = useState<BrowserState>('active');

    // Callback refs
    const onResumeCallbackRef = useRef<(() => void) | null>(null);
    const onIdleCallbackRef = useRef<(() => void) | null>(null);
    const onCloseCallbackRef = useRef<(() => void) | null>(null);

    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isIdleRef = useRef(false);
    const lastActivityRef = useRef(Date.now());

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

    // Clear idle timer
    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    // Clear debounce timer
    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    // Start idle timer
    const startIdleTimer = useCallback(() => {
        clearIdleTimer();
        idleTimerRef.current = setTimeout(() => {
            if (!isIdleRef.current) {
                isIdleRef.current = true;
                debouncedSetState('idle');
                onIdleCallbackRef.current?.();
            }
        }, idleTimeout);
    }, [clearIdleTimer, idleTimeout]);

    // Handle user activity (resume from idle)
    const handleActivity = useCallback(() => {
        lastActivityRef.current = Date.now();

        if (isIdleRef.current) {
            isIdleRef.current = false;
            debouncedSetState('active');
            onResumeCallbackRef.current?.();
        }

        startIdleTimer();
    }, [startIdleTimer]);

    // Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = useCallback(() => {
        if (document.hidden) {
            // Tab is hidden (switched away or minimized)
            clearIdleTimer();
            if (!isIdleRef.current) {
                isIdleRef.current = true;
                debouncedSetState('idle');
                onIdleCallbackRef.current?.();
            }
        } else {
            // Tab is visible again
            if (isIdleRef.current) {
                isIdleRef.current = false;
                debouncedSetState('active');
                onResumeCallbackRef.current?.();
            }
            startIdleTimer();
        }
    }, [clearIdleTimer, startIdleTimer]);

    // Handle window focus/blur
    const handleFocus = useCallback(() => {
        handleActivity();
    }, [handleActivity]);

    const handleBlur = useCallback(() => {
        clearIdleTimer();
        if (!isIdleRef.current) {
            isIdleRef.current = true;
            debouncedSetState('idle');
            onIdleCallbackRef.current?.();
        }
    }, [clearIdleTimer]);

    // Handle page unload/close
    const handleBeforeUnload = useCallback(() => {
        clearDebounceTimer(); // Clear debounce for immediate close state
        setState('closed');
        onCloseCallbackRef.current?.();
    }, [clearDebounceTimer]);

    useEffect(() => {
        // Activity events
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, true);
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Start initial timer
        startIdleTimer();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleActivity, true);
            });

            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            clearIdleTimer();
            clearDebounceTimer();
        };
    }, [handleActivity, handleVisibilityChange, handleFocus, handleBlur, handleBeforeUnload, startIdleTimer, clearIdleTimer]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearDebounceTimer(); // Clear debounce for immediate close state
            setState('closed');
            onCloseCallbackRef.current?.();
        };
    }, [clearDebounceTimer]);

    return state;
};

export default useBrowserState;