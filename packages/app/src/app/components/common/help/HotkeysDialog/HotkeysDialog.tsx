// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Dialog, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useState } from "react";
import { Icon } from "../../Icon/Icon";

import { Scroller } from "../../Scroller/Scroller";
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Blank,
    KeyBackspace,
    KeyCommand,
    KeyControl,
    KeyEnter,
    KeyOption,
    KeyShift,
    KeyTab,
} from "@blueprintjs/icons";

interface IHotkeyCombo {
    win32: string[];
    darwin: string[];
    linux: string[];
}

interface IHotkey {
    title: string;
    tooltip?: string;
    combos: IHotkeyCombo;
}

interface IHotkeySection {
    title: string;
    kotkeys: IHotkey[];
}

interface IKeys {
    [x: string]: string;
}

function resolveHotkeyPlatform(): keyof IHotkeyCombo {
    const p = window.platform;
    if (p === "darwin" || p === "win32" || p === "linux") {
        return p;
    }
    if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent;
        if (/Linux/i.test(ua)) {
            return "linux";
        }
        if (/Mac|iPhone|iPad|iPod/i.test(ua)) {
            return "darwin";
        }
    }
    return "win32";
}

const KEYSICONS: { [key: string]: React.ReactNode } = {
    ctrl: window.platform === "darwin" ? <KeyControl /> : <Blank />,
    meta: window.platform === "darwin" ? <KeyCommand /> : <KeyControl />,
    alt: window.platform === "darwin" ? <KeyOption /> : "Alt",
    shift: <KeyShift />,
    left: <ArrowLeft />,
    right: <ArrowRight />,
    up: <ArrowUp />,
    down: <ArrowDown />,
    tab: <KeyTab />,
    enter: <KeyEnter />,
    backspace: <KeyBackspace />,
};

const KEYS: IKeys = Object.freeze({
    ctrl: "Ctrl",
    meta: window.platform === "darwin" ? "Cmd" : "Ctrl",
    alt: window.platform === "darwin" ? "Opt" : "Alt",
    shift: "Shift",
    left: "",
    right: "",
    up: "",
    down: "",
    tab: "Tab",
    enter: "Enter",
    backspace: "Backspace",
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const shortcuts: IHotkeySection[] = require("./hotkeys.json");

interface IHotkeysDialogProps {
    onClose: () => void;
}
export const HotkeysDialog: FunctionComponent<IHotkeysDialogProps> = ({ onClose }) => {
    const [open, setOpen] = useState(true);
    const comboPlatform = resolveHotkeyPlatform();

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <Dialog
            title="Hotkeys"
            isOpen={open}
            className={Classes.HOTKEY_DIALOG}
            onClose={handleClose}
            onClosed={onClose}
        >
            <Scroller className={Classes.DIALOG_BODY} thin vertical shadows maxHeight={500}>
                <div className={Classes.HOTKEY_COLUMN}>
                    {shortcuts.map((shortcut: IHotkeySection, i: number) => {
                        return (
                            <React.Fragment key={i}>
                                <>
                                    <h4 className={Classes.HEADING}>{shortcut.title}</h4>
                                    {(shortcut.kotkeys ?? []).map((hotkey: IHotkey, j: number) => {
                                        return (
                                            <div className={Classes.HOTKEY} key={`${i}${j}`}>
                                                <div className={Classes.HOTKEY_LABEL}>
                                                    {hotkey.title}

                                                    {hotkey.tooltip && (
                                                        <>
                                                            {" "}
                                                            <Tooltip content={hotkey.tooltip}>
                                                                <Icon
                                                                    icon="info-circle"
                                                                    className={Classes.TEXT_DISABLED}
                                                                />
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </div>
                                                <div className={Classes.KEY_COMBO}>
                                                    {(hotkey.combos[comboPlatform] ?? []).map(
                                                        (key: string, x: number) => {
                                                            if (key === "...")
                                                                return <small key={key}>{key}</small>;

                                                            return (
                                                                <kbd
                                                                    key={`${i}${j}${x}`}
                                                                    className={classNames(Classes.KEY, {
                                                                        [Classes.MODIFIER_KEY]: !x,
                                                                    })}
                                                                >
                                                                    {KEYSICONS[key] ?? null}
                                                                    {KEYS.hasOwnProperty(key)
                                                                        ? KEYS[key]
                                                                        : key}
                                                                </kbd>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            </React.Fragment>
                        );
                    })}

                    <div style={{ height: 40 }} />
                </div>
            </Scroller>
        </Dialog>
    );
};
