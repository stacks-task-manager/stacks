// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { ForwardRefRenderFunction, useImperativeHandle, useRef } from "react";
import { Classes } from "@blueprintjs/core";
import classNames from "classnames";

import Sprite from "app/icons/sprites.svg";

export interface IIconProps {
    icon?: string;
    color?: string;
    cursor?: string;
    stroke?: string;
    size?: number;
    width?: number;
    height?: number;
    spin?: boolean;
    interactive?: boolean;
    className?: string;
    [x: string]: unknown;
}
const IconPure: ForwardRefRenderFunction<HTMLSpanElement | null, IIconProps> = (
    { icon, color, cursor, stroke, size, width, height, spin, className, interactive, ...props },
    ref
) => {
    const iconRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => iconRef.current!, []);

    if (!icon) return null;
    return (
        <span
            className={classNames(Classes.ICON, `icon-${icon}`, className, { spin, interactive })}
            style={{ color, cursor }}
            ref={iconRef}
        >
            <svg
                style={{ stroke: stroke || "currentcolor" }}
                width={width || size || 16}
                height={height || size || 16}
                {...props}
            >
                <use href={`${Sprite}#${icon}`} />
            </svg>
        </span>
    );
};

export const Icon = React.forwardRef(IconPure);
