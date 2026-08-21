// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { SymbolSquare } from "@blueprintjs/icons";
import xor from "lodash/xor";
import React from "react";

import { IStack } from "@stacks/types";
import { Icon } from "app/components/common";
import { useStacks } from "app/hooks";
import { translate } from "@stacks/translations";

export interface IStacksMenuProps {
    value?: string[];
    canClear?: boolean;
    showTitle?: boolean;
    singleSelection?: boolean;
    onChange: (stacksId: string[]) => void;
}
export const StacksMenu = React.memo(function StacksMenu({
    value,
    canClear,
    showTitle,
    singleSelection,
    onChange,
}: IStacksMenuProps) {
    const stacks = useStacks();

    const handleToggleStackId = (stackId: string) => {
        onChange(singleSelection ? [stackId] : xor(value || [], [stackId]));
    };

    return (
        <Menu>
            {showTitle !== false && <MenuDivider title={translate("Select stack")} />}
            {stacks.map((stack: IStack) => {
                return (
                    <MenuItem
                        icon={<SymbolSquare color={stack.tint || Colors.GRAY3} />}
                        text={stack.title}
                        key={stack.id}
                        labelElement={<Icon icon={value?.includes(stack.id) ? "check" : undefined} />}
                        onClick={() => handleToggleStackId(stack.id)}
                        shouldDismissPopover={singleSelection ? true : false}
                        data-testid={`stacks-menu-stack-${stack.id}`}
                    />
                );
            })}
            {canClear && (
                <>
                    <MenuDivider />
                    <MenuItem
                        text={translate("All stacks")}
                        icon="small-square"
                        onClick={() => onChange([])}
                        shouldDismissPopover={true}
                        data-testid="stacks-menu-all-stacks"
                    />
                </>
            )}
        </Menu>
    );
});
