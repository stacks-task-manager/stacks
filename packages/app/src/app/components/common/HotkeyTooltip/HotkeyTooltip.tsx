// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classnames from "classnames";
import React, { FunctionComponent } from "react";

import { HotkeyChip } from "app/components/common";
import { Placement, PopoverTargetProps, Tooltip } from "@blueprintjs/core";

interface IHotkeyTooltipProps {
    title: string | React.ReactNode;
    keys?: string[];
    placement?: Placement;
    delay?: number;
    small?: boolean;
    horizontal?: boolean;
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    renderTarget?: (props: PopoverTargetProps) => JSX.Element;
}
export const HotkeyTooltip: FunctionComponent<IHotkeyTooltipProps> = ({
    title,
    keys,
    placement,
    delay,
    small,
    horizontal,
    className,
    children,
    disabled,
    renderTarget,
}) => {
    return (
        <Tooltip
            content={
                <div className={classnames("hotkeys-tooltip-content", [className], { horizontal })}>
                    <div className={classnames("hotkeys-tooltip-content__title", { small })}>{title}</div>
                    {keys != null && keys.length > 0 && <HotkeyChip keys={keys} />}
                </div>
            }
            placement={placement || "top"}
            hoverOpenDelay={delay}
            disabled={disabled}
            renderTarget={renderTarget}
        >
            {children}
        </Tooltip>
    );
};
