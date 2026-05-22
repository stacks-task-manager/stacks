// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";

import { Icon, IIconProps } from "../Icon/Icon";
import { getTextColor } from "app/utils/colors";

interface IconPillProps extends Omit<IIconProps, "size" | "color"> {
    size?: "small" | "medium" | "large";
    color?: string;
}

const IconSize = {
    small: 12,
    medium: 14,
    large: 18,
}

const DEFAULT_SIZE = "medium";
const DEFAULT_BACKGROUND = "aquamarine";

export const IconPill: FunctionComponent<IconPillProps> = ({ size, color, ...props }) => {
    const textColor = useMemo(() => {
        return getTextColor(color ?? DEFAULT_BACKGROUND);
    }, [color]);
    return (
        <div
            className={`icon-pill icon-pill--${size ?? DEFAULT_SIZE}`}
            style={{ backgroundColor: color ?? DEFAULT_BACKGROUND }}>
            <Icon {...props} size={IconSize[size ?? DEFAULT_SIZE]} color={textColor} />
        </div>
    );
}
