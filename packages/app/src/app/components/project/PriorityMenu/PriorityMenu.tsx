// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback, useRef, useState } from "react";
import { PRIORITY } from "@stacks/types";
import { PriorityMenuItems } from "app/widgets";

const Priorities = [PRIORITY.NONE, PRIORITY.CRITICAL, PRIORITY.HIGH, PRIORITY.MEDIUM, PRIORITY.LOW];

interface IPriorityMenuProps {
    value: PRIORITY;
    hasAll?: boolean;
    shouldDismiss?: boolean;
    onChange: (value: PRIORITY | null, event: React.MouseEvent) => void;
}
export const PriorityMenu: FunctionComponent<IPriorityMenuProps> = ({
    value,
    hasAll,
    shouldDismiss,
    onChange,
}) => {
    const [selected, setSelected] = useState<number | undefined>(undefined);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const handleFocus = useCallback((spanRef: HTMLSpanElement | null) => {
        if (spanRef) {
            spanRef.focus();
        }
    }, []);

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selected == null || selected + 1 > 4) {
                setSelected(0);
            } else {
                setSelected(selected + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selected == null || selected - 1 < 0) {
                setSelected(4);
            } else {
                setSelected(selected - 1);
            }
        } else if (event.key === "Enter") {
            if (selected != null) {
                document.getElementById(`priority-${Priorities[selected]}`)?.click();
            }
        } else if (event.key === "Escape") {
            if (btnRef.current) {
                btnRef.current.click();
            }
        }
    };

    return (
        <span tabIndex={0} ref={handleFocus} style={{ outline: "none" }} onKeyDown={handleOnKeyDown}>
            <button style={{ display: "none" }} className={Classes.POPOVER_DISMISS} ref={btnRef} />
            <Menu data-testid="priority-menu">
                {hasAll && (
                    <React.Fragment>
                        <MenuItem
                            text={translate("All priorities")}
                            shouldDismissPopover={shouldDismiss}
                            active={selected === 0}
                            onClick={(event: React.MouseEvent) => onChange(null, event)}
                        />
                        <MenuDivider />
                    </React.Fragment>
                )}

                <PriorityMenuItems
                    onChange={onChange}
                    selected={selected}
                    showDivider={!hasAll}
                    shouldDismiss={shouldDismiss}
                    value={value}
                />
            </Menu>
        </span>
    );
};
