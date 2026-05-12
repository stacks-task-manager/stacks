// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Placement, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { IQuickTimeLogProps, QuickTimeLog } from "./QuickTimeLog";

interface IQuickTimeLogPopoverProps extends IQuickTimeLogProps {
    children: React.ReactNode;
    placement?: Placement;
    disabled?: boolean;
}
export const QuickTimeLogPopover: FunctionComponent<IQuickTimeLogPopoverProps> = ({
    children,
    placement,
    disabled,
    ...props
}) => {
    return (
        <Popover
            content={<QuickTimeLog {...props} />}
            popoverClassName="popover-padded-medium"
            placement={placement || "left-end"}
            lazy
            disabled={disabled}
        >
            {children}
        </Popover>
    );
};
