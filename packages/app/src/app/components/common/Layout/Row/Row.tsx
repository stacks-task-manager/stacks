// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLDivProps } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useMemo } from "react";

interface IRowProps extends HTMLDivProps {
    gutter?: number;
    padding?: number;
    children?: React.ReactNode;
    wrap?: boolean;
    justify?: "center" | "left" | "right" | "between";
    align?: "center" | "top" | "bottom";
    cursor?: React.CSSProperties["cursor"];
    className?: string;
}
export const Row: FunctionComponent<IRowProps> = ({
    gutter,
    padding,
    children,
    wrap,
    justify,
    align,
    cursor,
    className,
    style,
    ...rest
}) => {
    const styles = useMemo(() => {
        const styles: React.CSSProperties = {
            cursor,
            ...style,
        };
        if (gutter && !wrap) styles.gap = gutter;
        if (padding) styles.padding = `0 ${padding}px`;
        if (wrap) styles.flexWrap = "wrap";

        if (justify) {
            if (justify === "center") {
                styles.justifyContent = "center";
            } else if (justify === "left") {
                styles.justifyContent = "flex-start";
            } else if (justify === "right") {
                styles.justifyContent = "flex-end";
            } else if (justify === "between") {
                styles.justifyContent = "space-between";
            }
        }

        if (align) {
            if (align === "center") {
                styles.alignItems = "center";
            } else if (align === "top") {
                styles.alignItems = "flex-start";
            } else if (align === "bottom") {
                styles.alignItems = "flex-end";
            }
        }

        return styles;
    }, [gutter, padding, justify]);
    return (
        <div className={classNames("layout-row", className)} style={styles} {...rest}>
            {children}
        </div>
    );
};
