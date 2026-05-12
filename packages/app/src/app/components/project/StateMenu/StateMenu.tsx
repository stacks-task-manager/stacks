// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Colors, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";

import { Icon } from "app/components/common";

interface IStateMenuProps {
    value: "all" | "done" | "todo";
    shouldDismiss?: boolean;
    onChange: (value: "all" | "done" | "todo") => void;
}
export const StateMenu: FunctionComponent<IStateMenuProps> = ({ value, shouldDismiss, onChange }) => {
    const handleIncompleted = () => {
        onChange("todo");
    };

    const handleCompleted = () => {
        onChange("done");
    };

    const handleAll = () => {
        onChange("all");
    };

    return (
        <Menu>
            <MenuItem
                text="Incomplete tasks"
                icon={<Icon icon="circle" color={Colors.ORANGE2} />}
                onClick={handleIncompleted}
                labelElement={<Icon icon={value === "todo" ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
            />

            <MenuDivider />
            <MenuItem
                text="Completed tasks"
                icon={<Icon icon="check-circle" color={Colors.FOREST2} />}
                onClick={handleCompleted}
                labelElement={<Icon icon={value === "done" ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
            />
            <MenuItem
                text="All tasks"
                icon={<Icon icon="minus-circle" color={Colors.BLUE3} />}
                onClick={handleAll}
                labelElement={<Icon icon={value === "all" ? "check" : undefined} />}
                shouldDismissPopover={shouldDismiss}
            />
        </Menu>
    );
};
