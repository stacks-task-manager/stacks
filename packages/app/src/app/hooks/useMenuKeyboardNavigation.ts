// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Shared arrow-key / Enter / Escape navigation for popover menus.
 * Both PriorityMenu and ProgressMenu duplicated this logic; this hook
 * centralizes the `selected` index state and key handling.
 */
import React, { useRef, useState } from "react";

interface IMenuKeyboardNavOptions {
    /** Highest selectable index (inclusive). ArrowUp wraps here. */
    maxIndex: number;
    /** Called with the selected index and originating key event when Enter is pressed. */
    onEnter: (selected: number, event: React.KeyboardEvent) => void;
    /** Optional dismiss button to click on Escape. */
    onEscape?: () => void;
}

/**
 * Centralizes `selected`-index state and arrow-key / Enter / Escape handling
 * for popover menus.
 * @param options Hook options.
 * @param options.maxIndex Highest selectable index (inclusive); ArrowUp wraps here.
 * @param options.onEnter Called with the selected index and originating key event when Enter is pressed.
 * @param options.onEscape Optional dismiss handler invoked on Escape.
 * @returns {object} An object with `selected` (current index), `btnRef` (dismiss button ref), and `handleOnKeyDown` (keydown handler to attach to the menu).
 */
export const useMenuKeyboardNavigation = ({ maxIndex, onEnter, onEscape }: IMenuKeyboardNavOptions) => {
    const [selected, setSelected] = useState<number | undefined>(undefined);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    /**
     * Keydown handler: ArrowDown/ArrowUp move the selection (wrapping), Enter
     * invokes `onEnter`, and Escape clicks the dismiss button / calls `onEscape`.
     * @param event The originating React keydown event.
     */
    const handleOnKeyDown = (event: React.KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selected == null || selected + 1 > maxIndex) {
                setSelected(0);
            } else {
                setSelected(selected + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selected == null || selected - 1 < 0) {
                setSelected(maxIndex);
            } else {
                setSelected(selected - 1);
            }
        } else if (event.key === "Enter") {
            if (selected != null) {
                onEnter(selected, event);
            }
        } else if (event.key === "Escape") {
            if (btnRef.current) {
                btnRef.current.click();
            }
            onEscape?.();
        }
    };

    return { selected, btnRef, handleOnKeyDown };
};
