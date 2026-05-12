// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useCallback, useMemo, useRef, useState } from "react";
import { Classes, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { Blank, Tick } from "@blueprintjs/icons";

interface IProgressMenuProps {
    value: number;
    shouldDismiss?: boolean;
    menu?: boolean;
    onChange: (value: number, event: React.MouseEvent) => void;
}

export const ProgressMenu: FunctionComponent<IProgressMenuProps> = ({
    value,
    shouldDismiss,
    menu,
    onChange,
}) => {
    const progressRef = useRef<HTMLSpanElement | null>(null);
    const [selected, setSelected] = useState<number | undefined>(undefined);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const handleFocus = useCallback((spanRef: HTMLSpanElement | null) => {
        if (spanRef) {
            spanRef.focus();
        }

        progressRef.current = spanRef;
    }, []);

    const handleOnKeyDown = (event: React.KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selected == null || selected + 1 > 10) {
                setSelected(0);
            } else {
                setSelected(selected + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selected == null || selected - 1 < 0) {
                setSelected(10);
            } else {
                setSelected(selected - 1);
            }
        } else if (event.key === "Enter") {
            if (selected != null && progressRef.current) {
                onChange(selected * 10, event as unknown as React.MouseEvent);
            }
        } else if (event.key === "Escape") {
            if (btnRef.current) {
                btnRef.current.click();
            }
        }
    };

    const progressItems = useMemo(() => {
        return (
            <>
                <MenuDivider title={translate("Idle")} />
                <MenuItem
                    text="0%"
                    labelElement={!value || value === 0 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(0, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 0}
                />
                <MenuItem
                    text="10%"
                    labelElement={value === 10 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(10, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 1}
                />
                <MenuDivider title={translate("Analysis")} />
                <MenuItem
                    text="20%"
                    labelElement={value === 20 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(20, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 2}
                />
                <MenuItem
                    text="30%"
                    labelElement={value === 30 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(30, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 3}
                />
                <MenuDivider title={translate("Doing")} />
                <MenuItem
                    text="40%"
                    labelElement={value === 40 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(40, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 4}
                />
                <MenuItem
                    text="50%"
                    labelElement={value === 50 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(50, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 5}
                />
                <MenuItem
                    text="60%"
                    labelElement={value === 60 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(60, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 6}
                />
                <MenuItem
                    text="70%"
                    labelElement={value === 70 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(70, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 7}
                />
                <MenuDivider title={translate("Finalizing")} />
                <MenuItem
                    text="80%"
                    labelElement={value === 80 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(80, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 8}
                />
                <MenuItem
                    text="90%"
                    labelElement={value === 90 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(90, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 9}
                />
                <MenuDivider title={translate("Done")} />
                <MenuItem
                    text="100%"
                    labelElement={value === 100 ? <Tick /> : <Blank />}
                    onClick={(event: React.MouseEvent) => onChange(100, event)}
                    shouldDismissPopover={shouldDismiss}
                    active={selected === 10}
                />
            </>
        );
    }, [value, selected]);

    if (menu === false) {
        return progressItems;
    }

    return (
        <span tabIndex={0} ref={handleFocus} style={{ outline: "none" }} onKeyDown={handleOnKeyDown}>
            <button style={{ display: "none" }} className={Classes.POPOVER_DISMISS} ref={btnRef} />
            <Menu>{progressItems}</Menu>
        </span>
    );
};
