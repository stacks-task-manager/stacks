// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Mousetrap hooks and selectors.
 */
import mousetrap, { ExtendedKeyboardEvent } from "mousetrap";
import { FunctionComponent, useEffect, useRef } from "react";

/**
 * Use mousetrap hook
 *
 * @param  {(string | string[])} handlerKey - A key, key combo or array of combos according to Mousetrap documentation.
 * @param  { function } handlerCallback - A function that is triggered on key combo catch.
 * @param  { string } evtType - A string that specifies the type of event to listen for. It can be 'keypress', 'keydown' or 'keyup'.
 */
export const useMousetrap = (
    handlerKey: string | string[],
    handlerCallback: (evt: ExtendedKeyboardEvent, combo: string) => void,
    evtType?: "keypress" | "keydown" | "keyup"
) => {
    const actionRef = useRef<(evt: ExtendedKeyboardEvent, combo: string) => void>(handlerCallback);

    useEffect(() => {
        mousetrap.bind(
            handlerKey,
            (evt: ExtendedKeyboardEvent, combo: string) => {
                typeof actionRef.current === "function" && actionRef.current(evt, combo);
            },
            evtType
        );
        return () => {
            mousetrap.unbind(handlerKey);
        };
    }, [handlerKey]);
};

interface IHotkeyProps {
    hotkey: string | string[];
    onPress: () => void;
    type?: "keypress" | "keydown" | "keyup";
}
export const Hotkey: FunctionComponent<IHotkeyProps> = ({ hotkey, onPress, type }) => {
    const handlePress = () => {
        onPress();
    };

    useMousetrap(hotkey, handlePress, type);
    return null;
};

export const useElementHotkey = (handlerKey: string | string[], elId: string, scrollTo?: boolean) => {
    const action = () => {
        if (scrollTo) {
            document.getElementById(elId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => {
                document.getElementById(elId)?.click();
            }, 500);
        } else {
            setTimeout(() => {
                document.getElementById(elId)?.click();
            }, 100);
        }
    };

    useMousetrap(handlerKey, action);

    return action;
};
