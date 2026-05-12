// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Button, Intent, Menu, MenuDivider, MenuItem, Placement, Popover, Size } from "@blueprintjs/core";

import { Icon } from "app/components/common";

export interface IColoredMenuItem {
    title: string;
    value: string | undefined;
    icon: string;
    intent: Intent;
}

interface IColoredSelectCellProps {
    items: (IColoredMenuItem | undefined)[];
    value?: string;
    placeholder?: string;
    intent: Intent;
    icon: string;
    placement?: Placement;
    size?: Size;
    disabled?: boolean;
    onChange: (value: string | undefined) => void;
}
export const ColoredSelectCell: FunctionComponent<IColoredSelectCellProps> = ({
    items,
    value,
    placeholder,
    intent,
    icon,
    placement,
    size,
    disabled,
    onChange,
}) => {
    const currentValue = useMemo(() => {
        return items.find(item => item && item.value === value);
    }, [value]);

    return (
        <div className="colored-select-cell">
            <Popover
                fill
                captureDismiss
                content={
                    <Menu className="colored-select-menu">
                        {items.map((item, index) => {
                            if (item == null) {
                                return <MenuDivider key={index} />;
                            }
                            return (
                                <MenuItem
                                    key={index}
                                    text={item.title}
                                    intent={item.intent}
                                    icon={<Icon icon={item.icon} />}
                                    onClick={() => onChange(item.value)}
                                />
                            );
                        })}
                    </Menu>
                }
                disabled={disabled}
                placement={placement}
            >
                <Button
                    size={size}
                    intent={intent}
                    icon={<Icon icon={icon} />}
                    alignText="left"
                    endIcon={!disabled && <Icon icon="chevron-down" />}
                >
                    {currentValue?.title || placeholder || "Select"}
                </Button>
            </Popover>
        </div>
    );
};
