// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent, useCallback } from "react";
import { PRIORITY } from "@stacks/types";
import { useMenuKeyboardNavigation } from "app/hooks";
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
    const { selected, btnRef, handleOnKeyDown } = useMenuKeyboardNavigation({
        maxIndex: 4,
        onEnter: selected => {
            document.getElementById(`priority-${Priorities[selected]}`)?.click();
        },
    });

    const handleFocus = useCallback((spanRef: HTMLSpanElement | null) => {
        if (spanRef) {
            spanRef.focus();
        }
    }, []);

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
