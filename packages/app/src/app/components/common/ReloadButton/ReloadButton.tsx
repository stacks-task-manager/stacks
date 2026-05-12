// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useEffect, useState } from "react";

import { ToolbarButton } from "app/components/common";
import { Placement } from "@blueprintjs/core";

interface IReloadButtonProps {
    tooltip: string | React.ReactNode;
    iconSize?: number;
    placement?: Placement;
    disabled?: boolean;
    onClick: () => void;
}
export const ReloadButton: FunctionComponent<IReloadButtonProps> = ({
    tooltip,
    iconSize,
    placement,
    disabled,
    onClick,
}) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setIsLoading(false);
        }, 3000);
    }, []);

    const handleClick = () => {
        if (isLoading || disabled) return;
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        onClick();
    };

    return (
        <ToolbarButton
            icon="refresh"
            iconSize={iconSize}
            tooltip={tooltip}
            placement={placement}
            spin={isLoading}
            onClick={handleClick}
            disabled={disabled || isLoading}
        />
    );
};
