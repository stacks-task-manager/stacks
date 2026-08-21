// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover } from "@blueprintjs/core";
import React from "react";

import { IStacksMenuProps, StacksMenu } from "app/components/project";

interface IStacksPickerProps extends IStacksMenuProps {
    children: React.ReactNode;
    fill?: boolean;
}
export const StacksPicker = React.memo(function StacksPicker({
    children,
    fill,
    ...props
}: IStacksPickerProps) {
    return (
        <Popover content={<StacksMenu {...props} />} fill={fill}>
            {children}
        </Popover>
    );
});
