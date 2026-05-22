// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLDivProps } from "@blueprintjs/core";
import classNames from "classnames";
import React, { CSSProperties, FunctionComponent, useMemo } from "react";

interface IColProps extends HTMLDivProps {
    align?: "top" | "center" | "bottom" | "stretch";
    justify?: "left" | "center" | "right" | "stretch" | "between" | "around";
    vertical?: boolean;
    gap?: number | string;
    width?: number | string;
    unshrinkable?: boolean;
    wrap?: boolean;
    fill?: boolean;
    collapse?: boolean;
    children?: React.ReactNode;
}
export const Col: FunctionComponent<IColProps> = ({
    children,
    align,
    justify,
    vertical,
    gap,
    width,
    unshrinkable,
    wrap,
    fill,
    collapse,
    className,
    style,
    ...restProps
}) => {
    const extStyles = style;
    const styles: CSSProperties = useMemo(() => {
        const style: CSSProperties = { ...extStyles };

        if (align) {
            switch (align) {
                case "center":
                    style.alignItems = "center";
                    break;
                case "top":
                    style.alignItems = "flex-start";
                    break;
                case "bottom":
                    style.alignItems = "flex-end";
                    break;
                case "stretch":
                    style.alignItems = "stretch";
                    break;
                default:
                    break;
            }
        }

        if (justify) {
            switch (justify) {
                case "center":
                    style.justifyContent = "center";
                    break;
                case "left":
                    style.justifyContent = "flex-start";
                    break;
                case "right":
                    style.justifyContent = "flex-end";
                    break;
                case "stretch":
                    style.justifyContent = "stretch";
                    break;
                case "between":
                    style.justifyContent = "space-between";
                    break;
                case "around":
                    style.justifyContent = "space-around";
                    break;
                default:
                    break;
            }
        }

        if (vertical === true) {
            style.flexDirection = "column";
        }

        if (gap) {
            style.gap = gap;
        }

        if (collapse) {
            style.width = "auto";
            style.flexShrink = 0;
        }

        if (width != null) {
            style.width = width;
            if (width !== "auto") {
                style.flexShrink = 0;
            }
        }

        if (unshrinkable) {
            style.flexShrink = 0;
            style.flexGrow = 0;
        }

        if (wrap) {
            style.flexWrap = "wrap";
        }

        if (fill) {
            style.width = "100%";
        }

        return style;
    }, [align, justify, gap, unshrinkable, width, wrap, extStyles, vertical]);

    return (
        <div {...restProps} className={classNames("layout-col", className)} style={styles}>
            {children}
        </div>
    );
};
