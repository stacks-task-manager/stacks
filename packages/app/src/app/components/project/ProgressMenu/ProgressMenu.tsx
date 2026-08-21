// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useCallback, useMemo, useRef } from "react";
import { Classes, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { Blank, Tick } from "@blueprintjs/icons";
import { useMenuKeyboardNavigation } from "app/hooks";

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

    const { selected, btnRef, handleOnKeyDown } = useMenuKeyboardNavigation({
        maxIndex: 10,
        onEnter: (selected, event) => {
            onChange(selected * 10, event as unknown as React.MouseEvent);
        },
    });

    const handleFocus = useCallback((spanRef: HTMLSpanElement | null) => {
        if (spanRef) {
            spanRef.focus();
        }

        progressRef.current = spanRef;
    }, []);

    const progressItems = useMemo(() => {
        const groups: Array<{ divider: string; values: number[] }> = [
            { divider: "Idle", values: [0, 10] },
            { divider: "Analysis", values: [20, 30] },
            { divider: "Doing", values: [40, 50, 60, 70] },
            { divider: "Finalizing", values: [80, 90] },
            { divider: "Done", values: [100] },
        ];

        return (
            <>
                {groups.map(group => (
                    <React.Fragment key={group.divider}>
                        <MenuDivider title={translate(group.divider)} />
                        {group.values.map(p => (
                            <MenuItem
                                key={p}
                                text={`${p}%`}
                                labelElement={value === p ? <Tick /> : <Blank />}
                                onClick={(event: React.MouseEvent) => onChange(p, event)}
                                shouldDismissPopover={shouldDismiss}
                                active={selected === p / 10}
                                data-testid={`progress-menu-item-${p}`}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </>
        );
    }, [value, selected, shouldDismiss, onChange]);

    if (menu === false) {
        return progressItems;
    }

    return (
        <span tabIndex={0} ref={handleFocus} style={{ outline: "none" }} onKeyDown={handleOnKeyDown}>
            <button style={{ display: "none" }} className={Classes.POPOVER_DISMISS} ref={btnRef} />
            <Menu data-testid="progress-menu">{progressItems}</Menu>
        </span>
    );
};
