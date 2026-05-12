// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { ProgressMenu } from "app/components/project";
import { Placement, Popover } from "@blueprintjs/core";

interface IProgressPickerProps {
    value: number;
    children: React.ReactNode;
    placement?: Placement;
    disabled?: boolean;
    onChange: (value: number, event: React.MouseEvent) => void;
}
export const ProgressPicker: FunctionComponent<IProgressPickerProps> = ({
    value,
    children,
    placement,
    disabled,
    onChange,
}) => {
    return (
        <Popover
            placement={placement}
            content={<ProgressMenu value={value} onChange={onChange} />}
            disabled={disabled}
        >
            {children}
        </Popover>
    );
};
