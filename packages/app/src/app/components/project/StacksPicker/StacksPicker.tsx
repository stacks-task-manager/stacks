// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { IStacksMenuProps, StacksMenu } from "app/components/project";

interface IStacksPickerProps extends IStacksMenuProps {
    children: React.ReactNode;
    fill?: boolean;
}
export const StacksPicker: FunctionComponent<IStacksPickerProps> = ({ children, fill, ...props }) => {
    return (
        <Popover content={<StacksMenu {...props} />} fill={fill}>
            {children}
        </Popover>
    );
};
