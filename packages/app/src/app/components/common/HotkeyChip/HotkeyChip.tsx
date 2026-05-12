// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { FunctionComponent, useMemo } from "react";

interface IKeys {
    [x: string]: string;
}

const KEYS: IKeys = Object.freeze({
    ctrl: window.platform === "darwin" ? "⌃" : "Ctrl",
    meta: window.platform === "darwin" ? "⌘" : "Ctrl",
    alt: window.platform === "darwin" ? "⌥" : "Alt",
    shift: "⇧",
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
    tab: "↹",
    enter: "↵",
    esc: "Esc",
});

interface IHotkeyChipProps {
    keys: (string | number)[];
    separator?: string;
    light?: boolean;
    transparent?: boolean;
    small?: boolean;
    round?: boolean;
}
export const HotkeyChip: FunctionComponent<IHotkeyChipProps> = ({
    keys,
    separator,
    light,
    transparent,
    small,
    round,
}) => {
    const memoizedKeys = useMemo(() => {
        return keys.map((key: string | number, index: number) => {
            let item = <span>{key}</span>;
            if (KEYS.hasOwnProperty(key)) {
                item = <span>{KEYS[key]}</span>;
            }

            let sep: string | null = null;
            if (index < keys.length - 1) {
                if (separator) {
                    sep = separator;
                } else if (window.platform !== "darwin") {
                    sep = "+";
                }
            }

            return (
                <React.Fragment key={index}>
                    {item}
                    {sep}
                </React.Fragment>
            );
        });
    }, [keys]);

    return (
        <div className={classNames("hotkey-chip", { light, transparent, small, round })}>{memoizedKeys}</div>
    );
};
