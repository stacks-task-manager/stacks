// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { SymbolSquare } from "@blueprintjs/icons";
import xor from "lodash/xor";
import React, { FunctionComponent } from "react";

import { IStack } from "@stacks/types";
import { Icon } from "app/components/common";
import { useStacks } from "app/hooks";

export interface IStacksMenuProps {
    value?: string[];
    canClear?: boolean;
    showTitle?: boolean;
    singleSelection?: boolean;
    onChange: (stacksId: string[]) => void;
}
export const StacksMenu: FunctionComponent<IStacksMenuProps> = ({
    value,
    canClear,
    showTitle,
    singleSelection,
    onChange,
}) => {
    const stacks = useStacks();

    const handleToggleStackId = (stackId: string) => {
        onChange(singleSelection ? [stackId] : xor(value || [], [stackId]));
    };

    return (
        <Menu>
            {showTitle !== false && <MenuDivider title="Select stack" />}
            {stacks.map((stack: IStack) => {
                return (
                    <MenuItem
                        icon={<SymbolSquare color={stack.tint || Colors.GRAY3} />}
                        text={stack.title}
                        key={stack.id}
                        labelElement={<Icon icon={value?.includes(stack.id) ? "check" : undefined} />}
                        onClick={() => handleToggleStackId(stack.id)}
                        shouldDismissPopover={singleSelection ? true : false}
                    />
                );
            })}
            {canClear && (
                <>
                    <MenuDivider />
                    <MenuItem
                        text="All stacks"
                        icon="small-square"
                        onClick={() => onChange([])}
                        shouldDismissPopover={true}
                    />
                </>
            )}
        </Menu>
    );
};
