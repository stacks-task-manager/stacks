// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AnchorButton, AnchorButtonProps, Tooltip, TooltipProps } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

interface ButtonTooltipProps {
    disabled?: boolean;
    buttonProps: AnchorButtonProps;
    tooltipProps: TooltipProps;
}
export const ButtonTooltip: FunctionComponent<ButtonTooltipProps> = ({
    disabled,
    buttonProps,
    tooltipProps,
}) => {
    return (
        <Tooltip
            {...tooltipProps}
            disabled={disabled}
            renderTarget={({ isOpen, ref, ...props }) => (
                <AnchorButton {...props} {...buttonProps} active={isOpen} ref={ref} disabled={disabled} />
            )}
        />
    );
};
